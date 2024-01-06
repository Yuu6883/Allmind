const { uid2id } = require('../util/cache');
const { B, R, BS } = require('../util/form');
const { sid, bps2str } = require('../util/misc');
const UserDB = require('../../database/user');
const { EmbedBuilder } = require('discord.js');

class Peer {
    /**
     * @param {P2P} parent
     * @param {import("discord.js").User} u1
     * @param {import("discord.js").User} u2
     */
    constructor(parent, u1, u2) {
        this.parent = parent;

        /** @type {[string, string]} */
        this.pids = [null, null];

        /** @type {[{ type: RTCSdpType, sdp: string }, { type: RTCSdpType, sdp: string }]} */
        this.desc = [null, null];

        /** @type {[string, string]} */
        this.cand = [null, null];

        /** @type {[uWSRes, uWSRes]} */
        this.streams = [null, null];

        /** @type {[string, string]} */
        this.results = [null, null];

        this.users = [u1, u2];

        // populate ids
        do this.uid = sid(16);
        while (this.parent.map.has(this.uid));
        this.parent.map.set(this.uid, this);

        do this.pids[0] = sid(12);
        while (this.parent.peers.has(this.pids[0]));
        this.parent.peers.set(this.pids[0], this);

        do this.pids[1] = sid(12);
        while (this.parent.peers.has(this.pids[1]));
        this.parent.peers.set(this.pids[1], this);

        // expire check
        this.timestamp = Date.now();
    }

    async delete() {
        const id1 = await uid2id(this.users[0].id);
        const id2 = await uid2id(this.users[1].id);

        this.parent.ids.delete(id1);
        this.parent.ids.delete(id2);

        this.parent.map.delete(this.uid);
        this.parent.peers.delete(this.pids[0]);
        this.parent.peers.delete(this.pids[1]);
    }
}

const warn = msg => `⚠️ **${msg}** ⚠️`;
class P2P {
    /** @param {App} app */
    constructor(app) {
        this.app = app;
        /** @type {Map<string, Peer>} */
        this.map = new Map();
        /** @type {Map<string, Peer>} */
        this.peers = new Map();
        /** @type {Set<number>} */
        this.ids = new Set();
    }

    /**
     * @param {import("discord.js").User} u1
     * @param {import("discord.js").User} u2
     */
    async reg(u1, u2) {
        const id1 = await uid2id(u1.id);
        const id2 = await uid2id(u2.id);
        if (this.ids.has(id1) || this.ids.has(id2)) return null;
        this.ids.add(id1);
        this.ids.add(id2);
        return new Peer(this, u1, u2);
    }

    /** @param {import("discord.js").ChatInputCommandInteraction} curr */
    async setup(curr) {
        /** @type {import("discord.js").GuildMember} */
        const p1 = curr.member;
        /** @type {import("discord.js").GuildMember} */
        const p2 = curr.options.getMember('user');

        if (p2.user.bot)
            return await curr.reply({
                content: 'Bot cannot accept p2p test',
                ephemeral: true,
            });

        if (p1.id === p2.id)
            return await curr.reply({
                content: 'Duh',
                ephemeral: true,
            });

        await Promise.all([curr.deferReply(), UserDB.reg('discord', p1.id, p2.id)]);
        const peer = await this.reg(p1, p2);

        if (!peer)
            return await curr.editReply({
                content: warn('Either you or the other user has a p2p test pending'),
            });

        await curr.editReply({
            content: `<@!${p2.id}> ${p1.displayName} invited you to a p2p test`,
            components: [
                R(
                    B(`accept_${peer.uid}`, 'Accept', { style: BS.Success }),
                    B(`result_${peer.uid}`, 'Get Result'),
                ),
            ],
            allowedMentions: {
                parse: ['users'],
            },
        });
    }

    /** @param {import("discord.js").MessageComponentInteraction} curr */
    async handle(curr) {
        if (!curr.isButton()) return;
        const [action, id] = curr.customId.split('_');
        const peer = this.map.get(id);
        if (!peer)
            return await curr.reply({
                content: warn('p2p test expired'),
                ephemeral: true,
            });

        const idx = peer.users.findIndex(u => u.id === curr.user.id);
        if (idx < 0)
            return await curr.reply({
                content: warn('This p2p test is not for you'),
                ephemeral: true,
            });

        const { pids, results, users } = peer;
        if (action === 'accept') {
            const pid = pids[idx];
            await curr.reply({
                content: warn(
                    'This link is only intended for you, do not share with others',
                ),
                components: [
                    R(
                        B(null, 'P2P Test', {
                            url: `${this.app.options.domain}?p2p=${pid}`,
                        }),
                    ),
                ],
                ephemeral: true,
            });
        } else if (action === 'result') {
            if (!results[0] || !results[1]) {
                return await curr.reply({
                    content: 'Test incomplete',
                    ephemeral: true,
                });
            }

            const embeds = [];
            try {
                /** @param {{ [key: string]: number[] }} speedMap */
                const str = speedMap => {
                    let output = '';
                    for (const speed in speedMap) {
                        const arr = speedMap[speed];

                        let min = arr[0];
                        let max = arr[0];
                        let avg = 0;

                        for (const n of arr) {
                            min = Math.min(min, n);
                            max = Math.max(max, n);
                            avg += n;
                        }

                        avg = avg / arr.length;

                        const s1 = `[x${arr.length}]`;
                        const s2 = bps2str(~~speed);
                        const s3 = `${s1}${' '.repeat(11 - s1.length - s2.length)}${s2}`;

                        output += `${s3}  ｜ ${(bps2str(min) + 'ps').padStart(
                            7,
                            ' ',
                        )} ｜ ${(bps2str(min) + 'ps').padStart(7, ' ')} ｜ ${(
                            bps2str(min) + 'ps'
                        ).padStart(7, ' ')}\n`;
                    }
                    return output;
                };

                /** @type {[P2PResult, P2PResult]} */
                const results = peer.results.map(r => JSON.parse(r));
                for (let i = 0; i < results.length; i++) {
                    const user = users[i];
                    const r = results[i];
                    const embed = new EmbedBuilder();

                    embed
                        .setTitle('P2P Ping Test')
                        .setDescription(
                            `Avg: **${Math.round(r.avgPing)}ms**\n` +
                                `Jitter: **${Math.round(r.jitter)}ms**\n` +
                                `Packet Loss: **${(
                                    (r.packetLoss / r.pings) *
                                    100
                                ).toFixed(2)}% [${r.packetLoss}/${r.pings}]**`,
                        )
                        .setThumbnail(user.displayAvatarURL({ size: 256 }))
                        .addFields([
                            {
                                name: 'DOWNLOAD',
                                value: `\`\`\`ps\npacket size  ｜   min   ｜   max   ｜   avg\n${str(
                                    r.dl,
                                )}\`\`\``,
                            },
                            {
                                name: 'UPLOAD',
                                value: `\`\`\`ps\npacket size  ｜   min   ｜   max   ｜   avg\n${str(
                                    r.ul,
                                )}\`\`\``,
                            },
                        ])
                        .setColor('#02d6a5');

                    embeds.push(embed);
                }
            } catch (e) {
                console.error(e);
            }

            await curr.deferUpdate();
            if (embeds.length) {
                curr.editReply({
                    content: '',
                    embeds,
                    components: [],
                });
            } else {
                curr.editReply({
                    content: warn('error happend'),
                    components: [],
                });
            }
        }
    }
}

module.exports = P2P;
