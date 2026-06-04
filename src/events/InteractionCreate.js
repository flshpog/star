const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // --- slash commands ---
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);
                const reply = { content: 'there was an error while executing this command!', ephemeral: true };
                if (interaction.replied || interaction.deferred) await interaction.followUp(reply).catch(() => {});
                else await interaction.reply(reply).catch(() => {});
            }
            return;
        }

        // --- modal submissions ---
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('sticky_add_modal_')) {
                const command = interaction.client.commands.get('sticky');
                if (command?.handleModalSubmit) {
                    try {
                        await command.handleModalSubmit(interaction);
                    } catch (error) {
                        console.error('Error handling sticky modal:', error);
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({ content: 'there was an error processing the sticky.', ephemeral: true }).catch(() => {});
                        }
                    }
                }
            }
            return;
        }

        // Button interactions from /top pagination are handled by their own
        // message collectors (see PageEmbed), so nothing to route here.
    }
};
