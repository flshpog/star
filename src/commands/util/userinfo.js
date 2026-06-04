const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('show information about a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('the user to look up (defaults to you)')),

    async execute(interaction) {
        const user = interaction.options.getUser('user') ?? interaction.user;
        const member = interaction.options.getMember('user') ?? interaction.member;

        const embed = new EmbedBuilder()
            .setTitle(user.tag)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .setColor(member?.displayColor || 0x5865f2)
            .addFields(
                { name: 'id', value: user.id, inline: true },
                { name: 'bot', value: user.bot ? 'yes' : 'no', inline: true },
                { name: 'account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:r>` },
            );

        if (member?.joinedTimestamp) {
            embed.addFields({ name: 'joined server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:r>` });
        }

        if (member) {
            const roles = member.roles.cache
                .filter(r => r.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => r.toString());
            if (roles.length) {
                embed.addFields({ name: `roles (${roles.length})`, value: roles.slice(0, 20).join(' ') });
            }
        }

        await interaction.reply({ embeds: [embed] });
    },
};
