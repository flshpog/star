const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getGame, setGame } = require('../../handlers/competition.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('competition')
        .setDescription('configure the song of luck competition.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('setup').setDescription('set the competition channels and signup state')
            .addChannelOption(o => o.setName('judge_channel').setDescription("private channel where submissions are posted").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addChannelOption(o => o.setName('announce_channel').setDescription('channel for themes, rounds and eliminations').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addBooleanOption(o => o.setName('signups').setDescription('whether players can /signup')))
        .addSubcommand(s => s.setName('view').setDescription('view the current competition configuration')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const sub = int.options.getSubcommand();
        const game = getGame(int.guild.id);

        if (sub === 'setup') {
            const judge = int.options.getChannel('judge_channel');
            const announce = int.options.getChannel('announce_channel');
            const signups = int.options.get('signups');

            if (judge) game.judgeChannel = judge.id;
            if (announce) game.announceChannel = announce.id;
            if (signups != null) game.signupsOpen = signups.value;
            setGame(int.guild.id, game);

            const embed = tools.createEmbed({
                title: 'competition updated',
                fields: [
                    { name: 'judges channel', value: game.judgeChannel ? `<#${game.judgeChannel}>` : 'not set', inline: true },
                    { name: 'announce channel', value: game.announceChannel ? `<#${game.announceChannel}>` : 'not set', inline: true },
                    { name: 'signups', value: game.signupsOpen ? 'open' : 'closed', inline: true },
                ]
            });
            return int.reply({ embeds: [embed], ephemeral: true });
        }

        // view
        const active = Object.values(game.players).filter(p => p.active).length;
        const embed = tools.createEmbed({
            author: { name: `song of luck — ${int.guild.name}`, iconURL: int.guild.iconURL() },
            fields: [
                { name: 'round', value: `${game.round}`, inline: true },
                { name: 'theme', value: game.theme || 'not set', inline: true },
                { name: 'signups', value: game.signupsOpen ? 'open' : 'closed', inline: true },
                { name: 'judges channel', value: game.judgeChannel ? `<#${game.judgeChannel}>` : 'not set', inline: true },
                { name: 'announce channel', value: game.announceChannel ? `<#${game.announceChannel}>` : 'not set', inline: true },
                { name: 'active players', value: `${active}`, inline: true },
            ]
        });
        return int.reply({ embeds: [embed], ephemeral: true });
    }
};
