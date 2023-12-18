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
