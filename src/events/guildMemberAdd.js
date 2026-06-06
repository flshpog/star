const { Events } = require('discord.js');
const { getConfig, formatWelcome } = require('../handlers/joinData.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (!member.guild) return;
        const cfg = getConfig(member.guild.id);

        // --- autoroles ---
        if (cfg.autoroles.length) {
            const me = member.guild.members.me;
            const canManage = me?.permissions.has('ManageRoles');
            for (const roleId of cfg.autoroles) {
                const role = member.guild.roles.cache.get(roleId);
                // skip roles we can't assign (gone, managed, or above the bot)
                if (!role || role.managed || !canManage || !role.editable) continue;
                await member.roles.add(role).catch(() => {});
            }
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
