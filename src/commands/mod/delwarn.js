const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { removeWarning } = require('../../handlers/modData.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delwarn')
        .setDescription("remove one of a member's warnings.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('the member').setRequired(true))
        .addIntegerOption(o => o.setName('number').setDescription('which warning to remove (see /warnings)').setMinValue(1).setRequired(true)),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        const user = int.options.getUser('user');
        const index = int.options.getInteger('number') - 1;

        const removed = removeWarning(int.guild.id, user.id, index);
        if (!removed) return tools.warn("that warning number doesn't exist. check /warnings.");

        const embed = tools.createEmbed({
            title: 'warning removed',
            description: `removed warning #${index + 1} from **${user.tag}**.`,
            fields: [{ name: 'was', value: removed.reason }],
            footer: `moderator: ${int.user.tag}`
        });
        return int.reply({ embeds: [embed], ephemeral: true });
    }
};
