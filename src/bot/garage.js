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
};

/** @type {Object<string, Map<number, AC6PartBase>>} */
const STATS = {
    units: [{ id: 0, name: NOTHING, weight: 0, en: 0 }],
    head: require('../../data/parts/head.json'),
    core: require('../../data/parts/core.json'),
    arms: require('../../data/parts/arms.json'),
    legs: require('../../data/parts/legs.json'),
    booster: require('../../data/parts/booster.json'),
    FCS: require('../../data/parts/fcs.json'),
    generator: require('../../data/parts/generator.json'),
    expansion: require('../../data/parts/expansion.json'),
};

for (const key in STATS) {
    const arr = STATS[key];
    const map = new Map();
    if (key === 'expansion') map.set(0, { id: 0, name: NOTHING });
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
    const b5 = B(Buttons.BACK, 'Go Back', { style: ButtonStyle.Secondary });
    return [new ActionRowBuilder().addComponents(b1, b2, b3, b4, b5)];
})();

/**
 * @param {string} id
 * @param {string} desc
 * @param {AC6Part[]} list // TODO
 * @returns
 */
const STEP4 = (id, desc, list, equipable = true) => {
    const total = 1 + ~~((list.length - 1) / MAX_PER_PAGE);

    const b1 = B(Buttons.EQUIP, 'Equip', {
        style: ButtonStyle.Success,
        disabled: !equipable,
    });
    const b2 = B(Buttons.BACK, 'Go Back', { style: ButtonStyle.Secondary });

    const select = new StringSelectMenuBuilder()
        .setCustomId(id)
        .setPlaceholder(desc)
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            list.map(part =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(part.name)
                    .setValue(part.id.toString()),
            ),
        );

    return [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(b1, b2),
    ];
};

const STEP5 = (equipable = false) => {
    const b1 = B(Buttons.EQUIP, 'Equip', {
        style: ButtonStyle.Success,
        disabled: !equipable,
    });
    const b2 = B(Buttons.BACK, 'Go Back', { style: ButtonStyle.Secondary });

    const select = [];

    for (const part of ['head', 'core', 'arms', 'legs']) {
        select.push(
            new StringSelectMenuBuilder()
                .setCustomId(part)
                .setPlaceholder(
                    `Preview ${part.slice(0, 1).toUpperCase()}${part.slice(1)}`,
                )
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(
                    [...STATS[part].values()].map(part =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(part.name)
                            .setValue(part.id.toString()),
                    ),
                ),
        );
    }

    return [
        ...select.map(s => new ActionRowBuilder().addComponents(s)),
        new ActionRowBuilder().addComponents(b1, b2),
    ];
};

const STEP6 = (equipable = false) => {
    const b1 = B(Buttons.EQUIP, 'Equip', {
        style: ButtonStyle.Success,
        disabled: !equipable,
    });
    const b2 = B(Buttons.BACK, 'Go Back', { style: ButtonStyle.Secondary });

    const select = [];

    for (const part of ['booster', 'FCS', 'generator', 'expansion']) {
        select.push(
            new StringSelectMenuBuilder()
                .setCustomId(part)
                .setPlaceholder(
                    `Preview ${part.slice(0, 1).toUpperCase()}${part.slice(1)}`,
                )
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(
                    [...STATS[part].values()].map(part =>
                        new StringSelectMenuOptionBuilder()
                            .setLabel(part.name)
                            .setValue(part.id.toString()),
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
                await current.message.edit({
                    content: 'Default AC loaded...',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP2,
                });
                await InteractionDB.update(rec.id, 2, rec.data);
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
                await current.message.edit({
                    content: '',
                    components: STEP3,
                });
                await InteractionDB.update(rec.id, 3, rec.data);
            } else if (current.customId === Buttons.FRAME) {
                await current.deferUpdate();
                await current.message.edit({
                    content: 'Previewing Frame Parts...',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP5(),
                });
                await InteractionDB.update(rec.id, 5, rec.data);
            } else if (current.customId === Buttons.INNER) {
                await current.deferUpdate();
                await current.message.edit({
                    content: 'Previewing Inner Parts...',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP6(),
                });
                await InteractionDB.update(rec.id, 6, rec.data);
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
                await current.message.edit({
                    content: '',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP2,
                });
                await InteractionDB.update(rec.id, 2, rec.data);
            } else if (idx >= 0) {
                await current.deferUpdate();

                rec.data.editing = current.customId;
                rec.data.preview = -1;

                // TODO: fix
                const list = [...STATS.units.values()];

                await current.message.edit({
                    content: '',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP4(
                        current.customId,
                        `Preview ${
                            ['Right Arm', 'Left Arm', 'Right Back', 'Left Back'][idx]
                        } Unit`,
                        list,
                        false,
                    ),
                });
                await InteractionDB.update(rec.id, 4, rec.data);
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

                await current.message.edit({
                    content: '',
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP3,
                });

                await InteractionDB.update(rec.id, 3, rec.data);
            } else if (current.customId === Buttons.EQUIP) {
                // TODO: equip
            } else {
                console.log(`Unknown button customId: ${current.customId}`);
                // TODO: log
            }
        } else if (current.isStringSelectMenu()) {
            const value = ~~current.values[0];
            await current.deferUpdate();

            if (value === rec.data[current.customId]) {
                console.log(`No change in ${current.customId} unit`);
            } else {
                // TODO: update
            }
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
                    if (part?.name !== NOTHING) content = `Equipped \`${part.name}\``;
                }

                delete rec.data.editing;
                rec.data.preview = -1;

                await current.message.edit({
                    content,
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP5(),
                });
                await InteractionDB.update(rec.id, 5, rec.data);
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
                const p = STATS[part].get(rec.data.preview);
                if (p?.name !== NOTHING) content = `Previewing \`${p.name}\``;
            } else delete rec.data.editing;

            await current.message.edit({
                content,
                embeds: [buildACEmbed(rec.data)],
                components: STEP5(!same),
            });
            await InteractionDB.update(rec.id, 5, rec.data);
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

                await current.message.edit({
                    content,
                    embeds: [buildACEmbed(rec.data)],
                    components: STEP6(),
                });
                await InteractionDB.update(rec.id, 6, rec.data);
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
                const p = STATS[part].get(rec.data.preview);
                if (p?.name !== NOTHING) content = `Previewing \`${p.name}\``;
            } else delete rec.data.editing;

            await current.message.edit({
                content,
                embeds: [buildACEmbed(rec.data)],
                components: STEP6(!same),
            });
            await InteractionDB.update(rec.id, 6, rec.data);
        } else {
            console.log('Unexpected Interaction at step6: ', current);
        }
    }

    /** @param {AC6Data} data */
    async loadDefaultAC(data) {
        // TODO: actual 621 build here
        data.r_arm = 0;
        data.l_arm = 0;
        data.r_back = 0;
        data.l_back = 0;
        data.head = 1;
        data.core = 1;
        data.arms = 1;
        data.legs = 1;
        data.booster = 1;
        data.FCS = 1;
        data.generator = 1;
        data.expansion = 0;
    }

    /** @param {AC6Data} data */
    async validateAC(data) {
        // TODO
        return true;
    }
};

const LessIsBetter = ['legLoad', 'armLoad', 'totalEN', 'totalWeight'];

/** @param {AC6Data} data */
const buildACEmbed = data => {
    console.log('Build embed for AC data: ', data);
    const ERR = 'ERROR';

    /** @type {Object<string, AC6Part>} */
    const parts = {
        r_arm: STATS.units.get(data.r_arm),
        l_arm: STATS.units.get(data.l_arm),
        r_back: STATS.units.get(data.r_back),
        l_back: STATS.units.get(data.l_back),
    };

    for (const name of [
        'head',
        'core',
        'arms',
        'legs',
        'booster',
        'FCS',
        'generator',
        'expansion',
    ]) {
        parts[name] = STATS[name].get(data[name]);
    }

    let table = '';

    try {
        const getStats = (partMap = parts) => {
            const list = Object.values(partMap);
            const stats = {
                AP: 0,
                def0: 0,
                def1: 0,
                def2: 0,
                stability: 0,
                totalWeight: 0,
                totalEN: 0,
                armLoad: partMap.l_arm.weight + partMap.r_arm.weight,
                armLoadLimit: partMap.arms.load,
                legLoad: 0,
                legLoadLimit: partMap.legs.load,
                enCap: partMap.generator.params[0],
                outputEN: Math.round(
                    partMap.core.output * 0.01 * partMap.generator.output,
                ),
            };

            for (const part of list) {
                if (part.ap) stats.AP += part.ap;
                if (part.def) {
                    stats.def0 += part.def[0];
                    stats.def1 += part.def[1];
                    stats.def2 += part.def[2];
                }
                if (part.stability) stats.stability += part.stability;
                if (part.weight) stats.totalWeight += part.weight;
                if (part.en) stats.totalEN += part.en;
            }

            stats.legLoad = stats.totalWeight - parts.legs.weight;
            console.log(`TotalEN = ${stats.totalEN}`);

            return stats;
        };

        const statsList = [getStats()];
        if (data.editing && data.preview !== data[data.editing] && data.preview >= 0) {
            const newParts = Object.assign({}, parts);
            newParts[data.editing] = STATS[data.editing].get(data.preview);
            statsList.push(getStats(newParts));
        }

        const p = (s = '') => String(s).padStart(6, ' ');
        const cmp = key => {
            if (key === null) {
                return `       ## ${p('TBD')}`;
            } else if (statsList.length > 1) {
                const [v1, v2] = statsList.map(s => s[key]);
                if (v1 === v2) return `       ## ${p(v2)}`;
                if ((v1 < v2) ^ LessIsBetter.includes(key)) return `${p(v1)} >> ${p(v2)}`;
                return `${p(v1)} >> ${p('!' + v2)}`;
            } else {
                const s = statsList[0];
                return `       ## ${p(s[key])}`;
            }
        };

        table =
            '```yaml' +
            `
AP          ${cmp('AP')}
KINETIC DEF ${cmp('def0')}
ENERGY DEF  ${cmp('def1')}
EXPL DEF    ${cmp('def2')}
STABILITY   ${cmp('stability')}
RECOVERY    ${cmp(null)}

TRACKING    ${cmp(null)}

BOOST SPEED ${cmp(null)}
QB SPEED    ${cmp(null)}
QB EN       ${cmp(null)}
QB RELOAD   ${cmp(null)}

EN CAP      ${cmp('enCap')}
EN SUPPLY   ${cmp(null)}
EN DELAY    ${cmp(null)}

TOTAL WEIGHT${cmp('totalWeight')}

ARM LOAD    ${cmp('armLoad')}
ARM LIMIT   ${cmp('armLoadLimit')}
TOTAL LOAD  ${cmp('legLoad')}
LOAD LIMIT  ${cmp('legLoadLimit')}
EN LOAD     ${cmp('totalEN')}
EN OUTPUT   ${cmp('outputEN')}` +
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
        return [
            `<:${part.toUpperCase()}:${emoji}> ${part.replace('_', '-')} unit ${
                ed ? E : ''
            }`,
            `${ed ? '```fix\n' : '`'}${parts[part]?.name || ERR}${ed ? '```' : '`'}`,
        ].join('\n');
    };

    /**
     * @param {string} emoji
     * @param {string} part
     */
    const Part = (emoji, part) => {
        const ed = data.editing === part;
        if (!ed) {
            return [
                `<:${part.toUpperCase()}:${emoji}> ${part.replace('_', '-')}`,
                `\`${parts[part]?.name || ERR}\``,
            ].join('\n');
        } else if (data.preview !== data[data.editing] && data.preview >= 0) {
            const b0 = Boolean(parts[part]?.id);
            const b1 = Boolean(STATS[part].get(data.preview)?.id);

            const diff = [];
            if (b0) diff.push(`- ${parts[part]?.name || ERR}`);
            if (b1) diff.push(`+ ${STATS[part].get(data.preview)?.name || ERR}`);
            if (!b0 && !b1) diff = [ERR];

            return [
                `<:${part.toUpperCase()}:${emoji}> ${part.replace('_', '-')} ${E}`,
                `\`\`\`diff\n${diff.join('\n')}\`\`\``,
            ].join('\n');
        } else {
            return [
                `<:${part.toUpperCase()}:${emoji}> ${part.replace('_', '-')} ${E}`,
                `\`\`\`fix\n${parts[part]?.name || ERR}\`\`\``,
            ].join('\n');
        }
    };
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
`.replace('```\n', '```'), // code block adds a LR for some reason
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
