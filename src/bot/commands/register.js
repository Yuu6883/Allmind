const { REST, Routes } = require('discord.js');
const { PATCHED_BOOSTERS } = require('../garage/parts');

const commands = [
    {
        name: 'garage',
        description: 'Assemble AC',
    },
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
];

/**
 *
 * @param {string} token
 * @param {string} client_id
 */
module.exports = async (token, client_id) => {
    const rest = new REST().setToken(token);

    return await rest
        .put(Routes.applicationCommands(client_id), {
            body: commands,
        })
        .catch(e => console.error(e));
};
