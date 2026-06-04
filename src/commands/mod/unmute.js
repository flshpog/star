const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getMuteRole } = require('../../handlers/modData.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove the mute role from a member.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('The member to unmute').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        const muteRoleId = getMuteRole(int.guild.id);
        if (!muteRoleId) return tools.warn("No mute role is set.");

        const role = int.guild.roles.cache.get(muteRoleId);
        const user = int.options.getUser('user');
        const reason = int.options.getString('reason') || 'No reason provided';
        const member = int.options.getMember('user');

        if (!member) return tools.warn("That user isn't in this server.");
        if (!role || !member.roles.cache.has(role.id)) return tools.warn("That member isn't muted.");
        if (!role.editable) return tools.warn("I can't remove the mute role — it's above my highest role.");

        try {
            await member.roles.remove(role, `${int.user.tag}: ${reason}`);
        } catch {
            return tools.warn("Failed to remove the mute role.");
        }

        const embed = tools.createEmbed({
            title: 'Member unmuted',
            description: `**${user.tag}** was unmuted.`,
            footer: `Moderator: ${int.user.tag}`
        });
        return int.reply({ embeds: [embed] });
    }
};
