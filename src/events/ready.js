const { Events, REST, Routes } = require('discord.js');
const { startPeriodicCheck } = require('../handlers/stickyManager.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        const commands = client.commands.map(cmd => cmd.data.toJSON());
        const rest = new REST().setToken(process.env.BOT_TOKEN);
        const clientId = process.env.CLIENT_ID || client.user.id;

        try {
            if (process.env.GUILD_ID) {
                // single-server bot: register to the guild only (updates instantly).
                await rest.put(
                    Routes.applicationGuildCommands(clientId, process.env.GUILD_ID),
                    { body: commands },
                );
                console.log(`Registered ${commands.length} commands to guild ${process.env.GUILD_ID}.`);

                // clear any global commands so they don't show up as duplicates.
                await rest.put(Routes.applicationCommands(clientId), { body: [] });
            } else {
                // no guild set: fall back to global (first registration can take ~1h).
                await rest.put(Routes.applicationCommands(clientId), { body: commands });
                console.log(`Registered ${commands.length} global commands.`);
            }
        } catch (error) {
            console.error('Error registering slash commands:', error);
        }

        client.user.setActivity('★');

        // re-post stickies that have drifted from the bottom of their channel
        startPeriodicCheck(client);
    },
};
