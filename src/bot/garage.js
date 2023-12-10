const {
    Interaction,
    CacheType,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require('discord.js');
const InteractionDB = require('../database/interaction');

const EmoteMap = require('./emote');

const MAX_PER_PAGE = 25;
const NOTHING = '(NOTHING)';
const Buttons = {
    LOADER4: 'loader4',
    PRESET: 'preset',
    UNITS: 'units',
    FRAME: 'frame',
    INNER: 'inner',
    SAVE: 'save',
    R_ARM: 'r_arm',
    L_ARM: 'l_arm',
    R_BACK: 'r_back',
    L_BACK: 'l_back',
    BACK: 'back',
    EQUIP: 'equip',
    SWAP: 'swap',
};
const LEG_TYPE = [null, 'BIPEDAL', 'REVERSE JOINT', 'TETRAPOD', 'TANK'];
/** @type {AC6Part} */
const PUNCH = { id: 0, name: NOTHING, weight: 0, en: 0 };
const PARTS_FILES =
    'arm_units back_units head core arms legs booster FCS generator expansion'.split(' ');

/** @type {Object<string, Map<number, AC6PartBase>>} */
const STATS = {};
for (const name of PARTS_FILES) STATS[name] = require(`../../data/parts/${name}.json`);

const DEFAULT_AC_DATA = require('../../data/preset/default.json');
const DEFAULT_BOOST_ID = 3;
const {
    getBoostSpeedMulti,
    overburdenPenalty,
    getTankBoostSpeedMulti,
    getQBSpeedMulti,
    getAttitudeRecovery,
    getQBReloadMulti,
} = require('./util/speed');

for (const key in STATS) {
    const arr = STATS[key];
    const map = new Map();

    if (key === 'expansion') map.set(0, { id: 0, name: NOTHING });
    if (key.endsWith('units')) map.set(0, PUNCH);

    for (const item of arr) {
        if (typeof item.id != 'number')
            throw Error(`Invalid ID for ${key}: \n${JSON.stringify(item, null, 4)}`);
        if (map.has(item.id))
            throw Error(
                `Dup ID detected for ${key}: \n${JSON.stringify(
                    item,
                    null,
                    4,
                )} & \n${JSON.stringify(map.get(item.id), null, 4)}`,
            );
        map.set(item.id, item);
    }
    STATS[key] = map;
}

{
    STATS.r_arm = new Map();
    STATS.l_arm = new Map();
    STATS.r_back = new Map();
    STATS.l_back = new Map();
    for (const unit of STATS.arm_units.values()) {
        STATS.l_arm.set(unit.id, unit);
        if (!unit.melee) STATS.r_arm.set(unit.id, unit);
    }
    for (const unit of STATS.back_units.values()) {
        STATS.l_back.set(unit.id, unit);
        if (!unit.shield) STATS.r_back.set(unit.id, unit);
    }
    delete STATS.arm_units;
    delete STATS.back_units;
}

/**
 * @param {string} id
 * @param {string} label
 */
const B = (
    id,
    label,
    opt = {
        style: ButtonStyle.Primary,
        disabled: false,
        emoji: null,
    },
) => {
    const b = new ButtonBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setDisabled(opt.disabled || false)
        .setStyle(opt.style || ButtonStyle.Primary);
    if (opt.emoji) b.setEmoji(opt.emoji);
    return b;
};

const STEP1 = (() => {
    const b1 = B(Buttons.LOADER4, 'Load Default AC', { emoji: EmoteMap.LOADER4 });
    const b2 = B(Buttons.PRESET, 'Load From Preset', { disabled: true });
    return [new ActionRowBuilder().addComponents(b1, b2)];
})();

const STEP2 = (() => {
    const b1 = B(Buttons.UNITS, 'Edit Arm/Back Units');
    const b2 = B(Buttons.FRAME, 'Edit Frame Parts');
    const b3 = B(Buttons.INNER, 'Edit Inner Parts');
    const b4 = B(Buttons.SAVE, 'Save', { style: ButtonStyle.Success });
    return [new ActionRowBuilder().addComponents(b1, b2, b3, b4)];
})();

const STEP3 = (() => {
    const b1 = B(Buttons.R_ARM, 'R-Arm');
    const b2 = B(Buttons.L_ARM, 'L-Arm');
    const b3 = B(Buttons.R_BACK, 'R-Back');
    const b4 = B(Buttons.L_BACK, 'L-Back');
    const b5 = B(Buttons.BACK, 'Back', { style: ButtonStyle.Secondary });
    return [new ActionRowBuilder().addComponents(b1, b2, b3, b4, b5)];
})();

/**
 * @param {AC6Data} data
 * @param {string} name
 * @param {AC6Part[]} list
 * @returns
 */
const STEP4 = (data, name, list, equipable = true) => {
    const pages = 1 + ~~((list.length - 1) / MAX_PER_PAGE);
    console.log(`pages = ${pages}`);

    const buttons = [
        B(Buttons.EQUIP, 'Equip', {
            style: ButtonStyle.Success,
            disabled: !equipable,
        }),
        B(Buttons.BACK, 'Back', { style: ButtonStyle.Secondary }),
    ];

    // TODO: fix
    const select = new StringSelectMenuBuilder()
        .setCustomId(name)
        .setPlaceholder('Page 1')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            list.slice(0, 25).map(p =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(`[${name.toUpperCase()}] ${p.name}`) // TODO: replace [name] with emote
                    .setDefault((data.preview >= 0 ? data.preview : data[name]) === p.id)
                    .setValue(p.id.toString()),
            ),
        );

    return [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(buttons),
    ];
};

/** @param {AC6Data} data */
const STEP5 = (data, equipable = false) => {
    const b1 = B(Buttons.EQUIP, 'Equip', {
        style: ButtonStyle.Success,
        disabled: !equipable,
    });
    const b2 = B(Buttons.BACK, 'Back', { style: ButtonStyle.Secondary });

    const select = [];

    for (const name of ['head', 'core', 'arms', 'legs']) {
        select.push(
            new StringSelectMenuBuilder()
                .setCustomId(name)
                .setPlaceholder(
                    `Preview ${name.slice(0, 1).toUpperCase()}${name.slice(1)}`,
                )
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(
                    [...STATS[name].values()].map(p => {
                        const option = new StringSelectMenuOptionBuilder()
                            .setLabel(`[${name.toUpperCase()}] ${p.name}`) // TODO: replace [name] with emote
                            .setDefault(
                                (data.editing === name ? data.preview : data[name]) ===
                                    p.id,
                            )
                            .setValue(p.id.toString());
                        if (name === 'legs') option.setDescription(LEG_TYPE[p.type]);
                        return option;
                    }),
                ),
        );
    }

    return [
        ...select.map(s => new ActionRowBuilder().addComponents(s)),
        new ActionRowBuilder().addComponents(b1, b2),
    ];
};

/** @param {AC6Data} data */
const STEP6 = (data, equipable = false) => {
    const b1 = B(Buttons.EQUIP, 'Equip', {
        style: ButtonStyle.Success,
        disabled: !equipable,
    });
    const b2 = B(Buttons.BACK, 'Back', { style: ButtonStyle.Secondary });

    const select = [];

    for (const name of ['booster', 'FCS', 'generator', 'expansion']) {
        select.push(
            new StringSelectMenuBuilder()
                .setCustomId(name)
                .setPlaceholder(
                    `Preview ${name.slice(0, 1).toUpperCase()}${name.slice(1)}`,
                )
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(
                    [...STATS[name].values()].map(p =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`[${name.toUpperCase()}] ${p.name}`)
                            .setDefault(
                                (data.editing === name ? data.preview : data[name]) ===
                                    p.id,
                            )
                            .setValue(p.id.toString()),
                    ),
                ),
        );
    }

    return [
        ...select.map(s => new ActionRowBuilder().addComponents(s)),
        new ActionRowBuilder().addComponents(b1, b2),
    ];
};

module.exports = class Garage {
    /** @param {import("../app")} app */
    constructor(app) {
        this.app = app;
    }

    /**
     * @param {Interaction<CacheType>} original
     * @param {Interaction<CacheType>} current
     */
    async handle(original, current) {
        if (!original) {
            console.log(`Adding interaction#${current.id} to DB`);
            await InteractionDB.add(current.id);

            await current.reply({
                components: STEP1,
            });
        } else {
            const rec = await InteractionDB.get(original.id);
            const func = this[`state_${rec.step}`];
            if (func instanceof Function) await func.bind(this)(current, rec);
        }
    }

    /**
     * Main Menu
     * @param {Interaction<CacheType>} current
     * @param {InteractionRecord} rec
     */
    async state_1(current, rec) {
        if (current.isButton()) {
            if (current.customId === Buttons.LOADER4) {
                await current.deferUpdate();
                await this.loadDefaultAC(rec.data);
                await InteractionDB.update(rec.id, 2, rec.data);
                await current.message.edit({
                    content: 'Default AC loaded...',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP2,
                });
                // TODO: handle other buttons
            } else {
                console.log(`Unknown button customId: ${current.customId}`);
                // TODO: log
            }
        } else {
            console.log('Unexpected Interaction at step1: ', current);
        }
    }

    /**
     * Select category to edit
     * @param {Interaction<CacheType>} current
     * @param {InteractionRecord} rec
     */
    async state_2(current, rec) {
        if (current.isButton()) {
            if (current.customId === Buttons.UNITS) {
                await current.deferUpdate();
                await InteractionDB.update(rec.id, 3, rec.data);
                await current.message.edit({
                    content: '',
                    components: STEP3,
                });
            } else if (current.customId === Buttons.FRAME) {
                await current.deferUpdate();
                await current.message.edit({
                    content: 'Previewing Frame Parts...',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP5(rec.data),
                });
                await InteractionDB.update(rec.id, 5, rec.data);
            } else if (current.customId === Buttons.INNER) {
                await current.deferUpdate();
                await InteractionDB.update(rec.id, 6, rec.data);
                await current.message.edit({
                    content: 'Previewing Inner Parts...',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP6(rec.data),
                });
            } else if (current.customId === Buttons.SAVE) {
                // TODO: save
            } else {
                console.log(`Unknown button customId: ${current.customId}`);
                // TODO: log
            }
        } else {
            console.log('Unexpected Interaction at step2: ', current);
        }
    }

    /**
     * Select L/R/ARM/BACK to edit
     * @param {Interaction<CacheType>} current
     * @param {InteractionRecord} rec
     */
    async state_3(current, rec) {
        if (current.isButton()) {
            const idx = [
                Buttons.R_ARM,
                Buttons.L_ARM,
                Buttons.R_BACK,
                Buttons.L_BACK,
            ].indexOf(current.customId);

            if (current.customId === Buttons.BACK) {
                await current.deferUpdate();
                await InteractionDB.update(rec.id, 2, rec.data);
                await current.message.edit({
                    content: '',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP2,
                });
            } else if (idx >= 0) {
                await current.deferUpdate();

                const name = (rec.data.editing = current.customId);
                rec.data.preview = -1;

                const list = [...(STATS[name]?.values() || [PUNCH])];

                await InteractionDB.update(rec.id, 4, rec.data);
                await current.message.edit({
                    content: '',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP4(rec.data, current.customId, list, false),
                });
            } else {
                console.log(`Unknown button customId: ${current.customId}`);
                // TODO: log
            }
        } else {
            console.log('Unexpected Interaction at step3: ', current);
        }
    }

    /**
     * Edit unit
     * @param {Interaction<CacheType>} current
     * @param {InteractionRecord} rec
     */
    async state_4(current, rec) {
        if (current.isButton()) {
            if (current.customId === Buttons.BACK) {
                await current.deferUpdate();

                delete rec.data.editing;
                rec.data.preview = -1;

                await InteractionDB.update(rec.id, 3, rec.data);
                await current.message.edit({
                    content: '',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP3,
                });
            } else if (current.customId === Buttons.EQUIP) {
                await current.deferUpdate();

                // TODO: check SWAP
                const idx = [
                    Buttons.R_ARM,
                    Buttons.L_ARM,
                    Buttons.R_BACK,
                    Buttons.L_BACK,
                ].indexOf(rec.data.editing);
                if (idx < 0) console.warn(rec.data.editing + ' what ???');

                const list = [...(STATS[rec.data.editing]?.values() || [PUNCH])];

                if (rec.data.preview > 0) {
                    // TODO: check swap
                    rec.data[rec.data.editing] = rec.data.preview;
                }
                rec.data.preview = -1;

                await InteractionDB.update(rec.id, 4, rec.data);
                await current.message.edit({
                    content: '',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP4(rec.data, rec.data.editing, list, false),
                });
            } else {
                console.log(`Unknown button customId: ${current.customId}`);
                // TODO: log
            }
        } else if (current.isStringSelectMenu()) {
            const value = ~~current.values[0];
            await current.deferUpdate();

            const part = rec.data.editing;
            rec.data.preview = value;
            const same = value === rec.data[part];

            let content = '';
            if (!same) {
                const p = STATS[part].get(value);
                if (p?.name !== NOTHING) content = `Previewing \`${p.name}\``;
            }

            const list = [...(STATS[part]?.values() || [PUNCH])];

            await InteractionDB.update(rec.id, 4, rec.data);
            await current.message.edit({
                content,
                embeds: [buildACEmbed(rec.data)],
                components: STEP4(rec.data, rec.data.editing, list, !same),
            });
        } else {
            console.log('Unexpected Interaction at step4: ', current);
        }
    }

    /**
     * Edit Frame Parts
     * @param {Interaction<CacheType>} current
     * @param {InteractionRecord} rec
     */
    async state_5(current, rec) {
        if (current.isButton()) {
            if (current.customId === Buttons.BACK) {
                await current.deferUpdate();

                delete rec.data.editing;
                rec.data.preview = -1;

                await InteractionDB.update(rec.id, 2, rec.data);
                await current.message.edit({
                    content: '',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP2,
                });
            } else if (current.customId === Buttons.EQUIP) {
                await current.deferUpdate();

                let content = '';
                if (rec.data.preview >= 0) {
                    rec.data[rec.data.editing] = rec.data.preview;
                    const part = STATS[rec.data.editing].get(rec.data.preview);
                    if (part?.name !== NOTHING) content = `Equipped \`${part.name}\``;
                    if (rec.data.editing === 'legs') {
                        if (part.type === 4) {
                            rec.data.booster = 0;
                            if (content) content += '\n';
                            content +=
                                'Booster removed, tank-type leg units use internal boosters';
                        } else {
                            if (!rec.data.booster) {
                                rec.data.booster = DEFAULT_BOOST_ID;
                                if (content) content += '\n';
                                content += 'Equipped default booster';
                            }
                        }
                    }
                }

                delete rec.data.editing;
                rec.data.preview = -1;

                await InteractionDB.update(rec.id, 5, rec.data);
                await current.message.edit({
                    content,
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP5(rec.data),
                });
            } else {
                console.log(`Unknown button customId: ${current.customId}`);
                // TODO: log
            }
        } else if (current.isStringSelectMenu()) {
            const value = ~~current.values[0];
            await current.deferUpdate();

            const part = current.customId;
            rec.data.preview = value;
            const same = value === rec.data[part];

            let content = '';
            if (!same) {
                rec.data.editing = part;
                const p = STATS[part].get(value);
                if (p?.name !== NOTHING) content = `Previewing \`${p.name}\``;
            } else delete rec.data.editing;

            await InteractionDB.update(rec.id, 5, rec.data);
            await current.message.edit({
                content,
                embeds: [buildACEmbed(rec.data)],
                components: STEP5(rec.data, !same),
            });
        } else {
            console.log('Unexpected Interaction at step5: ', current);
        }
    }

    /**
     * Edit Inner Parts
     * @param {Interaction<CacheType>} current
     * @param {InteractionRecord} rec
     */
    async state_6(current, rec) {
        if (current.isButton()) {
            if (current.customId === Buttons.BACK) {
                await current.deferUpdate();

                delete rec.data.editing;
                rec.data.preview = -1;

                await current.message.edit({
                    content: '',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP2,
                });
                await InteractionDB.update(rec.id, 2, rec.data);
            } else if (current.customId === Buttons.EQUIP) {
                await current.deferUpdate();

                let content = '';
                if (rec.data.preview >= 0) {
                    rec.data[rec.data.editing] = rec.data.preview;
                    const part = STATS[rec.data.editing].get(rec.data.preview);
                    if (part) content = `Equipped \`${part.name}\``;
                }

                delete rec.data.editing;
                rec.data.preview = -1;

                await InteractionDB.update(rec.id, 6, rec.data);
                await current.message.edit({
                    content,
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP6(rec.data),
                });
            } else {
                console.log(`Unknown button customId: ${current.customId}`);
                // TODO: log
            }
        } else if (current.isStringSelectMenu()) {
            const value = ~~current.values[0];
            await current.deferUpdate();

            const part = current.customId;
            rec.data.preview = value;
            const same = value === rec.data[part];

            let content = '';
            if (!same) {
                rec.data.editing = part;
                const p = STATS[part].get(value);
                if (p?.name !== NOTHING) content = `Previewing \`${p.name}\``;
            } else delete rec.data.editing;

            await InteractionDB.update(rec.id, 6, rec.data);
            await current.message.edit({
                content,
                embeds: [buildACEmbed(rec.data)],
                components: STEP6(rec.data, !same),
            });
        } else {
            console.log('Unexpected Interaction at step6: ', current);
        }
    }

    /** @param {AC6Data} data */
    async loadDefaultAC(data) {
        // TODO: actual 621 build here
        Object.assign(data, DEFAULT_AC_DATA);
        await this.validateAC(data);
    }

    /** @param {AC6Data} data */
    async validateAC(data) {
        // TODO
        return true;
    }
};

const LessIsBetter = new Set([
    'legLoad',
    'armLoad',
    'enLoad',
    'totalWeight',
    'qbEN',
    'qbReload',
    'enDelay',
]);

/** @param {AC6Data} data */
const buildACEmbed = data => {
    const ERR = 'ERROR';

    /** @type {Object<string, AC6Part>} */
    const parts = {};
    const partsList = [parts];

    for (const name of 'r_arm l_arm r_back l_back head core arms legs booster FCS generator expansion'.split(
        ' ',
    )) {
        parts[name] = STATS[name].get(data[name]);
    }

    let table = '';

    try {
        const getStats = (param = parts) => {
            const list = Object.values(param);
            const stats = {
                AP: 0,
                def0: 0,
                def1: 0,
                def2: 0,
                stability: 0,
                totalWeight: 0,
                enLoad: 0,
                armLoad: param.l_arm.weight + param.r_arm.weight,
                armLoadLimit: param.arms.load,
                legLoad: 0,
                legLoadLimit: param.legs.load,
                enCap: param.generator.params[0],
                enLoadLimit: Math.floor(
                    param.core.output * 0.01 * param.generator.output,
                ),
                constraint: [false, false, false],
            };

            for (const part of list) {
                if (!part) continue;
                if (part.ap) stats.AP += part.ap;
                if (part.def) {
                    stats.def0 += part.def[0];
                    stats.def1 += part.def[1];
                    stats.def2 += part.def[2];
                }
                if (part.stability) stats.stability += part.stability;
                if (part.weight) stats.totalWeight += part.weight;
                if (part.en) stats.enLoad += part.en;
            }

            /** @type {AC6PartLegs} */
            const legs = param.legs;
            stats.legLoad = stats.totalWeight - legs.weight;
            stats.tracking =
                stats.armLoad <= stats.armLoadLimit ? param.arms.tracking : 'TBD';

            const w = stats.totalWeight;
            stats.recovery = Math.floor(getAttitudeRecovery(w) * 100);
            stats.enRecharge =
                stats.enLoad > stats.enLoadLimit
                    ? 100
                    : Math.floor(1500 + (stats.enLoadLimit - stats.enLoad) * (25 / 6));

            const ob = overburdenPenalty(stats.legLoad / stats.legLoadLimit);
            const qbMulti = getQBSpeedMulti(w);

            // Tank legs
            if (legs.type === 4) {
                stats.boostSpeed = Math.floor(
                    legs.params[2] * 0.06 * getTankBoostSpeedMulti(w) * ob,
                );
                stats.qbSpeed = Math.floor(legs.params[5] * 0.02 * qbMulti * ob);

                stats.qbEN = Math.floor(
                    (200 - param.core.booster) * 0.01 * legs.params[7],
                );
                stats.qbReload = getQBReloadMulti(w - legs.params[9]) * legs.params[8];
            } else {
                /** @type {AC6PartBooster} */
                const booster = param.booster;
                // Normal boosters
                stats.boostSpeed = Math.floor(
                    booster.params[0] * 0.06 * getBoostSpeedMulti(w) * ob,
                );
                stats.qbSpeed = Math.floor(booster.params[3] * 0.02 * qbMulti * ob);
                stats.qbEN = Math.floor(
                    (200 - param.core.booster) * 0.01 * booster.params[5],
                );
                stats.qbReload =
                    getQBReloadMulti(w - booster.params[7]) * booster.params[6];
            }

            stats.qbReload = (Math.round(stats.qbReload * 100) * 0.01).toFixed(2);
            stats.enDelay = (
                ~~(
                    ((1000 - 10 * (param.core.supply - 100)) /
                        param.generator.params[1]) *
                    100
                ) * 0.01
            ).toFixed(2);

            stats.constraint[0] = stats.armLoad > stats.armLoadLimit;
            stats.constraint[1] = stats.legLoad > stats.legLoadLimit;
            stats.constraint[2] = stats.enLoad > stats.enLoadLimit;

            return stats;
        };

        const statsList = [getStats()];
        if (data.editing && data.preview !== data[data.editing] && data.preview >= 0) {
            const newParts = Object.assign({}, parts);
            newParts[data.editing] = STATS[data.editing].get(data.preview);

            // Preview changing to tank leg
            if (newParts.legs.type === 4) {
                newParts.booster = null;
                // Preview changing from tank leg
            } else if (!newParts.booster) {
                newParts.booster = STATS.booster.get(DEFAULT_BOOST_ID);
            }
            partsList.push(newParts);
            statsList.push(getStats(newParts));
        }

        const p = (s = '') => String(s).padStart(6, ' ');
        const cmp = (key, alert = false) => {
            if (key === null) {
                return `${p()} ## ${p('TBD')}`;
            } else if (statsList.length > 1) {
                const [v1, v2] = statsList.map(s => s[key]);
                if (v1 === v2)
                    return alert ? `${p()} >> ${p('!' + v2)}` : `${p()} ## ${p(v2)}`;
                if ((v1 < v2) ^ LessIsBetter.has(key) && !alert)
                    return `${p(v1)} >> ${p(v2)}`;
                return `${p(v1)} >> ${p('!' + v2)}`;
            } else {
                const s = statsList[0];
                return alert ? `${p()}    ${p('!' + s[key])}` : `${p()} ## ${p(s[key])}`;
            }
        };

        const extra = [];
        const check = statsList.slice(-1)[0];
        for (let i = 0; i < 3; i++)
            check.constraint[i] &&
                extra.push(['!ARMS_OVERBURDENED', '!OVERBURDENED', '!EN_SHORTFALL'][i]);

        table =
            '```yaml' +
            `
AP          ${cmp('AP')}
KINETIC DEF ${cmp('def0')}
ENERGY DEF  ${cmp('def1')}
EXPL DEF    ${cmp('def2')}
STABILITY   ${cmp('stability')}
RECOVERY    ${cmp('recovery')}

TRACKING    ${cmp('tracking')}

BOOST SPEED ${cmp('boostSpeed')}
QB SPEED    ${cmp('qbSpeed')}
QB EN CONS  ${cmp('qbEN')}
QB RELOAD   ${cmp('qbReload')}

EN CAP      ${cmp('enCap')}
EN SUPPLY   ${cmp('enRecharge')}
EN DELAY    ${cmp('enDelay')}

TOTAL WEIGHT${cmp('totalWeight')}

ARM LOAD    ${cmp('armLoad', check.constraint[0])}
ARM LIMIT   ${cmp('armLoadLimit', check.constraint[0])}
TOTAL LOAD  ${cmp('legLoad', check.constraint[1])}
LOAD LIMIT  ${cmp('legLoadLimit', check.constraint[1])}
EN LOAD     ${cmp('enLoad', check.constraint[2])}
EN OUTPUT   ${cmp('enLoadLimit', check.constraint[2])}
${extra.join('\n')}` +
            '```';
    } catch (e) {
        console.error(e);
        table = ERR;
    }

    const E = '*(editing)*';
    /**
     * @param {string} emoji
     * @param {string} part
     */
    const Unit = (emoji, part) => {
        const ed = data.editing === part;
        const name = part.replace('_', '-');

        if (partsList.length === 1 || partsList[0][part] == partsList[1][part]) {
            return [
                `<:${part.toUpperCase()}:${emoji}> ${name} unit ${ed ? E : ''}`,
                `${ed ? '```fix\n' : '`'}${parts[part]?.name || ERR}${ed ? '```' : '`'}`,
            ].join('\n');
        } else {
            const b0 = Boolean(partsList[0][part]?.id);
            const b1 = Boolean(partsList[1][part]?.id);

            const diff = [];
            if (b1) diff.push(`+ ${partsList[1][part]?.name || ERR}`);
            if (b0) diff.push(`- ${partsList[0][part]?.name || ERR}`);
            if (!b0 && !b1) diff.push(ERR);

            return [
                `<:${part.toUpperCase()}:${emoji}> ${name} ${ed ? E : ''}`,
                `\`\`\`diff\n${diff.join('\n')}\`\`\``,
            ].join('\n');
        }
    };

    /**
     * @param {string} emoji
     * @param {string} part
     */
    const Part = (emoji, part) => {
        const ed = data.editing === part;
        let name = part.replace('_', '-');
        name = name.slice(0, 1).toUpperCase() + name.slice(1).toLowerCase();

        if (partsList.length === 1 || partsList[0][part] == partsList[1][part]) {
            return [
                `<:${part.toUpperCase()}:${emoji}> ${name}`,
                `\`${parts[part]?.name || (part === 'booster' ? '(INTERNAL)' : ERR)}\``,
            ].join('\n');
        } else {
            const b0 = Boolean(partsList[0][part]?.id);
            const b1 = Boolean(partsList[1][part]?.id);

            const diff = [];
            if (b1) diff.push(`+ ${partsList[1][part]?.name || ERR}`);
            if (b0) diff.push(`- ${partsList[0][part]?.name || ERR}`);
            if (!b0 && !b1) diff.push(ERR);

            return [
                `<:${part.toUpperCase()}:${emoji}> ${name} ${ed ? E : ''}`,
                `\`\`\`diff\n${diff.join('\n')}\`\`\``,
            ].join('\n');
        }
    };
    // TODO: fix the lines or just get rid of them since layout is different for mobile
    const embed = new EmbedBuilder().addFields(
        {
            name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯Assembly⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯',
            value: `
${Unit('1182873037478051921', 'r_arm')}
${Unit('1182872911418228796', 'l_arm')}
${Unit('1182872712348180491', 'r_back')}
${Unit('1182872561848160288', 'l_back')}

${Part('1182872401420226601', 'head')}
${Part('1182872261254975538', 'core')}
${Part('1182872049895604264', 'arms')}
${Part('1182871891908771890', 'legs')}

${Part('1182871503847555132', 'booster')}
${Part('1182871190797287565', 'FCS')}
${Part('1182870817667817496', 'generator')}
${Part('1182870338531491901', 'expansion')}
`.replaceAll('```\n', '```'), // code block adds a LR for some reason
            inline: true,
        },
        {
            name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯AC SPECS⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯',
            value: table,
            inline: true,
        },
        {
            name: '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯',
            value: '\u200B',
            inline: false,
        },
    );

    return embed;
};
