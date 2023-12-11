const DB = require('.');

class InteractionDB {
    static async init() {
        this.stmt = {
            get: await DB.prep('SELECT * FROM interaction WHERE id = ?'),
            insert: await DB.prep(
                'INSERT INTO interaction (id, update_at, create_at) VALUES (?, ?, ?)',
            ),
            update: await DB.prep(
                'UPDATE interaction SET state = ?, data = ?, update_at = ? WHERE id = ?',
            ),
            delete: await DB.prep('DELETE FROM interaction WHERE id = ?'),
        };
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
        return DB.run(this.stmt.insert, [id, Date.now(), Date.now()]);
    }

    /**
     * @template T
     * @param {string} id
     * @param {number} state
     * @param {T} data
     */
    static update(id, state, data) {
        return DB.run(this.stmt.update, [state, JSON.stringify(data), Date.now(), id]);
    }

    /**
     * @param {string} id
     */
    static delete(id) {
        return DB.run(this.stmt.delete, id);
    }
}

module.exports = DB.register(InteractionDB);
