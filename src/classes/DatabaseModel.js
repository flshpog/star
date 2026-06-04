// JSON-file database (ported from sylvia/Polaris).
//
// Every collection lives in its own file (e.g. data/servers.json) as a single
// object keyed by document _id. Data is kept in memory and written on change.
// Single-process only — don't run multiple shards against these files.

const fs = require("fs")
const path = require("path")

const DATA_DIR = path.join(__dirname, "..", "..", "data")

// ---- dot-notation path helpers (Mongo-style "a.b.c" keys) ----

function setPath(obj, keyPath, value) {
    const parts = keyPath.split(".")
    let cur = obj
    for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i]
        if (typeof cur[k] != "object" || cur[k] === null || Array.isArray(cur[k])) cur[k] = {}
        cur = cur[k]
    }
    cur[parts[parts.length - 1]] = value
}

function unsetPath(obj, keyPath) {
    const parts = keyPath.split(".")
    let cur = obj
    for (let i = 0; i < parts.length - 1; i++) {
        if (typeof cur[parts[i]] != "object" || cur[parts[i]] === null) return
        cur = cur[parts[i]]
    }
    delete cur[parts[parts.length - 1]]
}

function getPath(obj, keyPath) {
    return keyPath.split(".").reduce((cur, k) => (cur == null ? undefined : cur[k]), obj)
}

function matches(doc, query) {
    return Object.entries(query).every(([key, cond]) => {
        const val = key == "_id" ? doc._id : getPath(doc, key)
        if (cond && typeof cond == "object" && !Array.isArray(cond)) {
            return Object.entries(cond).every(([op, target]) => {
                switch (op) {
                    case "$in":  return Array.isArray(target) && target.includes(val)
                    case "$nin": return Array.isArray(target) && !target.includes(val)
                    case "$lt":  return val < target
                    case "$lte": return val <= target
                    case "$gt":  return val > target
                    case "$gte": return val >= target
                    case "$ne":  return val !== target
                    default:     return false
                }
            })
        }
        return val === cond
    })
}

// value that works whether the caller awaits it OR calls .exec() on it
function query(value) {
    const p = Promise.resolve(value)
    p.exec = () => Promise.resolve(value)
    return p
}

function clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj))
}

class Model {
    constructor(collectionName, applyDefaults) {
        this.file = path.join(DATA_DIR, `${collectionName}.json`)
        this.applyDefaults = applyDefaults || (x => x)
        this.data = this.read()
        if (collectionName) console.log(`Loaded "${collectionName}" data (${Object.keys(this.data).length} entries)`)
    }

    read() {
        try { return JSON.parse(fs.readFileSync(this.file, "utf8")) }
        catch { return {} }
    }

    write() {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
        fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2))
    }

    hydrate(id) {
        const stored = this.data[id]
        if (!stored) return null
        return clone(this.applyDefaults(stored))
    }

    fetch(id, _filter, _options) {
        return query(this.hydrate(id))
    }

    update(id, data = {}, _options) {
        let doc = this.data[id]
        if (!doc) doc = this.data[id] = { _id: id }
        if (data.$set) for (const [k, v] of Object.entries(data.$set)) setPath(doc, k, v)
        if (data.$unset) for (const k of Object.keys(data.$unset)) unsetPath(doc, k)
        if (!data.$set && !data.$unset) for (const [k, v] of Object.entries(data)) setPath(doc, k, v)
        this.write()
        return query(this.hydrate(id))
    }

    create(data = {}, _options) {
        const id = data._id
        this.data[id] = { ...data }
        this.write()
        return query(this.hydrate(id))
    }

    find(queryObj = {}, _filter, _options) {
        const results = Object.keys(this.data)
            .filter(id => matches(this.data[id], queryObj))
            .map(id => this.hydrate(id))
        return query(results)
    }

    delete(queryObj = {}, _options) {
        let removed = 0
        for (const id of Object.keys(this.data)) {
            if (matches(this.data[id], queryObj)) { delete this.data[id]; removed++ }
        }
        if (removed) this.write()
        return query({ deletedCount: removed })
    }
}

module.exports = Model;
