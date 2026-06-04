const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Tools = require('../../classes/Tools.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xpconfig')
        .setDescription('Configure the XP system.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('view').setDescription('View the current XP settings'))
        .addSubcommand(s => s.setName('enable').setDescription('Turn the XP system on'))
        .addSubcommand(s => s.setName('disable').setDescription('Turn the XP system off'))
        .addSubcommand(s => s.setName('gain').setDescription('Set how much XP each message gives')
            .addIntegerOption(o => o.setName('min').setDescription('Minimum XP per message').setMinValue(0).setMaxValue(5000))
            .addIntegerOption(o => o.setName('max').setDescription('Maximum XP per message').setMinValue(0).setMaxValue(5000))
            .addNumberOption(o => o.setName('cooldown').setDescription('Seconds between XP-earning messages').setMinValue(0).setMaxValue(31536000)))
        .addSubcommand(s => s.setName('levelup').setDescription('Configure level-up announcements')
            .addBooleanOption(o => o.setName('enabled').setDescription('Whether to send level-up messages'))
            .addStringOption(o => o.setName('message').setDescription('The message to send (supports [[LEVEL]], [[@]], [[ROLE]], etc.)').setMaxLength(2000))
            .addChannelOption(o => o.setName('channel').setDescription('Channel to send level-ups in').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addStringOption(o => o.setName('location').setDescription('Where to send level-ups (overrides channel)').addChoices(
                { name: 'Current channel', value: 'current' },
                { name: 'Direct message', value: 'dm' }))
            .addBooleanOption(o => o.setName('embed').setDescription('Treat the message as a JSON embed'))
            .addIntegerOption(o => o.setName('multiple').setDescription('Only announce every Nth level').setMinValue(1).setMaxValue(1000)))
        .addSubcommand(s => s.setName('curve').setDescription('Configure the leveling curve (xp = a·lvl³ + b·lvl² + c·lvl)')
            .addNumberOption(o => o.setName('cubic').setDescription('Cubic coefficient (a, default 1)').setMinValue(0).setMaxValue(100))
            .addNumberOption(o => o.setName('quadratic').setDescription('Quadratic coefficient (b, default 50)').setMinValue(0).setMaxValue(10000))
            .addNumberOption(o => o.setName('linear').setDescription('Linear coefficient (c, default 100)').setMinValue(0).setMaxValue(100000))
            .addIntegerOption(o => o.setName('rounding').setDescription('Round XP requirements to the nearest N (default 100)').setMinValue(1).setMaxValue(1000))
            .addIntegerOption(o => o.setName('maxlevel').setDescription('Maximum reachable level (default 1000)').setMinValue(1).setMaxValue(1000)))
        .addSubcommand(s => s.setName('leaderboard').setDescription('Configure the leaderboard')
            .addBooleanOption(o => o.setName('disabled').setDescription('Disable the /top leaderboard'))
            .addIntegerOption(o => o.setName('minlevel').setDescription('Minimum level to appear on the leaderboard').setMinValue(0).setMaxValue(1000))
            .addIntegerOption(o => o.setName('maxentries').setDescription('Max ranked members (0 = unlimited)').setMinValue(0).setMaxValue(1000000))),

    async execute(interaction) {
        const int = interaction;
        const client = int.client;
        const tools = new Tools(client, int);

        let db = await tools.fetchSettings();
        if (!tools.canManageServer(int.member, db.settings.manualPerms)) return tools.warn("*notMod");

        const sub = int.options.getSubcommand();
        const s = db.settings;

        // ----- view -----
        if (sub === 'view') {
            const exampleLvl = 5;
            const embed = tools.createEmbed({
                author: { name: `XP settings for ${int.guild.name}`, iconURL: int.guild.iconURL() },
                fields: [
                    { name: 'Status', value: s.enabled ? 'Enabled' : 'Disabled', inline: true },
                    { name: 'XP per message', value: `${tools.commafy(s.gain.min)} - ${tools.commafy(s.gain.max)}`, inline: true },
                    { name: 'Cooldown', value: `${tools.commafy(s.gain.time)}s`, inline: true },
                    { name: 'Curve', value: `${s.curve[3]}·lvl³ + ${s.curve[2]}·lvl² + ${s.curve[1]}·lvl (round ${s.rounding})\nLevel ${exampleLvl} = ${tools.commafy(tools.xpForLevel(exampleLvl, s))} XP`, inline: false },
                    { name: 'Max level', value: `${tools.commafy(s.maxLevel)}`, inline: true },
                    { name: 'Reward roles', value: `${s.rewards.length}`, inline: true },
                    { name: 'Multipliers', value: `${s.multipliers.roles.length} role / ${s.multipliers.channels.length} channel`, inline: true },
                    { name: 'Level-up messages', value: s.levelUp.enabled ? `On — ${s.levelUp.channel === 'current' ? 'current channel' : s.levelUp.channel === 'dm' ? 'DMs' : `<#${s.levelUp.channel}>`}` : 'Off', inline: true },
                    { name: 'Leaderboard', value: s.leaderboard.disabled ? 'Disabled' : 'Enabled', inline: true },
                ],
                footer: 'Change settings with the other /xpconfig subcommands.'
            });
            return int.reply({ embeds: [embed], ephemeral: true });
        }

        // build a $set patch then persist + summarize
        const set = { 'info.lastUpdate': Date.now() };
        const changes = [];
        const opt = (name) => int.options.get(name);
        const has = (name) => opt(name) != null;

        switch (sub) {
            case 'enable':
                set['settings.enabled'] = true; changes.push('XP system **enabled**'); break;
            case 'disable':
                set['settings.enabled'] = false; changes.push('XP system **disabled**'); break;

            case 'gain':
                if (has('min')) { set['settings.gain.min'] = opt('min').value; changes.push(`Min XP: **${opt('min').value}**`); }
                if (has('max')) { set['settings.gain.max'] = opt('max').value; changes.push(`Max XP: **${opt('max').value}**`); }
                if (has('cooldown')) { set['settings.gain.time'] = opt('cooldown').value; changes.push(`Cooldown: **${opt('cooldown').value}s**`); }
                break;

            case 'levelup':
                if (has('enabled')) { set['settings.levelUp.enabled'] = opt('enabled').value; changes.push(`Level-up messages: **${opt('enabled').value ? 'on' : 'off'}**`); }
                if (has('message')) { set['settings.levelUp.message'] = opt('message').value; changes.push('Level-up message updated'); }
                if (has('channel')) { set['settings.levelUp.channel'] = opt('channel').channel.id; changes.push(`Level-up channel: <#${opt('channel').channel.id}>`); }
                else if (has('location')) { set['settings.levelUp.channel'] = opt('location').value; changes.push(`Level-up location: **${opt('location').value}**`); }
                if (has('embed')) { set['settings.levelUp.embed'] = opt('embed').value; changes.push(`Embed mode: **${opt('embed').value ? 'on' : 'off'}**`); }
                if (has('multiple')) { set['settings.levelUp.multiple'] = opt('multiple').value; changes.push(`Announce every **${opt('multiple').value}** level(s)`); }
                break;

            case 'curve':
                if (has('cubic')) { set['settings.curve.3'] = opt('cubic').value; changes.push(`Cubic: **${opt('cubic').value}**`); }
                if (has('quadratic')) { set['settings.curve.2'] = opt('quadratic').value; changes.push(`Quadratic: **${opt('quadratic').value}**`); }
                if (has('linear')) { set['settings.curve.1'] = opt('linear').value; changes.push(`Linear: **${opt('linear').value}**`); }
                if (has('rounding')) { set['settings.rounding'] = opt('rounding').value; changes.push(`Rounding: **${opt('rounding').value}**`); }
                if (has('maxlevel')) { set['settings.maxLevel'] = opt('maxlevel').value; changes.push(`Max level: **${opt('maxlevel').value}**`); }
                break;

            case 'leaderboard':
                if (has('disabled')) { set['settings.leaderboard.disabled'] = opt('disabled').value; changes.push(`Leaderboard: **${opt('disabled').value ? 'disabled' : 'enabled'}**`); }
                if (has('minlevel')) { set['settings.leaderboard.minLevel'] = opt('minlevel').value; changes.push(`Min level: **${opt('minlevel').value}**`); }
                if (has('maxentries')) { set['settings.leaderboard.maxEntries'] = opt('maxentries').value; changes.push(`Max entries: **${opt('maxentries').value || 'unlimited'}**`); }
                break;
        }

        if (changes.length === 0) return tools.warn("You didn't change anything! Provide at least one option.");

        await client.db.update(int.guild.id, { $set: set });
        return int.reply({ content: `Updated XP settings:\n- ${changes.join('\n- ')}`, ephemeral: true });
    }
};
