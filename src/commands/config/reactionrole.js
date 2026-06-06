const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { addMapping, removeMapping, listGuild, parseEmoji, parseMessageLink } = require('../../handlers/reactionRoleData.js');

// resolve a role from a mention, id, or name
function resolveRole(guild, input) {
    const raw = (input || '').trim();
    const mention = raw.match(/^<@&(\d+)>$/);
    const id = mention ? mention[1] : (/^\d+$/.test(raw) ? raw : null);
    if (id) return guild.roles.cache.get(id) || null;
    return guild.roles.cache.find(r => r.name.toLowerCase() === raw.toLowerCase()) || null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionrole')
        .setDescription('give a role when members react to a message.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(s => s.setName('add').setDescription('open a form to add a reaction role'))
        .addSubcommand(s => s.setName('remove').setDescription('remove a reaction role')
            .addStringOption(o => o.setName('message_link').setDescription('link to the message').setRequired(true))
            .addStringOption(o => o.setName('emoji').setDescription('the emoji to unbind').setRequired(true)))
        .addSubcommand(s => s.setName('list').setDescription('list the reaction roles in this server')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const sub = int.options.getSubcommand();

        if (sub === 'add') {
            const modal = new ModalBuilder().setCustomId('rr_add_modal').setTitle('add a reaction role');
            const linkInput = new TextInputBuilder().setCustomId('rr_link').setLabel('message link')
                .setPlaceholder('https://discord.com/channels/...').setStyle(TextInputStyle.Short).setRequired(true);
            const emojiInput = new TextInputBuilder().setCustomId('rr_emoji').setLabel('emoji')
                .setPlaceholder('🎉 or a custom emoji').setStyle(TextInputStyle.Short).setRequired(true);
            const roleInput = new TextInputBuilder().setCustomId('rr_role').setLabel('role (mention, id, or exact name)')
                .setPlaceholder('@Member or 123456789 or Member').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(
                new ActionRowBuilder().addComponents(linkInput),
                new ActionRowBuilder().addComponents(emojiInput),
                new ActionRowBuilder().addComponents(roleInput),
            );
            return int.showModal(modal);
        }

        if (sub === 'remove') {
            const loc = parseMessageLink(int.options.getString('message_link'));
            const emoji = parseEmoji(int.options.getString('emoji'));
            if (!loc) return tools.warn('that doesn\'t look like a valid message link.');
            if (!emoji) return tools.warn('that doesn\'t look like a valid emoji.');

            const removed = removeMapping(loc.messageId, emoji.key);
            if (!removed) return tools.warn('there was no reaction role for that emoji on that message.');

            // best-effort: pull the bot's reaction off the message
            const channel = int.guild.channels.cache.get(loc.channelId) || await int.guild.channels.fetch(loc.channelId).catch(() => null);
            const msg = channel && await channel.messages.fetch(loc.messageId).catch(() => null);
            if (msg) {
                const r = msg.reactions.cache.find(rx => (rx.emoji.id || rx.emoji.name) === emoji.key);
                if (r) await r.users.remove(int.client.user.id).catch(() => {});
            }
            return int.reply({ embeds: [tools.createEmbed({ title: 'reaction role removed', description: `${emoji.display} no longer grants a role on that message.` })] });
        }

        // list
        const all = listGuild(int.guild.id);
        if (!all.length) return int.reply({ embeds: [tools.createEmbed({ title: 'reaction roles', description: 'none set. add one with `/reactionrole add`.' })], ephemeral: true });

        const lines = all.map(m => {
            const link = `https://discord.com/channels/${int.guild.id}/${m.channelId}/${m.messageId}`;
            const pairs = Object.values(m.roles).map(r => `${r.emoji} → <@&${r.roleId}>`).join('\n');
            return `[message](${link})\n${pairs}`;
        });
        return int.reply({ embeds: [tools.createEmbed({ author: { name: `reaction roles for ${int.guild.name}`, iconURL: int.guild.iconURL() }, description: lines.join('\n\n') })], ephemeral: true });
    },

    async handleModalSubmit(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        const loc = parseMessageLink(int.fields.getTextInputValue('rr_link'));
        const emoji = parseEmoji(int.fields.getTextInputValue('rr_emoji'));
        const role = resolveRole(int.guild, int.fields.getTextInputValue('rr_role'));

        if (!loc) return tools.warn('that doesn\'t look like a valid message link.');
        if (loc.guildId !== int.guild.id) return tools.warn('that message is from another server.');
        if (!emoji) return tools.warn('that doesn\'t look like a valid emoji.');
        if (!role) return tools.warn("i couldn't find that role. paste a mention, id, or the exact name.");
        if (role.managed || role.id === int.guild.id) return tools.warn('pick a normal, assignable role.');
        if (!int.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return tools.warn("i need the manage roles permission.");
        if (!role.editable) return tools.warn(`that role is above mine, so i can't assign it — move my role higher.`);

        const channel = int.guild.channels.cache.get(loc.channelId) || await int.guild.channels.fetch(loc.channelId).catch(() => null);
        if (!channel) return tools.warn("i can't access that channel.");
        const msg = await channel.messages.fetch(loc.messageId).catch(() => null);
        if (!msg) return tools.warn("i couldn't find that message.");

        // seed the reaction so members have something to click
        try {
            await msg.react(emoji.reactable);
        } catch {
            return tools.warn("i couldn't react with that emoji — i may not have access to it (custom emojis must be from a server i'm in).");
        }

        addMapping(int.guild.id, loc.channelId, loc.messageId, emoji.key, role.id, emoji.display);

        return int.reply({ embeds: [tools.createEmbed({
            title: 'reaction role added',
            description: `reacting with ${emoji.display} on [that message](https://discord.com/channels/${int.guild.id}/${loc.channelId}/${loc.messageId}) now grants <@&${role.id}>.`,
        })], ephemeral: true });
    },
};
