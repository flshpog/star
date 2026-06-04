const { Events } = require('discord.js');
const Tools = require('../classes/Tools.js');
const LevelUpMessage = require('../classes/LevelUpMessage.js');
const stickyManager = require('../handlers/stickyManager.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (!message.guild || message.author.bot) return;

        // --- sticky re-posting ---
        if (stickyManager.getSticky(message.channel.id)) {
            stickyManager.resendSticky(message.channel).catch(() => {});
        }

        // --- XP gain (ported from sylvia/Polaris) ---
        if (!message.member) return;
        const client = message.client;
        const tools = new Tools(client);

        let author = message.author.id;
        let db = await tools.fetchSettings(author, message.guild.id);
        if (!db || !db.settings?.enabled) return;

        let settings = db.settings;

        let userData = db.users[author] || { xp: 0, cooldown: 0 };
        if (userData.cooldown > Date.now()) return;

        let multiplierData = tools.getMultiplier(message.member, settings, message.channel);
        if (multiplierData.multiplier <= 0) return;

        let oldXP = userData.xp;
        let xpRange = [settings.gain.min, settings.gain.max].map(x => Math.round(x * multiplierData.multiplier));
        let xpGained = tools.rng(...xpRange);

        if (xpGained > 0) userData.xp += Math.round(xpGained);
        else return;

        if (settings.gain.time > 0) userData.cooldown = Date.now() + (settings.gain.time * 1000);

        if (userData.hidden) userData.hidden = false;

        client.db.update(message.guild.id, { $set: { [`users.${author}`]: userData } }).exec();

        let oldLevel = tools.getLevel(oldXP, settings);
        let newLevel = tools.getLevel(userData.xp, settings);
        let levelUp = newLevel > oldLevel;

        let syncMode = settings.rewardSyncing.sync;
        if (syncMode == "xp" || (syncMode == "level" && levelUp)) {
            let roleCheck = tools.checkLevelRoles(message.guild.roles.cache, message.member.roles.cache, newLevel, settings.rewards, null, oldLevel);
            tools.syncLevelRoles(message.member, roleCheck).catch(() => {});
        }

        if (levelUp && settings.levelUp.enabled && settings.levelUp.message) {
            let useMultiple = (settings.levelUp.multiple > 1 && (settings.levelUp.multipleUntil == 0 || (newLevel < settings.levelUp.multipleUntil)));
            if (!useMultiple || (newLevel % settings.levelUp.multiple == 0)) {
                let lvlMessage = new LevelUpMessage(settings, message, { oldLevel, level: newLevel, userData });
                lvlMessage.send();
            }
        }
    }
};
