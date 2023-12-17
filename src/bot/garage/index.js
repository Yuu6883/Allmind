const UserDB = require('../../database/user');
const GarageDB = require('../../database/garage');
const SM = require('./sm');
const { delay } = require('../../util/time');

const BAD_CODE = 'bad code detected - fallback to assembly';
const WRONG_USER = 'This interaction is not initiated by you.';
const GARAGE_WARNING = ':warning: Only the **newest** garage can be interacted with: ';
const GARAGE_EXPIRED = ':warning: Garage expired';

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

        const rec = await GarageDB.get(uid);
        const state = SM.states[rec.state];

        await SM.proc(curr, curr.id, {
            state,
            data: state ? Object.assign(rec.data, { owner: uid }) : null,
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
     * @param {GarageInteraction} curr
     * @param {MsgCompInt} original
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

        const rec = await GarageDB.get(uid);
        // Dev moment
        if (!rec) {
            await curr.deferUpdate();
            await curr.deleteReply();
            return;
        }
        const { id, link, state, data } = rec;

        // Garage was opened somewhere else
        if (original.id !== id || !state) {
            await curr.deferUpdate();
            await curr.editReply(this.raw(link ? GARAGE_WARNING + link : GARAGE_EXPIRED));
            await delay(10 * 1000);
            await curr.deleteReply();
            return;
        }

        /** @type {GarageState} */
        const s = SM.states[state];
        if (!s) {
            console.error(`Invalid state[${state}]`);
            await curr.editReply(this.raw(SM.err));
            return;
        }

        /** @type {"onButton" | "onSelect" | "onModal"} */
        let func = null;
        if (curr.isButton()) {
            func = 'onButton';
        } else if (curr.isStringSelectMenu()) {
            func = 'onSelect';
        } else if (curr.isModalSubmit()) {
            func = 'onModal';
        } else {
            return console.warn('Unhandled interaction: ', curr);
        }

        const cid = curr.customId;
        const valueKey = { onButton: null, onSelect: 'values', onModal: 'fields' }[func];
        /** @type {GarageEventResult} */
        let result =
            s[func] && (await s[func](data, cid, valueKey ? curr[valueKey] : null));

        if (!result) {
            console.warn(`Unhandled ${func}[${cid}] in state[${SM.getStateName(s)}]`);
            result = [null, null, {}];
        }

        if (!result[0]) {
            delete data.staging;
            result[1] = BAD_CODE;
        }

        if (result[2]?.exit) {
            await curr.deferUpdate();
            await GarageDB.clear(uid);
            await curr.deleteReply();
            return;
        }

        if (result[2]?.modal) return await curr.showModal(result[2].modal);

        if (!curr.deferred && !curr.replied) await curr.deferUpdate();
        await SM.proc(curr, id, { data, state: result[0], msg: result[1] });
    }
};
