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
const SpeedStats = require('./stats/speed');
const LinkAccount = require('./tournament/link');
const Challonge = require('./tournament');
const P2P = require('./p2p');
const RandomAC = require('./random');
const Palworld = require('./access/pal');
const Terraria = require('./access/terra');

module.exports = class Allmind extends Client {
    /** @param {App} app */
    constructor(app) {
        super({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
        this.app = app;

        this.newsTimeout = null;

        this.garage = new Garage(app);
        this.link = new LinkAccount(app);
        this.challonge = new Challonge(app);
        this.p2p = new P2P(app);

        if (app.options.access && process.platform === 'linux') {
            this.pal = new Palworld(app);
            this.terra = new Terraria(app);
        }

        /** @type {{ pending: Map<string, { type: string, user: import("discord.js").User }>, pendingUsers: Map<string, string>}} */
        this.access = {
            pending: new Map(),
            pendingUsers: new Map(),
        };
    }

    async init() {
        this.on(Events.InteractionCreate, async int => {
            const cmd =
                int.isMessageComponent() || int.isModalSubmit()
                    ? int.message.interaction?.commandName
                    : int.isChatInputCommand()
                    ? int.commandName
                    : null;

            if (cmd === 'garage') {
                if (int.isMessageComponent() || int.isModalSubmit()) {
                    await this.garage.handle(int, int.message.interaction);
                } else {
                    await this.garage.init(int);
                }
            } else if (cmd === 'emotes' && int.isChatInputCommand()) {
                const source = await int.guild.emojis.fetch();
                const option = int.options.getString('filter');
                const emotes = [...source.values()]
                    .filter(emo =>
                        option ? emo.name.startsWith(`${option.toUpperCase()}_`) : true,
                    )
                    .map((emo, i) => ({
                        json: `"${i + 1}": "${emo.id}"`,
                        text: `${i + 1}. <:E:${emo.id}> ${emo.name}`,
                    }));

                if (!emotes) return await int.reply('no results found');
                {
                    const e = emotes.map(data => data.json).join(',\n');
                    await int.reply(e);
                }

                for (let i = 0; i < emotes.length; i += 15) {
                    {
                        const e = emotes
                            .map(data => data.text)
                            .slice(i, i + 15)
                            .join('\n');
                        await int.followUp(e);
                    }
                }
            } else if (cmd === 'speed' && int.isChatInputCommand()) {
                await SpeedStats.handle(int);
            } else if (cmd === 'link' && int.isChatInputCommand()) {
                await this.link.handle(int);
            } else if (cmd === 'challonge' && int.isChatInputCommand()) {
                await this.challonge.handle(int);
            } else if (cmd === 'p2p') {
                if (int.isChatInputCommand()) await this.p2p.setup(int);
                else if (int.isMessageComponent()) await this.p2p.handle(int);
            } else if (cmd === 'random') {
                await RandomAC.handle(int);
            } else if (cmd === 'pal') {
                await this.pal?.handle(int);
            } else if (cmd === 'terra') {
                await this.terra?.handle(int);
            } else {
                console.log('Received unknown interaction', int);
            }
        });

        await this.login(this.app.options.bot_token);
        await register(this.app.options.bot_token, this.user.id, this.app.options.access);
        await this.pal.monitor();

        // for (const guild of this.guilds.cache.values()) {
        //     unregister(this.app.options.bot_token, this.user.id, guild.id);
        // }

        if (this.app.options.news_webhook && this.app.options.news_role) {
            const getNews = require('../../data/bandai');
            const hook = new WebhookClient({ url: this.app.options.news_webhook });

            const cope = async () => {
                try {
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
                            content: `<@&${this.app.options.news_role}>`,
                            embeds: [em],
                        });
                    }
                } catch (e) {
                    console.error(e);
                }
                this.newsTimeout = setTimeout(cope, 10 * 1000);
            };
            this.newsTimeout = setTimeout(cope, 0);
        }
    }

    async destroy() {
        if (this.newsTimeout) clearTimeout(this.newsTimeout);

        this.pal?.stop();
        this.terra?.stop();

        await super.destroy();
    }
};
