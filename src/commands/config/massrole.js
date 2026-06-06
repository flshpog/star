const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('massrole')
        .setDescription('give a role to everyone who has another role.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addRoleOption(o => o.setName('source').setDescription('everyone with this role will get the target role').setRequired(true))
        .addRoleOption(o => o.setName('target').setDescription('the role to give them').setRequired(true)),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const source = int.options.getRole('source');
        const target = int.options.getRole('target');

        if (source.id === target.id) return tools.warn('the source and target roles are the same.');
        if (target.managed || target.id === int.guild.id) return tools.warn('pick a normal, assignable role as the target.');
        if (!int.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return tools.warn('i need the manage roles permission.');
        if (!target.editable) return tools.warn('that target role is above mine — move my role higher.');

        await int.deferReply();

        // pull every member so role membership is fully populated
        await int.guild.members.fetch().catch(() => {});

        // source @everyone => all members; otherwise just members holding the source role
        const members = source.id === int.guild.id ? int.guild.members.cache : source.members;

        let added = 0, skipped = 0, failed = 0;
        for (const member of members.values()) {
            if (member.roles.cache.has(target.id)) { skipped++; continue; }
            try { await member.roles.add(target); added++; }
            catch { failed++; }
        }

        const embed = tools.createEmbed({
            title: 'massrole complete',
            description: `gave <@&${target.id}> to everyone with <@&${source.id}>.`,
            fields: [
                { name: 'added', value: `${added}`, inline: true },
                { name: 'already had it', value: `${skipped}`, inline: true },
                { name: 'failed', value: `${failed}`, inline: true },
            ],
        });
        return int.editReply({ embeds: [embed] });
    },
};
