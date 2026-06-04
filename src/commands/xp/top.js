const { SlashCommandBuilder } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const PageEmbed = require('../../classes/PageEmbed.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription("View the server's XP leaderboard.")
        .addIntegerOption(o => o.setName('page').setDescription('Which page to view (negative to start from the last page)'))
        .addUserOption(o => o.setName('member').setDescription("Find a member's position on the leaderboard (overrides page)"))
        .addBooleanOption(o => o.setName('hidden').setDescription('Hides the reply so only you can see it')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        let db = await tools.fetchAll();
        if (!db || !db.users || !Object.keys(db.users).length) return tools.warn(`Nobody in this server is ranked yet!`);
        else if (!db.settings.enabled) return tools.warn("*xpDisabled");
        else if (db.settings.leaderboard.disabled) return tools.warn("The leaderboard is disabled in this server!");

        let pageNumber = int.options.get("page")?.value || 1;
        let pageSize = 10;

        let minLeaderboardXP = db.settings.leaderboard.minLevel > 1 ? tools.xpForLevel(db.settings.leaderboard.minLevel, db.settings) : 0;
        let rankings = tools.xpObjToArray(db.users);
        rankings = rankings.filter(x => x.xp > minLeaderboardXP && !x.hidden).sort(function(a, b) { return b.xp - a.xp; });

        if (db.settings.leaderboard.maxEntries > 0) rankings = rankings.slice(0, db.settings.leaderboard.maxEntries);

        if (!rankings.length) return tools.warn("Nobody in this server is on the leaderboard yet!");

        let highlight = null;
        let userSearch = int.options.get("user") || int.options.get("member");
        if (userSearch) {
            let foundRanking = rankings.findIndex(x => x.id == userSearch.user.id);
            if (isNaN(foundRanking) || foundRanking < 0) return tools.warn(int.user.id == userSearch.user.id ? "You aren't on the leaderboard!" : "This member isn't on the leaderboard!");
            else pageNumber = Math.floor(foundRanking / pageSize) + 1;
            highlight = userSearch.user.id;
        }

        let embed = tools.createEmbed({
            author: { name: 'Leaderboard for ' + int.guild.name, iconURL: int.guild.iconURL() }
        });

        let isHidden = db.settings.leaderboard.ephemeral || !!int.options.get("hidden")?.value;

        let xpEmbed = new PageEmbed(embed, rankings, {
            page: pageNumber, size: pageSize, owner: int.user.id, ephemeral: isHidden,
            mapFunction: (x, y, p) => `**${p})** ${x.id == highlight ? "**" : ""}Lv. ${tools.getLevel(x.xp, db.settings)} - <@${x.id}> (${tools.commafy(x.xp)} XP)${x.id == highlight ? "**" : ""}`
        });
        if (!xpEmbed.data.length) return tools.warn("There are no members on this page!");

        xpEmbed.post(int);
    }
};
