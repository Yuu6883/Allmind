/*

/challonge setup [tournament] [channel] [moderation_role]

permission required: 
- create private thread
- create webhook

*/

const { sid } = require('../util/misc');
const { R, B } = require('../util/form');
const { uid2id } = require('../util/cache');
const UserDB = require('../../database/user');
const LinkDB = require('../../database/link');
const { PermissionFlagsBits } = require('discord.js');

module.exports = class Challonge {
    /** @param {App} app */
    constructor(app) {
        this.app = app;
    }

    get api() {
        return this.app.auth.challonge;
    }

    /** @param {import("discord.js").ChatInputCommandInteraction} curr */
    async handle(curr) {
        const sub = curr.options.getSubcommand();

        if (sub === 'setup') {
            /** @type {Readonly<PermissionsBitField>} */
            const perm = curr.member.permissions;

            if (!perm.has(PermissionFlagsBits.ManageGuild)) {
                await curr.reply({
                    content:
                        "You don't have `ManageGuild` permission to use this command",
                });
                return;
            }

            const id = curr.options.getString('tournament');
            const channel = curr.options.getChannel('channel');
            const role = curr.options.getRole('role');

            console.log(id);
            const res = await this.api.checkTournamentPerm(id);
        }
    }
};
