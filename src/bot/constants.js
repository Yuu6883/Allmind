const EMOTES = {
    LOADER4: '',
    R_ARM_ICON: '',
    L_ARM_ICON: '',
    R_BACK_ICON: '',
    L_BACK_ICON: '',
    HEAD_ICON: '',
    CORE_ICON: '',
    ARMS_ICON: '',
    LEGS_ICON: '',
    BOOSTER_ICON: '',
    FCS_ICON: '',
    GENERATOR_ICON: '',
    EXPANSION_ICON: '',
    SNAIL: '',
};

Object.assign(EMOTES, require('../../data/emotes.json'));

const MAX_OPT = 25;

const CIDS = {
    ASSEMBLY: 'assembly',
    PRESET: 'preset',
    LOAD_SAVE: 'load_save',
    FRAME: 'frame',
    INNER: 'inner',
    SAVE: 'save',
    R_ARM: 'r_arm',
    L_ARM: 'l_arm',
    R_BACK: 'r_back',
    L_BACK: 'l_back',
    RETURN: 'return',
    EQUIP: 'equip',
    EQUIP_RETURN: 'equip_return',
    SWAP: 'swap',
    HMMM: 'hmmm',
};

const defs = require('../../data/preset/default.json');

module.exports = {
    EMOTES,
    MAX_OPT,
    CIDS,
    DEFAULT_AC_DATA: defs.garageData,
    DEFAULT_BOOSTER_ID: defs.defaultBoosterID,
};
