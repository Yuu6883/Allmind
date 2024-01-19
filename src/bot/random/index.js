const getStats = require('../garage/calc');
const { STATS, validateData, LEG_TYPES, id2parts, isTonka } = require('../garage/parts');
const { embedACData } = require('../garage/render');
const { R, B, BS } = require('../util/form');
const { pick, warn } = require('../util/misc');

const RandomACParamDB = require('../../database/random');
const WRONG_USER = 'This interaction is not initiated by you.';

module.exports = class RandomAC {
    /** @param {import("discord.js").ChatInputCommandInteraction | import("discord.js").MessageComponentInteraction} curr */
    static async handle(curr) {
        let ephemeral = false;
        let legFilter = 'BIPEDAL,REVERSE JOINT,TETRAPOD,TANK';
        const constraints = [false, false, true];

        if (curr.isMessageComponent()) {
            if (curr.user.id !== curr.message.interaction.user.id) {
                return await curr.reply({
                    content: WRONG_USER,
                    ephemeral: true,
                });
            }

            await curr.deferUpdate();

            // console.log(`RandomACParamDB.get ${curr.message.interaction.id}`);
            const res = await RandomACParamDB.get(curr.message.interaction.id);
            if (res) {
                legFilter = res.legs;
                constraints[0] = res.arms_ob;
                constraints[1] = res.legs_ob;
            }
        } else {
            const opt = curr.options;
            legFilter = opt.getString('legs');
            constraints[0] = !opt.getBoolean('allow_arms_overburden');
            constraints[1] = !opt.getBoolean('allow_legs_overburden');
            ephemeral = !opt.getBoolean('public');

            await curr.deferReply({ ephemeral });
            // console.log(`RandomACParamDB.add ${curr.id}`);
            await RandomACParamDB.add(curr.id, legFilter, constraints[0], constraints[1]);
        }

        /** @type {AC6Data} */
        const data = { ac_name: 'RANDOM' };

        /** @type {Set<number>} */
        const legTypeSet = new Set();
        for (const leg of legFilter.split(',')) legTypeSet.add(LEG_TYPES.indexOf(leg));

        /** @type {{ [key: string]: number[] }} */
        const map = {};
        for (const key in STATS) {
            map[key] = [...STATS[key].values()].map(p => p.id);
            if (key === 'legs')
                map[key] = map[key].filter(p => legTypeSet.has(STATS.legs.get(p).type));
        }

        for (const key in STATS) {
            if (!/back$/.exec(key)) continue;
            map[key] = map[key].concat(map[key.replace('back', 'arm')].map(id => -id));
        }

        let attempt = 0;
        let success = false;
        const cnt = new Uint8Array(4);
        while (attempt++ < 256) {
            for (const key in map) data[key] = pick(map[key]);
            if (isTonka(data.legs)) data.booster = 0;

            const error = validateData(data);
            if (error) {
                cnt[3]++;
                continue;
            }

            const stats = getStats(id2parts(data));

            let skip = false;
            for (let i = 0; i < 3; i++) {
                if (constraints[i] && stats.constraint[i]) {
                    cnt[i]++;
                    skip = true;
                }
            }
            if (skip) continue;
            success = true;
            break;
        }

        const tries = [`Total attempts: ${attempt}`];
        cnt[0] && tries.push(`arms overload: ${cnt[0]}`);
        cnt[1] && tries.push(`legs overload: ${cnt[1]}`);
        cnt[2] && tries.push(`EN overload: ${cnt[2]}`);
        cnt[3] && tries.push(`invalid: ${cnt[3]}`);

        if (!success) {
            return await curr.editReply({
                content: warn(`Failed to generate (${tries.join(', ')})`),
                ephemeral,
            });
        }

        const embed = embedACData(data);
        embed.setFooter({
            text: tries.join(' | '),
        });

        await curr.editReply({
            embeds: [embed],
            components: ephemeral ? null : [R(B('reroll', '🎲', { style: BS.Danger }))],
        });
    }
};
