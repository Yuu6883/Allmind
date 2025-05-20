const { sid } = require('../util/misc');
const { R, B } = require('../util/form');
const { uid2id } = require('../util/cache');
const UserDB = require('../../database/user');
const LinkDB = require('../../database/link');
const { MessageFlags } = require('discord.js');

module.exports = class LinkAccount {
    /** @param {App} app */
    constructor(app) {
        this.app = app;
        /** @type {Map<string, { user: import("discord.js").User, timestamp: number }>} */
        this.OTP = new Map();
    }

    /** @param {import("discord.js").ChatInputCommandInteraction} curr */
    async handle(curr) {
        /** @type {AuthProvider} */
        const provider = curr.options.getString('provider');

        if (provider === 'challonge') {
            await UserDB.reg('discord', curr.user.id);
            const link = await LinkDB.get(await uid2id(curr.user.id), 'challonge');
            if (link) {
                console.log(link);
                return await curr.reply({
                    content: '✅ Challonge linked ✅',
                    flags: MessageFlags.Ephemeral,
                });
            }

            const token = sid(16);
            this.OTP.set(token, { user: curr.user, timestamp: Date.now() });

            const components = [
                R(
                    B('link', 'Link Challonge Account', {
                        url: `${this.app.options.domain}/api/link/challonge?token=${token}`,
                    }),
                ),
            ];
            await curr.reply({
                content: '**This link is one-time use only**',
                components,
                flags: MessageFlags.Ephemeral,
            });
        }
    }

    /** @param {string} token */
    pop(token) {
        const item = this.OTP.get(token);
        if (!item) return null;
        this.OTP.delete(token);
        return item.user;
    }
};
