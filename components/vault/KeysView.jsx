"use client"
import { useState } from "react"
import { CheckCircle, Loader2, ShieldCheck, XCircle } from "lucide-react"
import { WrongPassphraseError, scorePassphrase } from "@/lib/vault/crypto"
import { Button, ErrorNote, Panel, PassphraseInput, StrengthMeter, formatDate } from "./ui"

function ChangePassphrase({ vault, notify }) {
    const [current, setCurrent] = useState("")
    const [next, setNext] = useState("")
    const [confirmation, setConfirmation] = useState("")
    const [working, setWorking] = useState(false)
    const [error, setError] = useState("")

    const strength = scorePassphrase(next)
    const mismatch = confirmation.length > 0 && confirmation !== next
    const ready = current && strength.acceptable && confirmation === next

    const submit = async (event) => {
        event.preventDefault()
        if (!ready || working) return
        setWorking(true)
        setError("")
        try {
            await vault.changePassphrase(current, next)
            setCurrent("")
            setNext("")
            setConfirmation("")
            notify("Passphrase changed.")
        } catch (failure) {
            setError(failure instanceof WrongPassphraseError ? "Your current passphrase is incorrect." : failure.message)
        } finally {
            setWorking(false)
        }
    }

    return (
        <Panel
            title="Change passphrase"
            description="Your files stay as they are. Only the wrapped copy of your master key changes, so backups you've already made still open with the old passphrase."
        >
            <form onSubmit={submit} className="space-y-4 max-w-sm">
                <PassphraseInput label="Current passphrase" value={current} onChange={setCurrent} autoComplete="current-password" />
                <PassphraseInput label="New passphrase" value={next} onChange={setNext} autoComplete="new-password" />
                <StrengthMeter strength={strength} empty={!next} />
                <PassphraseInput
                    label="Confirm new passphrase"
                    value={confirmation}
                    onChange={setConfirmation}
                    autoComplete="new-password"
                    hint={mismatch ? "These passphrases don't match." : undefined}
                />
                <ErrorNote>{error}</ErrorNote>
                <Button type="submit" variant="primary" disabled={!ready || working}>
                    {working && <Loader2 className="w-4 h-4 animate-spin" />}
                    {working ? "Changing…" : "Change passphrase"}
                </Button>
            </form>
        </Panel>
    )
}

function VerifyIntegrity({ vault }) {
    const [progress, setProgress] = useState(null)
    const { integrity } = vault

    const run = async () => {
        setProgress({ done: 0, total: 0 })
        try {
            await vault.verifyIntegrity((done, total) => setProgress({ done, total }))
        } finally {
            setProgress(null)
        }
    }

    return (
        <Panel
            title="Verify integrity"
            description="Decrypts every file and checks its authentication tag, which fails if even one byte has been changed."
        >
            <div className="flex flex-wrap items-center gap-4">
                <Button onClick={run} disabled={Boolean(progress)}>
                    {progress ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {progress ? `Checking ${progress.done + 1} of ${progress.total || "…"}` : "Verify all files"}
                </Button>
                {integrity && !progress && (
                    <p className="flex items-center gap-2 text-sm" role="status">
                        {integrity.failed.length ? (
                            <>
                                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                                <span className="text-red-300">
                                    {integrity.failed.length} of {integrity.total} failed
                                </span>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span className="text-gray-300">
                                    {integrity.total} of {integrity.total} verified, {formatDate(integrity.checkedAt)}
                                </span>
                            </>
                        )}
                    </p>
                )}
            </div>
        </Panel>
    )
}

export default function KeysView({ vault, notify }) {
    const details = [
        ["File encryption", "AES-256-GCM, unique IV per record"],
        ["Key derivation", `PBKDF2-SHA-256, ${vault.header?.iterations.toLocaleString()} iterations`],
        ["Master key", "Random 256-bit, wrapped with your passphrase key"],
        ["While unlocked", "Non-extractable key, held in memory only"],
        ["Also encrypted", "File names, types, sizes and the activity log"],
    ]

    return (
        <div className="flex flex-col gap-5">
            <div className="border-b border-white/5 pb-5">
                <h1 className="text-xl font-bold text-white tracking-tight">Keys</h1>
                <p className="text-xs mt-1 text-white/50 font-medium">How this vault is protected.</p>
            </div>

            <Panel title="Encryption details">
                <dl className="divide-y divide-white/5">
                    {details.map(([term, value]) => (
                        <div key={term} className="py-2.5 first:pt-0 last:pb-0 sm:flex sm:justify-between sm:gap-6">
                            <dt className="text-sm text-gray-400">{term}</dt>
                            <dd className="text-sm text-gray-200 sm:text-right">{value}</dd>
                        </div>
                    ))}
                </dl>
            </Panel>

            <VerifyIntegrity vault={vault} />
            <ChangePassphrase vault={vault} notify={notify} />
        </div>
    )
}
