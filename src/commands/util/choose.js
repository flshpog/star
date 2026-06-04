const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('choose')
        .setDescription('Randomly pick from a list of options')
        .addStringOption(option =>
            option.setName('options')
                .setDescription('Options separated by commas (e.g. "pizza, pasta, burgers")')
                .setRequired(true)),

    async execute(interaction) {
        const raw = interaction.options.getString('options');
        const options = (raw.includes(',') ? raw.split(',') : raw.split(/\s+/))
            .map(o => o.trim())
            .filter(Boolean);

        if (options.length < 2) {
            return interaction.reply({ content: 'Give me at least 2 options to choose from.', ephemeral: true });
        }

        const choice = options[Math.floor(Math.random() * options.length)];
        await interaction.reply(`🎲 I choose: **${choice}**`);
    },
};
