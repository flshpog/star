const { Events } = require('discord.js');
const { isEnabled, saveMemberRoles } = require('../handlers/stickyRoleData.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        if (!member.guild || !isEnabled(member.guild.id)) return;
        // a partial member (not cached) has no role list to snapshot
        if (member.partial || !member.roles) return;

        // store assignable roles only: skip @everyone and managed (bot/booster) roles
        const roleIds = member.roles.cache
            .filter(r => r.id !== member.guild.id && !r.managed)
            .map(r => r.id);

        saveMemberRoles(member.guild.id, member.id, roleIds);
    },
};
