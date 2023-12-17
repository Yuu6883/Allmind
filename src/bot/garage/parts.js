const { EMOTES } = require('../constants');

const NOTHING = '(NOTHING)';
const INTERNAL = '(INTERNAL)';
const LEG_TYPES = [null, 'BIPEDAL', 'REVERSE JOINT', 'TETRAPOD', 'TANK'];
/** @type {AC6Part} */
const PUNCH = { id: 9001, name: NOTHING, weight: 0, en: 0 };

const FRAME = ['head', 'core', 'arms', 'legs'];
const INNER = ['booster', 'FCS', 'generator', 'expansion'];

const PARTS_FILES = ['arm_units', 'back_units'].concat(FRAME, INNER);

/** @type {{ [K in keyof MappedData]: Map<number, MappedData[K]> } & Object<string, Map<number, AC6Part>} */
const STATS = {};

// TODO: move all the json require calls into async loader
for (const name of PARTS_FILES) STATS[name] = require(`../../../data/parts/${name}.json`);

for (const key in STATS) {
    const arr = STATS[key];
    const map = new Map();

    if (key === 'expansion') map.set(0, { id: 0, name: NOTHING });
    if (/units$/.exec(key)) map.set(PUNCH.id, PUNCH);

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
    Object.freeze(STATS);
}

/**
 *
 * @param {string} key
 * @param {number} id
 */
const get = (key, id) => {
    if (key === 'booster' && !id) return { id: 0, name: INTERNAL };

    let mapped = key;
    // Weapon bay check
    if (/back$/.exec(key) && id < 0) mapped = key.replace('back', 'arm');
    const part = Object.assign({}, STATS[mapped].get(Math.abs(id)));
    part.id = id;
    return part;
};

/** @param {BaseData} data */
const id2parts = data => {
    /** @type {MappedData} */
    const parts = {};
    for (const key of Object.keys(STATS)) parts[key] = get(key, data[key]);
    return parts;
};

const isTonka = (id = 0) => LEG_TYPES[STATS.legs.get(id).type] === 'TANK';

/** @param {BaseData} data */
const validateData = data => {
    /** @type {MappedData} */
    const parts = {};
    for (const key in STATS) {
        const id = data[key];
        if (typeof id !== 'number') return `invalid data[${key}] = ${id}`;

        let mapped = key;
        // weapon bay check
        if (/back$/.exec(key) && id < 0) mapped = key.replace('back', 'arm');
        parts[key] = STATS[mapped].get(Math.abs(id));
    }

    // Tank/booster check
    const tank = LEG_TYPES[parts.legs?.type] === 'TANK';
    if (tank && parts.booster) return 'tank has booster';

    for (const key in parts) {
        if (key === 'booster' && tank) continue;
        if (!parts[key]) return `${key} not found (id = ${data[key]})`;
    }

    if (
        (parts.r_arm !== PUNCH && parts.r_arm === parts.r_back) ||
        (parts.l_arm !== PUNCH && parts.l_arm === parts.l_back)
    )
        return 'weapon bay conflict';
};

/** @type {(BaseData & { emote: string })[]} */
const PRESET = require('../../../data/preset.json');

const DEFAULT_AC_DATA = Object.assign({}, PRESET[0]);
delete DEFAULT_AC_DATA.emote;
const err = validateData(DEFAULT_AC_DATA);

if (err) throw new Error(`Failed to validate DEFAULT_AC_DATA: ${err}`);

/** @type {number} */
const DEFAULT_BOOSTER_ID =
    [...STATS.booster.values()].find(b => b.name.includes('P10'))?.id || 1;

if (!STATS.booster.get(DEFAULT_BOOSTER_ID))
    throw new Error(`Invalid default booster ID: ${DEFAULT_BOOSTER_ID}`);

Object.assign(EMOTES, require('../../../data/emotes.json'));
EMOTES.PARTS.r_arm = EMOTES.PARTS.l_arm;
EMOTES.PARTS.r_back = EMOTES.PARTS.l_back;

EMOTES.PARTS.l_arm[PUNCH.id] = EMOTES.EMPTY;
EMOTES.PARTS.l_back[PUNCH.id] = EMOTES.EMPTY;

EMOTES.PARTS.booster[0] = EMOTES.EMPTY;
EMOTES.PARTS.expansion[0] = EMOTES.EMPTY;

EMOTES.get = (key, id, raw = false) => {
    // weapon bay
    if (~~id < 0) key = key.replace('back', 'arm');

    const e = EMOTES.PARTS[key]?.[Math.abs(~~id)];
    let result = e;
    if (!raw && e) result = e.includes(':') ? e : `<:E:${e}>`;
    // log error and return default warning emote
    if (!result) {
        console.error(`Missing emote for { key: ${key}, id: ${id} }`);
        result = '⚠️';
    }
    return result;
};

/** @param {AC6Part} part */
const getName = (part = {}, longName = false) =>
    (longName ? part.name : part.short ?? part.name) || 'ERROR';

module.exports = {
    INTERNAL,
    LEG_TYPES,
    PUNCH,
    STATS,
    FRAME,
    INNER,
    PRESET,
    DEFAULT_AC_DATA,
    DEFAULT_BOOSTER_ID,
    get,
    getName,
    isTonka,
    id2parts,
    validateData,
};
