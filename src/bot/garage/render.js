const fs = require('fs');
const path = require('path');
const { EmbedBuilder, User, AttachmentBuilder } = require('discord.js');

const PARTS = require('./parts');
const { STATS, LEG_TYPES, PUNCH, id2parts, getName } = PARTS;

const {
    getBoostSpeedMulti,
    overburdenPenalty,
    getTankBoostSpeedMulti,
    getQBSpeedMulti,
    getAttitudeRecovery,
    getQBReloadMulti,
} = require('../util/multiplier');
const { EMOTES } = require('../constants');

const LessIsBetter = new Set([
    'legLoad',
    'armLoad',
    'enLoad',
    'totalWeight',
    'qbEN',
    'qbReload',
    'enDelay',
]);

/** @param {Readonly<AC6Data>} data */
const embedACData = data => {
    const partsList = [id2parts(data)];

    let table = '';
    /** @type {Set<string>} */
    const editFields = new Set();

    try {
        /** @param {MappedData} param */
        const getStats = param => {
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

            if (LEG_TYPES[legs.type] === 'TANK') {
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

        const { staging } = data;
        if (staging) {
            for (const field in staging) editFields.add(field);

            /** @type {BaseData} */
            const newIDs = {};
            for (const key in STATS) newIDs[key] = staging[key] ?? data[key];

            const newParts = id2parts(newIDs);

            // Tank leg no booster
            if (LEG_TYPES[newParts.legs.type] == 'TANK') {
                newParts.booster = PARTS.get('booster', 0);
                // Assign default booster
            } else if (!newParts.booster.id) {
                newParts.booster = STATS.booster.get(PARTS.DEFAULT_BOOSTER_ID);
            }

            partsList.push(newParts);
        }

        const statsList = partsList.map(getStats);

        const p = (arg = '', m = false) => {
            const s = String(arg);
            if (s.length > 7) return 'LONGSTR';
            if (!m) return s.padStart(7, ' ');
            return s.length <= 5 ? s.padStart(6, ' ').padEnd(7, ' ') : s.padStart(7, ' ');
        };

        const cmp = (key, alert = false) => {
            if (key === null) {
                return `${p()}##${p('TBD')}`;
            } else if (statsList.length > 1) {
                const [v1, v2] = statsList.map(s => s[key]);
                if (v1 === v2)
                    return alert ? `${p()}>>${p('!' + v2)}` : `${p()}##${p(v2)}`;
                if ((v1 < v2) ^ LessIsBetter.has(key) && !alert)
                    return `${p(v1, true)}>>${p(v2)}`;
                return `${p(v1, true)}>>${p('!' + v2)}`;
            } else {
                const s = statsList[0];
                return alert ? `${p()}  ${p('!' + s[key])}` : `${p()}##${p(s[key])}`;
            }
        };

        const extra = [];
        const C = statsList.slice(-1)[0].constraint;
        const CONSTRAINTS = ['!ARMS_OVERBURDENED', '!OVERBURDENED', '!EN_SHORTFALL'];
        for (let i = 0; i < CONSTRAINTS.length; i++) C[i] && extra.push(CONSTRAINTS[i]);

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

TOTAL WEIGHT${cmp('totalWeight').replace('>>!', '> !')}

ARM LOAD    ${cmp('armLoad', C[0])}
ARM LIMIT   ${cmp('armLoadLimit', C[0])}
TOTAL LOAD  ${cmp('legLoad', C[1])}
LOAD LIMIT  ${cmp('legLoadLimit', C[1])}
EN LOAD     ${cmp('enLoad', C[2])}
EN OUTPUT   ${cmp('enLoadLimit', C[2])}
${extra.join('\n')}` +
            '```';
    } catch (e) {
        console.error(e);
        table = '**ERROR**';
    }

    let renderEmote = true;
    let longName = data.settings?.longName;
    const LINE = '⎯⎯⎯⎯⎯⎯⎯⎯';
    const underline = (line, b = true) => (b ? `__${line}__` : line);

    /** @param {string} key */
    const Unit = key => {
        const emote = EMOTES[`${key.toUpperCase()}_ICON`];
        const ed = editFields.has(key);

        const part0 = partsList[0];
        const part1 = partsList[1];

        if (partsList.length === 1 || part0[key]?.id == part1[key]?.id) {
            const p = part0[key];
            return [
                underline(`${LINE}<:E:${emote}>${LINE}`, ed),
                `${EMOTES.get(key, p.id) || ' '} \`${getName(p, longName)}\``,
            ].join('\n');
        } else {
            const b0 = Boolean(part0[key]) && part0[key].id !== PUNCH.id;
            const b1 = Boolean(part1[key]) && part1[key].id !== PUNCH.id;

            const diff = [];
            if (b1) diff.push(`+ ${getName(part1[key], longName)}`);
            if (b0) diff.push(`- ${getName(part0[key], longName)}`);
            if (!b0 && !b1) diff.push('ERROR');

            return [
                underline(`${LINE}<:E:${emote}>${LINE}`, ed),
                `\`\`\`diff\n${diff.join('\n')}\`\`\``,
            ].join('\n');
        }
    };

    /** @param {string} key */
    const Part = key => {
        const emote = EMOTES[`${key.toUpperCase()}_ICON`];
        const ed = editFields.has(key);

        const part0 = partsList[0];
        const part1 = partsList[1];

        if (partsList.length === 1 || part0[key]?.id === part1[key]?.id) {
            const part = part0[key];

            return [
                underline(`${LINE}<:E:${emote}>${LINE}`, ed),
                `${EMOTES.get(key, part.id)} \`${getName(part, longName)}\``,
            ].join('\n');
        } else {
            const b0 = Boolean(part0[key]?.id);
            const b1 = Boolean(part1[key]?.id);

            const diff = [];
            if (b1) diff.push(`+ ${getName(part1[key], longName)}`);
            if (b0) diff.push(`- ${getName(part0[key], longName)}`);
            if (!b0 && !b1) diff.push('ERROR');

            const unitIcon0 = EMOTES.get(key, part0[key]?.id);
            const unitIcon1 = EMOTES.get(key, part1[key]?.id);

            const icon = (renderEmote && b0 && b1 && `${unitIcon0}→${unitIcon1}`) || '';

            return [
                underline(`${LINE}<:E:${emote}>${LINE}`, ed),
                `${icon}\`\`\`diff\n${diff.join('\n')}\`\`\``,
            ].join('\n');
        }
    };

    const renderSections = () =>
        `${Unit('r_arm')}
${Unit('l_arm')}
${Unit('r_back')}
${Unit('l_back')}

${Part('head')}
${Part('core')}
${Part('arms')}
${Part('legs')}

${Part('booster')}
${Part('FCS')}
${Part('generator')}
${Part('expansion')}`;

    let assembly = renderSections().replaceAll('```\n', '```');

    if (assembly.length > 1024) {
        longName = false;
        assembly = renderSections().replaceAll('```\n', '```');
    }

    if (assembly.length > 1024) {
        renderEmote = false;
        assembly = renderSections().replaceAll('```\n', '```');
    }

    const embed = new EmbedBuilder().addFields(
        {
            name: `AC // ${data.staging?.ac_name ?? data.ac_name}`,
            value: assembly, // code block adds a LR for some reason
            inline: true,
        },
        {
            name: 'AC SPECS',
            value: table,
            inline: true,
        },
    );

    return embed;
};

const CUTSCENE_FILE = 'cutscene.gif';
// TODO: async this somewhere...
const CUTSCENE_GIF = fs.readFileSync(
    path.resolve(__dirname, '..', '..', '..', 'data', 'img', CUTSCENE_FILE),
);

/**
 * @param {User} user
 * @returns {import('discord.js').InteractionReplyOptions}
 */
const createCutscene = () => ({
    files: [new AttachmentBuilder(CUTSCENE_GIF, { name: CUTSCENE_FILE })],
});

module.exports = { embedACData, createCutscene };
