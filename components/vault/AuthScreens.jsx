"use client"
import { useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, Loader2, Lock, Shield, Upload } from "lucide-react"
import { WrongPassphraseError, scorePassphrase } from "@/lib/vault/crypto"
import { Button, ErrorNote, PassphraseInput, StrengthMeter } from "./ui"

function AuthCard({ icon: Icon, title, subtitle, children }) {
    return (
        <main className="min-h-screen bg-[#0b0c10] flex flex-col items-center justify-center px-4 py-12">
            <Link href="/" className="font-serif text-2xl text-white tracking-tight mb-8">
                StealthVault
            </Link>
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13151a] p-6 sm:p-8 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                <div className="w-11 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
                <p className="mt-1.5 text-sm text-gray-400 leading-relaxed">{subtitle}</p>
                <div className="mt-6">{children}</div>
            </div>
        </main>
    )
}

export function CreateVaultScreen({ vault }) {
    const [passphrase, setPassphrase] = useState("")
    const [confirmation, setConfirmation] = useState("")
    const [acknowledged, setAcknowledged] = useState(false)
    const [working, setWorking] = useState(false)
    const [error, setError] = useState("")
    const restoreInput = useRef(null)

    const strength = scorePassphrase(passphrase)
    const mismatch = confirmation.length > 0 && confirmation !== passphrase
    const ready = strength.acceptable && confirmation === passphrase && acknowledged

    const submit = async (event) => {
        event.preventDefault()
        if (!ready || working) return
        setWorking(true)
        setError("")
        try {
            await vault.createVault(passphrase)
        } catch (failure) {
            setError(failure.message || "The vault could not be created.")
            setWorking(false)
        }
    }

    const restore = async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ""
        if (!file) return
        setWorking(true)
        setError("")
        try {
            await vault.restoreBackup(file)
        } catch (failure) {
            setError(failure.message || "The backup could not be restored.")
            setWorking(false)
        }
    }

    return (
        <AuthCard
            icon={Shield}
            title="Create your vault"
            subtitle="Your passphrase encrypts everything in this browser. It never leaves your device."
        >
            <form onSubmit={submit} className="space-y-4">
                <PassphraseInput label="Passphrase" value={passphrase} onChange={setPassphrase} autoComplete="new-password" autoFocus />
                <StrengthMeter strength={strength} empty={!passphrase} />
                <PassphraseInput
                    label="Confirm passphrase"
                    value={confirmation}
                    onChange={setConfirmation}
                    autoComplete="new-password"
                    hint={mismatch ? "These passphrases don't match." : undefined}
                />

                <label className="flex items-start gap-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(event) => setAcknowledged(event.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-emerald-500"
                    />
                    <span className="text-xs text-amber-100/80 leading-relaxed">
                        I understand my passphrase can't be recovered or reset. If I lose it, my files are gone.
                    </span>
                </label>

                <ErrorNote>{error}</ErrorNote>

                <Button type="submit" variant="primary" className="w-full h-11" disabled={!ready || working}>
                    {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {working ? "Creating vault…" : "Create Vault"}
                </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-white/5">
                <input ref={restoreInput} type="file" accept=".svault" onChange={restore} className="hidden" aria-label="Backup file" />
                <Button className="w-full" disabled={working} onClick={() => restoreInput.current?.click()}>
                    <Upload className="w-4 h-4" />
                    Restore from a backup
                </Button>
            </div>
        </AuthCard>
    )
}

export function UnlockScreen({ vault }) {
    const [passphrase, setPassphrase] = useState("")
    const [working, setWorking] = useState(false)
    const [error, setError] = useState("")

    const submit = async (event) => {
        event.preventDefault()
        if (!passphrase || working) return
        setWorking(true)
        setError("")
        try {
            await vault.unlock(passphrase)
        } catch (failure) {
            setError(
                failure instanceof WrongPassphraseError
                    ? "That passphrase didn't work. The attempt has been recorded."
                    : failure.message,
            )
            setPassphrase("")
            setWorking(false)
        }
    }

    return (
        <AuthCard icon={Lock} title="Unlock your vault" subtitle="Enter your passphrase to decrypt your files in this browser.">
            <form onSubmit={submit} className="space-y-4">
                <PassphraseInput label="Passphrase" value={passphrase} onChange={setPassphrase} autoComplete="current-password" autoFocus />
                <ErrorNote>{error}</ErrorNote>
                <Button type="submit" variant="primary" className="w-full h-11" disabled={!passphrase || working}>
                    {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    {working ? "Unlocking…" : "Unlock"}
                </Button>
            </form>
        </AuthCard>
    )
}

export function UnsupportedScreen() {
    return (
        <AuthCard
            icon={AlertTriangle}
            title="This browser can't open the vault"
            subtitle="The vault needs the Web Crypto API and IndexedDB, which browsers only provide over HTTPS or on localhost. Private browsing modes can also block them."
        >
            <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                Back to the home page
            </Link>
        </AuthCard>
    )
}
