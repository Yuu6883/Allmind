const DB = require('.');
const { sid } = require('../bot/util/misc');

class OAuthStateDB {
    static async init() {
        const [get, ins, del] = await Promise.all(
            [
                'SELECT * FROM oauth2_state WHERE state = ?',
                `INSERT INTO oauth2_state (state, provider, ip, data, expire) VALUES (${DB.args(
                    5,
                )})`,
                'DELETE FROM oauth2_state WHERE state = ? OR expire < ?',
            ].map(sql => DB.prep(sql)),
        );

        this.stmt = { get, ins, del };
    }

    /**
     * @param {AuthProvider} provider
     * @param {string} ip
     * @param {Object} data
     */
    static async add(provider, ip, data = {}) {
        const state = sid(32);
        const result = await DB.run(this.stmt.ins, [
            state,
            provider,
            ip,
            JSON.stringify(data),
            Date.now() + 5 * 60 * 1000, // 5 minutes
        ]);
        return result.changes ? state : null;
    }

    /**
     * @param {string} state
     * @return {Promise<{ state: string, provider: AuthProvider, ip: string, data: Object, expire: number }>}
     */
    static async pop(state) {
        const result = await DB.get(this.stmt.get, state);
        if (!result) return null;
        const deleted = await DB.run(this.stmt.del, [state, Date.now()]);
        // console.log(`deleted ${deleted.changes} states`);
        try {
            result.data = JSON.parse(result.data);
        } catch {
            console.error(`Failed to parse oauth data: ${result.data}`);
        }
        return result;
    }
}

module.exports = DB.register(OAuthStateDB);
