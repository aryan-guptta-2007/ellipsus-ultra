"use client"
import { useEffect, useRef } from "react"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
    Lock, Shield, FileText, FileCode, FileImage, AlertTriangle, CheckCircle,
    Activity, Key, Settings, FileLock2, EyeOff, ChevronRight
} from "lucide-react"

// Register ScrollTrigger securely
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger)
}

const NAV_ITEMS = [
    { icon: FileLock2, label: "Files", href: "/vault#files", active: true },
    { icon: Activity, label: "Activity", href: "/vault#activity", active: false },
    { icon: Key, label: "Keys", href: "/vault#keys", active: false },
]

// Sample data for the preview. Tailwind needs the class names written out in full.
const SAMPLE_FILES = [
    {
        name: "financial_report_Q3.pdf",
        size: "2.4 MB",
        date: "Today",
        icon: FileText,
        iconTone: "bg-blue-500/10 text-blue-400 border-blue-500/10 group-hover:bg-blue-500/20",
        accent: "hover:border-l-emerald-500",
        nameHover: "group-hover:text-emerald-400",
        dot: "bg-emerald-500",
    },
    {
        name: "source_code_v8.zip",
        size: "84.5 MB",
        date: "Yesterday",
        icon: FileCode,
        iconTone: "bg-purple-500/10 text-purple-400 border-purple-500/10 group-hover:bg-purple-500/20",
        accent: "hover:border-l-purple-500",
        nameHover: "group-hover:text-purple-400",
        dot: "bg-purple-500",
    },
    {
        name: "passport_scan.png",
        size: "1.1 MB",
        date: "Mar 2",
        icon: FileImage,
        iconTone: "bg-orange-500/10 text-orange-400 border-orange-500/10 group-hover:bg-orange-500/20",
        accent: "hover:border-l-orange-500",
        nameHover: "group-hover:text-orange-400",
        dot: "bg-orange-500",
    },
]

const SAMPLE_ACTIVITY = [
    { title: "File Encrypted", text: "financial_report_Q3.pdf sealed.", time: "2m ago", dot: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]", titleTone: "text-blue-400", fade: "opacity-100" },
    { title: "Integrity Verified", text: "All 3 files passed verification.", time: "1h ago", dot: "bg-gray-500", titleTone: "text-gray-300", fade: "opacity-60" },
    { title: "Backup Exported", text: "Encrypted backup saved.", time: "4h ago", dot: "bg-gray-600", titleTone: "text-gray-400", fade: "opacity-40" },
]

function SampleFile({ file }) {
    const Icon = file.icon
    return (
        <Link
            href="/vault"
            className={`bg-[#1a1c23]/40 hover:bg-[#1a1c23]/80 transition-all duration-200 border border-white/5 ${file.accent} hover:border-r-white/10 hover:border-y-white/10 hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:-translate-y-[2px] rounded-r-xl rounded-l-sm p-3 lg:p-4 flex items-center gap-4 lg:gap-5 group relative overflow-hidden`}
        >
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>

            <div className={`p-2.5 lg:p-3 rounded-lg border transition-colors ${file.iconTone}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-semibold text-gray-100 truncate transition-colors ${file.nameHover}`}>{file.name}</h4>
                    <div className="mt-1 flex items-center gap-2 opacity-60">
                        <span className={`w-1.5 h-1.5 rounded-full ${file.dot}`}></span>
                        <span className="text-[10px] text-gray-400 truncate">AES-256-GCM • Verified</span>
                    </div>
                </div>
                <div className="hidden sm:flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 gap-1.5 shrink-0">
                    <EyeOff className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] text-emerald-400 font-medium">Private</span>
                </div>
                <div className="hidden xl:flex flex-col items-end text-[10px] font-mono opacity-50 shrink-0">
                    <span className="text-gray-400">{file.size}</span>
                    <span className="text-gray-500">{file.date}</span>
                </div>
                <div className="bg-white/[0.03] rounded-full p-2 group-hover:bg-white/10 transition-colors shrink-0">
                    <Lock className="w-3 h-3 text-gray-400" />
                </div>
            </div>
        </Link>
    )
}

export default function DashboardPreview() {
    const containerRef = useRef(null)

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        const ctx = gsap.context(() => {
            // Main Dashboard Animation
            gsap.from(".dashboard-main", {
                y: 300,
                scale: 0.9,
                opacity: 0,
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top bottom",
                    end: "top 20%",
                    scrub: 1
                }
            })

            // Left Phone Animation
            gsap.from(".phone-left", {
                x: -200,
                y: 100,
                rotate: -15,
                opacity: 0,
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top 80%",
                    end: "top 10%",
                    scrub: 1.5
                }
            })

            // Right Phone Animation
            gsap.from(".phone-right", {
                x: 200,
                y: 150,
                rotate: 15,
                opacity: 0,
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top 80%",
                    end: "top 10%",
                    scrub: 1.5
                }
            })

            // The float runs on an inner wrapper so it never competes with the scrubbed tweens above.
            gsap.to(".phone-float", {
                y: -10,
                rotation: 0.5,
                duration: 12,
                yoyo: true,
                repeat: -1,
                ease: "sine.inOut"
            })
        }, containerRef)

        return () => ctx.revert()
    }, [])

    return (
        <section
            ref={containerRef}
            className="dashboard-section relative lg:min-h-[150vh] w-full z-10 -mt-[1px] pb-20 lg:pb-0 overflow-visible"
        >
            <div className="dashboard-wrapper lg:sticky lg:top-[10vh] left-0 w-full flex justify-center [perspective:1000px] lg:overflow-hidden lg:pb-[12vh] px-4 md:px-0">

                {/* Main Dashboard: High Density UI */}
                <div className="dashboard-main relative w-full md:w-[90%] lg:w-[85%] max-w-[1100px] lg:aspect-[16/10] bg-[#0b0c10] rounded-2xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] z-10 overflow-hidden flex flex-col font-sans">

                    {/* Background Grid & Noise (Reduced Opacity) */}
                    <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
                        style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                    </div>

                    {/* Header: Integrated, Compact, OS Shell Feel - Darker & Distinct */}
                    <div className="h-12 shrink-0 border-b border-white/10 bg-[#050608]/90 backdrop-blur-2xl flex items-center px-4 lg:px-6 justify-between z-20 shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative">
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                            </div>
                            {/* Top Header Inner */}
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                                <span className="text-xs font-bold tracking-widest text-white/90">STEALTHVAULT</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/20">
                            <Shield className="w-3 h-3 text-emerald-400" />
                            <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">Unlocked</span>
                        </div>
                    </div>

                    {/* Body - Fixed Grid for SaaS Rigidity */}
                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[180px_1fr_260px] xl:grid-cols-[220px_1fr_300px] bg-[#0b0c10] relative z-0">

                        {/* Left Sidebar: Control Layer (Fixed Width, Glow Divider, Adjusted Contrast) */}
                        <div className="hidden lg:flex flex-col border-r border-white/5 bg-[#08090b] py-6 px-3 gap-2 shadow-[1px_0_20px_rgba(0,0,0,0.5)] relative z-10">
                            {/* Workspace Label */}
                            <div className="px-3 mb-4">
                                <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Vault</div>
                                <div className="text-[11px] text-gray-300 font-bold mt-0.5 tracking-tight">Main Vault</div>
                            </div>

                            {NAV_ITEMS.map((item) => (
                                <Link key={item.label} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs transition-all duration-200 group relative overflow-hidden ${item.active ? 'bg-emerald-500/10 text-emerald-400 font-semibold shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]' : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'}`}>
                                    {/* Active/Hover Border Indicator */}
                                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r-full transition-all duration-200 ${item.active ? 'h-5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'h-0 group-hover:h-4 bg-gray-600'}`}></div>

                                    <item.icon className={`w-4 h-4 relative z-10 ${item.active ? 'text-emerald-400' : 'text-white/50 group-hover:text-white transition-colors'}`} />
                                    <span className="relative z-10 transition-colors">{item.label}</span>
                                </Link>
                            ))}

                            <div className="mt-auto mx-2">
                                <div className="h-[1px] bg-white/5 mb-2 w-full"></div>
                                <Link href="/vault#settings" className="px-2 py-2 flex items-center gap-3 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-md transition-all group">
                                    <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                                    <span className="text-xs font-medium">Settings</span>
                                </Link>
                            </div>
                        </div>

                        {/* Center: Encrypted Files Grid (Fixed Layout) */}
                        <div className="min-w-0 p-4 lg:p-6 flex flex-col gap-4 lg:gap-6 bg-gradient-to-b from-[#0b0c10] to-[#13151a]">
                            <div className="flex flex-wrap justify-between items-end gap-3 border-b border-white/5 pb-4 lg:pb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-tight">Main Vault</h3>
                                    <p className="text-xs mt-1 flex items-center gap-1.5 font-medium">
                                        <span className="text-white">3</span>
                                        <span className="text-white/50">protected files</span>
                                        <span className="w-0.5 h-0.5 rounded-full bg-emerald-500/50 mx-0.5 shadow-[0_0_4px_rgba(16,185,129,0.5)]"></span>
                                        <span className="text-white">88 MB</span>
                                        <span className="text-white/50">used</span>
                                    </p>
                                </div>
                                <Link href="/vault" className="h-9 px-5 rounded-md bg-emerald-500 text-[11px] text-[#0b0c10] font-bold hover:bg-emerald-400 transition-all duration-200 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 flex items-center gap-2 group">
                                    Upload Securely
                                    <ChevronRight className="w-3 h-3 group-hover:translate-x-[2px] transition-transform" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 gap-3 lg:gap-4 mt-1">
                                {SAMPLE_FILES.map((file) => <SampleFile key={file.name} file={file} />)}
                            </div>
                        </div>

                        {/* Right Panel: Security Status (Fixed Width) */}
                        <div className="hidden lg:flex bg-[#0f1115]/50 border-l border-white/5 p-0 flex-col relative overflow-hidden backdrop-blur-sm shadow-[inset_1px_0_0_rgba(255,255,255,0.02)]">

                            {/* 1. VAULT STATUS WIDGET */}
                            <div className="p-5 xl:p-6 border-b border-white/5 relative z-10 bg-gradient-to-b from-emerald-500/[0.02] to-transparent">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Vault Status</h4>
                                    <Shield className="w-3 h-3 text-emerald-500" />
                                </div>

                                {/* Encryption Strength */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-[10px] text-gray-400 mb-2 font-mono">
                                        <span>Encryption</span>
                                        <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                                            AES-256-GCM
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden flex gap-0.5 relative shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/2 animate-shimmer"></div>
                                        {[...Array(10)].map((_, i) => (
                                            <div key={i} className="h-full flex-1 rounded-[1px] bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)]"></div>
                                        ))}
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-[#1a1c23]/50 p-2.5 rounded-lg border border-white/5">
                                        <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Failed unlocks</div>
                                        <div className="text-lg font-mono text-white">0</div>
                                    </div>
                                    <div className="bg-[#1a1c23]/50 p-2.5 rounded-lg border border-white/5">
                                        <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Files</div>
                                        <div className="text-lg font-mono text-white">3</div>
                                    </div>
                                </div>

                                {/* Integrity */}
                                <div className="bg-gradient-to-br from-emerald-900/20 to-[#0f1115] p-3 rounded-lg border border-emerald-500/20 flex items-center justify-between">
                                    <div>
                                        <div className="text-[9px] text-emerald-400/80 uppercase tracking-widest mb-1">Integrity</div>
                                        <div className="text-3xl font-extrabold text-white tracking-tighter flex items-baseline gap-1" style={{ textShadow: '0 0 30px rgba(16,185,129,0.2)' }}>
                                            3
                                            <span className="text-xs text-gray-500 font-normal tracking-normal">/ 3 verified</span>
                                        </div>
                                    </div>
                                    <div className="relative w-10 h-10 flex items-center justify-center">
                                        {/* Circular SVG Ring - Pulsing Check */}
                                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                                            <circle cx="20" cy="20" r="18" fill="none" stroke="#222" strokeWidth="3" />
                                            <circle cx="20" cy="20" r="18" fill="none" stroke="#10b981" strokeWidth="3" className="drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]" />
                                        </svg>
                                        <CheckCircle className="w-4 h-4 text-emerald-500 absolute animate-[pulse_3s_infinite]" />
                                    </div>
                                </div>
                            </div>

                            {/* 2. ACTIVITY TIMELINE */}
                            <div className="p-5 flex-1 relative z-10">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-4">Live Activity</h4>

                                <div className="space-y-4 font-mono">
                                    {SAMPLE_ACTIVITY.map((item) => (
                                        <div key={item.title} className={`flex gap-3 relative ${item.fade}`}>
                                            <div className={`w-1.5 h-1.5 mt-1 rounded-full shrink-0 ${item.dot}`}></div>
                                            <div>
                                                <div className={`text-[10px] font-bold mb-0.5 ${item.titleTone}`}>{item.title}</div>
                                                <div className="text-[9px] text-gray-500">{item.text}</div>
                                                <div className="text-[9px] text-gray-600 mt-1">{item.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. ANIMATED ENCRYPTED BACKGROUND */}
                            <div className="absolute inset-0 z-0 overflow-hidden opacity-20 pointer-events-none">
                                <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-emerald-500/30 leading-3 whitespace-pre text-right transform translate-x-4">
                                    {`0X_9F_A2\nENCRYPTING...\nBLOCK_77\nAES_INIT\nKEY_GEN\n01010101\nSECURE\n...`}
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#0b0c10] to-transparent"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Left Phone: Unlocked Screen - Floating & Blurred (Verified to 0.85/1px) */}
                <div className="phone-left hidden xl:block absolute bottom-[6%] left-[1%] xl:left-[3%] w-[200px] xl:w-[220px] aspect-[9/19] z-20">
                    <div className="phone-float w-full h-full bg-[#0b0c10] rounded-[2.5rem] border-[6px] border-[#222630] shadow-[0_30px_70px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden opacity-85 blur-[1px]">
                        <div className="h-full w-full bg-[#0b0c10] relative flex flex-col items-center justify-center p-6">
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-5 bg-black rounded-b-xl"></div>

                            {/* Shield Visual - Toned Down */}
                            <div className="relative w-16 h-16 mb-5">
                                <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full animate-[pulse_3s_infinite]"></div>
                                <div className="absolute inset-0 border-2 border-emerald-500/10 rounded-full animate-[pulse_3s_infinite]"></div>
                                <div className="absolute inset-0 border border-emerald-500/20 rounded-full flex items-center justify-center bg-emerald-500/[0.01]">
                                    <Shield className="w-6 h-6 text-emerald-500/50" />
                                </div>
                            </div>

                            <h4 className="text-white/90 text-xs font-bold tracking-wide">Vault Unlocked</h4>
                            <p className="text-center text-[9px] text-emerald-500/60 mt-0.5 font-mono">Key held in memory ✓</p>

                            <div className="mt-6 w-full bg-white/5 rounded-lg p-3 border border-white/5">
                                <div className="flex justify-between text-[9px] text-gray-500 mb-1.5 items-center">
                                    <span>Auto-lock</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
                                        <span className="text-emerald-400 font-medium">4:32</span>
                                    </div>
                                </div>
                                <div className="w-full h-0.5 bg-black/40 rounded-full overflow-hidden mt-2">
                                    <div className="w-[80%] h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                                </div>
                            </div>

                            <div className="absolute bottom-8 w-1/3 h-1 bg-white/20 rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* Right Phone: Failed Unlock - Floating & Blurred */}
                <div className="phone-right hidden xl:block absolute bottom-[3%] right-[1%] xl:right-[3%] w-[200px] xl:w-[220px] aspect-[9/19] z-20">
                    <div className="phone-float w-full h-full bg-[#0b0c10] rounded-[2.5rem] border-[6px] border-[#222630] shadow-[0_30px_70px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden opacity-85 blur-[1px]">
                        <div className="h-full w-full bg-[#0b0c10] relative flex flex-col">
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-5 bg-black rounded-b-xl"></div>

                            {/* Notification Banner */}
                            <div className="mt-16 mx-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-md">
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 bg-red-500/20 rounded-md">
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                    </div>
                                    <div>
                                        <h5 className="text-[11px] font-bold text-red-400">Failed Unlock</h5>
                                        <p className="text-[9px] text-gray-400 leading-tight mt-0.5">A wrong passphrase was entered while you were away.</p>
                                    </div>
                                </div>
                            </div>

                            {/* File List Below */}
                            <div className="px-4 mt-4 space-y-3 opacity-40 grayscale">
                                <div className="h-10 w-full bg-white/5 rounded-lg flex items-center px-3 gap-2">
                                    <div className="w-6 h-6 rounded bg-white/10"></div>
                                    <div className="w-16 h-1.5 bg-white/10 rounded"></div>
                                </div>
                                <div className="h-10 w-full bg-white/5 rounded-lg flex items-center px-3 gap-2">
                                    <div className="w-6 h-6 rounded bg-white/10"></div>
                                    <div className="w-16 h-1.5 bg-white/10 rounded"></div>
                                </div>
                            </div>

                            <div className="mt-auto mx-6 mb-12">
                                <Link href="/vault#activity" className="block text-center w-full py-2 bg-white/10 border border-white/10 rounded-lg text-[10px] text-white font-medium">View Activity</Link>
                            </div>

                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-white/20 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background blend */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b0c10] to-[#000] -z-10" />
        </section>
    )
}
