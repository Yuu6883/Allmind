const DB = require('.');

class InteractionDB {
    static async init() {
        const [get, ins, upd, del] = await Promise.all(
            [
                'SELECT * FROM interaction WHERE id = ?',
                'INSERT INTO interaction (id, update_at, create_at) VALUES (?, ?, ?)',
                'UPDATE interaction SET state = ?, data = ?, update_at = ? WHERE id = ?',
                'DELETE FROM interaction WHERE id = ?',
            ].map(sql => DB.prep(sql)),
        );

        this.stmt = { get, ins, upd, del };
    }

    /**
     * @param {string} id
     * @returns {Promise<InteractionRecord>}
     */
    static async get(id) {
        const rec = await DB.get(this.stmt.get, id);
        if (!rec) return null;
        rec.data = JSON.parse(rec.data || '{}');
        return rec;
    }

    /**
     * @param {string} id
     */
    static add(id) {
        return DB.run(this.stmt.ins, [id, Date.now(), Date.now()]);
    }

    /**
     * @template T
     * @param {string} id
     * @param {number} state
     * @param {T} data
     */
    static update(id, state, data) {
        return DB.run(this.stmt.upd, [state, JSON.stringify(data), Date.now(), id]);
    }

    /**
     * @param {string} id
     */
    static delete(id) {
        return DB.run(this.stmt.del, id);
    }
}

module.exports = DB.register(InteractionDB);
