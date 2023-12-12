const { REST, Routes } = require('discord.js');

/**
 *
 * @param {string} token
 * @param {string} client_id
 * @param {string} guild_id
 */
module.exports = async (token, client_id, guild_id) => {
    const rest = new REST().setToken(token);

    return await rest
        .put(Routes.applicationGuildCommands(client_id, guild_id), {
            body: [],
        })
        .catch(e => console.error(e));
};
