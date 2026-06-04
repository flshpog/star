const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getGame, setGame, announce } = require('../../handlers/competition.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roundadvance')
        .setDescription('advance to the next round.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(o => o.setName('theme').setDescription("the new round's theme (optional)")),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const game = getGame(int.guild.id);

        game.round += 1;
        game.signupsOpen = false;
        const newTheme = int.options.getString('theme');
        if (newTheme) game.theme = newTheme;
        setGame(int.guild.id, game);

        const active = Object.entries(game.players).filter(([, p]) => p.active).map(([id]) => `<@${id}>`);

        const embed = tools.createEmbed({
            title: `round ${game.round} has begun!`,
            description: (game.theme ? `**Theme:** ${game.theme}\n\n` : '') + `**${active.length}** players remain. Submit with \`/submit\`.`,
        });
        await announce(int.guild, game.announceChannel, { embeds: [embed] });

        return int.reply({
            content: `advanced to **round ${game.round}**.${newTheme ? ` Theme: **${newTheme}**.` : ''} ${active.length} active player${active.length !== 1 ? 's' : ''}.`,
            ephemeral: true
        });
    }
};
