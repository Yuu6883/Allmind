const Allmind = require('./bot');
const DB = require('./database');

module.exports = class App {
    /** @param {AppOptions} options */
    constructor(options) {
        options.host = options.host || '0.0.0.0';
        options.port = options.port || 3000;
        options.access_log = options.access_log || false;

        this.options = options;
        this.bot = new Allmind(this);
    }

    async init() {
        await DB.open();
        console.log('Mind DB Opened');
        await this.bot.init();
        console.log('Allmind Online');
    }

    async stop() {
        await this.bot.destroy();
        console.log('Allmind Offline');
        await DB.close();
        console.log('Mind DB Closed');
    }
};
