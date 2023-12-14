const DB = require('.');

class InteractionDB {
    static async init() {
        const [get, ins, upd1, upd2, del] = await Promise.all(
            [
                'SELECT id, link, state, data, update_at FROM garage WHERE owner = ?',
                'INSERT OR IGNORE INTO garage (owner, id, update_at) VALUES (?, ?, ?)',
                'UPDATE garage SET id = ?, link = ?, state = ?, data = ?, update_at = ? WHERE owner = ?',
                'UPDATE garage SET id = null, link = null, state = null, update_at = ? WHERE owner = ?',
                'DELETE FROM garage WHERE owner = ?',
            ].map(sql => DB.prep(sql)),
        );

        this.stmt = { get, ins, upd1, upd2, del };
    }

    /**
     * @param {string} owner
     * @param {string} id
     */
    static reg(owner, id) {
        return DB.run(this.stmt.ins, [owner, id, Date.now()]);
    }

    /** @param {string} owner */
    static async get(owner) {
        /** @type {GarageRecord} */
        const rec = await DB.get(this.stmt.get, owner);
        if (!rec) return null;
        rec.data = JSON.parse(rec.data) || {};
        rec.data.owner = owner;
        return rec;
    }

    /**
     * @param {string} owner
     * @param {string} id
     * @param {string} link
     * @param {string} state
     * @param {AC6Data} data
     */
    static update(owner, id, link, state, data) {
        if (data) delete data.owner; // no need to save owner again
        const json = JSON.stringify(data);
        return DB.run(this.stmt.upd1, [id, link, state, json, Date.now(), owner]);
    }

    /** @param {string} owner */
    static clear(owner) {
        return DB.run(this.stmt.upd2, [Date.now(), owner]);
    }

    /** @param {string} owner */
    static delete(owner) {
        return DB.run(this.stmt.del, owner);
    }
}

module.exports = DB.register(InteractionDB);
