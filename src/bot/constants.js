const EMOTES = {
    EMPTY: '',
    SETTINGS: '',
    RETURN: '',
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
    /** @type {Omit<{ [K in keyof BaseData]: Object<string, string> }, "data_name" | "ac_name">} */
    PARTS: {},
    /** @type {(key: string, id: number | string, raw?: boolean) => string} */
    get: null,
};

const MAX_OPT = 25;
const MAX_SAVE_FOLDER = 4;

const CIDS = {
    ASSEMBLY: 'assembly',
    PRESET: 'preset',
    AC_DATA: 'ac_data',
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
    WB: 'weapon_bay',
    HMMM: 'hmmm',
    DATA_NAME: 'data_name',
    AC_NAME: 'ac_name',
    OVERWRITE: 'overwrite',
    EDIT_NAME: 'edit_name',
    EDIT_MODAL: 'edit_modal',
    EXIT: 'exit',
    DELETE: 'delete',
    SETTINGS: 'settings',
    AUTO_EQ: 'auto_equip',
    LONG_NAME: 'long_name',
};

module.exports = {
    EMOTES,
    MAX_OPT,
    MAX_SAVE_FOLDER,
    CIDS,
};
