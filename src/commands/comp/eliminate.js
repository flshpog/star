const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getGame, setGame, announce } = require('../../handlers/competition.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eliminate')
        .setDescription('eliminate a player from the competition.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(o => o.setName('player').setDescription('the player to eliminate').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('optional note (e.g. lowest average)')),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const game = getGame(int.guild.id);

        const user = int.options.getUser('player');
        const reason = int.options.getString('reason');
        const player = game.players[user.id];

        if (!player || !player.active) return tools.warn("that player isn't an active competitor.");

        player.active = false;
        player.eliminatedRound = game.round;
        setGame(int.guild.id, game);

        const remaining = Object.values(game.players).filter(p => p.active).length;

        const embed = tools.createEmbed({
            title: 'eliminated',
            description: `<@${user.id}> has been eliminated in round ${game.round}.` + (reason ? `\n${reason}` : ''),
            footer: `${remaining} player${remaining !== 1 ? 's' : ''} remaining`
        });
        await announce(int.guild, game.announceChannel, { embeds: [embed] });

        return int.reply({ content: `eliminated <@${user.id}>. ${remaining} remaining.`, ephemeral: true });
    }
};
