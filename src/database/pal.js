const DB = require('.');

class PalDB {
    static async init() {
        const [get, list, ins, del] = await Promise.all(
            [
                'SELECT * FROM palworld_whitelist WHERE ip = ?',
                'SELECT * FROM palworld_whitelist WHERE uid = ?',
                `INSERT OR IGNORE INTO palworld_whitelist (ip, uid) VALUES (${DB.args(
                    2,
                )})`,
                'DELETE FROM palworld_whitelist WHERE uid = ?',
            ].map(sql => DB.prep(sql)),
        );

        this.stmt = { get, list, ins, del };
    }

    /** @param {string} ip */
    static async get(ip) {
        /** @type {{ uid: string }} */
        const result = await DB.get(this.stmt.get, ip);
        if (!result) return null;
        return result.uid;
    }

    /** @param {string} uid */
    static async listIPs(uid) {
        /** @type {{ ip: string }[]} */
        const result = await DB.all(this.stmt.list, uid);
        if (!result) return null;
        return result.map(row => row.ip);
    }

    /**
     * @param {string} ip
     * @param {string} uid
     */
    static add(ip, uid) {
        return DB.run(this.stmt.ins, [ip, uid]);
    }

    /** @param {string} uid */
    static async del(uid) {
        return DB.run(this.stmt.del, uid);
    }
}

module.exports = DB.register(PalDB);
