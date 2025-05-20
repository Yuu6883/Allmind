const { MessageFlags } = require('discord.js');

module.exports = class Patch {
    /** @param {App} app */
    constructor(app) {
        this.app = app;
    }

    /**
     * @param {GarageInteraction} curr
     */
    async handle(curr) {
        await curr.reply({
            content: 'Patch notes',
            flags: MessageFlags.Ephemeral,
        });
    }
};
