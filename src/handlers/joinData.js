const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DIR, 'server.json'); // { guildId: { autoroles: [id], welcome: { channel, message, enabled } } }

const DEFAULT_MESSAGE = 'welcome {user} to {server}! you\'re member #{count}.';

function load() {
    try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
    catch { return {}; }
}

function save(all) {
    if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
}

function getConfig(guildId) {
    const cfg = load()[guildId] || {};
    return {
        autoroles: cfg.autoroles || [],
        welcome: {
            channel: cfg.welcome?.channel || null,
            message: cfg.welcome?.message || DEFAULT_MESSAGE,
            enabled: cfg.welcome?.enabled ?? false,
        },
    };
}

function setConfig(guildId, cfg) {
    const all = load();
    all[guildId] = cfg;
    save(all);
}

// ----- autoroles -----
function addAutorole(guildId, roleId) {
    const cfg = getConfig(guildId);
    if (cfg.autoroles.includes(roleId)) return false;
    cfg.autoroles.push(roleId);
    setConfig(guildId, cfg);
    return true;
}

function removeAutorole(guildId, roleId) {
    const cfg = getConfig(guildId);
    if (!cfg.autoroles.includes(roleId)) return false;
    cfg.autoroles = cfg.autoroles.filter(id => id !== roleId);
    setConfig(guildId, cfg);
    return true;
}

// ----- welcome -----
function setWelcomeChannel(guildId, channelId) {
    const cfg = getConfig(guildId);
    cfg.welcome.channel = channelId;
    cfg.welcome.enabled = true;
    setConfig(guildId, cfg);
}

function setWelcomeMessage(guildId, message) {
    const cfg = getConfig(guildId);
    cfg.welcome.message = message;
    setConfig(guildId, cfg);
}

function setWelcomeEnabled(guildId, enabled) {
    const cfg = getConfig(guildId);
    cfg.welcome.enabled = enabled;
    setConfig(guildId, cfg);
}

// fill placeholders in a welcome template for a given member
function formatWelcome(template, member) {
    const g = member.guild;
    return (template || DEFAULT_MESSAGE)
        .replace(/{user}/gi, `<@${member.id}>`)
        .replace(/{username}/gi, member.user.username)
        .replace(/{server}/gi, g.name)
        .replace(/{membercount}/gi, g.memberCount)
        .replace(/{count}/gi, g.memberCount);
}

module.exports = {
    DEFAULT_MESSAGE,
    getConfig,
    addAutorole,
    removeAutorole,
    setWelcomeChannel,
    setWelcomeMessage,
    setWelcomeEnabled,
    formatWelcome,
};
