const { performance } = require('perf_hooks');
const RL = require('readline').createInterface(process.stdin);
const start = performance.now();
const App = require('./src/app');
console.log(`import took ${(performance.now() - start).toFixed(2)}ms`);

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
