const { SlashCommandBuilder } = require('discord.js');
const https = require('https');
const http = require('http');
const Tools = require('../../classes/Tools.js');
const { getGame, setGame, announce } = require('../../handlers/competition.js');

// Accept the common music platforms (Spotify, YouTube, SoundCloud, Apple Music)
const LINK_REGEX = /^https?:\/\/(open\.spotify\.com|spotify\.link|(?:www\.|m\.|music\.)?youtube\.com|youtu\.be|soundcloud\.com|on\.soundcloud\.com|music\.apple\.com)\//i;

// fetch a page's <title> (follows redirects, gives up after 5s) — best-effort
function fetchTitle(url, depth = 0) {
    return new Promise((resolve) => {
        if (depth > 5) return resolve(null);
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.destroy();
                return fetchTitle(res.headers.location, depth + 1).then(resolve);
            }
            let body = '';
            res.setEncoding('utf-8');
            res.on('data', chunk => {
                body += chunk;
                const match = body.match(/<title[^>]*>([^<]+)<\/title>/i);
                if (match) { res.destroy(); resolve(match[1].trim()); }
            });
            res.on('end', () => {
                const match = body.match(/<title[^>]*>([^<]+)<\/title>/i);
                resolve(match ? match[1].trim() : null);
            });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    });
}

function cleanTitle(raw) {
    if (!raw) return null;
    return raw
        .replace(/ - YouTube$/i, '')
        .replace(/ \| Spotify$/i, '')
        .replace(/ by .+ \| Free Listening on SoundCloud$/i, '')
        .replace(/ \| SoundCloud$/i, '')
        .replace(/ on Apple Music$/i, '')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .trim() || null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit')
        .setDescription('Submit your song for the current round.')
        .addStringOption(o => o.setName('song').setDescription('A Spotify, YouTube, or SoundCloud link').setRequired(true)),

    async execute(interaction) {
        const int = interaction;
        const tools = new Tools(int.client, int);
        const game = getGame(int.guild.id);

        const player = game.players[int.user.id];
        if (!player || !player.active) return tools.warn("You're not an active player. Sign up with `/signup` first.");
        if (!game.judgeChannel) return tools.warn("The host hasn't set a judges' channel yet.");

        const link = int.options.getString('song').trim();
        if (!LINK_REGEX.test(link)) return tools.warn("Please submit a valid Spotify, YouTube, or SoundCloud link.");

        const isNew = !player.submissions[game.round];

        await int.deferReply({ ephemeral: true });
        const title = cleanTitle(await fetchTitle(link)) || 'Untitled';

        player.submissions[game.round] = { url: link, title, at: Date.now() };
        setGame(int.guild.id, game);

        // submitted / total among active players this round
        const activePlayers = Object.values(game.players).filter(p => p.active);
        const submittedCount = activePlayers.filter(p => p.submissions[game.round]).length;

        // post to the private judges' channel
        const embed = tools.createEmbed({
            author: { name: int.user.tag, iconURL: int.user.displayAvatarURL() },
            title: `Round ${game.round} submission`,
            fields: [
                { name: 'Song', value: `[${title}](${link})` },
                { name: 'Player', value: `<@${int.user.id}>`, inline: true },
                { name: 'Theme', value: game.theme || 'Not set', inline: true },
            ],
            footer: `${submittedCount}/${activePlayers.length} submitted`,
            timestamp: true
        });
        await announce(int.guild, game.judgeChannel, { embeds: [embed] });

        // light log line in the announce channel (if configured)
        if (game.announceChannel) {
            await announce(int.guild, game.announceChannel, `<@${int.user.id}> submitted for **${game.theme || 'this round'}**.`);
        }

        return int.editReply({ content: `${isNew ? 'Submitted' : 'Updated your submission'}: **${title}** (round ${game.round}).` });
    }
};
