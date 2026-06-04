const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getMuteRole, parseDuration } = require('../../handlers/modData.js');

const MAX_TIMER = 2147483647; // setTimeout's ~24.8-day ceiling

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rmute')
        .setDescription('mute a member by applying the configured mute role.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('the member to mute').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('optional auto-unmute time, e.g. 10m, 1h, 1d'))
        .addStringOption(o => o.setName('reason').setDescription('reason for the mute')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        const muteRoleId = getMuteRole(int.guild.id);
        if (!muteRoleId) return tools.warn("no mute role is set. an admin can set one with `/modconfig muterole`.");

        const role = int.guild.roles.cache.get(muteRoleId);
        if (!role) return tools.warn("the configured mute role no longer exists. set a new one with `/modconfig muterole`.");

        const user = int.options.getUser('user');
        const reason = int.options.getString('reason') || 'no reason provided';
        const member = int.options.getMember('user');

        if (!member) return tools.warn("that user isn't in this server.");
        if (user.id === int.user.id) return tools.warn("you can't mute yourself!");
        if (member.roles.cache.has(role.id)) return tools.warn("that member is already muted.");
        if (!role.editable) return tools.warn("i can't assign the mute role — it's above my highest role.");

        let ms = parseDuration(int.options.getString('duration'));

        try {
            await member.roles.add(role, `${int.user.tag}: ${reason}`);
        } catch {
            return tools.warn("failed to apply the mute role.");
        }

        // auto-unmute (in-memory only — won't survive a restart)
        let durationNote = '';
        if (ms) {
            if (ms <= MAX_TIMER) {
                setTimeout(() => { member.roles.remove(role, 'mute expired').catch(() => {}); }, ms);
                durationNote = ` for ${tools.time(ms)}`;
            } else {
                durationNote = ' (duration too long to auto-expire — unmute manually)';
            }
        }

        const embed = tools.createEmbed({
            title: 'member muted',
            description: `**${user.tag}** was muted${durationNote}.`,
            fields: [{ name: 'reason', value: reason }],
            footer: `moderator: ${int.user.tag}`
        });
        return int.reply({ embeds: [embed] });
    }
};
