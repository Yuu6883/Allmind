const UserDB = require('../../database/user');

/** @type {Map<string, [number, number]>} */
const UID_MAP = new Map();

/** @param {string} uid */
const uid2id = async uid => {
    const entry = UID_MAP.get(uid);
    if (!entry) {
        const rec = await UserDB.getByUID('discord', uid);
        if (!rec) return -1;
        UID_MAP.set(uid, [rec.id, Date.now()]);
        return rec.id;
    } else return entry[0];
};

module.exports = { uid2id };
