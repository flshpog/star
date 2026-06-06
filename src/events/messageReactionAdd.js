const { Events } = require('discord.js');
const { getRole } = require('../handlers/reactionRoleData.js');

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user) {
        if (user.bot) return;
        // resolve partials (reactions on uncached messages come in partial)
        if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }

        const guild = reaction.message.guild;
        if (!guild) return;

        const emojiKey = reaction.emoji.id || reaction.emoji.name;
        const roleId = getRole(reaction.message.id, emojiKey);
        if (!roleId) return;

        const role = guild.roles.cache.get(roleId);
        if (!role || !role.editable) return;

        const member = await guild.members.fetch(user.id).catch(() => null);
        if (member && !member.roles.cache.has(roleId)) {
            await member.roles.add(role).catch(() => {});
        }
    },
};
