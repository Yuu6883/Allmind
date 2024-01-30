const { exec } = require('child_process');

/** @returns {Promise<string>} */
const dump = (port = 0) =>
    new Promise(resolve =>
        exec(`timeout 0.25s tcpdump -n udp port ${~~port}`, (err, stdout, stderr) => {
            console.log(`stdout: ${stdout} \nstderr: ${stderr}`);
            resolve(stdout);
        }),
    );

module.exports = class Palworld {
    /** @param {App} app */
    constructor(app) {
        this.app = app;
        this.timeout = null;
        this.stopped = false;

        /** @type {import("pm2").ProcessDescription} */
        this.ps = null;
    }

    async monitor() {
        await new Promise((resolve, reject) => {
            pm2.connect(error => (error ? reject(error) : resolve()));
        }).catch(_ => console.error('Failed to connect to pm2'));

        const loop = async () => {
            const [ps, udpLog] = await Promise.all([
                new Promise(resolve =>
                    this.app.pm2.describe('palworld', (error, ls) => {
                        if (error) {
                            console.error(error);
                            resolve(null);
                        } else resolve(ls[0]);
                    }),
                ),
                dump(this.app.options.pal.port),
            ]);

            this.ps = ps;
            console.log(this.ps);

            if (this.stopped) return;
            // this.timeout = setTimeout(loop, 10 * 1000); // 10s
        };
        loop();
    }

    list() {}

    stop() {
        clearTimeout(this.timeout);
        this.stopped = true;
    }
};
