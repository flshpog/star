const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot repeat your message')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('What should I say?')
                .setRequired(true))
        // Only members who can manage messages may use this.
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const message = interaction.options.getString('message');
        await interaction.reply({ content: 'Sent!', ephemeral: true });
        // parse: ['users'] blocks @everyone / @here / role pings while still allowing user mentions.
        await interaction.channel.send({ content: message, allowedMentions: { parse: ['users'] } });
    },
};
