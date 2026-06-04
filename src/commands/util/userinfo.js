const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Show information about a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to look up (defaults to you)')),

    async execute(interaction) {
        const user = interaction.options.getUser('user') ?? interaction.user;
        const member = interaction.options.getMember('user') ?? interaction.member;

        const embed = new EmbedBuilder()
            .setTitle(user.tag)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .setColor(member?.displayColor || 0x5865f2)
            .addFields(
                { name: 'ID', value: user.id, inline: true },
                { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
                { name: 'Account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>` },
            );

        if (member?.joinedTimestamp) {
            embed.addFields({ name: 'Joined server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` });
        }

        if (member) {
            const roles = member.roles.cache
                .filter(r => r.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => r.toString());
            if (roles.length) {
                embed.addFields({ name: `Roles (${roles.length})`, value: roles.slice(0, 20).join(' ') });
            }
        }

        await interaction.reply({ embeds: [embed] });
    },
};
