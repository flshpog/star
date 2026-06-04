const Discord = require('discord.js')

// Misc helpers used around the bot. Ported from sylvia/Polaris, stripped of the
// web dashboard + config.json dependencies. All embeds are forced to white
// (#ffffff) here so the whole bot has one consistent, minimal look.

const COLOR = 0xffffff

class Tools {
    constructor(client, int) {

        this.COLOR = COLOR

        // has manage guild perm
        this.canManageServer = function(member=int?.member, nahnvm) {
            return nahnvm || (member && member.permissions.has(Discord.PermissionFlagsBits.ManageGuild))
        }

        // has manage roles perm
        this.canManageRoles = function(member=int?.member, nahnvm) {
            return nahnvm || (member && member.permissions.has(Discord.PermissionFlagsBits.ManageRoles))
        }

        // converts a string (e.g. "rank") into a clickable slash command mention
        this.commandTag = function(cmd) {
            let foundCmd = client?.application?.commands?.cache?.find(x => x.name == cmd && x.type == Discord.ApplicationCommandType.ChatInput)
            return foundCmd?.id ? `</${cmd}:${foundCmd.id}>` : `\`/${cmd}\``
        }

        // common error messages
        this.errors = {
            xpDisabled: `xp is not enabled in this server!${this.canManageServer() ? ` (enable with ${this.commandTag("xpconfig")})` : ""}`,
            noData: "this server doesn't have any data yet!",
            noBotXP: "bots can't earn xp, silly!",
            cantManageRoles: "i don't have permission to manage roles!",
            notMod: "you don't have permission to use this command!"
        }

        // fetch settings from db (+ a user's xp), creating the server doc if missing
        this.fetchSettings = async function(userID, serverID=int.guild.id) {
            let data = await client.db.fetch(serverID, ["settings", userID ? `users.${userID}` : null])
            if (!data) {
                await client.db.create({ _id: serverID })
                return await this.fetchSettings(userID, serverID)
            }
            if (!data.users) data.users = {}
            return data
        }

        // fetch all xp in the server
        this.fetchAll = async function(serverID=int.guild.id) {
            return await client.db.fetch(serverID).then(data => {
                if (!data) return
                return data
            })
        }

        // calculate current level from xp
        this.getLevel = function(xp, settings, returnRequirement) {
            let lvl = 0
            let previousLevel = 0
            let xpRequired = 0
            while (xp >= xpRequired && lvl <= settings.maxLevel) {
                lvl++
                previousLevel = xpRequired
                xpRequired = this.xpForLevel(lvl, settings)
            }
            lvl--
            return returnRequirement ? { level: lvl, xpRequired, previousLevel } : lvl
        }

        // calculate xp to reach a level
        this.xpForLevel = function(lvl, settings) {
            if (lvl > settings.maxLevel) lvl = settings.maxLevel
            let xpRequired = Object.entries(settings.curve).reduce((total, n) => total + (n[1] * (lvl ** n[0])), 0)
            return settings.rounding > 1 ? settings.rounding * Math.round(xpRequired / settings.rounding) : Math.round(xpRequired)
        }

        // get expected reward roles for a certain level
        this.getRolesForLevel = function(lvl, rewards) {
            if (!lvl || !rewards) return []
            let levelRoles = rewards.filter(x => x.level <= lvl).sort((a, b) => b.level - a.level)
            let topRole = levelRoles[0]
            if (topRole) levelRoles = levelRoles.filter(x => x.keep || (x.level == topRole.level))
            return levelRoles
        }

        // check which level roles a member should and shouldn't have
        this.checkLevelRoles = function(allRoles, roles, lvl, rewards, shouldHave, oldLevel) {
            rewards = rewards.filter(x => allRoles.some(r => r.id == x.id))
            if (!oldLevel) oldLevel = lvl
            if (!shouldHave) shouldHave = this.getRolesForLevel(lvl, rewards)
            let currentLevelRoles = rewards.filter(x => roles.some(r => r.id == x.id))

            let correct = []
            let missing = []
            shouldHave.forEach(x => {
                if (currentLevelRoles.some(r => r.id == x.id)) correct.push(x)
                else if (!x.noSync || (x.noSync && oldLevel < x.level)) missing.push(x)
            })
            let incorrect = currentLevelRoles.filter(x => !x.noSync && !shouldHave.some(r => r.id == x.id))

            return { current: currentLevelRoles, shouldHave, correct, incorrect, missing }
        }

        // add missing level roles and remove incorrect ones
        this.syncLevelRoles = async function(member, list) {
            if (!member.guild.members.me.permissions.has(Discord.PermissionFlagsBits.ManageRoles)) return
            if (!list.incorrect.length && !list.missing.length) return
            let currentRoles = member.roles.cache
            let newRoles = currentRoles.map(x => x.id)
                .filter(x => !list.incorrect.some(r => r.id == x))
                .concat(list.missing.map(x => x.id))
            return member.roles.set(newRoles)
        }

        // get and calculate xp multiplier (for both channels and roles)
        this.getMultiplier = function(member, settings, channel=int.channel) {
            let obj = { multiplier: 1, role: 1, channel: 1, roleList: [], channelList: [] }
            let memberRoles = member.roles.cache

            obj.rolePriority = settings.multipliers.rolePriority
            obj.channelStacking = settings.multipliers.channelStacking

            let thread = {}
            if (channel && channel.isThread()) {
                thread = channel
                channel = channel.parent
            }

            let channelIDs = [ thread?.id, channel?.id, channel?.parent?.id ]
            let foundChannelBoost = channelIDs.map(x => settings.multipliers.channels.find(c => c.id == x)).find(x => x)

            if (foundChannelBoost) {
                obj.channel = foundChannelBoost.boost
                obj.channelList = [foundChannelBoost]
            }

            let roleBoosts = settings.multipliers.roles.filter(x => memberRoles.has(x.id))
            let foundRoleBoost;
            if (roleBoosts.length) {

                let foundXPBan = roleBoosts.find(x => x.boost <= 0)
                if (foundXPBan) foundRoleBoost = foundXPBan

                else switch (obj.rolePriority) {
                    case "smallest":
                        foundRoleBoost = roleBoosts.sort((a, b) => a.boost - b.boost)[0]; break;
                    case "highest":
                        let foundTopBoost = memberRoles.sort((a, b) => b.position - a.position).find(x => roleBoosts.find(y => y.id == x.id))
                        foundRoleBoost = roleBoosts.find(x => x.id == foundTopBoost.id); break;
                    case "combine":
                        let combined = roleBoosts.map(x => x.boost).reduce((a, b) => a * b, 1).toFixed(4)
                        combined = Math.min(+combined, 1000000)
                        obj.role = combined; obj.roleList = roleBoosts; break;
                    case "add":
                        let filteredBoosts = roleBoosts.filter(x => x.boost != 1)
                        let summed = filteredBoosts.length == 1 ? filteredBoosts[0].boost : filteredBoosts.map(x => x.boost).reduce((a, b) => a + (b-1), 1)
                        obj.role = Number(summed.toFixed(4)); obj.roleList = filteredBoosts; break;
                    default:
                        obj.rolePriority = "largest"
                        foundRoleBoost = roleBoosts.sort((a, b) => b.boost - a.boost)[0]; break;
                }

                if (foundRoleBoost) {
                    obj.role = foundRoleBoost.boost
                    obj.roleList = [foundRoleBoost]
                }
            }

            if (obj.role <= 0 || obj.channel <= 0) obj.multiplier = 0
            else switch (settings.multipliers.channelStacking) {
                case "largest": obj.multiplier = Math.max(obj.role, obj.channel); break;
                case "channel": obj.multiplier = foundChannelBoost ? obj.channel : obj.role; break;
                case "role": obj.multiplier = foundRoleBoost ? obj.role : obj.channel; break;
                case "add": obj.multiplier = Math.max(0, 1 + (obj.role - 1) + (obj.channel - 1)); break;
                default: obj.channelStacking = "multiply"; obj.multiplier = obj.role * obj.channel; break;
            }

            obj.multiplier = Math.round(obj.multiplier * 10000) / 10000

            return obj
        }

        // error message if user has no xp
        this.noXPYet = function(user) {
            return this.warn(user.bot ? "*noBotXP" : user.id != int.user.id ? `${user.displayName} doesn't have any xp yet!` : `you don't have any xp yet!`)
        }

        // create an embed from an object (always white)
        this.createEmbed = function(options={}) {
            let embed = new Discord.EmbedBuilder()
            if (options.title) embed.setTitle(options.title)
            if (options.description) embed.setDescription(options.description)
            embed.setColor(this.COLOR)
            if (options.author) embed.setAuthor(typeof options.author == "string" ? {name: options.author, iconURL: int?.member?.displayAvatarURL()} : options.author)
            if (options.footer) embed.setFooter(typeof options.footer == "string" ? {text: options.footer} : options.footer)
            if (options.fields) embed.addFields(options.fields)
            if (options.timestamp) embed.setTimestamp()
            return embed
        }

        // create a button (or multiple)
        this.button = function(buttonOptions) {
            let isArr = Array.isArray(buttonOptions)
            if (!isArr) buttonOptions = [buttonOptions]
            buttonOptions = buttonOptions.map(b => {
                if (typeof b.style == "string") b.style = Discord.ButtonStyle[b.style]
                return b
            })
            if (isArr) return buttonOptions.map(x => new Discord.ButtonBuilder(x))
            else return new Discord.ButtonBuilder(buttonOptions[0])
        }

        // check if user is allowed to interact with a button
        this.canPressButton = function(b, allowedUsers) {
            return (b.user.id.includes(allowedUsers || [int?.user.id]))
        }

        // ignore the press if the user can't press that button
        this.buttonReply = function(int, message) {
            return message ? int.reply(message) : int.deferUpdate()
        }

        // create a component row
        this.row = function(components) {
            if (!components || (Array.isArray(components) && !components[0])) return null
            if (!components.length) components = [components]
            return [new Discord.ActionRowBuilder({components})]
        }

        // disable all clickable buttons
        this.disableButtons = function(btns, selected) {
            let disabledBtns = btns.map(x => x.data.style == Discord.ButtonStyle.Link ? x : x.setDisabled())
            if (selected) {
                selected.deferUpdate()
                disabledBtns = disabledBtns.filter(x => x.customId == selected.customId)
            }
            return this.row(disabledBtns)
        }

        // xp is stored as an object, convert to array
        this.xpObjToArray = function(users) {
            return Object.entries(users).map(x => Object.assign({id: x[0]}, x[1]))
        }

        // send an ephemeral reply, usually when the user did something wrong
        this.warn = function(msg) {
            if (msg.startsWith("*")) msg = this.errors[msg.slice(1)] || msg
            return int.reply({content: this.errors[msg] || msg, ephemeral: true})
        }

        // random number between min and max, inclusive
        this.rng = function(min, max) {
            if (max == undefined && +min) { max = min; min = 1 }
            return Math.floor(Math.random() * (max - min + 1)) + min
        }

        // randomly pick from array
        this.choose = function(arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        }

        // remove duplicates from array
        this.undupe = function(array) {
            if (!Array.isArray(array)) return array
            else return array.filter((x, y) => array.indexOf(x) == y)
        }

        // shuffle array
        this.shuffle = function(arr) {
            for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
            return arr
        }

        // clamp number between two values
        this.clamp = function(num, min, max) {
            return Math.min(Math.max(num, min), max)
        };

        // cut off text once it passes a certain length
        this.limitLength = function(string, max, after="...") {
            if (string.length <= max) return string
            else return string.slice(0, max) + after
        }

        // capitalize first letter of word(s)
        this.capitalize = function(str, all) {
            let text = all ? str.split(" ") : [str]
            text = text.map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase())
            return text.join(" ")
        }

        // add commas to long numbers
        this.commafy = function(num, locale="en-US") {
            return num.toLocaleString(locale, { maximumFractionDigits: 10 })
        }

        // convert timestamp to neat string (e.g. "3 minutes")
        this.time = function(ms, decimals=0, noS, shortTime) {
            let commafy = this.commafy
            if (ms > 3e16) return "forever"
            function timeFormat(amount, str) {
                amount = +amount
                return `${commafy(amount)} ${str}${noS || amount == 1 ? "" : "s"}`
            }
            ms = Math.abs(ms)
            let seconds = (ms / 1000).toFixed(0)
            let minutes = (ms / (1000 * 60)).toFixed(decimals)
            let hours = (ms / (1000 * 60 * 60)).toFixed(decimals)
            let days = (ms / (1000 * 60 * 60 * 24)).toFixed(decimals)
            let years = (ms / (1000 * 60 * 60 * 24 * 365)).toFixed(decimals)
            if (seconds < 1) return timeFormat((ms / 1000).toFixed(2), shortTime ? "sec" : "second")
            if (seconds < 60) return timeFormat(seconds, shortTime ? "sec" : "second")
            else if (minutes < 60) return timeFormat(minutes, shortTime ? "min" : "minute")
            else if (hours <= 24) return timeFormat(hours, "hour")
            else if (days <= 365) return timeFormat(days, "day")
            else return timeFormat(years, "year")
        }

        // convert timestamp to h:m:s (e.g. 4:20)
        this.timestamp = function(ms, useTimeIfLong) {
            if (useTimeIfLong && ms >= 86399000) return this.time(ms, 1)
            let secs = Math.ceil(Math.abs(ms) / 1000)
            if (secs < 0) secs = 0
            let days = Math.floor(secs / 86400)
            if (days) secs -= days * 86400
            let timestamp = `${ms < 0 ? "-" : ""}${days ? `${days}d + ` : ""}${[Math.floor(+secs / 3600), Math.floor(+secs / 60) % 60, +secs % 60].map(v => v < 10 ? "0" + v : v).filter((v,i) => v !== "00" || i > 0).join(":")}`
            if (timestamp.length > 5) timestamp = timestamp.replace(/^0+/, "")
            return timestamp
        }

        // add either 's or ' for plural nouns
        this.pluralS = function(msg="", full=true) {
            let extraS = msg.toLowerCase().endsWith("s") ? "" : "s"
            return full ? msg + "'" + extraS : extraS
        }

        // add an extra s for plurals (e.g. 1 level, 2 levels)
        this.extraS = function(msg, count, onlyExtra, extra={}) {
            let extraStr = (count == 1) ? (extra.s || "") : (extra.p || "s")
            return onlyExtra ? extraStr : msg + extraStr
        }
    }
}

Tools.global = new Tools()   // for files that never run client-dependent functions
module.exports = Tools;
