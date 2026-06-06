const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DIR, 'stickyroles.json');
// shape: { [guildId]: { enabled: bool, members: { [userId]: [roleId] } } }

function load() {
    try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
    catch { return {}; }
}

function save(all) {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
}

function isEnabled(guildId) {
    return load()[guildId]?.enabled ?? false;
}

function setEnabled(guildId, enabled) {
    const all = load();
    if (!all[guildId]) all[guildId] = { enabled, members: {} };
    else all[guildId].enabled = enabled;
    save(all);
}

function saveMemberRoles(guildId, userId, roleIds) {
    const all = load();
    if (!all[guildId]) all[guildId] = { enabled: false, members: {} };
    all[guildId].members[userId] = roleIds;
    save(all);
}

function getMemberRoles(guildId, userId) {
    return load()[guildId]?.members?.[userId] || [];
}

function clearMemberRoles(guildId, userId) {
    const all = load();
    if (all[guildId]?.members?.[userId]) {
        delete all[guildId].members[userId];
        save(all);
    }
}

module.exports = { isEnabled, setEnabled, saveMemberRoles, getMemberRoles, clearMemberRoles };
