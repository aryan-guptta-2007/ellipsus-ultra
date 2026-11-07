"use client"
import { useEffect, useRef } from "react"
import Link from "next/link"
import gsap from "gsap"
import { Shield, Lock, FileLock2, KeyRound, ArrowRight, Play } from "lucide-react"
import FloatingLetters from "./FloatingLetters"
import PlaneSVG from "./PlaneSVG"

const REVEALED = ".hero-tag, .hero-subtext, .hero-btns, .trust-container, .trust-badge, .phantom-ui"

export default function Hero() {
    const containerRef = useRef(null)

    // Intro: runs once on mount.
    useEffect(() => {
        const ctx = gsap.context(() => {
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                gsap.set(REVEALED, { opacity: 1, y: 0 })
                gsap.set(".hero-line-2 span", { opacity: 0.92 })
                return
            }

            const tl = gsap.timeline()
            const confidentEase = "expo.out"

            // 1. Tag Animation (Soft Fade + Rise)
            tl.fromTo(".hero-tag",
                { opacity: 0, y: 8, filter: "blur(4px)" },
                { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: confidentEase, delay: 0.3 }
            )

            // 2. First Headline (Masked Upward Reveal - Glide)
            tl.fromTo(".hero-line-1 span",
                { y: "110%" },
                { y: "0%", duration: 1.1, ease: confidentEase },
                0.6
            )

            // 3. Second Headline (Weighty Reveal with Opacity Cap)
            tl.fromTo(".hero-line-2 span",
                { y: "110%", opacity: 0 },
                { y: "0%", opacity: 0.92, duration: 1.2, ease: confidentEase },
                0.9
            )

            // 4. Subtext (Fade Only)
            tl.fromTo(".hero-subtext",
                { opacity: 0 },
                { opacity: 1, duration: 0.8, ease: "power1.out" },
                1.4
            )

            // 5. Buttons (Subtle Scale & Fade)
            tl.fromTo(".hero-btns",
                { scale: 0.98, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.9, ease: confidentEase },
                1.8
            )

            // 6. Trust Row (Spec: Opacity 0->1, Y 8px->0, 300ms ease)
            tl.fromTo(".trust-container",
                { opacity: 0, y: 8 },
                { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
                2.2
            )
            tl.fromTo(".trust-badge",
                { opacity: 0 },
                { opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out" },
                2.3
            )

            // 7. Phantom UI Reveal (Very Slow Fade)
            tl.fromTo(".phantom-ui",
                { opacity: 0, x: 20 },
                { opacity: 1, x: 0, duration: 1.5, ease: "power2.out" },
                2.0
            )

            // Background Grid Drift (Ultra-Slow Stability: 90s)
            gsap.to(".bg-grid-layer", {
                y: 20,
                duration: 90,
                repeat: -1,
                yoyo: true,
                ease: "linear"
            })
        }, containerRef)

        return () => ctx.revert()
    }, [])

    // Grid parallax and glow follow the pointer without touching the intro.
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        const ctx = gsap.context(() => {
            const layerX = gsap.quickTo(".parallax-layer", "x", { duration: 1.5, ease: "power2.out" })
            const layerY = gsap.quickTo(".parallax-layer", "y", { duration: 1.5, ease: "power2.out" })
            const glowX = gsap.quickTo(".mouse-glow", "x", { duration: 2.5, ease: "power2.out" })
            const glowY = gsap.quickTo(".mouse-glow", "y", { duration: 2.5, ease: "power2.out" })

            const handleMouseMove = ({ clientX, clientY }) => {
                const x = clientX - window.innerWidth / 2
                const y = clientY - window.innerHeight / 2
                layerX(-x * 0.02)
                layerY(-y * 0.02)
                glowX(x * 0.06)
                glowY(y * 0.06)
            }

            window.addEventListener("mousemove", handleMouseMove)
            return () => window.removeEventListener("mousemove", handleMouseMove)
        }, containerRef)

        return () => ctx.revert()
    }, [])

    return (
        // Adjusted Vertical Spacing: pt-36 (was pt-40) for tighter "intentional" tallness
        <section id="top" ref={containerRef} className="relative min-h-[95vh] flex flex-col items-center justify-center overflow-hidden pt-36 pb-16 bg-[#0b0c10]">

            {/* Background Layers */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <FloatingLetters />
                <PlaneSVG />

                {/* Parallax Container for Grid */}
                <div className="parallax-layer absolute -inset-8 will-change-transform">
                    {/* Drifting Faint Grid (Reduced Opacity to 0.025) */}
                    <div className="bg-grid-layer absolute inset-0 z-0 opacity-[0.025]"
                        style={{
                            backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
                            backgroundSize: '70px 70px',
                            backgroundPosition: 'center top'
                        }}>
                    </div>
                </div>

                {/* Center Glow (Elliptical & Diffused) */}
                {/* Asymmetry: Shifted to left-[52%] to break perfect symmetry (Light Direction) */}
                <div className="absolute top-[54%] left-[52%] -translate-x-1/2 -translate-y-1/2 w-[1400px] h-[600px] bg-[rgba(16,185,129,0.03)] rounded-[100%] blur-[120px] mix-blend-screen pointer-events-none"></div>

                {/* Mouse Reactive Glow */}
                <div className="mouse-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] mix-blend-screen pointer-events-none will-change-transform"></div>

                {/* Phantom Product Proof (Right Side) */}
                <div className="phantom-ui absolute top-1/2 right-[-5%] -translate-y-1/2 w-[600px] h-[400px] mix-blend-overlay opacity-0 pointer-events-none hidden lg:block">
                    <div className="relative w-full h-full border border-white/10 rounded-xl bg-gradient-to-br from-white/[0.03] to-transparent p-6 rotate-[-12deg] scale-90 blur-[1px]">
                        {/* Abstract UI Elements */}
                        <div className="w-1/3 h-2 bg-white/10 rounded-full mb-6"></div>
                        <div className="flex gap-4 mb-4">
                            <div className="w-16 h-16 rounded bg-white/5"></div>
                            <div className="flex-1 space-y-2">
                                <div className="w-3/4 h-2 bg-white/10 rounded-full"></div>
                                <div className="w-1/2 h-2 bg-white/5 rounded-full"></div>
                            </div>
                        </div>
                        <div className="w-full h-[1px] bg-white/5 my-6"></div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="h-20 bg-white/5 rounded"></div>
                            <div className="h-20 bg-white/5 rounded"></div>
                            <div className="h-20 bg-white/5 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="hero-content relative z-10 flex flex-col items-center justify-center text-center px-4 w-full max-w-5xl mx-auto">

                {/* Top Label (Anchored Tighter: mb-6) */}
                {/* Contrast Boost: text-emerald-400, bg-emerald-500/10 */}
                <span className="hero-tag mb-6 text-[10px] md:text-[11px] font-mono text-emerald-400 tracking-[0.15em] font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/10 backdrop-blur-sm opacity-0">
                    ZERO-KNOWLEDGE FILE VAULT
                </span>

                {/* Masked Headline with Hierarchy */}
                <h1 className="font-serif text-[#E6EAF0] mb-8 drop-shadow-2xl mx-auto flex flex-col items-center gap-0">
                    {/* Line 1: Heavier, Authority, Tight Tracking for Optical Balance */}
                    <span className="hero-line-1 block overflow-hidden pb-1">
                        <span className="block text-[10vw] md:text-[5rem] font-medium tracking-[-0.03em] leading-[1.05]">
                            Secure what matters.
                        </span>
                    </span>
                    {/* Line 2: Elegance, Tighter, Smaller */}
                    <span className="hero-line-2 block overflow-hidden pt-1 pb-2 mx-auto -mt-1 md:-mt-3">
                        <span className="block text-[6.3vw] lg:text-[4.1rem] font-light text-[#E6EAF0] opacity-0 tracking-normal leading-[1.1]">
                            Everything else stays invisible.
                        </span>
                    </span>
                </h1>

                {/* Subtext */}
                <p className="hero-subtext mt-2 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light tracking-wide opacity-0">
                    Your files are encrypted <span className="text-gray-200 font-normal">in your browser</span>, with a key only you hold.
                </p>

                {/* CTA Buttons (Tighter Spacing: pt-9) */}
                <div className="hero-btns flex flex-col md:flex-row items-center justify-center gap-5 pt-9 w-full opacity-0">

                    {/* Primary CTA: Premium Logic + Power Pulse */}
                    <div className="relative group">
                        {/* Power Pulse (Behind CTA) */}
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse"></div>

                        {/* Button Frame */}
                        <Link href="/vault" className="relative block px-8 py-3.5 text-[#050608] rounded-lg text-sm font-bold tracking-wide overflow-hidden transform-gpu transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[2px] hover:shadow-[0_12px_30px_rgba(16,185,129,0.25),inset_0_0_20px_rgba(255,255,255,0.2)] bg-gradient-to-b from-emerald-400 to-emerald-500">
                            {/* Subtle inner highlight for 3D feel */}
                            <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/30"></span>
                            <span className="relative z-10 flex items-center gap-2">
                                Create Vault
                                {/* Arrow Slide 4px */}
                                <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[4px]" />
                            </span>
                        </Link>
                    </div>

                    {/* Secondary CTA: Stable (No Lift), Snappier Transition (duration-200) */}
                    <a href="#how-it-works" className="group px-8 py-3.5 rounded-lg text-sm font-medium text-gray-100 border border-white/30 hover:border-white/60 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] bg-white/[0.01] hover:bg-white/[0.1] hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] flex items-center gap-2 transform-gpu">
                        <Play className="w-3 h-3 fill-current opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                        See How It Works
                    </a>
                </div>

                {/* Trust Badges - Detached Row with Divider (0.08 Opacity) */}
                <div className="trust-container pt-12 w-full max-w-4xl opacity-0 translate-y-2">
                    <div className="w-full h-[1px] bg-white/[0.08] mb-8 mx-auto max-w-2xl"></div>

                    <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
                        {[
                            { icon: Lock, label: "AES-256 Encryption" },
                            { icon: KeyRound, label: "Your Key Only" },
                            { icon: FileLock2, label: "Encrypted File Names" },
                            { icon: Shield, label: "Tamper Detection" },
                        ].map((badge) => (
                            <div key={badge.label} className="trust-badge flex items-center gap-2.5 group cursor-default">
                                <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/10 text-emerald-400/70 group-hover:text-emerald-400 transition-colors">
                                    <badge.icon className="w-3 h-3" />
                                </div>
                                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-widest group-hover:text-gray-400 transition-colors">
                                    {badge.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    )
}
