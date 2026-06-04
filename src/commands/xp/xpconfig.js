const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Tools = require('../../classes/Tools.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xpconfig')
        .setDescription('configure the xp system.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('view').setDescription('view the current xp settings'))
        .addSubcommand(s => s.setName('enable').setDescription('turn the xp system on'))
        .addSubcommand(s => s.setName('disable').setDescription('turn the xp system off'))
        .addSubcommand(s => s.setName('gain').setDescription('set how much xp each message gives')
            .addIntegerOption(o => o.setName('min').setDescription('minimum xp per message').setMinValue(0).setMaxValue(5000))
            .addIntegerOption(o => o.setName('max').setDescription('maximum xp per message').setMinValue(0).setMaxValue(5000))
            .addNumberOption(o => o.setName('cooldown').setDescription('seconds between xp-earning messages').setMinValue(0).setMaxValue(31536000)))
        .addSubcommand(s => s.setName('levelup').setDescription('configure level-up announcements')
            .addBooleanOption(o => o.setName('enabled').setDescription('whether to send level-up messages'))
            .addStringOption(o => o.setName('message').setDescription('the message to send (supports [[LEVEL]], [[@]], [[ROLE]], etc.)').setMaxLength(2000))
            .addChannelOption(o => o.setName('channel').setDescription('channel to send level-ups in').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addStringOption(o => o.setName('location').setDescription('where to send level-ups (overrides channel)').addChoices(
                { name: 'current channel', value: 'current' },
                { name: 'direct message', value: 'dm' }))
            .addBooleanOption(o => o.setName('embed').setDescription('treat the message as a json embed'))
            .addIntegerOption(o => o.setName('multiple').setDescription('only announce every nth level').setMinValue(1).setMaxValue(1000)))
        .addSubcommand(s => s.setName('curve').setDescription('configure the leveling curve (xp = a·lvl³ + b·lvl² + c·lvl)')
            .addNumberOption(o => o.setName('cubic').setDescription('cubic coefficient (a, default 1)').setMinValue(0).setMaxValue(100))
            .addNumberOption(o => o.setName('quadratic').setDescription('quadratic coefficient (b, default 50)').setMinValue(0).setMaxValue(10000))
            .addNumberOption(o => o.setName('linear').setDescription('linear coefficient (c, default 100)').setMinValue(0).setMaxValue(100000))
            .addIntegerOption(o => o.setName('rounding').setDescription('round xp requirements to the nearest n (default 100)').setMinValue(1).setMaxValue(1000))
            .addIntegerOption(o => o.setName('maxlevel').setDescription('maximum reachable level (default 1000)').setMinValue(1).setMaxValue(1000)))
        .addSubcommand(s => s.setName('leaderboard').setDescription('configure the leaderboard')
            .addBooleanOption(o => o.setName('disabled').setDescription('disable the /top leaderboard'))
            .addIntegerOption(o => o.setName('minlevel').setDescription('minimum level to appear on the leaderboard').setMinValue(0).setMaxValue(1000))
            .addIntegerOption(o => o.setName('maxentries').setDescription('max ranked members (0 = unlimited)').setMinValue(0).setMaxValue(1000000))),

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
                author: { name: `xp settings for ${int.guild.name}`, iconURL: int.guild.iconURL() },
                fields: [
                    { name: 'status', value: s.enabled ? 'enabled' : 'disabled', inline: true },
                    { name: 'xp per message', value: `${tools.commafy(s.gain.min)} - ${tools.commafy(s.gain.max)}`, inline: true },
                    { name: 'cooldown', value: `${tools.commafy(s.gain.time)}s`, inline: true },
                    { name: 'curve', value: `${s.curve[3]}·lvl³ + ${s.curve[2]}·lvl² + ${s.curve[1]}·lvl (round ${s.rounding})\nlevel ${exampleLvl} = ${tools.commafy(tools.xpForLevel(exampleLvl, s))} xp`, inline: false },
                    { name: 'max level', value: `${tools.commafy(s.maxLevel)}`, inline: true },
                    { name: 'reward roles', value: `${s.rewards.length}`, inline: true },
                    { name: 'multipliers', value: `${s.multipliers.roles.length} role / ${s.multipliers.channels.length} channel`, inline: true },
                    { name: 'level-up messages', value: s.levelUp.enabled ? `on — ${s.levelUp.channel === 'current' ? 'current channel' : s.levelUp.channel === 'dm' ? 'dms' : `<#${s.levelUp.channel}>`}` : 'off', inline: true },
                    { name: 'leaderboard', value: s.leaderboard.disabled ? 'disabled' : 'enabled', inline: true },
                ],
                footer: 'change settings with the other /xpconfig subcommands.'
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
                set['settings.enabled'] = true; changes.push('xp system **enabled**'); break;
            case 'disable':
                set['settings.enabled'] = false; changes.push('xp system **disabled**'); break;

            case 'gain':
                if (has('min')) { set['settings.gain.min'] = opt('min').value; changes.push(`min xp: **${opt('min').value}**`); }
                if (has('max')) { set['settings.gain.max'] = opt('max').value; changes.push(`max xp: **${opt('max').value}**`); }
                if (has('cooldown')) { set['settings.gain.time'] = opt('cooldown').value; changes.push(`cooldown: **${opt('cooldown').value}s**`); }
                break;

            case 'levelup':
                if (has('enabled')) { set['settings.levelUp.enabled'] = opt('enabled').value; changes.push(`level-up messages: **${opt('enabled').value ? 'on' : 'off'}**`); }
                if (has('message')) { set['settings.levelUp.message'] = opt('message').value; changes.push('level-up message updated'); }
                if (has('channel')) { set['settings.levelUp.channel'] = opt('channel').channel.id; changes.push(`level-up channel: <#${opt('channel').channel.id}>`); }
                else if (has('location')) { set['settings.levelUp.channel'] = opt('location').value; changes.push(`level-up location: **${opt('location').value}**`); }
                if (has('embed')) { set['settings.levelUp.embed'] = opt('embed').value; changes.push(`embed mode: **${opt('embed').value ? 'on' : 'off'}**`); }
                if (has('multiple')) { set['settings.levelUp.multiple'] = opt('multiple').value; changes.push(`announce every **${opt('multiple').value}** level(s)`); }
                break;

            case 'curve':
                if (has('cubic')) { set['settings.curve.3'] = opt('cubic').value; changes.push(`cubic: **${opt('cubic').value}**`); }
                if (has('quadratic')) { set['settings.curve.2'] = opt('quadratic').value; changes.push(`quadratic: **${opt('quadratic').value}**`); }
                if (has('linear')) { set['settings.curve.1'] = opt('linear').value; changes.push(`linear: **${opt('linear').value}**`); }
                if (has('rounding')) { set['settings.rounding'] = opt('rounding').value; changes.push(`rounding: **${opt('rounding').value}**`); }
                if (has('maxlevel')) { set['settings.maxLevel'] = opt('maxlevel').value; changes.push(`max level: **${opt('maxlevel').value}**`); }
                break;

            case 'leaderboard':
                if (has('disabled')) { set['settings.leaderboard.disabled'] = opt('disabled').value; changes.push(`leaderboard: **${opt('disabled').value ? 'disabled' : 'enabled'}**`); }
                if (has('minlevel')) { set['settings.leaderboard.minLevel'] = opt('minlevel').value; changes.push(`min level: **${opt('minlevel').value}**`); }
                if (has('maxentries')) { set['settings.leaderboard.maxEntries'] = opt('maxentries').value; changes.push(`max entries: **${opt('maxentries').value || 'unlimited'}**`); }
                break;
        }

        if (changes.length === 0) return tools.warn("you didn't change anything! provide at least one option.");

        await client.db.update(int.guild.id, { $set: set });
        return int.reply({ content: `updated xp settings:\n- ${changes.join('\n- ')}`, ephemeral: true });
    }
};
