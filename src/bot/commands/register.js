const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { STATS } = require('../garage/parts');

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
                required: true,
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
