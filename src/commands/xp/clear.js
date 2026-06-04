const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription("clear a member's xp cooldown.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(o => o.setName('member').setDescription('which member to clear').setRequired(true)),

    async execute(interaction) {
        const int = interaction;
        const client = int.client;
        const tools = new Tools(client, int);

        const user = int.options.get("member")?.user;

        let db = await tools.fetchSettings(user.id);
        if (!db) return tools.warn("*noData");
        else if (!tools.canManageServer(int.member, db.settings.manualPerms)) return tools.warn("*notMod");
        else if (!db.settings.enabled) return tools.warn("*xpDisabled");

        if (user.bot) return tools.warn("bots don't have cooldowns, silly!");

        let current = db.users[user.id];
        let cooldown = current?.cooldown;
        if (!cooldown || cooldown <= Date.now()) return tools.warn("this member doesn't have an active cooldown!");

        client.db.update(int.guild.id, { $set: { [`users.${user.id}.cooldown`]: 0 } }).then(() => {
            int.reply(`${tools.pluralS(user.displayName)} cooldown has been reset! (previously ${tools.timestamp(cooldown - Date.now())})`);
        }).catch(() => tools.warn("something went wrong while trying to reset the cooldown!"));
    }
};
