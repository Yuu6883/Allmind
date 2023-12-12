const { performance } = require('perf_hooks');
const {
    Interaction,
    CacheType,
    ButtonStyle: BS,
    InteractionResponse,
} = require('discord.js');

const { embedACData, createCutscene } = require('./render');
const {
    EMOTES,
    CIDS,
    MAX_OPT,
    DEFAULT_AC_DATA,
    DEFAULT_BOOSTER_ID,
} = require('../constants');

const GarageDB = require('../../database/garage');
const { NOTHING, INTERNAL, LEG_TYPES, PUNCH, STATS } = require('./parts');
const { B, R, S, O } = require('../util/form');

/** @type {GarageState} */
const MainST = {
    render: [
        R(
            B(CIDS.ASSEMBLY, 'Assembly'),
            B(CIDS.LOAD_SAVE, 'AC DATA'),
            B(CIDS.PRESET, 'Load Preset', { disabled: true }), // TODO: preset AC's
        ),
    ],
    onButton: async (data, id) => {
        if (id === CIDS.ASSEMBLY) {
            await SM.loadDefaultAC(data);
            return [AssemblyST, 'loaded default AC'];
        } else if (id === CIDS.LOAD_SAVE) {
        }
    },
};

/** @type {GarageState} */
const AssemblyST = {
    render: () => {
        const row1 = [
            B(CIDS.R_ARM, 'R-Arm'),
            B(CIDS.L_ARM, 'L-Arm'),
            B(CIDS.R_BACK, 'R-Back'),
            B(CIDS.L_BACK, 'L-Back'),
        ];

        // hmmm
        if (Math.random() < 0.01) {
            row1.push(
                B(CIDS.HMMM, null, {
                    style: BS.Secondary,
                    emoji: EMOTES.SNAIL,
                }),
            );
        }

        return [
            R(row1),
            R([
                B(CIDS.FRAME, 'Edit Frame Parts'),
                B(CIDS.INNER, 'Edit Inner Parts'),
                B(CIDS.SAVE, 'Save', { style: BS.Success }),
            ]),
        ];
    },
    onButton: async (data, id) => {
        const idx = [CIDS.R_ARM, CIDS.L_ARM, CIDS.R_BACK, CIDS.L_BACK].indexOf(id);
        if (idx >= 0) {
            data.editing = id;
            data.preview = -1;
            return [UnitEditST, `editing [${id}] unit`];
        } else if (id === CIDS.FRAME) {
            return [FrameEditST, 'editing frame parts'];
        } else if (id === CIDS.INNER) {
            return [InnerEditST, 'editing inner parts'];
        } else if (id === CIDS.HMMM) {
            data.l_arm = data.r_arm = data.l_back = data.r_back = 0;
            return [AssemblyST, 'all units unequipped\ntime for re-education'];
        } else if (id === CIDS.SAVE) {
            // TODO: save
        }
    },
};

/** @type {GarageState} */
const UnitEditST = {
    render: data => {
        const { editing, preview } = data;
        const equipable = preview >= 0 && preview !== data[editing];

        const buttons = [
            B(CIDS.EQUIP_RETURN, 'Equip & Return', {
                style: BS.Success,
                disabled: !equipable,
            }),
            B(CIDS.EQUIP, 'Equip', {
                disabled: !equipable,
            }),
            B(CIDS.RETURN, 'Return', { style: BS.Secondary }),
        ];

        const isBack = editing.endsWith('back');
        const swapKey = editing.replace('back', 'swap');
        const arm = editing.replace('back', 'arm');
        if (isBack) {
            buttons.splice(
                2,
                0,
                B(CIDS.SWAP, `${data[swapKey] ? 'Disable' : 'Enable'} Weapon Bay`),
            );
        }

        const rows = [];
        const list = [...(STATS[data[swapKey] ? arm : editing]?.values() || [PUNCH])];

        for (let i = 0, p = 1; i < list.length; i += MAX_OPT, p++) {
            const options = list.slice(i, i + 25).map(part =>
                O({
                    // TODO: replace [name] with emote
                    label: `[${editing.toUpperCase()}] ${part.name}`,
                    description: part.type || '👊',
                    default: (preview >= 0 ? preview : data[editing]) === part.id,
                    value: part.id.toString(),
                }),
            );

            const select = S(`${editing}_select_${p}`, options);
            select.setPlaceholder(`PAGE ${p}`);
            rows.push(R(select));
        }

        return [...rows, R(buttons)];
    },
    onButton: async (data, id) => {
        const { editing, preview } = data;

        if (id === CIDS.SWAP) {
            const isBack = editing.endsWith('back');
            if (!isBack) return console.error('Swap button pressed on arm units');
            const swapKey = editing.replace('back', 'swap');
            data[swapKey] = !data[swapKey];
            data[editing] = 0;
            data.preview = -1;

            const msg = `${
                data[swapKey] ? 'enabled' : 'disabled'
            } weapon bay on ${editing}`;
            return [UnitEditST, msg];
        }

        const idx = [CIDS.EQUIP, CIDS.RETURN, CIDS.EQUIP_RETURN].indexOf(id);
        //                01          10             11
        if (idx < 0) return;
        const flags = idx + 1,
            EQ = 1,
            RET = 2;

        let msg = '';
        if (flags & EQ) {
            const d = editing[0];
            const wb = data[`${d}_swap`];
            if (preview >= 0) {
                // Weapon bay check
                if (wb && preview > 0) {
                    const isBack = editing.endsWith('back');
                    const key = isBack ? `${d}_arm` : `${d}_back`;
                    if (data[key] === preview) {
                        data[key] = 0;
                        // debug message
                        msg +=
                            `unequipped [${STATS[`${d}_arm`].get(preview).name}]` +
                            ` on [${key}] due to weapon bay conflict`;
                    }
                }
                data[editing] = preview;
            }
            // debug message
            if (preview > 0) {
                const map = STATS[wb ? `${d}_arm` : editing];
                if (msg) msg += '\n';
                msg += `equipped [${map.get(preview).name}] on [${editing}]`;
            }
        }

        data.preview = -1;
        if (flags & RET) {
            delete data.editing;
            return [AssemblyST, msg];
        }
        return [UnitEditST, msg];
    },
    onSelect: async (data, _, values) => {
        const { editing } = data;
        const value = Number(values[0]);

        data.preview = value;
        const same = value === data[editing];

        let msg = '';
        if (!same) {
            let key = editing;
            if (editing.endsWith('back') && data[editing.replace('back', 'swap')])
                key = editing.replace('back', 'arm');

            const p = STATS[key].get(value);
            if (p?.name !== NOTHING) msg = `previewing [${p.name}]`;
        }
        return [UnitEditST, msg];
    },
};

/** @type {GarageState} */
const FrameEditST = {
    render: data => {
        const { editing, preview } = data;
        const equipable = preview >= 0 && preview !== data[editing];

        const buttons = [
            B(CIDS.EQUIP_RETURN, 'Equip & Return', {
                style: BS.Success,
                disabled: !equipable,
            }),
            B(CIDS.EQUIP, 'Equip', {
                disabled: !equipable,
            }),
            B(CIDS.RETURN, 'Return', { style: BS.Secondary }),
        ];

        const rows = [];
        for (const name of ['head', 'core', 'arms', 'legs']) {
            let match = false;
            const options = [...STATS[name].values()].map(part => {
                const def =
                    (preview > 0 && editing === name ? preview : data[name]) === part.id;
                const option = O({
                    // TODO: replace [name] with emote
                    label: `[${name.toUpperCase()}] ${part.name}`,
                    value: part.id.toString(),
                    default: def,
                });
                // TODO: anything else to add description?
                if (name === 'legs') option.setDescription(LEG_TYPES[part.type]);
                match |= def;
                return option;
            });
            if (!match) console.error(`Missing select [${name}]: `, data);

            rows.push(R(S(name, options)));
        }

        return [...rows, R(buttons)];
    },
    onButton: async (data, id) => {
        const idx = [CIDS.EQUIP, CIDS.RETURN, CIDS.EQUIP_RETURN].indexOf(id);
        //                01          10             11
        if (idx < 0) return;
        const flags = idx + 1,
            EQ = 1,
            RET = 2;

        let msg = '';
        if (flags & EQ) {
            if (data.preview > 0) {
                data[data.editing] = data.preview;
                const part = STATS[data.editing].get(data.preview);

                if (data.editing === 'legs') {
                    if (part.type === LEG_TYPES.indexOf('TANK')) {
                        data.booster = 0;
                        msg =
                            'booster removed, tank-type leg units use internal boosters';
                    } else if (!data.booster) {
                        data.booster = DEFAULT_BOOSTER_ID;
                        const b = STATS.booster.get(DEFAULT_BOOSTER_ID);
                        msg += `equipped booster [${b.name}]`;
                    }
                }
            }
            if (msg) msg += '\n';
            msg += `equipped [${STATS[data.editing].get(data[data.editing]).name}]`;
        }
        data.preview = -1;
        if (flags & RET) {
            delete data.editing;
            return [AssemblyST, msg];
        }
        return [FrameEditST, msg];
    },
    onSelect: async (data, id, values) => {
        const value = Number(values[0]);

        data.preview = value;
        const same = value === data[id];

        let msg = '';
        if (!same) {
            data.editing = id;
            const p = STATS[id].get(value);
            if (p?.name !== NOTHING) msg = `previewing [${p.name}]`;
        }
        return [FrameEditST, msg];
    },
};

/** @type {GarageState} */
const InnerEditST = {
    render: data => {
        const { editing, preview } = data;
        const equipable = preview >= 0 && preview !== data[editing];

        const buttons = [
            B(CIDS.EQUIP_RETURN, 'Equip & Return', {
                style: BS.Success,
                disabled: !equipable,
            }),
            B(CIDS.EQUIP, 'Equip', {
                disabled: !equipable,
            }),
            B(CIDS.RETURN, 'Return', { style: BS.Secondary }),
        ];

        const rows = [];
        for (const name of ['booster', 'FCS', 'generator', 'expansion']) {
            let match = false;
            const options = [...STATS[name].values()].map(part => {
                const def =
                    (preview > 0 && editing === name ? preview : data[name]) === part.id;
                match |= def;
                return O({
                    label: `[${name.toUpperCase()}] ${part.name}`,
                    value: part.id.toString(),
                    default: def,
                });
            });

            const select = S(name, options);
            // Disable booster selection for tank legs
            if (
                name === 'booster' &&
                STATS.legs.get(data.legs).type === LEG_TYPES.indexOf('TANK')
            ) {
                select.setPlaceholder(INTERNAL);
                select.setDisabled(true);
            } else {
                if (!match) console.error(`Missing select [${name}]: `, data);
            }
            rows.push(R(select));
        }
        return [...rows, R(buttons)];
    },
    onButton: async (data, id) => {
        const idx = [CIDS.EQUIP, CIDS.RETURN, CIDS.EQUIP_RETURN].indexOf(id);
        //                01          10             11
        if (idx < 0) return;
        const flags = idx + 1,
            EQ = 1,
            RET = 2;

        let msg = '';
        if (flags & EQ) {
            if (data.preview > 0) {
                if (
                    data.editing === 'booster' &&
                    STATS.legs.get(data.legs).type === LEG_TYPES.indexOf('TANK')
                ) {
                    msg += 'unable to edit booster';
                } else {
                    data[data.editing] = data.preview;
                }
            }
            if (msg) msg += '\n';
            msg += `equipped [${STATS[data.editing].get(data[data.editing]).name}]`;
        }
        data.preview = -1;
        if (flags & RET) {
            delete data.editing;
            return [AssemblyST, msg];
        }
        return [InnerEditST, msg];
    },
    onSelect: async (data, id, values) => {
        const value = Number(values[0]);

        data.preview = value;
        const same = value === data[id];

        let msg = '';
        if (!same) {
            data.editing = id;
            const p = STATS[id].get(value);
            if (p?.name !== NOTHING) msg = `previewing [${p.name}]`;
        }
        return [InnerEditST, msg];
    },
};

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
const delay = ms => ~~ms > 0 && new Promise(res => setTimeout(res, ~~ms));

/** @param {Promise<void>} p */
const timedAwait = async p => {
    const now = performance.now();
    await p;
    return performance.now() - now;
};

/** @type {Set<string>} */
const cutsceneIDs = new Set();
/**
 * @param {Interaction<CacheType>} curr
 * @param {boolean} cutscene
 */
const cutsceneCheck = async (curr, cutscene) => {
    if (!curr.isRepliable()) return;

    const uid = curr.user.id;

    if (cutsceneIDs.has(uid)) {
        await curr.reply({
            content: ':warning: **CUTSCENE IS UNSKIPPABLE** :warning:',
            ephemeral: true,
        });
        return true;
    }

    if (cutscene) {
        cutsceneIDs.add(uid);
        await curr.reply(createCutscene());

        /** @param {string} m */
        const chat = async (m, waitAfter = 0) => {
            const t = await timedAwait(curr.editReply({ content: `**${m}**` }));
            await delay(waitAfter * 1000 - t);
        };

        await delay(2 * 1000);
        await chat(`Registration number Rb${uid}.`, 3);
        await chat(`Callsign: ${curr.user.displayName}.\nAuthentication complete.`, 3.5);
        await chat('Removing MIA status.\nRestoring access privileges.', 7);
        await chat('This is ALLMIND, the mercenary support system.', 5.5);
        await chat('Welcome back.\nALLMIND anticipates great things from you.', 5);

        cutsceneIDs.delete(uid);
    }
};

class SM {
    /**
     * Go to a specific garage state
     * rec is null only when at first interaction
     * @param {Interaction<CacheType>} curr
     * @param {string} id
     * @param {Object} param
     * @param {GarageState?} param.state
     * @param {AC6Data?} param.data
     * @param {string?} param.msg
     * @param {boolean?} param.cutscene only happen once per user
     */
    static async proc(curr, id, { state, data, msg, cutscene }) {
        if (await cutsceneCheck(curr, cutscene)) return;

        if (!state) state = Object.keys(data).length ? AssemblyST : MainST;

        /** @type {import('discord.js').MessageEditOptions} */
        const res = { embeds: [], files: [] };

        if (state.render instanceof Function) {
            if (data) {
                res.components = state.render(data);
                res.embeds.push(embedACData(data));
            } else {
                msg = this.err;
                console.error('Missing data on render call');
            }
        } else res.components = state.render;

        if (msg) {
            if (res.embeds.length) res.embeds[0].setFooter({ text: msg });
            else res.content = msg;
        } else res.content = '';

        let link = '';
        if (curr.isMessageComponent()) {
            await curr.editReply(res);
            link = curr.message.url;
        } else if (curr.isRepliable()) {
            const r = await (curr.deferred || curr.replied
                ? curr.editReply(res)
                : curr.reply(Object.assign(res, { fetchReply: true })));
            link = r.url;
        } else {
            return console.error('Dead code path reached');
        }

        await GarageDB.update(curr.user.id, id, link, this.getStateName(state), data);
    }

    /** @param {AC6Data} data */
    static async loadDefaultAC(data) {
        Object.assign(data, DEFAULT_AC_DATA);
        await this.validateAC(data);
    }

    /** @param {AC6Data} data */
    static async validateAC(data) {
        // TODO: validate AC data and fix if bad
        return true;
    }

    /** @param {GarageState} state */
    static getStateName(state) {
        for (const key in this.states) {
            if (this.states[key] === state) return key;
        }
        return 'Unknown';
    }
}

SM.states = { MainST, AssemblyST, UnitEditST, FrameEditST, InnerEditST };
SM.delay = delay;
SM.err = '';

module.exports = SM;
