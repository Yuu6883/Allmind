const { REST, Routes } = require('discord.js');

const commands = [
    {
        name: 'garage',
        description: 'Assemble AC',
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
