"use client"
import { useEffect, useId, useRef, useState } from "react"
import { Eye, EyeOff, X } from "lucide-react"

export function formatBytes(bytes) {
    if (!bytes) return "0 B"
    const units = ["B", "KB", "MB", "GB", "TB"]
    const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    const value = bytes / 1024 ** power
    return `${power === 0 || value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[power]}`
}

export function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export function timeAgo(timestamp) {
    const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
    if (seconds < 60) return "just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}

// Saves through a temporary link. The download attribute plus a generic type
// means the browser never tries to render decrypted content in this origin.
export function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

const BUTTON_STYLES = {
    primary: "bg-emerald-500 text-[#0b0c10] font-bold hover:bg-emerald-400",
    secondary: "bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 hover:text-white",
    danger: "bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 hover:text-red-200",
}

export function Button({ variant = "secondary", className = "", type = "button", ...props }) {
    return (
        <button
            type={type}
            className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${BUTTON_STYLES[variant]} ${className}`}
            {...props}
        />
    )
}

export function PassphraseInput({ label, value, onChange, autoComplete, autoFocus, hint }) {
    const id = useId()
    const [visible, setVisible] = useState(false)
    return (
        <div>
            <label htmlFor={id} className="block text-xs font-medium text-gray-300 mb-1.5">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={visible ? "text" : "password"}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    autoComplete={autoComplete}
                    autoFocus={autoFocus}
                    spellCheck={false}
                    autoCapitalize="off"
                    className="w-full h-11 rounded-md bg-[#08090b] border border-white/10 pl-3 pr-11 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40"
                />
                <button
                    type="button"
                    onClick={() => setVisible((current) => !current)}
                    aria-label={visible ? `Hide ${label}` : `Show ${label}`}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                >
                    {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
            {hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
        </div>
    )
}

const STRENGTH_COLORS = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-400"]

export function StrengthMeter({ strength, empty }) {
    return (
        <div aria-live="polite">
            <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                    <div
                        key={level}
                        className={`h-1 flex-1 rounded-full ${!empty && (strength.score >= level || level === 1) ? STRENGTH_COLORS[strength.score] : "bg-white/10"}`}
                    />
                ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
                {empty ? "At least 12 characters. A few unrelated words works well." : strength.label}
            </p>
        </div>
    )
}

export function ErrorNote({ children }) {
    if (!children) return null
    return (
        <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            {children}
        </p>
    )
}

export function Modal({ title, onClose, children, wide = false }) {
    const panelRef = useRef(null)

    useEffect(() => {
        const previous = document.activeElement
        panelRef.current?.focus()
        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => {
            window.removeEventListener("keydown", onKeyDown)
            previous?.focus?.()
        }
    }, [onClose])

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onMouseDown={onClose}>
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                onMouseDown={(event) => event.stopPropagation()}
                className={`w-full ${wide ? "max-w-3xl" : "max-w-md"} max-h-[85vh] flex flex-col rounded-xl bg-[#13151a] border border-white/10 shadow-2xl focus:outline-none`}
            >
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/5">
                    <h2 className="text-sm font-semibold text-white truncate">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="w-8 h-8 -mr-2 flex items-center justify-center rounded text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 overflow-auto">{children}</div>
            </div>
        </div>
    )
}

export function Panel({ title, description, children }) {
    return (
        <section className="rounded-xl border border-white/5 bg-[#1a1c23]/40 p-5">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-400 leading-relaxed">{description}</p>}
            <div className="mt-4">{children}</div>
        </section>
    )
}
