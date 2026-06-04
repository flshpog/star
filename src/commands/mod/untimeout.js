const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('remove a timeout from a member.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('the member to un-timeout').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('reason')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        const user = int.options.getUser('user');
        const reason = int.options.getString('reason') || 'no reason provided';
        const member = int.options.getMember('user');

        if (!member) return tools.warn("that user isn't in this server.");
        if (!member.isCommunicationDisabled()) return tools.warn("that member isn't timed out.");
        if (!member.moderatable) return tools.warn("i can't edit that member — check my role position and permissions.");

        try {
            await member.timeout(null, `${int.user.tag}: ${reason}`);
        } catch {
            return tools.warn("failed to remove the timeout.");
        }

        const embed = tools.createEmbed({
            title: 'timeout removed',
            description: `**${user.tag}**'s timeout was removed.`,
            footer: `moderator: ${int.user.tag}`
        });
        return int.reply({ embeds: [embed] });
    }
};
