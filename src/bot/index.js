const { Client, GatewayIntentBits, Events } = require('discord.js');
const register = require('./commands/register');
// const unregister = require('./commands/unregister');
const Garage = require('./garage');

module.exports = class Allmind extends Client {
    /** @param {import("../app")} app */
    constructor(app) {
        super({ intents: [GatewayIntentBits.Guilds] });
        this.app = app;
        this.garage = new Garage(app);
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
    }

    async destroy() {
        await super.destroy();
    }
};
