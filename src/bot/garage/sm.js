const { performance } = require('perf_hooks');
const {
    ButtonStyle: BS,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');

const { embedACData, createCutscene } = require('./render');
const {
    EMOTES,
    CIDS,
    MAX_OPT,
    MAX_SAVE_FOLDER,
    DEFAULT_AC_DATA,
    DEFAULT_BOOSTER_ID,
} = require('../constants');

const UserDB = require('../../database/user');
const GarageDB = require('../../database/garage');
const SaveDB = require('../../database/save');

const { NOTHING, INTERNAL, LEG_TYPES, PUNCH, STATS, validateData } = require('./parts');
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
            return [AssemblyST, null];
        } else if (id === CIDS.LOAD_SAVE) {
            data.noEmbed = true;
            return [LoadST, null];
        }
    },
};

/** @type {[SaveData]} */
const EMPTY_FOLDER = [{ data_name: 'NONE', ac_name: '👻', id: -1 }];

/** @type {GarageState} */
const LoadST = {
    readAccount: true,
    render: async (_, acc) => {
        const saveList = await SaveDB.list(acc.id);
        /** @type {SaveData[][]} */
        const folders = Array.from({ length: MAX_SAVE_FOLDER }, _ => []);
        for (const save of saveList) {
            // Invalid folder
            if (save.folder < 0 || save.folder >= folders.length) {
                console.log('invalid save folder', save, 'uid', acc.uid);
                await SaveDB.delete(save.id);
                continue;
            }

            const folder = folders[save.folder];
            // too many in 1 folder somehow
            if (folder.length >= MAX_OPT) {
                console.log('deleting save', save.id);
                await SaveDB.delete(save.id);
                continue;
            }

            folder.push(save);
        }

        return folders
            .map((folder, i) =>
                R(
                    S(
                        `user_${acc.id}_folder_${i}`,
                        (folder.length ? folder : EMPTY_FOLDER).map(save =>
                            O({
                                label: save.data_name,
                                description: `AC NAME: ${save.ac_name}`,
                                value: save.id.toString(),
                            }),
                        ),
                    )
                        .setPlaceholder(`Folder${i + 1}   [${folder.length}/${MAX_OPT}]`)
                        .setDisabled(!folder.length),
                ),
            )
            .concat([R(B(CIDS.RETURN, 'Return', { style: BS.Secondary }))]);
    },
    onButton: async (_, id) => {
        if (id === CIDS.RETURN) return [MainST, null];
    },
    onSelect: async (data, id, values) => {},
};

/** @type {GarageState} */
const AssemblyST = {
    render: data => {
        data.noEmbed = false;

        const row1 = [
            B(CIDS.L_ARM, 'L-Arm'),
            B(CIDS.R_ARM, 'R-Arm'),
            B(CIDS.FRAME, 'Frame Parts'),
        ];

        const row2 = [
            B(CIDS.L_BACK, 'L-Back'),
            B(CIDS.R_BACK, 'R-Back'),
            B(CIDS.INNER, 'Inner Parts'),
        ];

        const row3 = [
            B(CIDS.SAVE, 'Save', { style: BS.Success }),
            B(CIDS.RETURN, 'Return', { style: BS.Secondary }),
        ];

        // hmmm
        if (Math.random() < 0.01) {
            row3.push(
                B(CIDS.HMMM, null, {
                    style: BS.Secondary,
                    emoji: EMOTES.SNAIL,
                }),
            );
        }

        return [R(row1), R(row2), R(row3)];
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
        } else if (id === CIDS.SAVE) {
            return [SaveST, 'choosing save file'];
        } else if (id === CIDS.RETURN) {
            return [MainST, ''];
        } else if (id === CIDS.HMMM) {
            data.l_arm = data.r_arm = data.l_back = data.r_back = 0;
            return [AssemblyST, 'all units unequipped\ntime for re-education'];
        }
    },
};

// TODO: replace the user_{} stuff with a JOIN clause in db to save directly from uid
/** @type {GarageState} */
const SaveST = {
    readAccount: true,
    render: async (_, acc) => {
        const saveList = await SaveDB.list(acc.id);
        /** @type {SaveData[][]} */
        const folders = Array.from({ length: MAX_SAVE_FOLDER }, _ => []);
        for (const save of saveList) {
            // Invalid folder
            if (save.folder < 0 || save.folder >= folders.length) {
                console.log('invalid save folder', save, 'uid', acc.uid);
                await SaveDB.delete(save.id);
                continue;
            }

            const folder = folders[save.folder];
            // too many in 1 folder somehow
            if (folder.length >= MAX_OPT) {
                console.log('deleting save', save.id);
                await SaveDB.delete(save.id);
                continue;
            }

            folder.push(save);
        }

        return folders
            .map((folder, i) =>
                R(
                    S(
                        `user_${acc.id}_folder_${i}`,
                        folder
                            .map(save =>
                                O({
                                    label: save.data_name,
                                    description: `AC NAME: ${save.ac_name}`,
                                    value: save.id.toString(),
                                }),
                            )
                            .concat(
                                folder.length >= MAX_OPT
                                    ? []
                                    : [
                                          O({
                                              label: '+',
                                              description: 'NEW SAVE',
                                              value: 'new',
                                          }),
                                      ],
                            ),
                    ).setPlaceholder(`Folder${i + 1}   [${folder.length}/${MAX_OPT}]`),
                ),
            )
            .concat([R(B(CIDS.RETURN, 'Return', { style: BS.Secondary }))]);
    },
    onButton: async (_, id) => {
        if (id === CIDS.RETURN) return [AssemblyST, null];
    },
    onSelect: async (data, id, values) => {
        const match = /^user_(\d+)_folder_(\d+)$/.exec(id);
        if (!match) return;
        const user = ~~match[1];
        const folder = ~~match[2];
        if (folder >= MAX_SAVE_FOLDER)
            return [
                AssemblyST,
                `requested folder[${folder + 1}] > allowed folder[${MAX_SAVE_FOLDER}]`,
            ];

        const value = values[0];

        if (value === 'new') {
            const modal = new ModalBuilder()
                .setCustomId(`save_user_${user}_folder_${folder}`)
                .setTitle('Saving AC DATA');

            const saveName = new TextInputBuilder()
                .setCustomId(CIDS.DATA_NAME)
                .setLabel('Data name')
                .setMinLength(1)
                .setMaxLength(16)
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const ACName = new TextInputBuilder()
                .setCustomId(CIDS.AC_NAME)
                .setLabel('AC name')
                .setMinLength(1)
                .setMaxLength(16)
                .setValue(data.ac_name)
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(R(saveName), R(ACName));
            return [SaveST, null, { modal }];
        }

        return [SaveST, null];
    },
    onModal: async (data, id, fields) => {
        const match = /^save_user_(\d+)_folder_(\d+)$/.exec(id);
        if (!match) return;
        const user = ~~match[1];
        const folder = ~~match[2];
        if (folder >= MAX_SAVE_FOLDER)
            return [
                AssemblyST,
                `requested folder[${folder + 1}] > allowed folder[${MAX_SAVE_FOLDER}]`,
            ];

        const err = validateData(data);
        if (err) return [AssemblyST, `failed to validate data: ${err}`];

        const save = Object.assign(data, {
            folder,
            data_name: fields.getTextInputValue(CIDS.DATA_NAME),
            ac_name: fields.getTextInputValue(CIDS.AC_NAME),
        });

        await SaveDB.add(user, save);
        return [AssemblyST, 'AC saved'];
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
 * @param {SMProcessable} curr
 * @param {boolean} cutscene
 */
const cutsceneCheck = async (curr, cutscene) => {
    const uid = curr.user.id;

    if (cutsceneIDs.has(uid)) {
        await curr.reply({
            content: ':warning: **CUTSCENE IS UNSKIPPABLE** :warning:',
            ephemeral: true,
        });
        return true;
    }

    if (!cutscene) return;
    cutsceneIDs.add(uid);

    // here comes the fun part
    try {
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
    } catch (e) {}

    cutsceneIDs.delete(uid);
};

class SM {
    /**
     * Go to a specific garage state
     * rec is null only when at first interaction
     * @param {SMProcessable} curr
     * @param {string} id
     * @param {Object} param
     * @param {GarageState?} param.state
     * @param {AC6Data?} param.data
     * @param {string?} param.msg
     * @param {boolean?} param.cutscene only happen once per user
     */
    static async proc(curr, id, param) {
        let { state, data, msg } = param;

        if (await cutsceneCheck(curr, param.cutscene)) return;

        // MainST has no data
        if (!state) {
            //              fallback  : init
            state = data ? AssemblyST : MainST;
        } else if (state === AssemblyST && !data) {
            // first time going from MainST to AssemblyST
            data = {};
            Object.assign(data, DEFAULT_AC_DATA);
        }

        if (data) data.owner = curr.user.id;

        /** @type {import('discord.js').MessageEditOptions} */
        const res = { embeds: [], files: [] };

        if (state.render instanceof Function) {
            if (data) {
                const err = validateData(data);
                // data validation error, force reset to AssemblyST
                if (err) {
                    delete data.editing;
                    data.preview = -1;
                    // TODO: maybe try to recover data?
                    Object.assign(data, DEFAULT_AC_DATA);
                    state = AssemblyST;
                    msg = 'data corrupted\nloaded default ac';
                }

                const acc = state.readAccount
                    ? await UserDB.getByUID('discord', data.owner)
                    : null;

                res.components = (await state.render(data, acc)) || [];
                if (!data.noEmbed) res.embeds.push(embedACData(data));
            } else {
                msg = this.err;
                res.allowedMentions = { parse: ['users'] };
                console.error('Missing data on render call');
            }
        } else res.components = state.render || [];

        if (msg) {
            if (res.embeds.length) res.embeds[0].setFooter({ text: msg });
            else res.content = msg;
        } else res.content = '';

        const r = await (curr.deferred || curr.replied
            ? curr.editReply(res)
            : curr.reply(Object.assign(res, { fetchReply: true })));
        const link = r.url;

        await GarageDB.update(curr.user.id, id, link, this.getStateName(state), data);
    }

    /** @param {GarageState} state */
    static getStateName(state) {
        for (const key in this.states) {
            if (this.states[key] === state) return key;
        }
        return 'Unknown';
    }
}

SM.states = { MainST, AssemblyST, UnitEditST, FrameEditST, InnerEditST, SaveST, LoadST };
SM.delay = delay;
SM.err = '';

module.exports = SM;
