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
    /** @param {string} name */
    static filterName(name) {
        return name.toUpperCase().slice(0, 16);
    }

    static async init() {
        const [get, list, ins, upd1, upd2, del] = await Promise.all(
            [
                'SELECT * FROM save WHERE id = ?',
                'SELECT id, folder, data_name, ac_name FROM save WHERE owner = ?',
                INS_SQL,
                UPD_SQL,
                'UPDATE save SET data_name = ?, ac_name = ?, update_at = ? WHERE id = ?',
                'DELETE FROM save WHERE id = ?',
            ].map(sql => DB.prep(sql)),
        );

        this.stmt = { get, list, ins, upd1, upd2, del };
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
        const args = [
            owner,
            folder,
            this.filterName(data_name),
            this.filterName(ac_name),
        ];
        for (const key of readFields) args.push(Number(data[key]));
        return DB.run(this.stmt.ins, args.concat([Date.now(), Date.now()]));
    }

    /**
     * @param {number} id
     * @param {SaveData & AC6Data} data
     */
    static updateData(id, data) {
        const args = readFields.map(key => Number(data[key]));
        return DB.run(this.stmt.upd1, args.concat([Date.now(), id]));
    }

    /**
     * @param {number} id
     * @param {string} data_name
     * @param {string} ac_name
     */
    static updateNames(id, data_name, ac_name) {
        return DB.run(this.stmt.upd2, [
            this.filterName(data_name),
            this.filterName(ac_name),
            Date.now(),
            id,
        ]);
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
