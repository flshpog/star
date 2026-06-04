const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { addWarning } = require('../../handlers/modData.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('warn a member.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('the member to warn').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('reason for the warning').setRequired(true)),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        const user = int.options.getUser('user');
        const reason = int.options.getString('reason');

        if (user.bot) return tools.warn("you can't warn a bot.");
        if (user.id === int.user.id) return tools.warn("you can't warn yourself!");

        const list = addWarning(int.guild.id, user.id, { mod: int.user.id, reason, at: Date.now() });

        // try to notify the user
        await user.send(`you were warned in **${int.guild.name}**: ${reason}`).catch(() => {});

        const embed = tools.createEmbed({
            title: 'member warned',
            description: `**${user.tag}** was warned.`,
            fields: [
                { name: 'reason', value: reason, inline: true },
                { name: 'total warnings', value: `${list.length}`, inline: true }
            ],
            footer: `moderator: ${int.user.tag}`
        });
        return int.reply({ embeds: [embed] });
    }
};
