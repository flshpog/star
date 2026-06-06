const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getConfig, setWelcomeChannel, setWelcomeMessage, setWelcomeEnabled, formatWelcome } = require('../../handlers/joinData.js');

const PLACEHOLDERS = '`{user}` mention · `{username}` name · `{server}` server · `{count}` member number';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('configure the welcome message for new members.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('channel').setDescription('set the channel welcomes are posted to (also enables them)')
            .addChannelOption(o => o.setName('channel').setDescription('the welcome channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true)))
        .addSubcommand(s => s.setName('message').setDescription('set the welcome text')
            .addStringOption(o => o.setName('text').setDescription('use {user}, {username}, {server}, {count}').setRequired(true)))
        .addSubcommand(s => s.setName('toggle').setDescription('turn welcome messages on or off')
            .addBooleanOption(o => o.setName('on').setDescription('enabled?').setRequired(true)))
        .addSubcommand(s => s.setName('test').setDescription('post a test welcome for yourself'))
        .addSubcommand(s => s.setName('view').setDescription('view the current welcome settings')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const sub = int.options.getSubcommand();

        if (sub === 'channel') {
            const channel = int.options.getChannel('channel');
            setWelcomeChannel(int.guild.id, channel.id);
            return int.reply({ embeds: [tools.createEmbed({
                title: 'welcome channel set',
                description: `welcomes will now be posted in <#${channel.id}>.`,
                footer: 'set the text with /welcome message',
            })] });
        }

        if (sub === 'message') {
            const text = int.options.getString('text');
            setWelcomeMessage(int.guild.id, text);
            return int.reply({ embeds: [tools.createEmbed({
                title: 'welcome message set',
                description: text,
                footer: 'preview it with /welcome test',
            })] });
        }

        if (sub === 'toggle') {
            const on = int.options.getBoolean('on');
            setWelcomeEnabled(int.guild.id, on);
            return int.reply({ embeds: [tools.createEmbed({
                title: `welcome messages ${on ? 'enabled' : 'disabled'}`,
            })] });
        }

        if (sub === 'test') {
            const cfg = getConfig(int.guild.id);
            if (!cfg.welcome.channel) return tools.warn('set a welcome channel first with `/welcome channel`.');
            const channel = int.guild.channels.cache.get(cfg.welcome.channel)
                || await int.guild.channels.fetch(cfg.welcome.channel).catch(() => null);
            if (!channel) return tools.warn("i can't find the welcome channel — set it again with `/welcome channel`.");
            await channel.send({ content: formatWelcome(cfg.welcome.message, int.member), allowedMentions: { users: [int.user.id] } }).catch(() => {});
            return int.reply({ content: `posted a test welcome in <#${channel.id}>.`, ephemeral: true });
        }

        // view
        const cfg = getConfig(int.guild.id);
        const embed = tools.createEmbed({
            author: { name: `welcome settings for ${int.guild.name}`, iconURL: int.guild.iconURL() },
            fields: [
                { name: 'status', value: cfg.welcome.enabled ? 'enabled' : 'disabled', inline: true },
                { name: 'channel', value: cfg.welcome.channel ? `<#${cfg.welcome.channel}>` : 'not set', inline: true },
                { name: 'message', value: cfg.welcome.message },
                { name: 'placeholders', value: PLACEHOLDERS },
            ],
        });
        return int.reply({ embeds: [embed], ephemeral: true });
    },
};
