const path = require('path');
const sql = require('sqlite3');

const DB_FOLDER = path.resolve(__dirname, '..', '..', 'data');
const MAIN_DB_FILE = path.resolve(DB_FOLDER, 'main.db');
const LOG_DB_FILE = path.resolve(DB_FOLDER, 'log.db');

const TABLE = 'CREATE TABLE IF NOT EXISTS';
const UIDX = 'CREATE UNIQUE INDEX IF NOT EXISTS';

/**
 * @param {string} path
 * @returns {sql.Database}
 */
const openDB = path =>
    new Promise((resolve, reject) => {
        const db = new sql.Database(path, err => (err ? reject(err) : resolve(db)));
    });

/**
 * @param {sql.Database} db
 * @param {string} sql
 * @returns {Promise<sql.RunResult>}
 */
const runSQL = (db, sql, args) =>
    new Promise((resolve, reject) =>
        db.run(sql, args, function (err) {
            err ? reject({ err, sql, args }) : resolve(this);
        }),
    );

class DB {
    /**
     * @template T
     * @param {T} mod
     * @returns {T}
     */
    static register(mod) {
        /** @type {{ init: Promise<void>, stmt: { [key: string]: sql.Statement } }[]} */
        this.modules = this.modules || [];
        if (!(mod.init instanceof Function)) throw Error('Invalid DB Module!');
        this.modules.push(mod);
        return mod;
    }

    static async open() {
        if (this.mainDB || this.logDB) return false;

        this.mainDB = await openDB(MAIN_DB_FILE);
        this.logDB = await openDB(LOG_DB_FILE);

        try {
            await this.init();
            return true;
        } catch (e) {
            console.error(e.stack);
            return false;
        }
    }

    static async init() {
        const tasks = [];

        /** @param {string} sql */
        const run = (sql, db = this.mainDB, args) => tasks.push(runSQL(db, sql, args));

        this.mainDB.serialize(() => {
            run('PRAGMA foreign_keys = ON');

            run(
                `${TABLE} user (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider   TEXT NOT NULL,
                    uid        TEXT NOT NULL,
                    acc_token  TEXT DEFAULT NULL,
                    ref_token  TEXT DEFAULT NULL,
                    auth_ip    TEXT DEFAULT NULL,
                    auth_time  INTEGER DEFAULT NULL,
                    coam       INTEGER DEFAULT 0,
                    update_at  INTEGER NOT NULL,
                    create_at  INTEGER NOT NULL
                );`,
            );

            run(`${UIDX} id ON user (id);`);

            run(`${UIDX} user_provider_id ON user (provider, uid);`);

            run(`${TABLE} user_cache (
                    provider   TEXT NOT NULL,
                    uid        TEXT NOT NULL,
                    username   TEXT NOT NULL,
                    avatar     TEXT,
                    timestamp  INTEGER NOT NULL
                )`);

            run(`${UIDX} cache_provider_id ON user_cache (provider, uid);`);

            // owner -> user (uid), not sure why FOREIGN KEY does not work
            run(`${TABLE} garage (
                    owner      TEXT PRIMARY KEY,
                    id         TEXT DEFAULT NULL,
                    state      TEXT DEFAULT NULL,
                    data       TEXT DEFAULT NULL,
                    link       TEXT DEFAULT NULL,
                    update_at  INTEGER NOT NULL
                )`);

            run(`${UIDX} id ON garage (owner)`);

            run(`${TABLE} save (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                owner      INTEGER NOT NULL,
                folder     INTEGER NOT NULL,
                data_name  TEXT NOT NULL,
                ac_name    TEXT NOT NULL,
                r_arm      INTEGER NOT NULL,
                l_arm      INTEGER NOT NULL,
                r_back     INTEGER NOT NULL,
                l_back     INTEGER NOT NULL,
                head       INTEGER NOT NULL,
                core       INTEGER NOT NULL,
                arms       INTEGER NOT NULL,
                legs       INTEGER NOT NULL,
                booster    INTEGER NOT NULL,
                FCS        INTEGER NOT NULL,
                generator  INTEGER NOT NULL,
                expansion  INTEGER NOT NULL,
                extra      TEXT DEFAULT NULL,
                update_at  INTEGER NOT NULL,
                create_at  INTEGER NOT NULL,
                FOREIGN KEY (owner) REFERENCES user(id)
            )`);

            if (this.modules) tasks.push(...this.modules.map(m => m.init()));
        });

        const result = await Promise.allSettled(tasks);
        for (const r of result) {
            if (r.status === 'rejected') console.error(r.reason);
        }
    }

    static async close() {
        if (!this.mainDB || !this.logDB) return false;

        const tasks = [];
        for (const mod of this.modules || []) {
            for (const key in mod.stmt) {
                tasks.push(
                    new Promise((resolve, reject) =>
                        mod.stmt[key].finalize(err => (err ? reject(err) : resolve())),
                    ),
                );
            }
        }

        await Promise.allSettled(tasks);
        await new Promise((resolve, reject) => {
            this.mainDB.close(err => (err ? reject(err) : resolve()));
        });

        await new Promise((resolve, reject) => {
            this.logDB.close(err => (err ? reject(err) : resolve()));
        });

        this.mainDB = this.logDB = null;
        return true;
    }

    /**
     * @param {string} sql
     * @returns {Promise<sql.Statement>}
     */
    static prep(sql, db = this.mainDB) {
        return new Promise((resolve, reject) => {
            db.prepare(sql, function (err) {
                err ? reject(err) : resolve(this);
            });
        });
    }

    /**
     * @param {sql.Statement} stmt
     * @param {any} args
     * @returns {Promise<sql.RunResult>}
     */
    static run(stmt, args) {
        return new Promise((resolve, reject) =>
            stmt.run(args, function (err) {
                err ? reject({ err, stmt, args }) : resolve(this);
            }),
        );
    }

    /**
     * @param {sql.Statement} stmt
     * @param {any} args
     * @param {Function?} cb
     * @returns {Promise<any>}
     */
    static get(stmt, args, cb) {
        return new Promise((resolve, reject) =>
            stmt.get(args, function (err, row) {
                err ? reject({ err, stmt, args }) : (cb && cb(this), resolve(row));
            }),
        );
    }

    /**
     * @param {sql.Statement} stmt
     * @param {any} args
     * @param {Function} cb
     * @returns {Promise<any[]>}
     */
    static all(stmt, args, cb) {
        return new Promise((resolve, reject) =>
            stmt.all(args, function (err, rows) {
                err ? reject({ err, stmt, args }) : (cb && cb(this), resolve(rows));
            }),
        );
    }
}

module.exports = DB;
