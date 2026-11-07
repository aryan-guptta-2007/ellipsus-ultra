// IndexedDB persistence. This layer only ever sees ciphertext. File metadata
// and file contents live in separate stores so listing a vault never has to
// load the file data.

const DB_NAME = "stealthvault"
const DB_VERSION = 1
const META = "meta"
const FILES = "files"
const BLOBS = "blobs"
const LOG = "log"
const ALL_STORES = [META, FILES, BLOBS, LOG]

let connection = null

function open() {
    if (connection) return connection
    connection = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)
        request.onupgradeneeded = () => {
            const db = request.result
            db.createObjectStore(META)
            db.createObjectStore(FILES, { keyPath: "id" })
            db.createObjectStore(BLOBS, { keyPath: "id" })
            db.createObjectStore(LOG, { keyPath: "id" })
        }
        request.onsuccess = () => {
            const db = request.result
            db.onversionchange = () => {
                db.close()
                connection = null
            }
            resolve(db)
        }
        request.onerror = () => {
            connection = null
            reject(request.error)
        }
    })
    return connection
}

function asPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

async function read(storeName, run) {
    const db = await open()
    return asPromise(run(db.transaction(storeName, "readonly").objectStore(storeName)))
}

// Resolves once the transaction commits, so a resolved write is durable.
async function write(storeNames, run) {
    const db = await open()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeNames, "readwrite")
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
        run(tx)
    })
}

export const getHeader = () => read(META, (store) => store.get("header"))
export const putHeader = (header) => write([META], (tx) => tx.objectStore(META).put(header, "header"))

export const getSettings = () => read(META, (store) => store.get("settings"))
export const putSettings = (settings) => write([META], (tx) => tx.objectStore(META).put(settings, "settings"))

export const getSecurityState = async () =>
    (await read(META, (store) => store.get("security"))) ?? { failedAttempts: 0, restoredAt: null }
export const putSecurityState = (state) => write([META], (tx) => tx.objectStore(META).put(state, "security"))

export const listFileRecords = () => read(FILES, (store) => store.getAll())
export const getBlobRecord = (id) => read(BLOBS, (store) => store.get(id))

export const putFile = (fileRecord, blobRecord) =>
    write([FILES, BLOBS], (tx) => {
        tx.objectStore(FILES).put(fileRecord)
        tx.objectStore(BLOBS).put(blobRecord)
    })

export const deleteFile = (id) =>
    write([FILES, BLOBS], (tx) => {
        tx.objectStore(FILES).delete(id)
        tx.objectStore(BLOBS).delete(id)
    })

export const listLogRecords = () => read(LOG, (store) => store.getAll())

export const putLogRecord = (record, removeIds = []) =>
    write([LOG], (tx) => {
        const store = tx.objectStore(LOG)
        store.put(record)
        removeIds.forEach((id) => store.delete(id))
    })

export const clearVault = () =>
    write(ALL_STORES, (tx) => ALL_STORES.forEach((name) => tx.objectStore(name).clear()))

export async function readAllForBackup() {
    const [header, files, log] = await Promise.all([getHeader(), listFileRecords(), listLogRecords()])
    const blobs = new Map()
    for (const file of files) blobs.set(file.id, await getBlobRecord(file.id))
    return { header, files, blobs, log }
}

// One transaction, so a failed restore leaves no partial vault behind.
export const restoreVault = ({ header, files, blobs, log, restoredAt }) =>
    write(ALL_STORES, (tx) => {
        ALL_STORES.forEach((name) => tx.objectStore(name).clear())
        tx.objectStore(META).put(header, "header")
        tx.objectStore(META).put({ failedAttempts: 0, restoredAt }, "security")
        files.forEach((file) => tx.objectStore(FILES).put(file))
        blobs.forEach((blob) => tx.objectStore(BLOBS).put(blob))
        log.forEach((entry) => tx.objectStore(LOG).put(entry))
    })
