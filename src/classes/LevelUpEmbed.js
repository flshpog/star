const Discord = require("discord.js")

// Parses a user-supplied JSON embed string for embed-mode level-up messages.
class LevelUpEmbed {
    constructor(data) {

        this.extraContent = null
        this.messageEmbed = null

        try {
            data = JSON.parse(data)
            let embed = data?.embeds[0]
            if (!embed || Array.isArray(embed) || typeof embed != "object") this.invalid = true

            if (data.content) this.extraContent = data.content
            this.messageEmbed = new Discord.EmbedBuilder(embed)

        }
        catch(e) {
            console.log(e)
            this.invalid = true
        }
    }

    json(returnFull=true) {
        if (this.invalid || !this.messageEmbed) return null
        let jsonData = this.messageEmbed.toJSON()
        delete jsonData.type

        for (const [key, val] of Object.entries(jsonData)) {
            if (val === null || val === undefined) delete jsonData[key]
        }

        let fullData = returnFull ? { content: this.extraContent || undefined, embeds: [ jsonData ] } : jsonData
        return fullData
    }
}

module.exports = LevelUpEmbed;
