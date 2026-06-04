const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getGame, setGame } = require('../../handlers/competition.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('competition')
        .setDescription('Configure the Song of Luck competition.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('setup').setDescription('Set the competition channels and signup state')
            .addChannelOption(o => o.setName('judge_channel').setDescription("Private channel where submissions are posted").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addChannelOption(o => o.setName('announce_channel').setDescription('Channel for themes, rounds and eliminations').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addBooleanOption(o => o.setName('signups').setDescription('Whether players can /signup')))
        .addSubcommand(s => s.setName('view').setDescription('View the current competition configuration')),

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
                title: 'Competition updated',
                fields: [
                    { name: 'Judges channel', value: game.judgeChannel ? `<#${game.judgeChannel}>` : 'Not set', inline: true },
                    { name: 'Announce channel', value: game.announceChannel ? `<#${game.announceChannel}>` : 'Not set', inline: true },
                    { name: 'Signups', value: game.signupsOpen ? 'Open' : 'Closed', inline: true },
                ]
            });
            return int.reply({ embeds: [embed], ephemeral: true });
        }

        // view
        const active = Object.values(game.players).filter(p => p.active).length;
        const embed = tools.createEmbed({
            author: { name: `Song of Luck — ${int.guild.name}`, iconURL: int.guild.iconURL() },
            fields: [
                { name: 'Round', value: `${game.round}`, inline: true },
                { name: 'Theme', value: game.theme || 'Not set', inline: true },
                { name: 'Signups', value: game.signupsOpen ? 'Open' : 'Closed', inline: true },
                { name: 'Judges channel', value: game.judgeChannel ? `<#${game.judgeChannel}>` : 'Not set', inline: true },
                { name: 'Announce channel', value: game.announceChannel ? `<#${game.announceChannel}>` : 'Not set', inline: true },
                { name: 'Active players', value: `${active}`, inline: true },
            ]
        });
        return int.reply({ embeds: [embed], ephemeral: true });
    }
};
