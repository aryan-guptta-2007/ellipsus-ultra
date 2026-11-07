"use client"
import { formatBytes, formatDate, timeAgo } from "./ui"

const AUTO_LOCK_LABEL = (minutes) => (minutes ? `${minutes} min` : "never")

// Each event maps to a title, a one-line detail and a dot colour.
const EVENTS = {
    "vault.created": () => ["Vault Created", "New master key generated in this browser.", "emerald"],
    "vault.unlocked": () => ["Vault Unlocked", "Master key unwrapped into memory.", "emerald"],
    "vault.locked": (e) => ["Vault Locked", e.reason === "idle" ? "Locked automatically after inactivity." : "Key cleared from memory.", "gray"],
    "vault.verified": (e) =>
        e.failed
            ? ["Integrity Check Failed", `${e.failed} of ${e.total} files failed verification.`, "red"]
            : ["Integrity Verified", `All ${e.total} ${e.total === 1 ? "file" : "files"} passed verification.`, "emerald"],
    "file.added": (e) => ["File Encrypted", `${e.name} sealed with AES-256-GCM (${formatBytes(e.size)}).`, "blue"],
    "file.downloaded": (e) => ["File Decrypted", `${e.name} downloaded.`, "blue"],
    "file.previewed": (e) => ["File Previewed", `${e.name} decrypted for viewing.`, "blue"],
    "file.deleted": (e) => ["File Deleted", `${e.name} removed from the vault.`, "gray"],
    "file.corrupt": (e) => ["Integrity Failure", `${e.name} failed its integrity check.`, "red"],
    "unlock.failed": (e) => ["Failed Unlock Attempts", `${e.count} wrong ${e.count === 1 ? "passphrase" : "passphrases"} entered while locked.`, "red"],
    "passphrase.changed": () => ["Passphrase Changed", "Master key re-wrapped with a new passphrase.", "amber"],
    "backup.exported": (e) => ["Backup Exported", `Encrypted backup saved (${formatBytes(e.size)}).`, "amber"],
    "backup.restored": () => ["Backup Restored", "Vault restored from an encrypted backup.", "amber"],
    "settings.changed": (e) => ["Settings Changed", `Auto-lock set to ${AUTO_LOCK_LABEL(e.autoLockMinutes)}.`, "gray"],
    "log.unreadable": () => ["Unreadable Entry", "This activity record failed its integrity check.", "red"],
}

const DOT_COLORS = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    gray: "bg-gray-500",
}

function describe(entry) {
    const [title, detail, color] = (EVENTS[entry.type] ?? EVENTS["log.unreadable"])(entry)
    return { title, detail, color }
}

export function ActivityList({ entries, compact = false }) {
    return (
        <ol className={compact ? "space-y-4 font-mono" : "space-y-1"}>
            {entries.map((entry) => {
                const { title, detail, color } = describe(entry)
                return compact ? (
                    <li key={entry.id} className="flex gap-3">
                        <div className={`w-1.5 h-1.5 mt-1 rounded-full shrink-0 ${DOT_COLORS[color]}`} />
                        <div className="min-w-0">
                            <p className="text-[11px] text-gray-200 font-bold">{title}</p>
                            <p className="text-[10px] text-gray-500 truncate" title={detail}>{detail}</p>
                            <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(entry.at)}</p>
                        </div>
                    </li>
                ) : (
                    <li key={entry.id} className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-white/[0.02]">
                        <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${DOT_COLORS[color]}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-100">{title}</p>
                            <p className="text-xs text-gray-500 break-words">{detail}</p>
                        </div>
                        <time className="text-xs text-gray-600 shrink-0 hidden sm:block">{formatDate(entry.at)}</time>
                    </li>
                )
            })}
        </ol>
    )
}

export default function ActivityView({ vault }) {
    return (
        <div>
            <div className="border-b border-white/5 pb-5 mb-4">
                <h1 className="text-xl font-bold text-white tracking-tight">Activity</h1>
                <p className="text-xs mt-1 text-white/50 font-medium">
                    Encrypted with your vault key. Keeps the latest 500 events.
                </p>
            </div>
            {vault.log.length ? (
                <ActivityList entries={vault.log} />
            ) : (
                <p className="py-12 text-center text-sm text-gray-500">No activity yet.</p>
            )}
        </div>
    )
}
