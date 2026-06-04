const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getWarnings } = require('../../handlers/modData.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription("view a member's warnings.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('the member to look up').setRequired(true)),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        const user = int.options.getUser('user');
        const list = getWarnings(int.guild.id, user.id);

        if (!list.length) {
            return int.reply({ content: `**${user.tag}** has no warnings.`, ephemeral: true });
        }

        const lines = list.map((w, i) => `**${i + 1}.** ${w.reason} — by <@${w.mod}> <t:${Math.floor(w.at / 1000)}:R>`);
        const embed = tools.createEmbed({
            author: { name: `warnings for ${user.tag}`, iconURL: user.displayAvatarURL() },
            description: lines.join('\n'),
            footer: `${list.length} warning${list.length !== 1 ? 's' : ''} • remove with /delwarn`
        });
        return int.reply({ embeds: [embed], ephemeral: true });
    }
};
