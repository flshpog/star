const { SlashCommandBuilder } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getGame, setGame } = require('../../handlers/competition.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('signup')
        .setDescription('sign up for the song of luck competition.'),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const game = getGame(int.guild.id);

        if (!game.signupsOpen) return tools.warn("signups are currently closed.");

        const id = int.user.id;
        const existing = game.players[id];
        if (existing && existing.active) return tools.warn("you're already signed up!");

        game.players[id] = {
            active: true,
            submissions: existing?.submissions || {},
            eliminatedRound: null,
        };
        setGame(int.guild.id, game);

        return int.reply({ content: `you're signed up for **song of luck**! good luck.`, ephemeral: true });
    }
};
