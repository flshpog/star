# ★

A simple Discord utility bot built on [discord.js](https://discord.js.org/) v14.

## Commands
| Command | Description |
| --- | --- |
| `/ping` | Check the bot's latency |
| `/choose` | Randomly pick from a list of options |
| `/userinfo` | Show info about a user |
| `/serverinfo` | Show info about the server |
| `/say` | Make the bot repeat a message (requires Manage Messages) |
| `/avatar` | Show a user's avatar |

## Setup
1. Install [Node.js](https://nodejs.org/) (v18+), then run `npm install` in this folder.
2. Copy `.env.example` to `.env` and fill in:
   - `BOT_TOKEN` — from the **Bot** tab of the [Discord developer portal](https://discord.com/developers/applications)
   - `CLIENT_ID` — your application ID from the **General Information** tab
   - `GUILD_ID` — *(optional)* a server ID, for instant command updates while testing
3. Invite the bot to your server (replace `CLIENT_ID` in the URL):
   `https://discord.com/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot%20applications.commands`
4. Start it: `npm start`

On startup the bot registers its slash commands automatically. If you set `GUILD_ID`,
they appear instantly in that server; global commands can take up to an hour the first time.

## Adding a command
Drop a new file in `src/commands/<category>/` that exports `{ data, execute }`:

```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('hello').setDescription('Say hi'),
    async execute(interaction) {
        await interaction.reply('Hi!');
    },
};
```

It's picked up automatically on the next restart.
