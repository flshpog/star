const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { removeWarning } = require('../../handlers/modData.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delwarn')
        .setDescription("Remove one of a member's warnings.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('The member').setRequired(true))
        .addIntegerOption(o => o.setName('number').setDescription('Which warning to remove (see /warnings)').setMinValue(1).setRequired(true)),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        const user = int.options.getUser('user');
        const index = int.options.getInteger('number') - 1;

        const removed = removeWarning(int.guild.id, user.id, index);
        if (!removed) return tools.warn("That warning number doesn't exist. Check /warnings.");

        const embed = tools.createEmbed({
            title: 'Warning removed',
            description: `Removed warning #${index + 1} from **${user.tag}**.`,
            fields: [{ name: 'Was', value: removed.reason }],
            footer: `Moderator: ${int.user.tag}`
        });
        return int.reply({ embeds: [embed], ephemeral: true });
    }
};
