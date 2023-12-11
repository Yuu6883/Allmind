const { Interaction, CacheType } = require('discord.js');

const UserDB = require('../../database/user');
const IDB = require('../../database/interaction');
const SM = require('./sm');

module.exports = class Garage {
    /** @param {import("../../app")} app */
    constructor(app) {
        this.app = app;
    }

    /**
     * @param {Interaction<CacheType>} original
     * @param {Interaction<CacheType>} curr
     */
    async handle(original, curr) {
        // New interaction
        if (!original) {
            await Promise.all([IDB.add(curr.id), UserDB.reg('discord', curr.user.id)]);
            await SM.goto(SM.initST, curr);
            return;
        }

        if (curr.user.id !== original.user.id) {
            if (curr.isRepliable()) {
                curr.reply({
                    content: 'This interaction is not initiated by you.',
                    ephemeral: true,
                });
            }
            return;
        }

        await curr.deferUpdate();
        const rec = await IDB.get(original.id);
        if (!rec) return console.error(`INTDB.get("${origin.id}") returned null!`);

        const s = SM.states[rec.state];
        if (!s) return console.error(`Invalid state#${rec.state}`);

        /** @type {[GarageState, string]} */
        const next = [null, null];
        let forceAssembly = false;
        if (curr.isButton()) {
            const status = s.onButton && (await s.onButton(rec.data, curr.customId));

            if (!status) {
                console.warn(`Unhandled button[${curr.customId}] in state[${s.id}]`);
                forceAssembly = true;
            } else Object.assign(next, status);
        } else if (curr.isStringSelectMenu()) {
            const status =
                s.onSelect && (await s.onSelect(rec.data, curr.customId, curr.values));

            if (!status) {
                console.warn(`Unhandled select[${curr.customId}] in state[${s.id}]`);
                forceAssembly = true;
            } else Object.assign(next, status);
        } else {
            // TODO
            console.warn('Unknown interaction type: ', curr);
        }

        if (forceAssembly) {
            delete rec.data.editing;
            rec.data.preview = -1;
            SM.goto(SM.fallbackST, curr, rec, 'bad code detected - fallback to assembly');
        } else {
            SM.goto(next[0], curr, rec, next[1]);
        }
    }
};
