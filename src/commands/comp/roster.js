const { SlashCommandBuilder } = require('discord.js');
const Tools = require('../../classes/Tools.js');
const { getGame } = require('../../handlers/competition.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roster')
        .setDescription('View the competition roster and standings.'),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const game = getGame(int.guild.id);

        const entries = Object.entries(game.players);
        if (!entries.length) return int.reply({ content: 'Nobody has signed up yet.', ephemeral: true });

        const active = entries.filter(([, p]) => p.active);
        const eliminated = entries.filter(([, p]) => !p.active);

        const activeLines = active.map(([id, p]) => {
            const submitted = p.submissions[game.round] ? 'submitted' : 'no submission';
            return `<@${id}> — ${submitted}`;
        });
        const elimLines = eliminated
            .sort((a, b) => (b[1].eliminatedRound || 0) - (a[1].eliminatedRound || 0))
            .map(([id, p]) => `<@${id}> — out round ${p.eliminatedRound ?? '?'}`);

        const fields = [
            { name: `Active (${active.length})`, value: activeLines.join('\n') || 'None' },
        ];
        if (elimLines.length) fields.push({ name: `Eliminated (${eliminated.length})`, value: elimLines.join('\n') });

        const embed = tools.createEmbed({
            author: { name: `Song of Luck — Round ${game.round}`, iconURL: int.guild.iconURL() },
            description: game.theme ? `**Theme:** ${game.theme}` : 'No theme set yet.',
            fields
        });
        return int.reply({ embeds: [embed] });
    }
};
