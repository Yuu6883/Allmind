const NOTHING = '(NOTHING)';
const INTERNAL = '(INTERNAL)';
const LEG_TYPES = [null, 'BIPEDAL', 'REVERSE JOINT', 'TETRAPOD', 'TANK'];
/** @type {AC6Part} */
const PUNCH = { id: 0, name: NOTHING, weight: 0, en: 0 };
const PARTS_FILES =
    'arm_units back_units head core arms legs booster FCS generator expansion'.split(' ');

/** @type {Object<string, Map<number, AC6PartBase>>} */
const STATS = {};
// TODO: move this into async loader
for (const name of PARTS_FILES) STATS[name] = require(`../../../data/parts/${name}.json`);

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
        unit.name = unit.name.toUpperCase();
        STATS.l_arm.set(unit.id, unit);
        if (!unit.melee) STATS.r_arm.set(unit.id, unit);
    }
    for (const unit of STATS.back_units.values()) {
        unit.name = unit.name.toUpperCase();
        STATS.l_back.set(unit.id, unit);
        if (!unit.shield) STATS.r_back.set(unit.id, unit);
    }
    delete STATS.arm_units;
    delete STATS.back_units;
}

/** @param {AC6Data} data */
const validateData = data => {
    /** @type {Object<string, AC6Part>} */
    const parts = {};
    for (const item in STATS) {
        let key = item;
        if (key.endsWith('back') && data[key.replace('back', 'swap')])
            key = key.replace('back', 'arm');
        if (typeof data[key] !== 'number') return `invalid data[${key}] = ${data[key]}`;
        parts[item] = STATS[key].get(data[key]);
    }

    const tank = LEG_TYPES[parts.legs?.type] === 'TANK';
    if (tank && parts.booster) return 'tank has booster';

    for (const key in parts) {
        if (key === 'booster' && tank) continue;
        if (!parts[key]) return `${key} not found (id = ${data[key]})`;
    }
};

const { DEFAULT_AC_DATA } = require('../constants');
const err = validateData(DEFAULT_AC_DATA);

if (err) throw new Error(`Failed to validate DEFAULT_AC_DATA: ${err}`);

module.exports = {
    NOTHING,
    INTERNAL,
    LEG_TYPES,
    PUNCH,
    STATS,
    validateData,
};
