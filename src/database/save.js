const DB = require('.');

const FIELDS =
    'r_arm l_arm r_back l_back head core arms legs booster FCS generator expansion';

class SaveDB {
    static async init() {
        const [get1, list1, ins, upd, del] = await Promise.all(
            [
                'SELECT * FROM save WHERE id = ?',
                'INSERT INTO interaction (id, update_at, create_at) VALUES (?, ?, ?)',
                'UPDATE interaction SET state = ?, data = ?, update_at = ? WHERE id = ?',
                'DELETE FROM save WHERE id = ?',
            ].map(sql => DB.prep(sql)),
        );

        this.stmt = { get, ins, upd, del };
    }

    /**
     * @param {string} id
     * @returns {Promise<GarageRecord>}
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

module.exports = DB.register(SaveDB);
