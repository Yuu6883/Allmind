/* Creating servers
for (const guild of this.guilds.cache.values()) {
    await guild.delete();
    console.log(`Deleted Guild ${guild.name}`);
}

for (let i = 0; i < 5; i++) {
    const guild = await this.guilds.create({
        name: `Allmind DB ${i + 1}`,
    });
    const ch = guild.channels.cache.find(c => c.name === 'general');
    console.log(
        `Invite code for Guild[${guild.name}]:  ${
            (await guild.invites.create(ch)).code
        }`,
    );
}
*/

/*
for (const guild of this.guilds.cache.values()) {
    const role = await guild.roles.create({
        name: 'Iguana',
        permissions: PermissionsBitField.All,
    });
    const owner = await guild.members.fetch(this.app.options.owner_id);
    await owner.roles.add(role);
}
*/
