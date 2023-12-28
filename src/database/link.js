const DB = require('.');

class LinkDB {
    static async init() {
        const [get, ins, del] = await Promise.all(
            [
                'SELECT * FROM links WHERE owner = ? AND provider = ?',
                `INSERT INTO links (owner, provider, data, create_at) VALUES (${DB.args(
                    4,
                )})`,
                'DELETE FROM links WHERE owner = ? AND provider = ?',
            ].map(sql => DB.prep(sql)),
        );

        this.stmt = { get, ins, del };
    }

    /**
     * @param {number} owner
     * @param {AuthProvider} provider
     */
    static async get(owner, provider) {
        const result = await DB.get(this.stmt.get, [owner, provider]);
        if (!result) return null;
        result.data = JSON.parse(result.data);
        return result;
    }

    /**
     * @param {number} owner
     * @param {AuthProvider} provider
     * @param {Object} data
     */
    static add(owner, provider, data = {}) {
        return DB.run(this.stmt.ins, [owner, provider, JSON.stringify(data), Date.now()]);
    }

    /**
     * @param {number} owner
     * @param {AuthProvider} provider
     */
    static del(owner, provider) {
        return DB.run(this.stmt.del, [owner, provider]);
    }
}

module.exports = DB.register(LinkDB);
