const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { addWarning } = require('../../handlers/modData.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('The member to warn').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for the warning').setRequired(true)),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        const user = int.options.getUser('user');
        const reason = int.options.getString('reason');

        if (user.bot) return tools.warn("You can't warn a bot.");
        if (user.id === int.user.id) return tools.warn("You can't warn yourself!");

        const list = addWarning(int.guild.id, user.id, { mod: int.user.id, reason, at: Date.now() });

        // try to notify the user
        await user.send(`You were warned in **${int.guild.name}**: ${reason}`).catch(() => {});

        const embed = tools.createEmbed({
            title: 'Member warned',
            description: `**${user.tag}** was warned.`,
            fields: [
                { name: 'Reason', value: reason, inline: true },
                { name: 'Total warnings', value: `${list.length}`, inline: true }
            ],
            footer: `Moderator: ${int.user.tag}`
        });
        return int.reply({ embeds: [embed] });
    }
};
