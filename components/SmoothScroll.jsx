"use client"
import { useEffect } from "react"
import Lenis from "lenis"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

// Mounted by the landing page only. The vault page scrolls natively.
export default function SmoothScroll() {
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        gsap.registerPlugin(ScrollTrigger)
        const lenis = new Lenis({ duration: 1.2, anchors: true })
        lenis.on("scroll", ScrollTrigger.update)

        // Driving Lenis from GSAP's ticker keeps scrubbed animations in step with scrolling.
        const tick = (seconds) => lenis.raf(seconds * 1000)
        gsap.ticker.add(tick)
        gsap.ticker.lagSmoothing(0)

        return () => {
            gsap.ticker.remove(tick)
            gsap.ticker.lagSmoothing(500, 33)
            lenis.destroy()
        }
    }, [])

    return null
}
