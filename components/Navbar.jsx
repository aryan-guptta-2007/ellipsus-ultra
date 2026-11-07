"use client"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"

const LINKS = [
    { href: "#how-it-works", label: "How It Works" },
    { href: "#security", label: "Security" },
    { href: "#faq", label: "FAQ" },
]

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        handleScroll()
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return (
        <nav
            aria-label="Main"
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#050608]/90 backdrop-blur-md py-3 border-b border-white/5" : "bg-transparent py-5"
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                {/* Logo */}
                <a href="#top" className="text-xl font-serif text-white tracking-tight">
                    StealthVault
                </a>

                <div className="flex items-center gap-8">
                    <div className="hidden md:flex items-center gap-7">
                        {LINKS.map((link) => (
                            <a key={link.href} href={link.href} className="text-xs font-medium text-gray-400 hover:text-white transition-colors">
                                {link.label}
                            </a>
                        ))}
                    </div>
                    <Link
                        href="/vault"
                        className="group inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-white/5 border border-white/15 text-xs font-semibold text-white hover:bg-white/10 hover:border-white/30 transition-colors"
                    >
                        Open Vault
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </div>
        </nav>
    )
}
