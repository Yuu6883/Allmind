const DB = require('.');
const { STATS } = require('../bot/garage/parts');

const readFields = Object.keys(STATS).concat(['r_swap', 'l_swap']);
const insertFields = ['owner', 'folder', 'data_name', 'ac_name']
    .concat(readFields)
    .concat(['update_at', 'create_at']);

/** @param {ArrayLike} list */
const makeArgs = list => new Array(list.length).fill('?').join(', ');

class SaveDB {
    static async init() {
        const [get, list, ins, upd, del] = await Promise.all(
            [
                'SELECT * FROM save WHERE id = ?',
                'SELECT id, folder, data_name, ac_name FROM save WHERE owner = ?',
                `INSERT INTO save (${insertFields.join(', ')}) VALUES (${makeArgs(
                    insertFields,
                )})`,
                'UPDATE save SET update_at = ? WHERE id = ?',
                'DELETE FROM save WHERE id = ?',
            ].map(sql => DB.prep(sql)),
        );

        this.stmt = { get, list, ins, upd, del };
    }

    /** @param {number} id */
    static async get(id) {
        /** @type {SaveData & AC6Data} */
        const data = await DB.get(this.stmt.get, id);
        if (!data) return;

        data.r_swap = Boolean(data.r_swap);
        data.l_swap = Boolean(data.l_swap);

        return data;
    }

    /**
     * @param {number} owner
     * @returns {Promise<SaveData[]>}
     */
    static list(owner) {
        return DB.all(this.stmt.list, owner);
    }

    /**
     * @param {number} owner
     * @param {AC6Data & SaveData} data
     */
    static add(owner, data) {
        const { folder, data_name, ac_name } = data;
        const args = [owner, folder, data_name.toUpperCase(), ac_name.toUpperCase()];
        for (const key of readFields) args.push(Number(data[key]));
        return DB.run(this.stmt.ins, args.concat([Date.now(), Date.now()]));
    }

    /**
     * @param {string} id
     * @param {SaveData & AC6Data} data
     */
    static update(id) {
        // return DB.run(this.stmt.upd, [state, JSON.stringify(data), Date.now(), id]);
    }

    /**
     * @param {string} id
     */
    static delete(id) {
        return DB.run(this.stmt.del, id);
    }
}

module.exports = DB.register(SaveDB);
