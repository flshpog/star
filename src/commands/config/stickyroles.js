const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { isEnabled, setEnabled, clearMemberRoles } = require('../../handlers/stickyRoleData.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stickyroles')
        .setDescription('re-apply a member\'s roles when they rejoin the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('toggle').setDescription('turn sticky roles on or off')
            .addBooleanOption(o => o.setName('on').setDescription('enabled?').setRequired(true)))
        .addSubcommand(s => s.setName('forget').setDescription('drop the stored roles for one member')
            .addUserOption(o => o.setName('member').setDescription('the member to forget').setRequired(true)))
        .addSubcommand(s => s.setName('view').setDescription('view the sticky roles setting')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const sub = int.options.getSubcommand();

        if (sub === 'toggle') {
            const on = int.options.getBoolean('on');
            setEnabled(int.guild.id, on);
            return int.reply({ embeds: [tools.createEmbed({
                title: `sticky roles ${on ? 'enabled' : 'disabled'}`,
                description: on
                    ? "members who leave and rejoin will get their roles back. (only roles a member has from now on are remembered.)"
                    : 'rejoining members will no longer have their roles restored.',
            })] });
        }

        if (sub === 'forget') {
            const user = int.options.getUser('member');
            clearMemberRoles(int.guild.id, user.id);
            return int.reply({ embeds: [tools.createEmbed({ title: 'forgotten', description: `cleared stored roles for <@${user.id}>.` })], ephemeral: true });
        }

        // view
        return int.reply({ embeds: [tools.createEmbed({
            author: { name: `sticky roles for ${int.guild.name}`, iconURL: int.guild.iconURL() },
            fields: [{ name: 'status', value: isEnabled(int.guild.id) ? 'enabled' : 'disabled' }],
        })], ephemeral: true });
    },
};
