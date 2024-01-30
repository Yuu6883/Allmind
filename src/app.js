const pm2 = require('pm2');
const ChallongeAPI = require('./auth/challonge');
const Allmind = require('./bot');
const DB = require('./database');
const Server = require('./routes');
const Palworld = require('./bot/pal');

module.exports = class App {
    /** @param {AppOptions} options */
    constructor(options) {
        options.host = options.host || '0.0.0.0';
        options.port = options.port || 3000;
        options.access_log = options.access_log || false;
        options.domain = options.domain || `http://localhost:${options.port}`;

        this.options = options;
        this.bot = new Allmind(this);
        this.server = new Server(this);

        this.auth = {
            challonge: new ChallongeAPI(this),
        };
        this.name = 'Allmind';

        if (options.pal && process.platform === 'linux') this.pal = new Palworld(this);
    }

    get pm2() {
        return pm2;
    }

    async init() {
        if (this.pal) await this.pal.monitor();

        await DB.open();
        console.log('Mind DB Opened');
        await this.server.open();
        console.log('Web Server Online');
        await this.bot.init();
        this.name = this.bot.user.displayName;
        console.log(`${this.name} Online`);
    }

    async stop() {
        this.server.close();
        console.log('Web Server Closed');
        await this.bot.destroy();
        console.log(`${this.name} Offline`);
        await DB.close();

        if (this.pal) this.pal.stop();

        console.log('Mind DB Closed');
    }
};
