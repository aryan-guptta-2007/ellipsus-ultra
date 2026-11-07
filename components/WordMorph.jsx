"use client"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

// Register ScrollTrigger securely
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger)
}

const WORDS = [
    { text: "Financial", color: "#059669" },    // Deep Emerald
    { text: "Legal", color: "#2563eb" },        // Royal Blue
    { text: "Medical", color: "#d97706" },      // Amber
    { text: "Personal", color: "#7c3aed" },     // Violet
    { text: "Crypto", color: "#db2777" }        // Pink
]

export default function WordMorph() {
    const containerRef = useRef(null)
    const wordRef = useRef(null)

    useEffect(() => {
        const el = wordRef.current
        if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        let index = 0
        let interval
        let timeline

        const runMorphSequence = () => {
            const nextIndex = (index + 1) % WORDS.length
            const word = WORDS[nextIndex]

            timeline = gsap.timeline({
                onComplete: () => {
                    index = nextIndex
                }
            })

            // Exit: Blur + Slide Up + Fade Out
            timeline.to(el, {
                y: -20,
                opacity: 0,
                filter: "blur(8px)",
                duration: 0.5,
                ease: "power2.in",
                onComplete: () => {
                    el.textContent = word.text
                    el.style.color = word.color
                }
            })

            // Entry: Slide Up + Fade In + Deblur
            timeline.fromTo(el,
                { y: 20, opacity: 0, filter: "blur(8px)" },
                { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.8, ease: "power2.out" }
            )
        }

        const startAnimation = () => {
            clearInterval(interval)
            interval = setInterval(runMorphSequence, 2500)
        }

        const stopAnimation = () => clearInterval(interval)

        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                trigger: containerRef.current,
                start: "top 70%",
                end: "bottom top",
                onEnter: startAnimation,
                onLeave: stopAnimation,
                onEnterBack: startAnimation,
                onLeaveBack: stopAnimation
            })
        }, containerRef)

        return () => {
            stopAnimation()
            timeline?.kill()
            ctx.revert()
        }
    }, [])

    return (
        <section ref={containerRef} className="white-editorial-section relative pt-[160px] pb-40 md:pb-60 flex items-center justify-center bg-[#f4f1ec] overflow-hidden z-20 -mt-[120px]">

            {/* Decorative Pencil Sketch Placeholder (CSS Shape) */}
            <div className="absolute right-[5%] top-[20%] w-64 h-64 border border-gray-900/10 rounded-full opacity-20 pointer-events-none animate-spin-slow-reverse" style={{ borderStyle: 'dashed' }}></div>
            <div className="absolute left-[10%] bottom-[20%] w-32 h-32 border border-gray-900/5 rotate-45 pointer-events-none"></div>

            <h2 className="relative z-10 font-serif text-[56px] md:text-[80px] lg:text-[100px] leading-[1.1] tracking-[-0.03em] text-[#1b1b1b] text-center font-light px-4">
                Security for
                <br className="md:hidden" />
                <span className="inline-block w-[300px] md:w-[420px] text-center md:text-left md:ml-8 relative">
                    <span ref={wordRef} className="inline-block min-w-full font-normal" style={{ color: WORDS[0].color }}>
                        {WORDS[0].text}
                    </span>
                </span>
                <br className="lg:hidden" />
                files.
            </h2>

            {/* Editorial aesthetic: Page number / footer mark */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] text-gray-500 uppercase font-sans whitespace-nowrap">
                Whatever you can't afford to lose
            </div>

        </section>
    )
}
