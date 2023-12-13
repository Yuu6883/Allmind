const { performance } = require('perf_hooks');

const { embedACData, createCutscene } = require('./render');

const CONSTANTS = require('../constants');
const { CIDS, EMOTES, MAX_OPT, MAX_SAVE_FOLDER } = CONSTANTS;
const { DEFAULT_AC_DATA, DEFAULT_BOOSTER_ID } = CONSTANTS;

const GarageDB = require('../../database/garage');
const SaveDB = require('../../database/save');

const PARTS = require('./parts');
const { INTERNAL, LEG_TYPES, PUNCH, STATS } = PARTS;

const { B, R, S, O, M, T, BS } = require('../util/form');
const { uid2id } = require('./cache');
const { lines } = require('../util/string');

const RETURN_BTN = B(CIDS.RETURN, 'Return', { style: BS.Secondary });

/** @type {GarageState} */
const MainST = {
    render: [
        R(
            B(CIDS.ASSEMBLY, 'Assembly'),
            B(CIDS.AC_DATA, 'AC DATA'),
            B(CIDS.PRESET, 'Load Preset', { disabled: true }), // TODO: preset AC's
        ),
    ],
    async onButton(data, id) {
        if (id === CIDS.ASSEMBLY) {
            return [AssemblyST, null];
        } else if (id === CIDS.AC_DATA) {
            data.noEmbed = true;
            return [LoadListST, null];
        }
    },
};

/** @type {[SaveData]} */
const EMPTY_FOLDER = [{ data_name: 'NONE', ac_name: '👻', id: -1 }];
const NEW_SAVE = {
    label: '+',
    description: 'NEW SAVE',
    value: 'new',
};

/** @type {GarageState} */
const LoadListST = {
    async render(data) {
        const id = await uid2id(data.owner);
        const saveList = await SaveDB.list(id);
        /** @type {SaveData[][]} */
        const folders = Array.from({ length: MAX_SAVE_FOLDER }, _ => []);
        for (const save of saveList) {
            // Invalid folder
            if (save.folder < 0 || save.folder >= folders.length) {
                console.log('invalid save folder', save, 'uid', data.owner);
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

        /** @param {SaveData[]} folder */
        const options = folder =>
            (folder.length ? folder : EMPTY_FOLDER).map(save =>
                O({
                    label: save.data_name,
                    description: `AC NAME: ${save.ac_name}`,
                    value: save.id.toString(),
                }),
            );

        /** @param {SaveData[]} folder */
        const mapper = (folder, i = 0) =>
            R(
                S(`folder_${i}`, options(folder))
                    .setPlaceholder(`Folder${i + 1}   [${folder.length}/${MAX_OPT}]`)
                    .setDisabled(!folder.length),
            );

        return folders.map(mapper).concat([R(RETURN_BTN)]);
    },
    async onButton(_, id) {
        if (id === CIDS.RETURN) return [MainST, null];
    },
    async onSelect(data, _, values) {
        const sid = ~~values[0];
        const save = await SaveDB.get(sid);
        if (!save) return [MainST, `unknown save_id[${sid}]`];
        const user = await uid2id(data.owner);
        if (save.owner !== user) {
            // consider import?
            const err = `save owner mismatch[${save.owner} != ${user}(uid: ${data.owner})]`;
            return [MainST, err];
        }

        const temp = {};
        for (const key of SaveDB.readFields.concat(['ac_name'])) {
            temp[key] = save[key];
        }
        const err = PARTS.validateData(temp);
        if (err) {
            await SaveDB.delete(sid);
            return [null, `save corrupted: ${err}`];
        }
        data.overwrite = -sid;
        data.staging = temp;
        return [PreviewLoadST, `previewing data [${save.data_name}] ${save.ac_name}`];
    },
};

/** @type {GarageState} */
const PreviewLoadST = {
    render: [R(B(CIDS.LOAD_SAVE, 'Load AC DATA'), RETURN_BTN)],
    async onButton(data, id) {
        if (id === CIDS.LOAD_SAVE) {
            return [
                OverwriteST,
                `:warning: **Overwrite current garage with ${data.staging.ac_name}?** :warning:`,
            ];
        } else if (id === CIDS.RETURN) {
            delete data.overwrite;
            delete data.staging;
            return [LoadListST, null];
        }
    },
};

/** @type {GarageState} */
const AssemblyST = {
    render(_) {
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

        const row3 = [B(CIDS.SAVE, 'Save', { style: BS.Success }), RETURN_BTN];

        // hmmm TODO: put funny stuff in modules
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
    onButton(data, id) {
        const idx = [CIDS.R_ARM, CIDS.L_ARM, CIDS.R_BACK, CIDS.L_BACK].indexOf(id);
        if (idx >= 0) {
            data.staging = { [id]: data[id] };
            return [UnitEditST, `editing [${id}] unit`];
        } else if (id === CIDS.FRAME) {
            data.staging = Object.fromEntries(PARTS.FRAME.map(k => [k, data[k]]));
            return [FrameEditST, 'editing frame parts'];
        } else if (id === CIDS.INNER) {
            data.staging = Object.fromEntries(PARTS.INNER.map(k => [k, data[k]]));
            return [InnerEditST, 'editing inner parts'];
        } else if (id === CIDS.SAVE) {
            return [SaveListST, 'choosing save file'];
        } else if (id === CIDS.RETURN) {
            return [MainST, ''];
        } else if (id === CIDS.HMMM) {
            data.l_arm = PUNCH.id;
            data.r_arm = PUNCH.id;
            data.l_back = PUNCH.id;
            data.r_back = PUNCH.id;
            return [AssemblyST, 'all units removed\ntime for re-education'];
        }
    },
};

/** @type {GarageState} */
const SaveListST = {
    async render(data) {
        const id = await uid2id(data.owner);
        const saveList = await SaveDB.list(id);
        /** @type {SaveData[][]} */
        const folders = Array.from({ length: MAX_SAVE_FOLDER }, _ => []);
        for (const save of saveList) {
            // Invalid folder
            if (save.folder < 0 || save.folder >= folders.length) {
                console.log('invalid save folder', save, 'uid', data.owner);
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

        /** @param {SaveData[]} folder */
        const options = (folder, i = 0) =>
            folder
                .map(save =>
                    O({
                        label: save.data_name,
                        description: `AC NAME: ${save.ac_name}`,
                        value: save.id.toString(),
                    }),
                )
                // has spot in the folder to make a new save
                .concat(folder.length >= MAX_OPT ? [] : [O(NEW_SAVE)]);

        /** @param {SaveData[]} folder */
        const mapper = (folder, i = 0) =>
            R(
                S(`folder_${i}`, options(folder, i)).setPlaceholder(
                    `Folder${i + 1}   [${folder.length}/${MAX_OPT}]`,
                ),
            );

        return folders.map(mapper).concat([R(RETURN_BTN)]);
    },
    async onButton(_, id) {
        if (id === CIDS.RETURN) return [AssemblyST, null];
    },
    async onSelect(data, id, values) {
        const match = /^folder_(\d+)$/.exec(id);
        if (!match) return;
        const folder = ~~match[1];
        if (folder >= MAX_SAVE_FOLDER)
            return [
                AssemblyST,
                `requested folder[${folder + 1}] > allowed folder[${MAX_SAVE_FOLDER}]`,
            ];

        const value = values[0];

        if (value === 'new') {
            const modal = M(`save_folder_${folder}`, 'Saving AC DATA', [
                T(CIDS.DATA_NAME, 'Data name'),
                T(CIDS.AC_NAME, 'AC name', { value: data.ac_name }),
            ]);
            return [SaveListST, null, { modal }];
        }

        const sid = ~~value;

        const save = await SaveDB.get(sid);
        if (!save) return [AssemblyST, `unknown save_id[${sid}]`];
        const user = await uid2id(data.owner);
        if (save.owner !== user) {
            const err = `save owner mismatch[${save.owner} != ${user}(uid: ${data.owner})]`;
            return [AssemblyST, err];
        }

        data.overwrite = sid;
        return [
            OverwriteST,
            `:warning: **Overwrite [${save.data_name}] ${save.ac_name}?** :warning:`,
        ];
    },
    async onModal(data, id, fields) {
        const match = /^save_folder_(\d+)$/.exec(id);
        if (!match) return;
        const user = await uid2id(data.owner);
        const folder = ~~match[1];
        if (folder >= MAX_SAVE_FOLDER)
            return [
                AssemblyST,
                `requested folder[${folder + 1}] > allowed folder[${MAX_SAVE_FOLDER}]`,
            ];

        const err = PARTS.validateData(data);
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
const OverwriteST = {
    render(data) {
        data.noEmbed = true;
        return [R(B(CIDS.OVERWRITE, 'YES', { style: BS.Danger }), B(CIDS.RETURN, 'NO'))];
    },
    async onButton(data, id) {
        const ow = ~~data.overwrite;
        delete data.overwrite;

        if (id === CIDS.RETURN) {
            return [ow < 0 ? LoadListST : AssemblyST, null];
        }
        if (id === CIDS.OVERWRITE && ow) {
            const m = lines();
            if (ow > 0) {
                const err = PARTS.validateData(data);
                if (err) return [null, `failed to save: ${err}`];
                const res = await SaveDB.update(ow, data);
                m(res.changes ? 'overwrite success' : 'overwrite failure');
            } else {
                const sid = -ow;
                const save = await SaveDB.get(sid);
                const temp = {};
                for (const key of SaveDB.readFields.concat(['ac_name'])) {
                    temp[key] = save[key];
                }
                const err = PARTS.validateData(temp);
                if (err) {
                    await SaveDB.delete(sid);
                    return [null, `save corrupted: ${err}`];
                }
                Object.assign(data, temp);
                m(`loaded data [${save.data_name}]`);
            }
            return [AssemblyST, m.str];
        }
    },
};

/** @type {GarageState} */
const UnitEditST = {
    render(data) {
        const { staging } = data;
        const field = Object.keys(staging)[0];
        const equipable = staging[field] !== data[field];

        const buttons = [
            B(CIDS.EQUIP_RETURN, 'Equip & Return', {
                style: BS.Success,
                disabled: !equipable,
            }),
            B(CIDS.EQUIP, 'Equip', {
                disabled: !equipable,
            }),
            RETURN_BTN,
        ];

        const isBack = field.endsWith('back');
        const arm = field.replace('back', 'arm');
        const wb = isBack && (staging[field] ?? data[field]) < 0;
        // Weapon bay toggle button
        if (isBack)
            buttons.splice(2, 0, B(CIDS.WB, `${wb ? 'Disable' : 'Enable'} Weapon Bay`));

        const rows = [];
        const list = [...(STATS[wb ? arm : field]?.values() || [PUNCH])];

        for (let i = 0, p = 1; i < list.length; i += MAX_OPT, p++) {
            const options = list.slice(i, i + 25).map(part =>
                O({
                    // TODO: replace [name] with emote
                    label: `[${field.toUpperCase()}] ${part.name}`,
                    description: part.type || '👊',
                    default: part.id === Math.abs(staging[field]),
                    value: (wb ? -part.id : part.id).toString(),
                }),
            );

            const select = S(`select_${p}_${field}`, options);
            select.setPlaceholder(`PAGE ${p}`);
            rows.push(R(select));
        }

        return [...rows, R(buttons)];
    },
    async onButton(data, id) {
        const { staging } = data;
        const field = Object.keys(staging)[0];
        const isBack = field.endsWith('back');

        // Toggle weapon bay
        if (id === CIDS.WB) {
            if (!isBack) [null, 'weapon bay button pressed on arm units'];

            const b = staging[field] < 0;
            if (b) staging[field] = PUNCH.id;
            else staging[field] = -PUNCH.id;

            return [UnitEditST, `weapon bay ${b ? 'disabled' : 'enabled'}`];
        }

        const idx = [CIDS.EQUIP, CIDS.RETURN, CIDS.EQUIP_RETURN].indexOf(id);
        //                01          10             11
        if (idx < 0) return;
        const flags = idx + 1,
            EQ = 1,
            RET = 2;

        const m = lines();
        if (flags & EQ) {
            const d = field[0];
            /** @type {"l_arm" | "r_arm"} */
            const arm = `${d}_arm`;
            /** @type {"l_back" | "r_back"} */
            const back = `${d}_back`;

            if (field === back) {
                // equipping back weapon bay, check & removed arm if conflict
                if ((data[arm] !== PUNCH.id && data[arm]) === -staging[back]) {
                    data[arm] = PUNCH.id;
                    const n = STATS[arm].get(-staging[back]).name;
                    m(`removed ${arm} [${n}] due to weapon bay conflict`);
                }
            } else {
                // equipping arm, check back weapon bay & removed back if conflict
                if (data[back] !== -PUNCH.id && data[back] === -staging[arm]) {
                    data[back] = -PUNCH.id;
                    const n = STATS[arm].get(staging[arm]).name;
                    m(`removed ${back} [${n}] due to weapon bay conflict`);
                }
            }

            const part1 = PARTS.get(field, data[field]);
            const part2 = PARTS.get(field, staging[field]);
            data[field] = staging[field];
            // weapon bay staging changes
            for (const key in staging) if (key !== field) delete staging[key];

            if (part2 === PUNCH) m(`removed ${field} [${part1.name}]`);
            else m(`equipped ${field} [${part2.name}]`);
        }

        if (flags & RET) {
            delete data.staging;
            return [AssemblyST, m.str];
        }

        return [UnitEditST, m.str];
    },
    async onSelect(data, id, values) {
        const { staging } = data;
        const field = /[rl]_(arm|back)$/.exec(id)[0];
        for (const key in staging) if (key !== field) delete staging[key];

        const value = Number(values[0]);

        staging[field] = value;
        const same = value === data[field];

        const d = field[0];
        const arm = `${d}_arm`;
        const back = `${d}_back`;

        if (field === back) {
            const check = staging[arm] ?? data[arm];
            // equipping back weapon bay, check & removed arm if conflict
            if (check !== PUNCH.id && check === -staging[back]) staging[arm] = PUNCH.id;
        } else {
            const check = staging[back] ?? data[back];
            // equipping arm, check back weapon bay & removed back if conflict
            if (check !== -PUNCH.id && check === -staging[arm]) staging[back] = -PUNCH.id;
        }

        return [
            UnitEditST,
            same ? '' : `previewing ${field} [${PARTS.get(field, value).name}]`,
        ];
    },
};

/** @type {GarageState} */
const FrameEditST = {
    render(data) {
        const { staging } = data;
        const equipable = Object.entries(staging).some(
            ([field, value]) => data[field] != value,
        );

        const buttons = [
            B(CIDS.EQUIP_RETURN, 'Equip & Return', {
                style: BS.Success,
                disabled: !equipable,
            }),
            B(CIDS.EQUIP, 'Equip', {
                disabled: !equipable,
            }),
            RETURN_BTN,
        ];

        const rows = [];
        for (const field of PARTS.FRAME) {
            const options = [...STATS[field].values()].map(part => {
                const option = O({
                    // TODO: replace [name] with emote
                    label: `[${field.toUpperCase()}] ${part.name}`,
                    value: part.id.toString(),
                    default: staging[field] === part.id,
                });
                // anything else to add description?
                if (field === 'legs') option.setDescription(LEG_TYPES[part.type]);
                return option;
            });
            rows.push(R(S(field, options)));
        }

        return [...rows, R(buttons)];
    },
    async onButton(data, id) {
        const { staging } = data;

        const idx = [CIDS.EQUIP, CIDS.RETURN, CIDS.EQUIP_RETURN].indexOf(id);
        //                01          10             11
        if (idx < 0) return;
        const flags = idx + 1,
            EQ = 1,
            RET = 2;

        const m = lines();
        if (flags & EQ) {
            for (const field in staging) {
                if (data[field] === staging[field]) continue;
                const id = (data[field] = staging[field]);
                const part = PARTS.get(field, id);

                if (field === 'legs') {
                    if (LEG_TYPES[part.type] === 'TANK') {
                        data.booster = 0;
                        m('removed booster, tank-type leg units use internal boosters');
                    } else if (!data.booster) {
                        data.booster = DEFAULT_BOOSTER_ID;
                        const b = STATS.booster.get(DEFAULT_BOOSTER_ID);
                        m(`equipped booster [${b.name}]`);
                    }
                }

                m(`equipped ${field} [${part.name}]`);
            }
        }

        if (flags & RET) {
            delete data.staging;
            return [AssemblyST, m.str];
        }

        return [FrameEditST, m.str];
    },
    async onSelect(data, field, values) {
        const value = Number(values[0]);
        data.staging[field] = value;
        const same = data[field] === value;
        return [
            FrameEditST,
            same ? '' : `previewing ${field} [${PARTS.get(field, value).name}]`,
        ];
    },
};

/** @type {GarageState} */
const InnerEditST = {
    render(data) {
        const { staging } = data;
        const equipable = Object.entries(staging).some(
            ([field, value]) => data[field] != value,
        );

        const buttons = [
            B(CIDS.EQUIP_RETURN, 'Equip & Return', {
                style: BS.Success,
                disabled: !equipable,
            }),
            B(CIDS.EQUIP, 'Equip', {
                disabled: !equipable,
            }),
            RETURN_BTN,
        ];

        const rows = [];
        for (const field of PARTS.INNER) {
            const options = [...STATS[field].values()].map(part => {
                return O({
                    label: `[${field.toUpperCase()}] ${part.name}`,
                    value: part.id.toString(),
                    default: staging[field] === part.id,
                });
            });
            const select = S(field, options);
            // Disable booster selection for tank legs
            if (field === 'booster' && PARTS.isTonka(data.legs)) {
                select.setPlaceholder(INTERNAL);
                select.setDisabled(true);
            }
            rows.push(R(select));
        }

        return [...rows, R(buttons)];
    },
    async onButton(data, id) {
        const idx = [CIDS.EQUIP, CIDS.RETURN, CIDS.EQUIP_RETURN].indexOf(id);
        //                01          10             11
        if (idx < 0) return;
        const flags = idx + 1,
            EQ = 1,
            RET = 2;

        const m = lines();
        if (flags & EQ) {
            for (const field in staging) {
                if (data[field] === staging[field]) continue;

                if (field === 'booster' && PARTS.isTonka(data.legs)) {
                    m('unable to edit booster');
                    continue;
                }

                const id = (data[field] = staging[field]);
                m(`equipped ${field} [${PARTS.get(field, id).name}]`);
            }
        }

        if (flags & RET) {
            delete data.staging;
            return [AssemblyST, m.str];
        }

        return [InnerEditST, m.str];
    },
    async onSelect(data, field, values) {
        const value = Number(values[0]);
        data.staging[field] = value;
        const same = data[field] === value;
        return [
            InnerEditST,
            same ? '' : `previewing ${field} [${PARTS.get(field, value).name}]`,
        ];
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
        const id = await uid2id(uid);

        /** @param {string} m */
        const chat = async (m, waitAfter = 0) => {
            const t = await timedAwait(curr.editReply({ content: `**${m}**` }));
            await delay(waitAfter * 1000 - t);
        };

        await delay(2 * 1000);
        await chat(`Registration number Rb${id}.`, 3);
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
            data = { owner: curr.user.id };
            Object.assign(data, DEFAULT_AC_DATA);
        }

        /** @type {import('discord.js').MessageEditOptions} */
        const res = { embeds: [], files: [] };

        if (state.render instanceof Function) {
            if (data) {
                res.components = (await state.render(data)) || [];
            } else {
                msg = this.err;
                res.allowedMentions = { parse: ['users'] };
                console.error('Missing data on render call');
            }
        } else res.components = state.render || [];

        if (data && state !== MainST) {
            const err = PARTS.validateData(data);
            // data validation error, force reset to AssemblyST
            if (err) {
                delete data.staging;
                // TODO: generate log
                // maybe try to recover data instead of loader4?
                Object.assign(data, DEFAULT_AC_DATA);
                state = AssemblyST;
                msg = `data corrupted: ${err}\nloaded default ac`;
            }

            if (!data.noEmbed) res.embeds.push(embedACData(data));
            delete data.noEmbed;
        }

        if (msg) {
            if (res.embeds.length) {
                res.content = '';
                res.embeds[0].setFooter({ text: msg });
            } else res.content = msg;
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

SM.states = {
    MainST,
    AssemblyST,
    UnitEditST,
    FrameEditST,
    InnerEditST,
    SaveListST,
    LoadListST,
    OverwriteST,
    PreviewLoadST,
};
SM.delay = delay;
SM.err = '';

module.exports = SM;
