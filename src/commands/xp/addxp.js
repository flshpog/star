const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addxp')
        .setDescription('add or remove xp from a member.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(o => o.setName('member').setDescription('which member to modify').setRequired(true))
        .addIntegerOption(o => o.setName('xp').setDescription('how much xp to add (negative number to remove xp)').setMinValue(-1e10).setMaxValue(1e10).setRequired(true))
        .addStringOption(o => o.setName('operation').setDescription('how the xp amount should be interpreted').addChoices(
            { name: 'add xp', value: 'add_xp' },
            { name: 'set xp to', value: 'set_xp' },
            { name: 'add levels', value: 'add_level' },
            { name: 'set level to', value: 'set_level' },
        )),

    async execute(interaction) {
        const int = interaction;
        const client = int.client;
        const tools = new Tools(client, int);

        const member = int.options.get("member")?.member;
        const amount = int.options.get("xp")?.value;
        const operation = int.options.get("operation")?.value || "add_xp";

        let user = member?.user;
        if (!user) return tools.warn("i couldn't find that member!");

        let db = await tools.fetchSettings(user.id);
        if (!db) return tools.warn("*noData");
        else if (!tools.canManageServer(int.member, db.settings.manualPerms)) return tools.warn("*notMod");
        else if (!db.settings.enabled) return tools.warn("*xpDisabled");

        if (amount === 0 && operation.startsWith("add")) return tools.warn("invalid amount of xp!");
        else if (user.bot) return tools.warn("you can't give xp to bots, silly!");

        let currentXP = db.users[user.id];
        let xp = currentXP?.xp || 0;
        let level = tools.getLevel(xp, db.settings);

        let newXP = xp;
        let newLevel = level;

        switch (operation) {
            case "add_xp": newXP += amount; break;
            case "set_xp": newXP = amount; break;
            case "add_level": newLevel += amount; break;
            case "set_level": newLevel = amount; break;
        }

        newXP = Math.max(0, newXP);
        newLevel = tools.clamp(newLevel, 0, db.settings.maxLevel);

        if (newXP != xp) newLevel = tools.getLevel(newXP, db.settings);
        else if (newLevel != level) newXP = tools.xpForLevel(newLevel, db.settings);

        let syncMode = db.settings.rewardSyncing.sync;
        if (syncMode == "xp" || (syncMode == "level" && newLevel != level) || (newLevel > level)) {
            let roleCheck = tools.checkLevelRoles(int.guild.roles.cache, member.roles.cache, newLevel, db.settings.rewards);
            tools.syncLevelRoles(member, roleCheck).catch(() => {});
        }
        let xpDiff = newXP - xp;

        client.db.update(int.guild.id, { $set: { [`users.${user.id}.xp`]: newXP } }).then(() => {
            int.reply(`${user.displayName} now has **${tools.commafy(newXP)}** xp${newLevel != level ? ` and is **level ${newLevel}**` : ""}! (previously ${tools.commafy(xp)}, ${xpDiff >= 0 ? "+" : ""}${tools.commafy(xpDiff)})`);
        }).catch(() => tools.warn("something went wrong while trying to modify xp!"));
    }
};
