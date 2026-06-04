const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync')
        .setDescription('sync your level roles by adding missing ones and removing incorrect ones.')
        .addUserOption(o => o.setName('member').setDescription('which member to sync (requires manage server permission)')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        let foundUser = int.options.get("member");
        let member = foundUser ? foundUser.member : int.member;
        if (!int.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return tools.warn("*cantManageRoles");

        let db = await tools.fetchSettings(member.id);
        if (!db) return tools.warn("*noData");
        else if (!db.settings.enabled) return tools.warn("*xpDisabled");

        let isMod = db.settings.manualPerms ? tools.canManageRoles() : tools.canManageServer();
        if (member.id != int.user.id && !isMod) return tools.warn("you don't have permission to sync someone else's roles!");

        else if (db.settings.rewardSyncing.noManual && !isMod) return tools.warn("you don't have permission to sync your level roles!");
        else if (!db.settings.rewards.length) return tools.warn("this server doesn't have any reward roles!");

        let currentXP = db.users[member.id];
        if (!currentXP || !currentXP.xp) return tools.noXPYet(member.user);

        let xp = currentXP.xp;
        let level = tools.getLevel(xp, db.settings);

        let currentRoles = member.roles.cache;
        let roleCheck = tools.checkLevelRoles(int.guild.roles.cache, currentRoles, level, db.settings.rewards);
        if (!roleCheck.incorrect.length && !roleCheck.missing.length) return int.reply("your level roles are already properly synced!");

        tools.syncLevelRoles(member, roleCheck).then(() => {
            let replyStr = ["level roles successfully synced!"];
            if (roleCheck.missing.length) replyStr.push(`added: ${roleCheck.missing.map(x => `<@&${x.id}>`).join(" ")}`);
            if (roleCheck.incorrect.length) replyStr.push(`removed: ${roleCheck.incorrect.map(x => `<@&${x.id}>`).join(" ")}`);
            return int.reply(replyStr.join("\n"));
        }).catch(e => int.reply(`error syncing roles! ${e.message}`));
    }
};
