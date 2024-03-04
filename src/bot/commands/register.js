const { REST, Routes } = require('discord.js');
const { PATCHED_BOOSTERS } = require('../garage/parts');

const commands = [
    {
        name: 'garage',
        description: 'Assemble AC',
    },
    /*
    {
        name: 'emotes',
        description: 'List all emotes in the server',
        options: [
            {
                type: 3,
                name: 'filter',
                description: 'filter by name',
                required: false,
                choices: [
                    'head',
                    'core',
                    'arms',
                    'legs',
                    'booster',
                    'FCS',
                    'generator',
                ].map(v => ({ name: v.toUpperCase(), value: v })),
            },
        ],
    },
    */
    {
        name: 'speed',
        description: 'List speed stats given booster and weight (assume no overburden)',
        options: [
            {
                type: 3,
                name: 'booster',
                description: 'Booster',
                required: true,
                choices: PATCHED_BOOSTERS.map(b => ({
                    name: b.short ?? b.name,
                    value: b.id.toString(),
                })),
            },
            {
                type: 4,
                name: 'weight',
                description: 'AC total weight',
                required: true,
                min_value: 30000,
                max_value: 150000,
            },
        ],
    },
    {
        name: 'link',
        description: 'Link external account to your discord account in Allmind database',
        options: [
            {
                type: 3,
                name: 'provider',
                description: 'Third party account provider',
                required: true,
                choices: [
                    {
                        name: 'Challonge',
                        value: 'challonge',
                    },
                ],
            },
        ],
    },
    {
        name: 'challonge',
        description: 'Connect a Challonge tournament to Discord',
        options: [
            {
                type: 1,
                name: 'setup',
                description: 'Set up a Challonge tournament in this guild',
                options: [
                    {
                        type: 3,
                        name: 'tournament',
                        description: 'Tournament ID on Challonge',
                        required: true,
                    },
                    {
                        type: 7,
                        name: 'channel',
                        description: 'Channel to host the tournament',
                        required: true,
                    },
                    {
                        type: 8,
                        name: 'role',
                        description: 'Moderation role for the tournament',
                        required: true,
                    },
                ],
            },
        ],
    },
    {
        name: 'p2p',
        description: 'Test p2p ping with a user',
        options: [
            {
                type: 6,
                name: 'user',
                description: 'User to invite to a p2p ping test',
                required: true,
            },
        ],
    },
    {
        name: 'random',
        description: 'Generate random AC with specific constraints',
        options: [
            {
                type: 3,
                name: 'legs',
                description: 'Leg type',
                required: true,
                choices: [
                    {
                        name: 'Any',
                        value: 'BIPEDAL,REVERSE JOINT,TETRAPOD,TANK',
                    },
                    {
                        name: 'Bipedal',
                        value: 'BIPEDAL',
                    },
                    {
                        name: 'Reverse Joint',
                        value: 'REVERSE JOINT',
                    },
                    {
                        name: 'Tetrapod',
                        value: 'TETRAPOD',
                    },
                    {
                        name: 'Tank',
                        value: 'TANK',
                    },
                    {
                        name: 'Non-Tonk',
                        value: 'BIPEDAL,REVERSE JOINT,TETRAPOD',
                    },
                ],
            },
            {
                type: 5,
                name: 'allow_arms_overburden',
                description: 'Allow arms overburden (default false)',
            },
            {
                type: 5,
                name: 'allow_legs_overburden',
                description: 'Allow legs overburden (default false)',
            },
            {
                type: 5,
                name: 'public',
                description: 'Make output visible to channel (default false)',
            },
        ],
    },
    {
        name: 'pal',
        description: 'Palworld commands',
        options: [
            {
                type: 1,
                name: 'access',
                description: 'Generate link to whitelist user to play on Palworld server',
            },
            {
                type: 1,
                name: 'stats',
                description: 'List current online players and Palworld server stats',
                options: [
                    {
                        type: 5,
                        name: 'cpu',
                        description: 'Show CPU usage (default false)',
                    },
                ],
            },
        ],
    },
    {
        name: 'terra',
        description: 'Terraria commands',
        options: [
            {
                type: 1,
                name: 'access',
                description: 'Generate link to whitelist user to play on terraria server',
            },
            {
                type: 1,
                name: 'stats',
                description: 'List current online players and Terraria server stats',
                options: [
                    {
                        type: 5,
                        name: 'cpu',
                        description: 'Show CPU usage (default false)',
                    },
                ],
            },
        ],
    },
];

/**
 *
 * @param {string} token
 * @param {string} client_id
 * @param {AccessOptions} access
 */
module.exports = async (token, client_id, access) => {
    const rest = new REST().setToken(token);

    let body = commands;
    if (!access?.pal) body = body.filter(c => c.name !== 'pal');
    if (!access?.terra) body = body.filter(c => c.name !== 'terra');

    return await rest
        .put(Routes.applicationCommands(client_id), {
            body,
        })
        .catch(e => console.error(e));
};
