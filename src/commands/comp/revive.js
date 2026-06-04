const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getGame, setGame } = require('../../handlers/competition.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('revive')
        .setDescription('Bring an eliminated player back into the competition.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(o => o.setName('player').setDescription('The player to revive').setRequired(true)),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const game = getGame(int.guild.id);

        const user = int.options.getUser('player');
        const player = game.players[user.id];

        if (!player) return tools.warn("That player has never been in the competition.");
        if (player.active) return tools.warn("That player is already active.");

        player.active = true;
        player.eliminatedRound = null;
        setGame(int.guild.id, game);

        return int.reply({ content: `Revived <@${user.id}>. They're back in the game.`, ephemeral: true });
    }
};
