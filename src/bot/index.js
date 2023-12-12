const { Client, GatewayIntentBits, Events, PermissionFlagsBits } = require('discord.js');
const register = require('./commands/register');
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
            const cmd = int.isMessageComponent()
                ? int.message.interaction.commandName
                : int.isChatInputCommand()
                ? int.commandName
                : null;

            if (cmd === 'garage') {
                if (int.isMessageComponent()) {
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
    }

    async destroy() {
        await super.destroy();
    }
};
