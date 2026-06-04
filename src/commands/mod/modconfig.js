const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getMuteRole, setMuteRole } = require('../../handlers/modData.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modconfig')
        .setDescription('configure moderation settings.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('muterole').setDescription('set the role used by /rmute')
            .addRoleOption(o => o.setName('role').setDescription('the mute role').setRequired(true)))
        .addSubcommand(s => s.setName('view').setDescription('view the current moderation settings')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const sub = int.options.getSubcommand();

        if (sub === 'muterole') {
            const role = int.options.getRole('role');
            if (role.managed || role.id === int.guild.id) return tools.warn("pick a normal, assignable role.");
            setMuteRole(int.guild.id, role.id);
            const embed = tools.createEmbed({
                title: 'mute role set',
                description: `/rmute will now apply <@&${role.id}>.`,
                footer: !role.editable ? 'heads up: that role is above mine, so i can\'t assign it yet — move my role higher.' : undefined
            });
            return int.reply({ embeds: [embed] });
        }

        // view
        const muteRoleId = getMuteRole(int.guild.id);
        const embed = tools.createEmbed({
            author: { name: `moderation settings for ${int.guild.name}`, iconURL: int.guild.iconURL() },
            fields: [{ name: 'mute role', value: muteRoleId ? `<@&${muteRoleId}>` : 'not set' }]
        });
        return int.reply({ embeds: [embed], ephemeral: true });
    }
};
