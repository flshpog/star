const { SlashCommandBuilder } = require('discord.js');
const Tools = require('../../classes/Tools.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calculate')
        .setDescription('Check how much XP you need to reach a certain level.')
        .addIntegerOption(o => o.setName('target').setDescription('The desired level').setMinValue(1).setMaxValue(1000).setRequired(true))
        .addUserOption(o => o.setName('member').setDescription('Which member to check')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        let member = int.member;
        let foundUser = int.options.get("member");
        if (foundUser) member = foundUser.member;

        let db = await tools.fetchSettings(member.id);
        if (!db) return tools.warn("*noData");
        else if (!db.settings.enabled) return tools.warn("*xpDisabled");

        let targetLevel = Math.min(int.options.get("target").value, db.settings.maxLevel);
        let targetXP = tools.xpForLevel(targetLevel, db.settings);

        if (db.settings.rankCard.disabled) {
            let miniEmbed = tools.createEmbed({
                title: `Level ${tools.commafy(targetLevel)}`,
                description: `${tools.commafy(targetXP)} XP required`,
                footer: "Rank cards are disabled, so calculations are hidden!"
            });
            return int.reply({ embeds: [miniEmbed] });
        }

        let currentXP = db.users[member.id];
        if (!currentXP || !currentXP.xp) return tools.noXPYet(foundUser ? foundUser.user : int.user);
        let xp = currentXP.xp;
        let userLevel = tools.getLevel(xp, db.settings);

        let remaining = targetXP - xp;
        let reached = remaining <= 0;
        let percent = xp / targetXP * 100;

        let barSize = 33;
        let barRepeat = Math.min(barSize, Math.round(percent / (100 / barSize)));
        let progressBar = `${"▓".repeat(barRepeat)}${"░".repeat(barSize - barRepeat)} (${Number(percent.toFixed(2))}%)`;

        if (targetLevel == userLevel && userLevel >= db.settings.maxLevel) progressBar += `\nYou reached the maximum level${db.settings.maxLevel < 1000 ? " in this server" : ""}!`;

        let multiplierData = tools.getMultiplier(member, db.settings);
        let multiplier = multiplierData.multiplier || multiplierData.role;
        if (multiplier <= 0) return int.reply("Your multiplier prevents you from gaining any XP!");

        let estimatedMin = Math.ceil(remaining / (db.settings.gain.min * multiplier));
        let estimatedMax = Math.ceil(remaining / (db.settings.gain.max * multiplier));
        let estimatedAvg = Math.round((estimatedMax + estimatedMin) / 2);
        let estimatedTime = estimatedAvg * db.settings.gain.time;

        let estimatedRange = (estimatedMax == estimatedMin) ? `${tools.commafy(estimatedMax)}` : `${tools.commafy(estimatedMax)} - ${tools.commafy(estimatedMin)} (avg. ${tools.commafy(estimatedAvg)})`;

        let levelDetails = [
            `**Current XP: **${tools.commafy(xp)} (Level ${tools.commafy(userLevel)})`,
            `**Target XP: **${tools.commafy(targetXP)}`,
            `**Remaining XP: **${reached ? "0 (" : ""}${tools.commafy(targetXP - xp)}${reached ? ")" : ""}`
        ];

        if (!reached) levelDetails = levelDetails.concat([
            "",
            `**XP per message: **${db.settings.gain.min == db.settings.gain.max ? tools.commafy(Math.round(db.settings.gain.min * multiplier)) : `${tools.commafy(Math.round(db.settings.gain.min * multiplier))} - ${tools.commafy(Math.round(db.settings.gain.max * multiplier))}`}`,
            `**Messages remaining: **${estimatedRange}`,
            `**Cooldown remaining: **${estimatedTime == Infinity ? "Until the end of time" : tools.time(estimatedTime * 1000, 1)}`,
        ]);

        let embed = tools.createEmbed({
            author: { name: member.user.displayName, iconURL: member.displayAvatarURL() },
            title: `Level ${tools.commafy(targetLevel)}${reached ? " (reached!)" : ""}`,
            description: levelDetails.join("\n"), footer: progressBar
        });

        return int.reply({ embeds: [embed] });
    }
};
