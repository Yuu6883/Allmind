const DB = require('.');
const { STATS } = require('../bot/garage/parts');

const readFields = Object.keys(STATS);
const insertFields = ['owner', 'folder', 'data_name', 'ac_name']
    .concat(readFields)
    .concat(['update_at', 'create_at']);
const updateFields = readFields.concat(['update_at']);

/** @param {ArrayLike} list */
const makeArgs = list => new Array(list.length).fill('?').join(', ');

const INS_SQL = `INSERT INTO save (${insertFields.join(', ')}) VALUES (${makeArgs(
    insertFields,
)})`;

const UPD_SQL = `UPDATE save SET ${updateFields
    .map(f => `${f} = ?`)
    .join(', ')} WHERE id = ?`;
class SaveDB {
    static async init() {
        const [get, list, ins, upd, del] = await Promise.all(
            [
                'SELECT * FROM save WHERE id = ?',
                'SELECT id, folder, data_name, ac_name FROM save WHERE owner = ?',
                INS_SQL,
                UPD_SQL,
                'DELETE FROM save WHERE id = ?',
            ].map(sql => DB.prep(sql)),
        );

        this.stmt = { get, list, ins, upd, del };
    }

    /**
     * @param {number} id
     * @return {Promise<SaveData & Omit<AC6Data, "owner">>}
     */
    static get(id) {
        return DB.get(this.stmt.get, id);
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
     * @param {number} id
     * @param {SaveData & AC6Data} data
     */
    static update(id, data) {
        const args = readFields.map(key => Number(data[key]));
        return DB.run(this.stmt.upd, args.concat([Date.now(), id]));
    }

    /**
     * @param {number} id
     */
    static delete(id) {
        return DB.run(this.stmt.del, id);
    }
}

SaveDB.readFields = readFields;

module.exports = DB.register(SaveDB);
