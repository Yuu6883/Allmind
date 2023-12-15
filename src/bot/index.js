const {
    Client,
    GatewayIntentBits,
    Events,
    WebhookClient,
    EmbedBuilder,
} = require('discord.js');
const register = require('./commands/register');
// const unregister = require('./commands/unregister');
const NewsDB = require('../database/news');
const Garage = require('./garage');

module.exports = class Allmind extends Client {
    /** @param {import("../app")} app */
    constructor(app) {
        super({ intents: [GatewayIntentBits.Guilds] });
        this.app = app;
        this.garage = new Garage(app);
        this.newsTimeout = null;
    }

    async init() {
        this.on(Events.InteractionCreate, async int => {
            const cmd =
                int.isMessageComponent() || int.isModalSubmit()
                    ? int.message.interaction.commandName
                    : int.isChatInputCommand()
                    ? int.commandName
                    : null;

            if (cmd === 'garage') {
                if (int.isMessageComponent() || int.isModalSubmit()) {
                    await this.garage.handle(int, int.message.interaction);
                } else {
                    await this.garage.init(int);
                }
            } else {
                console.log('Received unknown interaction', int);
            }
        });

        await this.login(this.app.options.bot_token);
        register(this.app.options.bot_token, this.user.id);

        // for (const guild of this.guilds.cache.values()) {
        //     unregister(this.app.options.bot_token, this.user.id, guild.id);
        // }

        if (this.app.options.news_webhook && this.app.options.news_role) {
            try {
                const getNews = require('../../data/bandai');
                const hook = new WebhookClient({ url: this.app.options.news_role });

                const cope = async () => {
                    /** @type {News[]} */
                    const news = await getNews();
                    /** @type {News[]} */
                    const latest = [];
                    const archive = await NewsDB.list();
                    const map = new Map(archive.map(p => [p.id, p]));

                    for (const n of news) {
                        if (map.has(n.id)) continue;
                        const res = await NewsDB.add(n).catch(_ => ({}));
                        if (!res.changes) continue;
                        latest.push(n);
                    }

                    latest.sort((a, b) => a.date - b.date);
                    for (const post of latest) {
                        const em = new EmbedBuilder()
                            .setTitle(post.title)
                            .setDescription(post.desc)
                            .setURL(post.url)
                            .setImage(post.image)
                            .setTimestamp(post.date);
                        await hook.send({
                            content: `<@&${this.app.options.news_webhook}>`,
                            embeds: [em],
                        });
                    }
                    this.newsTimeout = setTimeout(cope, 10 * 1000);
                };
                this.newsTimeout = setTimeout(cope, 0);
            } catch (e) {
                console.error(e);
            }
        }
    }

    async destroy() {
        if (this.newsTimeout) clearTimeout(this.newsTimeout);
        await super.destroy();
    }
};
