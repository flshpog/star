const { SlashCommandBuilder } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getGame, setGame, announce } = require('../../handlers/competition.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit')
        .setDescription('Submit your song for the current round.')
        .addStringOption(o => o.setName('song').setDescription('A link to your song').setRequired(true)),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const game = getGame(int.guild.id);

        const player = game.players[int.user.id];
        if (!player || !player.active) return tools.warn("You're not an active player. Sign up with `/signup` first.");
        if (!game.judgeChannel) return tools.warn("The host hasn't set a judges' channel yet.");

        const url = int.options.getString('song');
        const isNew = !player.submissions[game.round];
        player.submissions[game.round] = { url, at: Date.now() };
        setGame(int.guild.id, game);

        // post to the private judges' channel
        const embed = tools.createEmbed({
            author: { name: int.user.tag, iconURL: int.user.displayAvatarURL() },
            title: `Round ${game.round} submission`,
            fields: [
                { name: 'Player', value: `<@${int.user.id}>`, inline: true },
                { name: 'Theme', value: game.theme || 'Not set', inline: true },
                { name: 'Song', value: url },
            ],
            timestamp: true
        });
        await announce(int.guild, game.judgeChannel, { embeds: [embed] });

        return int.reply({ content: `${isNew ? 'Submitted' : 'Updated your submission'} for round ${game.round}!`, ephemeral: true });
    }
};
