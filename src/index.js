require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Slash commands only, so we just need the Guilds intent (no privileged intents).
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

// Load slash commands from src/commands/<category>/<name>.js
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const category of fs.readdirSync(commandsPath)) {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
        const command = require(path.join(categoryPath, file));
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`[warn] ${category}/${file} is missing "data" or "execute"`);
        }
    }
}

// Load events from src/events
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
    const event = require(path.join(eventsPath, file));
    if (event.once) client.once(event.name, (...args) => event.execute(...args));
    else client.on(event.name, (...args) => event.execute(...args));
}

process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));
process.on('uncaughtException', err => console.error('Uncaught exception:', err));

if (!process.env.BOT_TOKEN) {
    console.error('Missing BOT_TOKEN — copy .env.example to .env and fill it in.');
    process.exit(1);
}

client.login(process.env.BOT_TOKEN);
