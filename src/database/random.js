const DB = require('.');

class RandomACParamDB {
    static async init() {
        const [get, ins] = await Promise.all(
            [
                'SELECT * FROM random_ac_param WHERE id = ?',
                `INSERT INTO random_ac_param (id, legs, arms_ob, legs_ob) VALUES (${DB.args(
                    4,
                )})`,
            ].map(sql => DB.prep(sql)),
        );

        this.stmt = { get, ins };
    }

    /**
     * @param {string} id
     */
    static async get(id) {
        /** @type {{ id: string, legs: string, arms_ob: boolean, legs_ob: boolean }} */
        const result = await DB.get(this.stmt.get, [id]);
        if (!result) return null;
        result.arms_ob = Boolean(result.arms_ob);
        result.legs_ob = Boolean(result.legs_ob);
        return result;
    }

    /**
     * @param {string} id
     * @param {string} legs
     * @param {boolean} arms_ob
     * @param {boolean} legs_ob
     */
    static add(id, legs, arms_ob, legs_ob) {
        return DB.run(this.stmt.ins, [id, legs, ~~arms_ob, ~~legs_ob]);
    }
}

module.exports = DB.register(RandomACParamDB);
