const { spawn } = require('child_process');

/** @returns {Promise<string>} */
const dump = (port = 0) =>
    new Promise(resolve => {
        const cmd = `timeout 0.25s tcpdump -n udp port ${~~port}`.split(' ');
        console.log(cmd.join(' '));

        let stdout = '';
        let stderr = '';
        const proc = spawn(cmd[0], cmd.slice(1));
        proc.stdout.on('data', data => (stdout += data.toString()));
        proc.stderr.on('data', data => (stderr += data.toString()));
        proc.on('close', () => resolve({ stdout, stderr }));
    });

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
            this.app.pm2.connect(error => (error ? reject(error) : resolve()));
        }).catch(_ => console.error('Failed to connect to pm2'));

        const loop = async () => {
            const udpLog = await dump(this.app.options.pal.port);

            console.log(udpLog);

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
