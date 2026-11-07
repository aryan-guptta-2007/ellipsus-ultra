"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Activity, CheckCircle, FileLock2, Key, Loader2, Lock, Settings, Shield, X } from "lucide-react"
import { useVault } from "./useVault"
import { CreateVaultScreen, UnlockScreen, UnsupportedScreen } from "./AuthScreens"
import FilesView from "./FilesView"
import ActivityView, { ActivityList } from "./ActivityView"
import KeysView from "./KeysView"
import SettingsView from "./SettingsView"
import { Button, timeAgo } from "./ui"

const VIEWS = [
    { id: "files", label: "Files", icon: FileLock2, component: FilesView },
    { id: "activity", label: "Activity", icon: Activity, component: ActivityView },
    { id: "keys", label: "Keys", icon: Key, component: KeysView },
    { id: "settings", label: "Settings", icon: Settings, component: SettingsView },
]

function viewFromHash() {
    const id = window.location.hash.slice(1)
    return VIEWS.some((view) => view.id === id) ? id : "files"
}

function useToasts() {
    const [toasts, setToasts] = useState([])
    const nextId = useRef(0)

    const dismiss = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])

    const notify = useCallback(
        (message, tone = "success") => {
            const id = nextId.current++
            setToasts((current) => [...current, { id, message, tone }])
            setTimeout(() => dismiss(id), tone === "error" ? 8000 : 4000)
        },
        [dismiss],
    )

    return { toasts, notify, dismiss }
}

function Toasts({ toasts, dismiss }) {
    return (
        <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 sm:w-96" aria-live="polite">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    role={toast.tone === "error" ? "alert" : "status"}
                    className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-xl bg-[#13151a] ${toast.tone === "error" ? "border-red-500/30 text-red-200" : "border-emerald-500/30 text-emerald-100"}`}
                >
                    <span className="flex-1 break-words">{toast.message}</span>
                    <button type="button" aria-label="Dismiss" onClick={() => dismiss(toast.id)} className="text-gray-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    )
}

function NavItems({ view, mobile = false }) {
    return VIEWS.map(({ id, label, icon: Icon }) => {
        const active = view === id
        return mobile ? (
            <a
                key={id}
                href={`#${id}`}
                aria-current={active ? "page" : undefined}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${active ? "text-emerald-400" : "text-white/60"}`}
            >
                <Icon className="w-4 h-4" />
                {label}
            </a>
        ) : (
            <a
                key={id}
                href={`#${id}`}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs transition-colors ${active ? "bg-emerald-500/10 text-emerald-400 font-semibold" : "text-white/70 hover:bg-white/5 hover:text-white font-medium"}`}
            >
                <Icon className="w-4 h-4" />
                {label}
            </a>
        )
    })
}

function SecurityPanel({ vault }) {
    const { integrity, failedSinceLastUnlock, files, log } = vault

    return (
        <aside className="hidden xl:flex flex-col border-l border-white/5 bg-[#0f1115]/50 overflow-y-auto">
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Vault Status</h2>
                    <Shield className="w-3 h-3 text-emerald-500" />
                </div>

                <div className="flex justify-between text-[11px] text-gray-400 mb-4 font-mono">
                    <span>Encryption</span>
                    <span className="text-emerald-300 font-semibold">AES-256-GCM</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-[#1a1c23]/50 p-2.5 rounded-lg border border-white/5">
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Failed unlocks</p>
                        <p className={`text-lg font-mono ${failedSinceLastUnlock ? "text-red-400" : "text-white"}`}>{failedSinceLastUnlock}</p>
                    </div>
                    <div className="bg-[#1a1c23]/50 p-2.5 rounded-lg border border-white/5">
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Files</p>
                        <p className="text-lg font-mono text-white">{files.length}</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-900/20 to-[#0f1115] p-3 rounded-lg border border-emerald-500/20">
                    <p className="text-[9px] text-emerald-400/80 uppercase tracking-widest mb-1">Integrity</p>
                    {integrity ? (
                        <>
                            <p className="text-2xl font-extrabold text-white tracking-tight">
                                {integrity.total - integrity.failed.length}
                                <span className="text-sm text-gray-500 font-normal"> / {integrity.total} verified</span>
                            </p>
                            <p className="mt-1 text-[10px] text-gray-500">Checked {timeAgo(integrity.checkedAt)}</p>
                        </>
                    ) : (
                        <a href="#keys" className="text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            Run a check from Keys
                        </a>
                    )}
                </div>
            </div>

            <div className="p-5 flex-1">
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-4">Live Activity</h2>
                <ActivityList entries={log.slice(0, 6)} compact />
            </div>
        </aside>
    )
}

function Workspace({ vault }) {
    const [view, setView] = useState("files")
    const { toasts, notify, dismiss } = useToasts()

    useEffect(() => {
        const sync = () => setView(viewFromHash())
        sync()
        window.addEventListener("hashchange", sync)
        return () => window.removeEventListener("hashchange", sync)
    }, [])

    const { component: View } = VIEWS.find(({ id }) => id === view)

    return (
        <div className="h-[100dvh] flex flex-col bg-[#0b0c10] text-white">
            <header className="h-14 shrink-0 border-b border-white/10 bg-[#050608] flex items-center justify-between px-4 lg:px-6">
                <Link href="/" className="font-serif text-lg tracking-tight">
                    StealthVault
                </Link>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">Unlocked</span>
                    </div>
                    <Button className="h-9" onClick={() => vault.lock()}>
                        <Lock className="w-3.5 h-3.5" />
                        Lock
                    </Button>
                </div>
            </header>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_300px]">
                <nav aria-label="Vault" className="hidden lg:flex flex-col gap-1 border-r border-white/5 bg-[#08090b] py-6 px-3">
                    <NavItems view={view} />
                </nav>

                <main className="min-w-0 overflow-y-auto bg-gradient-to-b from-[#0b0c10] to-[#13151a] p-4 sm:p-6">
                    <div className="max-w-3xl mx-auto">
                        <View vault={vault} notify={notify} />
                    </div>
                </main>

                <SecurityPanel vault={vault} />
            </div>

            <nav aria-label="Vault" className="lg:hidden shrink-0 flex border-t border-white/10 bg-[#08090b]">
                <NavItems view={view} mobile />
            </nav>

            <Toasts toasts={toasts} dismiss={dismiss} />
        </div>
    )
}

export default function VaultApp() {
    const vault = useVault()

    switch (vault.status) {
        case "unsupported":
            return <UnsupportedScreen />
        case "new":
            return <CreateVaultScreen vault={vault} />
        case "locked":
            return <UnlockScreen vault={vault} />
        case "unlocked":
            return <Workspace vault={vault} />
        default:
            return (
                <main className="min-h-screen bg-[#0b0c10] flex items-center justify-center" aria-label="Loading vault">
                    <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                </main>
            )
    }
}
