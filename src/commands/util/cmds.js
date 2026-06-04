const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Tools = require('../../classes/Tools.js');

// category folder -> display name, in the order they should appear
const CATEGORIES = [
    ['comp', 'Song of Luck'],
    ['xp', 'XP'],
    ['mod', 'Moderation'],
    ['util', 'Utility'],
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cmds')
        .setDescription('List every command and what it does.'),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);

        const base = path.join(__dirname, '..');
        const fields = [];

        for (const [folder, label] of CATEGORIES) {
            const dir = path.join(base, folder);
            if (!fs.existsSync(dir)) continue;

            const cmds = [];
            for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
                const cmd = require(path.join(dir, file));
                if (cmd?.data) cmds.push({ name: cmd.data.name, desc: cmd.data.description });
            }
            if (!cmds.length) continue;

            cmds.sort((a, b) => a.name.localeCompare(b.name));
            fields.push({ name: label, value: cmds.map(c => `\`/${c.name}\` — ${c.desc}`).join('\n') });
        }

        const embed = tools.createEmbed({
            author: { name: `${int.client.user.username} — commands`, iconURL: int.client.user.displayAvatarURL() },
            fields,
            footer: `${fields.reduce((n, f) => n + f.value.split('\n').length, 0)} commands`
        });

        return int.reply({ embeds: [embed], ephemeral: true });
    }
};
