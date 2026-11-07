"use client"
import { useEffect, useState } from "react"
import { Download, Loader2, Trash2 } from "lucide-react"
import { Button, Modal, Panel, formatBytes, saveBlob } from "./ui"

const CONFIRM_WORD = "DELETE"

function DeleteVault({ vault }) {
    const [open, setOpen] = useState(false)
    const [typed, setTyped] = useState("")

    const close = () => {
        setOpen(false)
        setTyped("")
    }

    return (
        <Panel title="Delete vault" description="Permanently erases every file, your keys and the activity log from this browser.">
            <Button variant="danger" onClick={() => setOpen(true)}>
                <Trash2 className="w-4 h-4" />
                Delete vault
            </Button>
            {open && (
                <Modal title="Delete this vault?" onClose={close}>
                    <p className="text-sm text-gray-300 leading-relaxed">
                        This can't be undone. Unless you have a backup and its passphrase, your files will be gone for good.
                    </p>
                    <label className="block mt-4 text-xs font-medium text-gray-300">
                        Type {CONFIRM_WORD} to confirm
                        <input
                            value={typed}
                            onChange={(event) => setTyped(event.target.value)}
                            autoComplete="off"
                            className="mt-1.5 w-full h-11 rounded-md bg-[#08090b] border border-white/10 px-3 text-sm text-white focus:outline-none focus:border-red-500/60"
                        />
                    </label>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button onClick={close}>Cancel</Button>
                        <Button variant="danger" disabled={typed !== CONFIRM_WORD} onClick={vault.destroyVault}>
                            Delete everything
                        </Button>
                    </div>
                </Modal>
            )}
        </Panel>
    )
}

export default function SettingsView({ vault, notify }) {
    const [exporting, setExporting] = useState(false)
    const [storage, setStorage] = useState(null)

    useEffect(() => {
        navigator.storage?.estimate?.().then(setStorage).catch(() => {})
    }, [vault.files.length])

    const exportBackup = async () => {
        setExporting(true)
        try {
            const blob = await vault.exportBackup()
            const date = new Date().toLocaleDateString("en-CA") // local date as YYYY-MM-DD
            saveBlob(blob, `stealthvault-backup-${date}.svault`)
            notify("Encrypted backup saved.")
        } catch (error) {
            notify(error.message, "error")
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="border-b border-white/5 pb-5">
                <h1 className="text-xl font-bold text-white tracking-tight">Settings</h1>
                <p className="text-xs mt-1 text-white/50 font-medium">Applies to the vault in this browser.</p>
            </div>

            <Panel title="Auto-lock" description="Clears the key from memory after a period with no activity.">
                <select
                    aria-label="Auto-lock after"
                    value={vault.settings.autoLockMinutes}
                    onChange={(event) => vault.updateSettings({ autoLockMinutes: Number(event.target.value) })}
                    className="h-10 rounded-md bg-white/5 border border-white/10 px-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/60 [&>option]:bg-[#13151a]"
                >
                    <option value={1}>After 1 minute</option>
                    <option value={5}>After 5 minutes</option>
                    <option value={15}>After 15 minutes</option>
                    <option value={30}>After 30 minutes</option>
                    <option value={0}>Never</option>
                </select>
            </Panel>

            <Panel
                title="Backup"
                description="Your vault lives only in this browser, so clearing site data erases it. A backup is one encrypted file that you can keep anywhere. To restore one, delete this vault and choose Restore from a backup."
            >
                <Button onClick={exportBackup} disabled={exporting}>
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Export encrypted backup
                </Button>
            </Panel>

            {storage?.quota > 0 && (
                <Panel title="Browser storage">
                    <p className="text-sm text-gray-300">
                        {formatBytes(storage.usage)} used of {formatBytes(storage.quota)} available
                    </p>
                    <div className="mt-3 h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.max(1, (storage.usage / storage.quota) * 100)}%` }} />
                    </div>
                </Panel>
            )}

            <DeleteVault vault={vault} />
        </div>
    )
}
