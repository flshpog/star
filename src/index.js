require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');

const Model = require('./classes/DatabaseModel');
const { applyDefaults } = require('./database_schema');

// Intents:
//  - Guilds:                slash commands, roles, channels
//  - GuildMessages:         XP gain (counts that a message was sent) + sticky re-posting
//  - GuildMembers:          PRIVILEGED — fires guildMemberAdd for autoroles + welcomes.
//                           Enable in the dev portal (Bot > Server Members Intent).
//  - GuildMessageReactions: reaction roles (messageReactionAdd/Remove)
// XP/stickies do NOT read message content, so no MessageContent intent.
// Partials let reaction events fire on messages sent before the bot started.
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// JSON data store for the XP engine (servers.json). Same shape as sylvia.
client.db = new Model('servers', applyDefaults);

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
