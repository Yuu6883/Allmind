const UserDB = require('../../database/user');
const GarageDB = require('../../database/garage');
const SM = require('./sm');

const BAD_CODE = 'bad code detected - fallback to assembly';
const WRONG_USER = 'This interaction is not initiated by you.';
const GARAGE_WARNING = ':warning: Only the **newest** garage can be interacted with: ';
module.exports = class Garage {
    /** @param {import("../../app")} app */
    constructor(app) {
        this.app = app;
        SM.err = `:warning: Error :warning:\nPlease contact <@${app.options.owner_id}>`;
    }

    /**
     * New interaction
     * @param {import("discord.js").ChatInputCommandInteraction} curr
     */
    async init(curr) {
        const uid = curr.user.id;

        let cutscene = false;
        {
            const r = await UserDB.reg('discord', uid);
            if (r.changes) {
                await GarageDB.reg(uid, curr.id);
                cutscene = true;
            }
        }

        const { state, data } = await GarageDB.get(uid);

        await SM.proc(curr, curr.id, {
            state: SM.states[state],
            data,
            cutscene,
        });
    }

    /** @param {string} content */
    raw(content) {
        return {
            content,
            embeds: [],
            files: [],
            components: [],
        };
    }

    /**
     * @param {import("discord.js").MessageComponentInteraction} curr
     * @param {import('discord.js').MessageInteraction} original
     */
    async handle(curr, original) {
        const uid = original.user.id;
        // User filter
        if (curr.user.id !== uid) {
            await curr.reply({
                content: WRONG_USER,
                ephemeral: true,
            });
            return;
        }

        await curr.deferUpdate();
        const rec = await GarageDB.get(uid);
        // Dev moment
        if (!rec) {
            await curr.deleteReply();
            return;
        }

        const { id, link, state, data } = rec;
        // Garage was opened somewhere else
        if (id != original.id) {
            await curr.editReply(this.raw(GARAGE_WARNING + link));
            await SM.delay(10 * 1000);
            await curr.deleteReply();
            return;
        }

        const s = SM.states[state];
        if (!s) {
            await curr.editReply(this.raw(SM.err));
            console.error(`Invalid state[${state}]`);
            return;
        }
        const sn = SM.getStateName(s);

        /** @type {[GarageState, string]} */
        const tuple = [null, null];

        if (curr.isButton()) {
            const status = s.onButton && (await s.onButton(data, curr.customId));

            if (!status) {
                console.warn(`Unhandled button[${curr.customId}] in state[${sn}]`);
            } else Object.assign(tuple, status);
        } else if (curr.isStringSelectMenu()) {
            const status =
                s.onSelect && (await s.onSelect(data, curr.customId, curr.values));

            if (!status) {
                console.warn(`Unhandled select[${curr.customId}] in state[${sn}]`);
            } else Object.assign(tuple, status);
        } else {
            console.warn('Unknown interaction type: ', curr);
            return;
        }

        if (!tuple[0]) {
            delete data.editing;
            data.preview = -1;
            tuple[1] = BAD_CODE;
        }

        await SM.proc(curr, id, { data, state: tuple[0], msg: tuple[1] });
    }
};
