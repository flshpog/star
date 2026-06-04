const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { parseDuration } = require('../../handlers/modData.js');

const MAX_TIMEOUT = 28 * 86400 * 1000; // Discord's 28-day cap

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('time out a member for a set duration.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('the member to time out').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('how long, e.g. 10m, 1h, 1d (max 28d)').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('reason for the timeout')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        const user = int.options.getUser('user');
        const reason = int.options.getString('reason') || 'no reason provided';
        const member = int.options.getMember('user');

        if (!member) return tools.warn("that user isn't in this server.");
        if (user.id === int.user.id) return tools.warn("you can't time yourself out!");

        let ms = parseDuration(int.options.getString('duration'));
        if (!ms) return tools.warn("invalid duration. try something like `10m`, `1h`, or `1d`.");
        ms = Math.min(ms, MAX_TIMEOUT);

        if (!member.moderatable) return tools.warn("i can't time out that member — check my role position and permissions.");
        if (int.guild.ownerId !== int.user.id && int.member.roles.highest.comparePositionTo(member.roles.highest) <= 0) {
            return tools.warn("you can't time out someone with an equal or higher role than you.");
        }

        try {
            await member.timeout(ms, `${int.user.tag}: ${reason}`);
        } catch {
            return tools.warn("failed to time out that member.");
        }

        const until = Math.floor((Date.now() + ms) / 1000);
        const embed = tools.createEmbed({
            title: 'member timed out',
            description: `**${user.tag}** was timed out for ${tools.time(ms)}.`,
            fields: [
                { name: 'expires', value: `<t:${until}:r>`, inline: true },
                { name: 'reason', value: reason, inline: true }
            ],
            footer: `moderator: ${int.user.tag}`
        });
        return int.reply({ embeds: [embed] });
    }
};
