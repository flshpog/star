const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('ban a member from the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(o => o.setName('user').setDescription('the user to ban').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('reason for the ban'))
        .addIntegerOption(o => o.setName('delete_days').setDescription('days of their messages to delete (0-7)').setMinValue(0).setMaxValue(7)),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        const user = int.options.getUser('user');
        const reason = int.options.getString('reason') || 'no reason provided';
        const days = int.options.getInteger('delete_days') ?? 0;
        const member = int.options.getMember('user');

        if (user.id === int.user.id) return tools.warn("you can't ban yourself!");
        if (user.id === int.client.user.id) return tools.warn("i'm not going to ban myself!");

        if (member) {
            if (!member.bannable) return tools.warn("i can't ban that member — check my role position and permissions.");
            if (int.guild.ownerId !== int.user.id && int.member.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
                return tools.warn("you can't ban someone with an equal or higher role than you.");
            }
        }

        try {
            await int.guild.members.ban(user.id, { deleteMessageSeconds: days * 86400, reason: `${int.user.tag}: ${reason}` });
        } catch {
            return tools.warn("failed to ban that user.");
        }

        const embed = tools.createEmbed({
            title: 'member banned',
            description: `**${user.tag}** was banned.`,
            fields: [{ name: 'reason', value: reason }],
            footer: `moderator: ${int.user.tag}`
        });
        return int.reply({ embeds: [embed] });
    }
};
