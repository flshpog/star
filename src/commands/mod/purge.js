const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete a number of recent messages from this channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(o => o.setName('amount').setDescription('How many messages to delete (1-1000)').setMinValue(1).setMaxValue(1000).setRequired(true)),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        const channel = interaction.channel;
        await interaction.deferReply({ ephemeral: true });

        try {
            let deletedCount = 0;
            let remaining = amount;

            // bulkDelete: max 100 at a time, only messages < 14 days old
            while (remaining > 0) {
                const deleteAmount = Math.min(remaining, 100);
                const messages = await channel.messages.fetch({ limit: deleteAmount });
                if (messages.size === 0) break;

                const deletable = messages.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
                if (deletable.size === 0) break;

                const deleted = await channel.bulkDelete(deletable, true);
                deletedCount += deleted.size;
                remaining -= deleteAmount;
                if (deleted.size < deleteAmount) break;
            }

            await interaction.editReply(`Deleted **${deletedCount}** message${deletedCount !== 1 ? 's' : ''}.${deletedCount < amount ? ' (Messages older than 14 days can\'t be bulk-deleted.)' : ''}`);
        } catch (e) {
            let msg = 'Failed to delete messages. ';
            if (e.code === 50013) msg += "I don't have permission to manage messages here.";
            else if (e.code === 50001) msg += "I don't have access to this channel.";
            else msg += 'Check that I have the necessary permissions.';
            await interaction.editReply(msg);
        }
    }
};
