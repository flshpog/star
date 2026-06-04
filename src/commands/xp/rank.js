const { SlashCommandBuilder } = require('discord.js');
const Tools = require('../../classes/Tools.js');

// channel-stacking labels (inlined from sylvia's multiplier_modes.json)
const STACK_LABELS = {
    multiply: "Multipliers combined",
    add: "Multipliers summed, n-1 each",
    largest: "Largest between role and channel",
    channel: "Channel multiplier priority",
    role: "Role multiplier priority"
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('View your current XP, level, and cooldown.')
        .addUserOption(o => o.setName('member').setDescription('Which member to view'))
        .addBooleanOption(o => o.setName('hidden').setDescription('Hides the reply so only you can see it')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        let member = int.member;
        let foundUser = int.options.get("user") || int.options.get("member");
        if (foundUser) member = foundUser.member;
        if (!member) return tools.warn("That member couldn't be found!");

        let db = await tools.fetchSettings(member.id);
        if (!db) return tools.warn("*noData");
        else if (!db.settings.enabled) return tools.warn("*xpDisabled");

        let currentXP = db.users[member.id];

        if (db.settings.rankCard.disabled) return tools.warn("Rank cards are disabled in this server!");

        if (!currentXP || !currentXP.xp) return tools.noXPYet(foundUser ? foundUser.user : int.user);

        let xp = currentXP.xp;

        let levelData = tools.getLevel(xp, db.settings, true);
        let maxLevel = levelData.level >= db.settings.maxLevel;

        let remaining = levelData.xpRequired - xp;
        let levelPercent = maxLevel ? 100 : (xp - levelData.previousLevel) / (levelData.xpRequired - levelData.previousLevel) * 100;

        let multiplierData = tools.getMultiplier(member, db.settings);
        let multiplier = multiplierData.multiplier;

        let barSize = 33;
        let barRepeat = Math.round(levelPercent / (100 / barSize));
        let progressBar = `${"▓".repeat(barRepeat)}${"░".repeat(barSize - barRepeat)} (${!maxLevel ? Number(levelPercent.toFixed(2)) + "%" : "MAX"})`;

        let estimatedMin = Math.ceil(remaining / (db.settings.gain.min * (multiplier || multiplierData.role)));
        let estimatedMax = Math.ceil(remaining / (db.settings.gain.max * (multiplier || multiplierData.role)));

        let estimatedRange = (estimatedMax == estimatedMin) ? `${tools.commafy(estimatedMax)} ${tools.extraS("message", estimatedMax)}` : `${tools.commafy(estimatedMax)}-${tools.commafy(estimatedMin)} messages`;

        let nextLevelXP = (db.settings.rankCard.relativeLevel ? `${tools.commafy(xp - levelData.previousLevel)}/${tools.commafy(levelData.xpRequired - levelData.previousLevel)}` : `${tools.commafy(levelData.xpRequired)}`) + ` (${tools.commafy(remaining)} more)`;

        let embed = tools.createEmbed({
            author: { name: member.user.displayName, iconURL: member.displayAvatarURL() },
            footer: maxLevel ? progressBar : ((estimatedMin == Infinity || estimatedMin < 0) ? "You are unable to gain XP!" : `${progressBar}\n${estimatedRange} to go!`),
            fields: [
                { name: "XP", value: `${tools.commafy(xp)} (lv. ${levelData.level})`, inline: true },
                { name: "Next level", value: !maxLevel ? nextLevelXP : "Max level!", inline: true },
            ]
        });

        if (!db.settings.rankCard.hideCooldown) {
            let foundCooldown = currentXP.cooldown || 0;
            let cooldown = foundCooldown > Date.now() ? tools.timestamp(foundCooldown - Date.now()) : "None";
            embed.addFields([{ name: "Cooldown", value: cooldown, inline: true }]);
        }

        let hideMult = db.settings.hideMultipliers;

        let multRoles = multiplierData.roleList;
        let multiplierInfo = [];
        if ((!hideMult || multiplierData.role == 0) && multRoles.length) {
            let xpStr = multiplierData.role > 0 ? `${multiplierData.role}x XP` : "Cannot gain XP";
            let roleMultiplierStr = multRoles.length == 1 ? `${int.guild.id != multRoles[0].id ? `<@&${multRoles[0].id}>` : "Everyone"} - ${xpStr}` : `**${multRoles.length} roles** - ${xpStr}`;
            multiplierInfo.push(roleMultiplierStr);
        }

        let multChannels = multiplierData.channelList;
        if ((!hideMult || multiplierData.channel == 0) && multChannels.length && multiplierData.role > 0 && (multiplierData.role != 1 || multiplierData.channel != 1)) {
            let chXPStr = multChannels[0].boost > 0 ? `${multiplierData.channel}x XP` : "Cannot gain XP";
            let chMultiplierStr = `<#${multChannels[0].id}> - ${chXPStr}`;
            multiplierInfo.push(chMultiplierStr);
            if (multRoles.length) multiplierInfo.push(`**Total multiplier: ${multiplier}x XP** (${STACK_LABELS[multiplierData.channelStacking].toLowerCase()})`);
        }

        if (multiplierInfo.length) embed.addFields([{ name: "Multiplier", value: multiplierInfo.join("\n") }]);

        else if (!db.settings.rewardSyncing.noManual && !db.settings.rewardSyncing.noWarning) {
            let syncCheck = tools.checkLevelRoles(int.guild.roles.cache, member.roles.cache, levelData.level, db.settings.rewards);
            if (syncCheck.incorrect.length || syncCheck.missing.length) embed.addFields([{ name: "Note", value: `Your level roles are not properly synced. Use ${tools.commandTag("sync")} to fix this.` }]);
        }

        let isHidden = db.settings.rankCard.ephemeral || !!int.options.get("hidden")?.value;
        return int.reply({ embeds: [embed], ephemeral: isHidden });
    }
};
