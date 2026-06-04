const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('show information about this server'),

    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: 'use this command in a server.', ephemeral: true });
        }

        const { guild } = interaction;
        const owner = await guild.fetchOwner();

        const embed = new EmbedBuilder()
            .setTitle(guild.name)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .setColor(0x5865f2)
            .addFields(
                { name: 'owner', value: owner.user.tag, inline: true },
                { name: 'members', value: `${guild.memberCount}`, inline: true },
                { name: 'channels', value: `${guild.channels.cache.size}`, inline: true },
                { name: 'roles', value: `${guild.roles.cache.size}`, inline: true },
                { name: 'boosts', value: `${guild.premiumSubscriptionCount ?? 0}`, inline: true },
                { name: 'created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:r>` },
            )
            .setFooter({ text: `id: ${guild.id}` });

        await interaction.reply({ embeds: [embed] });
    },
};
