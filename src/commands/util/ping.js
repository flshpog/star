const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription("check the bot's latency"),

    async execute(interaction) {
        const sent = await interaction.reply({ content: 'pinging...', fetchReply: true });
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
        const ws = Math.round(interaction.client.ws.ping);
        await interaction.editReply(`🏓 pong!\n• roundtrip: **${roundtrip}ms**\n• websocket: **${ws}ms**`);
    },
};
