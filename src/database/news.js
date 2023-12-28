const DB = require('.');

const INIT_FIELDS = ['id', 'title', 'desc', 'image', 'url', 'date', 'create_at'];
const KEYS = INIT_FIELDS.join(', ');
class NewsDB {
    static async init() {
        const [get, ins, del] = await Promise.all(
            [
                'SELECT * FROM news',
                `INSERT INTO news (${KEYS}) VALUES (${DB.args(INIT_FIELDS.length)})`,
                'DELETE FROM news',
            ].map(sql => DB.prep(sql)),
        );

        this.stmt = { get, ins, del };
    }

    /** @returns {Promise<News[]>} */
    static async list() {
        return DB.all(this.stmt.get);
    }

    /** @param {News} news */
    static add(news) {
        const args = [];
        for (const key of INIT_FIELDS.slice(0, -1)) args.push(news[key]);
        return DB.run(this.stmt.ins, args.concat([Date.now()]));
    }

    /**  Dev only */
    static delete() {
        return DB.run(this.stmt.del);
    }
}

module.exports = DB.register(NewsDB);
