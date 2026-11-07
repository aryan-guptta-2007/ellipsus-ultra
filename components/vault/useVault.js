"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
    IntegrityError,
    createVaultKeys,
    decryptBytes,
    decryptJson,
    encryptBytes,
    encryptJson,
    fileDataContext,
    fileMetaContext,
    logContext,
    randomId,
    rewrapVaultKey,
    unlockVaultKey,
} from "@/lib/vault/crypto"
import { packBackup, unpackBackup } from "@/lib/vault/backup"
import * as store from "@/lib/vault/store"

// Web Crypto encrypts in one shot, so a file has to fit in memory a few times over.
export const MAX_FILE_BYTES = 256 * 1024 * 1024
const MAX_LOG_ENTRIES = 500
const DEFAULT_SETTINGS = { autoLockMinutes: 5 }
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"]

function isSupported() {
    return (
        typeof window !== "undefined" &&
        window.isSecureContext &&
        Boolean(window.crypto?.subtle) &&
        Boolean(window.indexedDB)
    )
}

function friendlyStorageError(error) {
    if (error?.name === "QuotaExceededError") {
        return new Error("This browser has run out of storage space for the vault.")
    }
    return error
}

async function decryptFileRecord(key, record) {
    try {
        const meta = await decryptJson(key, record.meta, fileMetaContext(record.id))
        return { ...meta, id: record.id, createdAt: record.createdAt, corrupt: false }
    } catch {
        return {
            id: record.id,
            createdAt: record.createdAt,
            name: "Unreadable record",
            type: "",
            size: 0,
            corrupt: true,
        }
    }
}

export function useVault() {
    const keyRef = useRef(null)
    const busyRef = useRef(0)
    const lastActivityRef = useRef(0)
    const channelRef = useRef(null)
    const logIdsRef = useRef([])

    const [status, setStatus] = useState("loading") // loading | unsupported | new | locked | unlocked
    const [header, setHeader] = useState(null)
    const [files, setFiles] = useState([])
    const [log, setLog] = useState([])
    const [settings, setSettings] = useState(DEFAULT_SETTINGS)
    const [integrity, setIntegrity] = useState(null)
    const [failedSinceLastUnlock, setFailedSinceLastUnlock] = useState(0)

    const notifyOtherTabs = useCallback((type) => channelRef.current?.postMessage({ type }), [])

    const refreshFiles = useCallback(async () => {
        const key = keyRef.current
        if (!key) return
        const records = await store.listFileRecords()
        const decrypted = await Promise.all(records.map((record) => decryptFileRecord(key, record)))
        setFiles(decrypted.sort((a, b) => b.createdAt - a.createdAt))
    }, [])

    const refreshLog = useCallback(async () => {
        const key = keyRef.current
        if (!key) return
        const records = (await store.listLogRecords()).sort((a, b) => a.at - b.at)
        logIdsRef.current = records.map((record) => record.id)
        const entries = await Promise.all(
            records.map(async (record) => {
                try {
                    const entry = await decryptJson(key, record.entry, logContext(record.id))
                    return { ...entry, id: record.id, at: record.at }
                } catch {
                    return { id: record.id, at: record.at, type: "log.unreadable" }
                }
            }),
        )
        setLog(entries.reverse())
    }, [])

    const addLog = useCallback(
        async (type, detail = {}) => {
            const key = keyRef.current
            if (!key) return
            const id = randomId()
            const at = Date.now()
            const entry = await encryptJson(key, { type, ...detail }, logContext(id))

            const overflow = logIdsRef.current.length + 1 - MAX_LOG_ENTRIES
            const removeIds = overflow > 0 ? logIdsRef.current.slice(0, overflow) : []
            await store.putLogRecord({ id, at, entry }, removeIds)
            logIdsRef.current = [...logIdsRef.current.slice(removeIds.length), id]
            setLog((current) =>
                [{ type, ...detail, id, at }, ...current].slice(0, MAX_LOG_ENTRIES),
            )
            notifyOtherTabs("changed")
        },
        [notifyOtherTabs],
    )

    const clearSession = useCallback(() => {
        keyRef.current = null
        logIdsRef.current = []
        setFiles([])
        setLog([])
        setIntegrity(null)
    }, [])

    const loadStatus = useCallback(async () => {
        if (!isSupported()) {
            setStatus("unsupported")
            return
        }
        const [storedHeader, storedSettings] = await Promise.all([store.getHeader(), store.getSettings()])
        setHeader(storedHeader ?? null)
        setSettings({ ...DEFAULT_SETTINGS, ...storedSettings })
        setStatus(storedHeader ? "locked" : "new")
    }, [])

    useEffect(() => {
        loadStatus().catch(() => setStatus("unsupported"))
    }, [loadStatus])

    // Keep other open tabs consistent. A vault can only be open in one state.
    useEffect(() => {
        if (typeof BroadcastChannel === "undefined") return
        const channel = new BroadcastChannel("stealthvault")
        channelRef.current = channel
        channel.onmessage = ({ data }) => {
            if (data.type === "changed") {
                refreshFiles()
                refreshLog()
            } else if (data.type === "header") {
                clearSession()
                loadStatus()
            }
        }
        return () => {
            channel.close()
            channelRef.current = null
        }
    }, [clearSession, loadStatus, refreshFiles, refreshLog])

    const beginSession = useCallback(
        async (key) => {
            keyRef.current = key
            lastActivityRef.current = Date.now()
            await Promise.all([refreshFiles(), refreshLog()])
            setStatus("unlocked")
        },
        [refreshFiles, refreshLog],
    )

    const createVault = useCallback(
        async (passphrase) => {
            const { header: nextHeader, key } = await createVaultKeys(passphrase)
            await store.putHeader(nextHeader)
            await store.putSecurityState({ failedAttempts: 0, restoredAt: null })
            setHeader(nextHeader)
            // Asks the browser not to evict the vault under storage pressure.
            navigator.storage?.persist?.().catch(() => {})
            await beginSession(key)
            await addLog("vault.created")
            notifyOtherTabs("header")
        },
        [addLog, beginSession, notifyOtherTabs],
    )

    const unlock = useCallback(
        async (passphrase) => {
            const current = await store.getHeader()
            let key
            try {
                key = await unlockVaultKey(passphrase, current)
            } catch (error) {
                const security = await store.getSecurityState()
                await store.putSecurityState({ ...security, failedAttempts: security.failedAttempts + 1 })
                throw error
            }

            const security = await store.getSecurityState()
            await store.putSecurityState({ failedAttempts: 0, restoredAt: null })
            setFailedSinceLastUnlock(security.failedAttempts)
            await beginSession(key)

            if (security.restoredAt) await addLog("backup.restored")
            if (security.failedAttempts > 0) await addLog("unlock.failed", { count: security.failedAttempts })
            await addLog("vault.unlocked")
        },
        [addLog, beginSession],
    )

    const lock = useCallback(
        async (reason = "manual") => {
            if (!keyRef.current) return
            await addLog("vault.locked", { reason }).catch(() => {})
            clearSession()
            setStatus("locked")
        },
        [addLog, clearSession],
    )

    // Runs a long operation without the idle timer locking the vault part way through.
    const whileBusy = useCallback(async (run) => {
        busyRef.current += 1
        try {
            return await run()
        } finally {
            busyRef.current -= 1
            lastActivityRef.current = Date.now()
        }
    }, [])

    useEffect(() => {
        if (status !== "unlocked" || !settings.autoLockMinutes) return
        const noteActivity = () => {
            lastActivityRef.current = Date.now()
        }
        ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, noteActivity, { passive: true }))

        // Comparing timestamps also catches time spent asleep, when timers don't run.
        const timer = setInterval(() => {
            const idleFor = Date.now() - lastActivityRef.current
            if (busyRef.current === 0 && idleFor >= settings.autoLockMinutes * 60_000) lock("idle")
        }, 1000)

        return () => {
            ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, noteActivity))
            clearInterval(timer)
        }
    }, [lock, settings.autoLockMinutes, status])

    const addFile = useCallback(
        (file) =>
            whileBusy(async () => {
                if (file.size > MAX_FILE_BYTES) throw new Error("Files can be up to 256 MB.")
                const key = keyRef.current
                if (!key) throw new Error("The vault is locked.")

                const id = randomId()
                const createdAt = Date.now()
                const plain = await file.arrayBuffer()
                const sealed = await encryptBytes(key, plain, fileDataContext(id))
                const meta = await encryptJson(
                    key,
                    { name: file.name, type: file.type, size: file.size, modifiedAt: file.lastModified },
                    fileMetaContext(id),
                )
                try {
                    await store.putFile(
                        { id, createdAt, meta },
                        { id, iv: sealed.iv, data: new Blob([sealed.data]) },
                    )
                } catch (error) {
                    throw friendlyStorageError(error)
                }

                setFiles((current) => [
                    { id, createdAt, name: file.name, type: file.type, size: file.size, modifiedAt: file.lastModified, corrupt: false },
                    ...current,
                ])
                setIntegrity(null)
                await addLog("file.added", { name: file.name, size: file.size })
            }),
        [addLog, whileBusy],
    )

    const readFile = useCallback(
        (file, action) =>
            whileBusy(async () => {
                const key = keyRef.current
                if (!key) throw new Error("The vault is locked.")
                const record = await store.getBlobRecord(file.id)
                try {
                    if (!record) throw new IntegrityError()
                    const data = await record.data.arrayBuffer()
                    const plain = await decryptBytes(key, { iv: record.iv, data }, fileDataContext(file.id))
                    await addLog(action, { name: file.name })
                    return plain
                } catch (error) {
                    if (error instanceof IntegrityError) {
                        await addLog("file.corrupt", { name: file.name })
                        throw new IntegrityError(`“${file.name}” failed its integrity check and can't be opened.`)
                    }
                    throw error
                }
            }),
        [addLog, whileBusy],
    )

    const removeFile = useCallback(
        async (file) => {
            await store.deleteFile(file.id)
            setFiles((current) => current.filter((item) => item.id !== file.id))
            setIntegrity(null)
            await addLog("file.deleted", { name: file.name })
        },
        [addLog],
    )

    const verifyIntegrity = useCallback(
        (onProgress) =>
            whileBusy(async () => {
                const key = keyRef.current
                const records = await store.listFileRecords()
                const failed = []
                for (const [index, { id, meta }] of records.entries()) {
                    onProgress?.(index, records.length)
                    try {
                        await decryptJson(key, meta, fileMetaContext(id))
                        const blob = await store.getBlobRecord(id)
                        if (!blob) throw new IntegrityError()
                        const data = await blob.data.arrayBuffer()
                        await decryptBytes(key, { iv: blob.iv, data }, fileDataContext(id))
                    } catch {
                        failed.push(id)
                    }
                }
                const result = { checkedAt: Date.now(), total: records.length, failed }
                setIntegrity(result)
                await addLog("vault.verified", { total: records.length, failed: failed.length })
                return result
            }),
        [addLog, whileBusy],
    )

    const changePassphrase = useCallback(
        (currentPassphrase, nextPassphrase) =>
            whileBusy(async () => {
                const current = await store.getHeader()
                const nextHeader = await rewrapVaultKey(currentPassphrase, nextPassphrase, current)
                await store.putHeader(nextHeader)
                setHeader(nextHeader)
                await addLog("passphrase.changed")
            }),
        [addLog, whileBusy],
    )

    const exportBackup = useCallback(
        () =>
            whileBusy(async () => {
                const blob = packBackup(await store.readAllForBackup())
                await addLog("backup.exported", { size: blob.size })
                return blob
            }),
        [addLog, whileBusy],
    )

    const restoreBackup = useCallback(
        async (source) => {
            const backup = await unpackBackup(source)
            try {
                await store.restoreVault({ ...backup, restoredAt: Date.now() })
            } catch (error) {
                throw friendlyStorageError(error)
            }
            setHeader(backup.header)
            setStatus("locked")
            notifyOtherTabs("header")
        },
        [notifyOtherTabs],
    )

    const updateSettings = useCallback(
        async (patch) => {
            const next = { ...settings, ...patch }
            await store.putSettings(next)
            setSettings(next)
            await addLog("settings.changed", patch)
        },
        [addLog, settings],
    )

    const destroyVault = useCallback(async () => {
        await store.clearVault()
        clearSession()
        setHeader(null)
        setSettings(DEFAULT_SETTINGS)
        setStatus("new")
        notifyOtherTabs("header")
    }, [clearSession, notifyOtherTabs])

    return useMemo(
        () => ({
            status,
            header,
            files,
            log,
            settings,
            integrity,
            failedSinceLastUnlock,
            createVault,
            unlock,
            lock,
            addFile,
            readFile,
            removeFile,
            verifyIntegrity,
            changePassphrase,
            exportBackup,
            restoreBackup,
            updateSettings,
            destroyVault,
        }),
        [
            status, header, files, log, settings, integrity, failedSinceLastUnlock,
            createVault, unlock, lock, addFile, readFile, removeFile, verifyIntegrity,
            changePassphrase, exportBackup, restoreBackup, updateSettings, destroyVault,
        ],
    )
}
