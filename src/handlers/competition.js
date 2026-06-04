const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', '..', 'data', 'competition.json');

function defaultGame() {
    return {
        round: 1,
        theme: '',
        signupsOpen: true,
        judgeChannel: null,
        announceChannel: null,
        players: {}, // userId: { active, submissions: { [round]: {url, at} }, eliminatedRound }
    };
}

function load() {
    try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
    catch { return {}; }
}

function save(all) {
    const dir = path.dirname(FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
}

function getGame(guildId) {
    const all = load();
    return all[guildId] || defaultGame();
}

function setGame(guildId, game) {
    const all = load();
    all[guildId] = game;
    save(all);
}

// send a message to a configured channel if it exists
async function announce(guild, channelId, payload) {
    if (!channelId) return;
    const ch = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (ch) await ch.send(payload).catch(() => {});
}

module.exports = { defaultGame, getGame, setGame, announce };
