const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', 'data');
const WARN_FILE = path.join(DIR, 'warnings.json');     // { guildId: { userId: [ {mod, reason, at} ] } }
const SETTINGS_FILE = path.join(DIR, 'modsettings.json'); // { guildId: { muteRole: id } }

function load(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { return {}; }
}

function save(file, data) {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ----- warnings -----
function getWarnings(guildId, userId) {
    const all = load(WARN_FILE);
    return all[guildId]?.[userId] || [];
}

function addWarning(guildId, userId, entry) {
    const all = load(WARN_FILE);
    if (!all[guildId]) all[guildId] = {};
    if (!all[guildId][userId]) all[guildId][userId] = [];
    all[guildId][userId].push(entry);
    save(WARN_FILE, all);
    return all[guildId][userId];
}

function removeWarning(guildId, userId, index) {
    const all = load(WARN_FILE);
    const list = all[guildId]?.[userId];
    if (!list || index < 0 || index >= list.length) return null;
    const [removed] = list.splice(index, 1);
    if (!list.length) delete all[guildId][userId];
    save(WARN_FILE, all);
    return removed;
}

// ----- mute role -----
function getMuteRole(guildId) {
    return load(SETTINGS_FILE)[guildId]?.muteRole || null;
}

function setMuteRole(guildId, roleId) {
    const all = load(SETTINGS_FILE);
    if (!all[guildId]) all[guildId] = {};
    all[guildId].muteRole = roleId;
    save(SETTINGS_FILE, all);
}

// ----- duration parsing ("10m", "1h30m", "1d", "2w") -> ms -----
function parseDuration(str) {
    if (!str) return null;
    const re = /(\d+)\s*(s|m|h|d|w)/gi;
    const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
    let ms = 0, m, matched = false;
    while ((m = re.exec(str))) { matched = true; ms += parseInt(m[1]) * mult[m[2].toLowerCase()]; }
    return matched ? ms : null;
}

module.exports = { getWarnings, addWarning, removeWarning, getMuteRole, setMuteRole, parseDuration };
