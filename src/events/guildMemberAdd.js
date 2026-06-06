const { Events } = require('discord.js');
const { getConfig, formatWelcome } = require('../handlers/joinData.js');
const stickyRoles = require('../handlers/stickyRoleData.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (!member.guild) return;
        const cfg = getConfig(member.guild.id);
        const me = member.guild.members.me;
        const canManage = me?.permissions.has('ManageRoles');

        // helper: assign a role only if it's safe to (exists, not managed, below the bot)
        const giveRole = async (roleId) => {
            const role = member.guild.roles.cache.get(roleId);
            if (!role || role.managed || !canManage || !role.editable) return;
            if (member.roles.cache.has(roleId)) return;
            await member.roles.add(role).catch(() => {});
        };

        // --- sticky roles: restore what they had before leaving ---
        if (stickyRoles.isEnabled(member.guild.id)) {
            for (const roleId of stickyRoles.getMemberRoles(member.guild.id, member.id)) {
                await giveRole(roleId);
            }
        }

        // --- autoroles ---
        for (const roleId of cfg.autoroles) {
            await giveRole(roleId);
        }

        // --- welcome message (humans only) ---
        if (member.user.bot) return;
        const w = cfg.welcome;
        if (!w.enabled || !w.channel) return;

        const channel = member.guild.channels.cache.get(w.channel)
            || await member.guild.channels.fetch(w.channel).catch(() => null);
        if (!channel) return;

        await channel.send({
            content: formatWelcome(w.message, member),
            allowedMentions: { users: [member.id] },
        }).catch(() => {});
    },
};
