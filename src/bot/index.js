const { Client, GatewayIntentBits, Events } = require('discord.js');
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
        this.on(Events.InteractionCreate, async interaction => {
            const cmd = interaction.isMessageComponent()
                ? interaction.message.interaction.commandName
                : interaction.commandName;

            if (cmd === 'garage') {
                if (interaction.isMessageComponent()) {
                    await this.garage.handle(
                        interaction.message.interaction,
                        interaction,
                    );
                } else {
                    await this.garage.handle(null, interaction);
                }
            } else {
                console.log(`Received unknown command: ${interaction.commandName}`);
                console.log(interaction);
            }
        });

        await this.login(this.app.options.bot_token);
        register(this.app.options.bot_token, this.user.id);
    }

    async destroy() {
        await super.destroy();
    }
};
