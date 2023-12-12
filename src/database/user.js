const DB = require('.');

const INIT_FIELDS = 'provider, uid, update_at, create_at';

class UserDB {
    static async init() {
        const [get1, get2, ins, ign, del] = await Promise.all(
            [
                'SELECT * FROM user WHERE id = ?',
                'SELECT * FROM user WHERE provider = ? AND uid = ?',
                `INSERT INTO user (${INIT_FIELDS}) VALUES (?, ?, ?, ?)`,
                `INSERT OR IGNORE INTO user (${INIT_FIELDS}) VALUES (?, ?, ?, ?)`,
                'DELETE FROM user WHERE id = ?',
            ].map(sql => DB.prep(sql)),
        );

        this.stmt = { get1, get2, ins, ign, del };
    }

    /**
     * @param {number} id
     * @returns {Promise<AC6Account>}
     */
    static async get(id) {
        return DB.get(this.stmt.get1, id);
    }

    /**
     * @param {AuthProvider} provider
     * @param {string} uid
     * @returns {Promise<AC6Account>}
     */
    static async getByUID(provider, uid) {
        return DB.get(this.stmt.get2, [provider, uid]);
    }

    /**
     * @param {AuthProvider} provider
     * @param {string} uid
     */
    static reg(provider, uid) {
        return DB.run(this.stmt.ign, [provider, uid, Date.now(), Date.now()]);
    }

    /**
     * @param {AuthProvider} provider
     * @param {string} uid
     */
    static add(provider, uid) {
        return DB.run(this.stmt.ins, [provider, uid, Date.now(), Date.now()]);
    }

    /**
     * @param {string} id
     */
    static update(id) {
        // return DB.run(this.stmt.upd, [state, JSON.stringify(data), Date.now(), id]);
    }

    /**
     * Dev only
     * @param {number} id
     */
    static delete(id) {
        return DB.run(this.stmt.del, id);
    }
}

module.exports = DB.register(UserDB);
