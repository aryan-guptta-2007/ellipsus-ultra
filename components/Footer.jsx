import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function Footer() {
    return (
        <footer className="relative bg-[#050608] border-t border-white/5">
            <div className="max-w-6xl mx-auto px-6 py-20 text-center">
                <h2 className="font-serif text-[2.5rem] md:text-[4rem] leading-tight text-[#E6EAF0]">
                    Your files. Your key.
                </h2>
                <p className="mt-4 text-gray-400">No account, no upload, nothing to install.</p>
                <Link
                    href="/vault"
                    className="group mt-8 inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-sm font-bold tracking-wide text-[#050608] bg-gradient-to-b from-emerald-400 to-emerald-500 hover:shadow-[0_12px_30px_rgba(16,185,129,0.25)] transition-shadow"
                >
                    Create Vault
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>

            <div className="border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
                    <span className="font-serif text-base text-gray-300">StealthVault</span>
                    <nav aria-label="Footer" className="flex items-center gap-6">
                        <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
                        <a href="#security" className="hover:text-white transition-colors">Security</a>
                        <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
                        <Link href="/vault" className="hover:text-white transition-colors">Open Vault</Link>
                    </nav>
                </div>
            </div>
        </footer>
    )
}
