const NOTHING = '(NOTHING)';
const INTERNAL = '(INTERNAL)';
const DEFAULT_BOOST_ID = 3;
const LEG_TYPES = [null, 'BIPEDAL', 'REVERSE JOINT', 'TETRAPOD', 'TANK'];
/** @type {AC6Part} */
const PUNCH = { id: 0, name: NOTHING, weight: 0, en: 0 };
const PARTS_FILES =
    'arm_units back_units head core arms legs booster FCS generator expansion'.split(' ');

/** @type {Object<string, Map<number, AC6PartBase>>} */
const STATS = {};
// TODO: move this into async loader
for (const name of PARTS_FILES) STATS[name] = require(`../../../data/parts/${name}.json`);
const DEFAULT_AC_DATA = require('../../../data/preset/default.json');

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

module.exports = {
    NOTHING,
    INTERNAL,
    LEG_TYPES,
    PUNCH,
    STATS,
    DEFAULT_AC_DATA,
    DEFAULT_BOOST_ID,
};
