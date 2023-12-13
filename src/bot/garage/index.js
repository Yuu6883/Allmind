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
        // this.firstBoot = true;

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
        if (id != original.id) {
            await curr.deferUpdate();
            await curr.editReply(this.raw(GARAGE_WARNING + link));
            await SM.delay(10 * 1000);
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
        const sn = SM.getStateName(s);

        /** @type {GarageEventResult} */
        const result = [null, null, {}];

        if (curr.isButton()) {
            const status = s.onButton && (await s.onButton(data, curr.customId));

            if (!status) {
                console.warn(`Unhandled button[${curr.customId}] in state[${sn}]`);
            } else Object.assign(result, status);
        } else if (curr.isStringSelectMenu()) {
            const status =
                s.onSelect && (await s.onSelect(data, curr.customId, curr.values));

            if (!status) {
                console.warn(`Unhandled select[${curr.customId}] in state[${sn}]`);
            } else Object.assign(result, status);
        } else if (curr.isModalSubmit()) {
            const status =
                s.onModal && (await s.onModal(data, curr.customId, curr.fields));

            if (!status) {
                console.warn(`Unhandled modal[${curr.customId}] in state[${sn}]`);
            } else Object.assign(result, status);
        } else {
            console.warn('Unknown interaction type: ', curr);
            return;
        }

        if (!result[0]) {
            delete data.staging;
            result[1] = BAD_CODE;
        }

        if (result[2]?.modal) {
            await curr.showModal(result[2].modal);
            return;
        }

        if (!curr.deferred && !curr.replied) await curr.deferUpdate();
        await SM.proc(curr, id, { data, state: result[0], msg: result[1] });
    }
};
