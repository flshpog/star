const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getConfig, addAutorole, removeAutorole } = require('../../handlers/joinData.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('manage roles given automatically when a member joins.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('add').setDescription('add a role to give new members')
            .addRoleOption(o => o.setName('role').setDescription('the role to auto-assign').setRequired(true)))
        .addSubcommand(s => s.setName('remove').setDescription('stop auto-assigning a role')
            .addRoleOption(o => o.setName('role').setDescription('the role to remove').setRequired(true)))
        .addSubcommand(s => s.setName('list').setDescription('list the current autoroles')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const sub = int.options.getSubcommand();

        if (sub === 'add') {
            const role = int.options.getRole('role');
            if (role.managed || role.id === int.guild.id) return tools.warn('pick a normal, assignable role.');

            const added = addAutorole(int.guild.id, role.id);
            if (!added) return tools.warn('that role is already an autorole.');

            const embed = tools.createEmbed({
                title: 'autorole added',
                description: `new members will now get <@&${role.id}>.`,
                footer: !role.editable ? "heads up: that role is above mine, so i can't assign it yet — move my role higher." : undefined,
            });
            return int.reply({ embeds: [embed] });
        }

        if (sub === 'remove') {
            const role = int.options.getRole('role');
            const removed = removeAutorole(int.guild.id, role.id);
            if (!removed) return tools.warn("that role isn't an autorole.");
            return int.reply({ embeds: [tools.createEmbed({ title: 'autorole removed', description: `new members will no longer get <@&${role.id}>.` })] });
        }

        // list
        const cfg = getConfig(int.guild.id);
        const embed = tools.createEmbed({
            author: { name: `autoroles for ${int.guild.name}`, iconURL: int.guild.iconURL() },
            description: cfg.autoroles.length ? cfg.autoroles.map(id => `<@&${id}>`).join('\n') : 'no autoroles set. add one with `/autorole add`.',
        });
        return int.reply({ embeds: [embed], ephemeral: true });
    },
};
