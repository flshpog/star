# ★

The Discord bot for the **Song of Luck** music competition — a Survivor-style ORG
where players submit songs to a theme each round and the lowest average is eliminated.
On top of the competition it's a full server bot: an XP/leveling system (ported from
Polaris), sticky messages, and moderation. Built on [discord.js](https://discord.js.org/) v14.

All embeds use a minimal white (`#ffffff`) style with no emoji.

## Commands

**Competition**
| Command | Who | Description |
| --- | --- | --- |
| `/signup` | anyone | Sign up while signups are open |
| `/submit <song>` | players | Submit your song; it's posted to the judges' channel |
| `/roster` | anyone | Current round, theme, who's in/out, who's submitted |
| `/theme <text>` | host | Set the round theme (announced) |
| `/roundadvance [theme]` | host | Advance to the next round |
| `/eliminate <player> [reason]` | host | Eliminate a player (you judge manually) |
| `/revive <player>` | host | Bring an eliminated player back |
| `/competition setup\|view` | host | Set judges/announce channels + signup toggle |

**XP** (ported from Polaris — same leveling math, reward roles, multipliers)
| Command | Description |
| --- | --- |
| `/rank` `/top` `/calculate` | View XP, the leaderboard, and level estimates |
| `/rewardrole` `/multiplier` | Configure level-reward roles and XP multipliers |
| `/addxp` `/clear` `/sync` | Mod tools: adjust XP, reset cooldowns, fix level roles |
| `/xpconfig` | Configure the XP system (replaces the old web dashboard) |

**Moderation** — `/ban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings` `/delwarn` `/purge` `/rmute` `/unmute` `/modconfig`

**Sticky / utility** — `/sticky` `/cmds` (lists every command) and `/ping` `/choose` `/userinfo` `/serverinfo` `/say` `/avatar`

## Setup
1. Install [Node.js](https://nodejs.org/) (v18+), then run `npm install`.
2. Copy `.env.example` to `.env` and fill in:
   - `BOT_TOKEN` — from the **Bot** tab of the [developer portal](https://discord.com/developers/applications)
   - `CLIENT_ID` — your application ID (**General Information** tab)
   - `GUILD_ID` — *(optional)* your server ID, for instant command updates while testing
3. Invite the bot (replace `CLIENT_ID`):
   `https://discord.com/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot%20applications.commands`
4. Start it: `npm start`

**No privileged intents required.** The bot only uses `Guilds` and `GuildMessages` — it
never reads message content, so you don't need to enable Message Content or Server Members
in the developer portal.

## Data
Everything is stored as plain JSON in `data/` (created automatically, gitignored):
- `servers.json` — XP and per-server XP settings
- `competition.json` — Song of Luck state (round, theme, players, submissions)
- `warnings.json` / `modsettings.json` — moderation warnings + mute role
- `stickies.json` — sticky messages

Back up the bot by copying the `data/` folder.

## Adding a command
Drop a file in `src/commands/<category>/` exporting `{ data, execute }`; it's loaded on the next restart.
