import { EyeOff, FileLock2, KeyRound, ShieldCheck, Timer, Wifi } from "lucide-react"

const FEATURES = [
    {
        icon: FileLock2,
        title: "AES-256-GCM encryption",
        text: "Every file gets its own random IV and an authentication tag, using your browser's built-in Web Crypto API.",
    },
    {
        icon: KeyRound,
        title: "A key only you can open",
        text: "Your passphrase is stretched with PBKDF2-SHA-256 over 600,000 iterations. It's never stored, in any form.",
    },
    {
        icon: EyeOff,
        title: "File names stay hidden",
        text: "Names, types, sizes and your activity log are encrypted too. Storage holds ciphertext and nothing else.",
    },
    {
        icon: ShieldCheck,
        title: "Tampering is detected",
        text: "Each ciphertext is bound to its record. Alter or swap one, and it fails verification instead of opening.",
    },
    {
        icon: Timer,
        title: "Locks itself",
        text: "After a period of inactivity, the key is cleared from memory. While unlocked, it can't be exported.",
    },
    {
        icon: Wifi,
        title: "Nothing to intercept",
        text: "There are no accounts and no uploads. A strict content security policy blocks connections to other sites.",
    },
]

export default function SecuritySection() {
    return (
        <section id="security" className="relative bg-[#0b0c10] py-24 md:py-32 scroll-mt-16">
            <div className="max-w-6xl mx-auto px-6">
                <p className="text-[11px] font-mono text-emerald-400 tracking-[0.15em] font-semibold uppercase">Security</p>
                <h2 className="mt-4 font-serif text-[2.5rem] md:text-[3.5rem] leading-tight text-[#E6EAF0] max-w-3xl">
                    Built so we couldn't read your files if we tried.
                </h2>

                <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {FEATURES.map(({ icon: Icon, title, text }) => (
                        <div key={title} className="rounded-xl border border-white/5 bg-[#13151a] p-6">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center">
                                <Icon className="w-4 h-4 text-emerald-400" />
                            </div>
                            <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                            <p className="mt-2 text-sm text-gray-400 leading-relaxed">{text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
