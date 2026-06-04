const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getGame, setGame, announce } = require('../../handlers/competition.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('theme')
        .setDescription('set the theme for the current round.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(o => o.setName('text').setDescription('the round theme').setRequired(true))
        .addBooleanOption(o => o.setName('announce').setDescription('post the theme in the announce channel (default: yes)')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const game = getGame(int.guild.id);

        const text = int.options.getString('text');
        game.theme = text;
        setGame(int.guild.id, game);

        const shouldAnnounce = int.options.get('announce')?.value ?? true;
        if (shouldAnnounce) {
            const embed = tools.createEmbed({
                title: `round ${game.round} theme`,
                description: text
            });
            await announce(int.guild, game.announceChannel, { embeds: [embed] });
        }

        return int.reply({ content: `round ${game.round} theme set to: **${text}**`, ephemeral: true });
    }
};
