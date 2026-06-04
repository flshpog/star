const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('multiplier')
        .setDescription('Add or remove an XP multiplier.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub.setName('role').setDescription('Add or remove a role multiplier')
            .addRoleOption(o => o.setName('role_name').setDescription('The role to add a multiplier for').setRequired(true))
            .addNumberOption(o => o.setName('multiplier').setDescription('Multiply XP gain by this amount (0.5, 2, etc), or 0 to disable XP gain').setMinValue(0).setMaxValue(100).setRequired(true))
            .addBooleanOption(o => o.setName('remove').setDescription('Removes this multiplier, if it exists')))
        .addSubcommand(sub => sub.setName('channel').setDescription('Add or remove a channel multiplier')
            .addChannelOption(o => o.setName('channel_name').setDescription('The channel or category to add a multiplier for').setRequired(true))
            .addNumberOption(o => o.setName('multiplier').setDescription('Multiply XP gain by this amount (0.5, 2, etc), or 0 to disable XP gain').setMinValue(0).setMaxValue(100).setRequired(true))
            .addBooleanOption(o => o.setName('remove').setDescription('Removes this multiplier, if it exists'))),

    async execute(interaction) {
        const int = interaction;
        const client = int.client;
        const tools = new Tools(client, int);

        let db = await tools.fetchSettings();
        if (!tools.canManageServer(int.member, db.settings.manualPerms)) return tools.warn("*notMod");

        let type = int.options.getSubcommand(false);

        let boostVal = int.options.get("multiplier")?.value ?? 1;

        let role = int.options.getRole("role_name");
        let channel = int.options.getChannel("channel_name");
        let boost = tools.clamp(+boostVal.toFixed(2), 0, 100);
        let remove = !!int.options.get("remove")?.value;

        if (!channel && !role) return;
        let target = (channel || role);
        let tag = role ? `<@&${role.id}>` : `<#${channel.id}>`;

        let typeIndex = role ? "roles" : "channels";
        let mults = db.settings.multipliers[typeIndex];
        let existingIndex = mults.findIndex(x => x.id == target.id);
        let foundExisting = (existingIndex >= 0) ? mults[existingIndex] : null;

        let newList = db.settings.multipliers;
        if (foundExisting) db.settings.multipliers[typeIndex].splice(existingIndex, 1);

        function finish(msg) {
            client.db.update(int.guild.id, { $set: { [`settings.multipliers.${typeIndex}`]: newList[typeIndex], 'info.lastUpdate': Date.now() } }).then(() => {
                return int.reply({ content: msg });
            });
        }

        if (remove) {
            if (!foundExisting) return tools.warn(`This ${type} never had a multiplier to begin with!`);
            return finish(`Deleted ${foundExisting.boost}x multiplier for ${tag}.`);
        }

        let boostData = { id: target.id, boost };
        newList[typeIndex].push(boostData);
        let boostStr = boost == 0 ? "no XP" : `${boost}x XP`;

        if (foundExisting) {
            if (foundExisting.boost == boost) return tools.warn(`This ${type} already gives a ${boost}x multiplier!`);
            return finish(`${tag} now gives ${boostStr}! (previously ${foundExisting.boost}x)`);
        }

        return finish(`${tag} now gives ${boostStr}!`);
    }
};
