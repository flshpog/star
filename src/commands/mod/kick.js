const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('kick a member from the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(o => o.setName('user').setDescription('the member to kick').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('reason for the kick')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        const user = int.options.getUser('user');
        const reason = int.options.getString('reason') || 'no reason provided';
        const member = int.options.getMember('user');

        if (!member) return tools.warn("that user isn't in this server.");
        if (user.id === int.user.id) return tools.warn("you can't kick yourself!");
        if (!member.kickable) return tools.warn("i can't kick that member — check my role position and permissions.");
        if (int.guild.ownerId !== int.user.id && int.member.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
            return tools.warn("you can't kick someone with an equal or higher role than you.");
        }

        try {
            await member.kick(`${int.user.tag}: ${reason}`);
        } catch {
            return tools.warn("failed to kick that member.");
        }

        const embed = tools.createEmbed({
            title: 'member kicked',
            description: `**${user.tag}** was kicked.`,
            fields: [{ name: 'reason', value: reason }],
            footer: `moderator: ${int.user.tag}`
        });
        return int.reply({ embeds: [embed] });
    }
};
