const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const PalDB = require('../../database/pal');
const { sid } = require('../util/misc');
const { R, B, BS } = require('../util/form');

const DATA_DIR = path.resolve(__dirname, '..', '..', '..', 'data');

/** @returns {Promise<string>} */
const dump = (port = 0) =>
    new Promise(resolve => {
        const cmd = [
            'timeout',
            '0.25s',
            'tcpdump',
            '-nlU',
            '-Q',
            'out',
            `udp port ${~~port}`,
        ];

        let stdout = '';
        let stderr = '';
        const proc = spawn(cmd[0], cmd.slice(1));
        proc.stdout.on('data', data => (stdout += data.toString()));
        proc.stderr.on('data', data => (stderr += data.toString()));
        proc.on('close', code => {
            code !== 124 && console.error(code, stderr);
            resolve(stdout);
        });
    });

module.exports = class Palworld {
    /** @param {App} app */
    constructor(app) {
        this.app = app;
        this.timeout = null;
        this.stopped = false;

        /** @type {import("pm2").ProcessDescription} */
        this.ps = null;
        /** @type {string[]} */
        this.online = [];

        /** @type {Map<string, import("discord.js").User>} */
        this.pending = new Map();
        /** @type {Map<string, string>} */
        this.pendingUsers = new Map();
    }

    syncWhitelist() {}

    async monitor() {
        if (this.timeout) return;
        this.stopped = false;

        this.guild = this.app.bot.guilds.cache.get(this.app.options.pal.guild);
        this.members = await this.guild.members.fetch();

        this.log = fs.createWriteStream(path.resolve(DATA_DIR, 'pal.log'), {
            flags: 'a',
        });

        await new Promise((resolve, reject) => {
            this.app.pm2.connect(error => (error ? reject(error) : resolve()));
        }).catch(_ => console.error('Failed to connect to pm2'));

        const loop = async () => {
            const udpLog = await dump(this.app.options.pal.port);
            const lines = udpLog.split('\n');
            /** @type {Set<string>} */
            const ips = new Set();
            for (const line of lines) {
                const match = / \> (\d+\.\d+\.\d+\.\d+)/.exec(line);
                if (!match) continue;
                ips.add(match[1]);
            }

            this.online = await Promise.all(
                [...ips].map(async ip => {
                    const uid = await PalDB.get(ip);
                    if (!uid) console.error(`unknown uid map for ip: ${ip}`);
                    return uid;
                }),
            );
            if (this.stopped) return;
            this.timeout = setTimeout(loop, 10 * 1000); // 10s
        };
        loop();
    }

    /**
     * @param {string} ip
     * @param {string} uid
     */
    async whitelist(ip, uid) {
        const res = await PalDB.add(ip, uid);
        if (!res.changes) return false;
        const sub = spawnSync(path.resolve(DATA_DIR, 'whitelist.sh'), [ip], {
            timeout: 100,
        });
        if (!sub.status && !sub.signal) {
            this.pendingUsers.delete(uid);
            return true;
        }

        console.error(sub);
        return false;
    }

    stop() {
        clearTimeout(this.timeout);
        this.timeout = null;
        this.stopped = true;
        this.log?.end();
    }

    /** @param {import("discord.js").ChatInputCommandInteraction} curr */
    handle(curr) {
        const sub = curr.options.getSubcommand();

        if (sub === 'join') {
            const PAL = this.app.options.pal;
            const token = this.pendingUsers.get(curr.user.id) || sid(32);

            if (!this.members.get(curr.user.id)) {
                curr.reply({
                    content: `You are not in Discord server **${this.guild.name}**`,
                    ephemeral: true,
                });
                return;
            }

            this.pending.set(token, curr.user);
            this.pendingUsers.set(curr.user.id, token);

            curr.reply({
                content: `**${PAL.domain}:${PAL.port}**`,
                components: [
                    R(
                        B(null, 'Request Access', {
                            style: BS.Link,
                            url: `${this.app.options.domain}?pal=${token}`,
                        }),
                    ),
                ],
                ephemeral: true,
            });
            this.log.write(`${Date.now()} <@${curr.user.id}> ${curr.user.globalName}\n`);
        } else if (sub === 'stats') {
        }
    }
};
