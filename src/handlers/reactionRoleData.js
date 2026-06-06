const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DIR, 'reactionroles.json');
// shape: { [messageId]: { guildId, channelId, roles: { [emojiKey]: { roleId, emoji } } } }

function load() {
    try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
    catch { return {}; }
}

function save(all) {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
}

// emojiKey matches discord's reaction payload: custom -> id, unicode -> the char
function addMapping(guildId, channelId, messageId, emojiKey, roleId, emojiDisplay) {
    const all = load();
    if (!all[messageId]) all[messageId] = { guildId, channelId, roles: {} };
    all[messageId].roles[emojiKey] = { roleId, emoji: emojiDisplay };
    save(all);
}

function getRole(messageId, emojiKey) {
    return load()[messageId]?.roles?.[emojiKey]?.roleId || null;
}

function removeMapping(messageId, emojiKey) {
    const all = load();
    const entry = all[messageId];
    if (!entry?.roles?.[emojiKey]) return false;
    delete entry.roles[emojiKey];
    if (!Object.keys(entry.roles).length) delete all[messageId];
    save(all);
    return true;
}

function listGuild(guildId) {
    const all = load();
    return Object.entries(all)
        .filter(([, v]) => v.guildId === guildId)
        .map(([messageId, v]) => ({ messageId, channelId: v.channelId, roles: v.roles }));
}

// parse "🎉" or "<:name:123>" or "<a:name:123>" -> { key, reactable, display }
function parseEmoji(input) {
    const raw = (input || '').trim();
    if (!raw) return null;
    const custom = raw.match(/^<(a?):(\w+):(\d+)>$/);
    if (custom) return { key: custom[3], reactable: `${custom[2]}:${custom[3]}`, display: raw };
    if (/\s/.test(raw)) return null; // a unicode emoji has no spaces
    return { key: raw, reactable: raw, display: raw };
}

// parse a discord message link -> { guildId, channelId, messageId }
function parseMessageLink(link) {
    const m = (link || '').trim().match(/channels\/(\d+)\/(\d+)\/(\d+)/);
    if (!m) return null;
    return { guildId: m[1], channelId: m[2], messageId: m[3] };
}

module.exports = { addMapping, getRole, removeMapping, listGuild, parseEmoji, parseMessageLink };
