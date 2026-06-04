// Settings definitions + default-filling (ported from sylvia/Polaris).
// Defines the per-server settings document the XP engine reads, and fills in
// default values on read (the one thing Mongoose used to do automatically).

// type:      bool, int, float, string, collection
// default:   the default value
// min+max:   for numbers, clamps between those values
// precision: for floats, decimal places
// maxlength: for strings, max length
// accept:    for strings, accepted values

const settings = {
    enabled: { type: "bool", default: false },

    gain: {
        min: { type: "int", default: 50, min: 0, max: 5000 },
        max: { type: "int", default: 100, min: 0, max: 5000 },
        time: { type: "float", precision: 4, default: 60, min: 0, max: 31536000 },
    },

    curve: {
        3: { type: "float", precision: 10, default: 1, min: 0, max: 100 },
        2: { type: "float", precision: 10, default: 50, min: 0, max: 10000 },
        1: { type: "float", precision: 10, default: 100, min: 0, max: 100000 },
    },
    rounding: { type: "int", default: 100, min: 1, max: 1000  },
    maxLevel: { type: "int", default: 1000, min: 1, max: 1000  },

    levelUp: {
        enabled: { type: "bool", default: false },
        embed: { type: "bool", default: false },
        rewardRolesOnly: { type: "bool", default: false },
        message: { type: "string", maxlength: 6000, default: "" },
        channel: { type: "string", default: "current", accept: ["dm", "current", "discord:channel"] },
        multiple: { type: "int", default: 1, min: 1, max: 1000 },
        multipleUntil: { type: "int", default: 20, min: 0, max: 1000 }
    },

    multipliers: {
        roles: { type: "collection", values: {
            id: { type: "string", accept: ["discord:role"] },
            boost: { type: "float", min: 0, max: 100, precision: 4 },
        }},
        rolePriority: { type: "string", default: "largest", accept: ["largest", "smallest", "highest", "add", "combine"] },
        channels: { type: "collection", values: {
            id: { type: "string", accept: ["discord:channel"] },
            boost: { type: "float", min: 0, max: 100, precision: 4 },
        }},
        channelStacking: { type: "string", default: "multiply", accept: ["multiply", "add", "largest", "channel", "role"] }
    },

    rewards: { type: "collection", values: {
        id: { type: "string", accept: ["discord:role"] },
        level: { type: "int", min: 1, max: 1000 },
        keep: { type: "bool" },
        noSync: { type: "bool" },
    }},

    rewardSyncing: {
        sync: { type: "string", default: "level", accept: ["level", "xp", "never"] },
        noManual: { type: "bool", default: false },
        noWarning: { type: "bool", default: false }
    },

    leaderboard: {
        disabled: { type: "bool", default: false },
        private: { type: "bool", default: false },
        hideRoles: { type: "bool", default: false },
        maxEntries: { type: "int", default: 0, min: 0, max: 1000000 },
        minLevel: { type: "int", default: 0, min: 0, max: 1000 },
        ephemeral: { type: "bool", default: false },
        embedColor: { type: "int", default: -1, min: -1, max: 0xffffff }
    },

    rankCard: {
        disabled: { type: "bool", default: false },
        relativeLevel: { type: "bool", default: false },
        hideCooldown: { type: "bool", default: false },
        ephemeral: { type: "bool", default: false },
        embedColor: { type: "int", default: -1, min: -1, max: 0xffffff }
    },

    hideMultipliers: { type: "bool", default: false },
    manualPerms: { type: "bool", default: false }
}

const settingsArray = []
const settingsIDs = {}

function addToSettingsArray(value, name) {
    let obj = value
    obj.db = name
    settingsArray.push(obj)
    settingsIDs[name] = obj
}

Object.entries(settings).forEach(([key, val]) => {
    if (!val.type) {
        Object.entries(val).forEach(([innerKey, innerVal]) => {
            addToSettingsArray(innerVal, `${key}.${innerKey}`)
        })
    }
    else addToSettingsArray(val, key)
})

// build a fresh settings object filled with every default value
function defaultSettings() {
    const out = {}
    Object.entries(settings).forEach(([key, val]) => {
        if (val.type) out[key] = val.type == "collection" ? [] : val.default
        else {
            out[key] = {}
            Object.entries(val).forEach(([innerKey, innerVal]) => {
                out[key][innerKey] = innerVal.type == "collection" ? [] : innerVal.default
            })
        }
    })
    return out
}

// deep-merge stored values on top of defaults (arrays/collections replaced wholesale)
function merge(base, over) {
    if (over === undefined) return base
    if (Array.isArray(base) || Array.isArray(over)) return over
    if (base && over && typeof base == "object" && typeof over == "object") {
        const out = { ...base }
        for (const k in over) out[k] = (k in base) ? merge(base[k], over[k]) : over[k]
        return out
    }
    return over
}

// given a stored server document (or null), return a full document with defaults filled in
function applyDefaults(stored) {
    if (!stored) return stored
    return {
        _id: stored._id,
        users: stored.users || {},
        settings: merge(defaultSettings(), stored.settings || {}),
        info: { lastUpdate: 0, ...(stored.info || {}) }
    }
}

module.exports = {
    settings, settingsArray, settingsIDs, defaultSettings, applyDefaults
}
