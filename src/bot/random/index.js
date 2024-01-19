const getStats = require('../garage/calc');
const { STATS, validateData, LEG_TYPES, id2parts, isTonka } = require('../garage/parts');
const { embedACData } = require('../garage/render');
const { pick, warn } = require('../util/misc');

module.exports = class RandomAC {
    /** @param {import("discord.js").ChatInputCommandInteraction} curr */
    static async handle(curr) {
        const legFilter = curr.options.getString('legs');

        const constraints = [
            !curr.options.getBoolean('allow_arms_overburden'),
            !curr.options.getBoolean('allow_legs_overburden'),
            true,
        ];

        await curr.deferReply();
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
            });
        }

        const embed = embedACData(data);
        embed.setFooter({
            text: tries.join(' | '),
        });

        await curr.editReply({ embeds: [embed] });
    }
};
