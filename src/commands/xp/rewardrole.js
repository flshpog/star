const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rewardrole')
        .setDescription('add or remove a reward role.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addRoleOption(o => o.setName('role_name').setDescription('the role to add or remove').setRequired(true))
        .addIntegerOption(o => o.setName('level').setDescription('the level to grant the role at, or 0 to remove').setMinValue(0).setMaxValue(1000).setRequired(true))
        .addBooleanOption(o => o.setName('keep').setDescription('keep this role even when a higher one is reached'))
        .addBooleanOption(o => o.setName('dont_sync').setDescription('advanced: ignore this role when syncing roles')),

    async execute(interaction) {
        const int = interaction;
        const client = int.client;
        const tools = new Tools(client, int);

        let db = await tools.fetchSettings();
        if (!tools.canManageServer(int.member, db.settings.manualPerms)) return tools.warn("*notMod");

        let role = int.options.getRole("role_name");
        let level = tools.clamp(Math.round(int.options.get("level")?.value), 0, 1000);

        let isKeep = !!int.options.get("keep")?.value;
        let isDontSync = !!int.options.get("dont_sync")?.value;

        let existingIndex = db.settings.rewards.findIndex(x => x.id == role.id);
        let foundExisting = (existingIndex >= 0) ? db.settings.rewards[existingIndex] : null;

        let newRoles = db.settings.rewards;
        if (foundExisting) newRoles.splice(existingIndex, 1);

        function finish(msg) {
            client.db.update(int.guild.id, { $set: { 'settings.rewards': newRoles, 'info.lastUpdate': Date.now() } }).then(() => {
                return int.reply({ content: msg });
            });
        }

        if (level == 0) {
            if (!foundExisting) return tools.warn("reward roles can't be granted at level 0! use this to delete existing reward roles.");
            return finish(`deleted reward role <@&${role.id}> for level ${foundExisting.level}.`);
        }

        if (!int.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return tools.warn("*cantManageRoles");
        if (!role.editable) return tools.warn(`i don't have permission to grant <@&${role.id}>!`);

        let roleData = { id: role.id, level };
        let extraStrings = [];
        if (isKeep) { roleData.keep = true; extraStrings.push("always kept"); }
        if (isDontSync) { roleData.noSync = true; extraStrings.push("ignores sync"); }

        newRoles.push(roleData);
        let extraStr = (extraStrings.length < 1) ? "" : ` (${extraStrings.join(", ")})`;

        if (foundExisting) {
            if (foundExisting.level == level) return tools.warn(`this role is already granted at level ${level}!`);
            return finish(`<@&${role.id}> will now be granted at level ${level}! (previously ${foundExisting.level})${extraStr}`);
        }

        return finish(`<@&${role.id}> will now be granted at level ${level}!${extraStr}`);
    }
};
