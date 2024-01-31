const { performance } = require('perf_hooks');
const start = performance.now();

const App = require('./src/app');

const DB = require('./src/database');
const UserDB = require('./src/database/user');
const SaveDB = require('./src/database/save');
const NewsDB = require('./src/database/news');
const GarageDB = require('./src/database/garage');
const PalDB = require('./src/database/pal');

console.log(`Mind Modules Loaded (${(performance.now() - start).toFixed(2)}ms)`);

const RL = require('readline').createInterface(process.stdin);
(async () => {
    const app = new App(require('./config.json'));
    await app.init();

    RL.on('line', async line => {
        try {
            const result = eval(line);
            if (result instanceof Promise) console.log(await result);
            else console.log(result);
        } catch (e) {
            console.error(e);
        }
    });

    process.once('SIGINT', async () => {
        try {
            await app.stop();
            process.exit(0);
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    });

    process.on('uncaughtException', console.error);
    process.on('unhandledRejection', console.error);
})();
