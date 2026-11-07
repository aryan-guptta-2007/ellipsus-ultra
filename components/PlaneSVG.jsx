"use client"
import { useEffect, useRef } from "react"
import gsap from "gsap"

export default function PlaneSVG() {
    const svgRef = useRef(null)

    useEffect(() => {
        const path = svgRef.current.querySelector("path")
        const length = path.getTotalLength()

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

        const ctx = gsap.context(() => {
            // Draw the outline, overshoot slightly, then settle.
            gsap.timeline({ delay: 0.8 })
                .fromTo(
                    path,
                    { strokeDasharray: length, strokeDashoffset: length },
                    { strokeDashoffset: -40, duration: 2.5, ease: "power2.inOut" },
                )
                .to(path, { strokeDashoffset: 0, duration: 1, ease: "power1.out" })

            // Slight breathing once the outline is drawn.
            gsap.to(svgRef.current, {
                y: -10,
                duration: 4,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                delay: 4,
            })
        }, svgRef)

        return () => ctx.revert()
    }, [])

    return (
        <svg
            ref={svgRef}
            aria-hidden="true"
            width="240"
            height="240"
            className="plane-svg absolute left-[6%] top-[28%] opacity-50 pointer-events-none hidden xl:block"
            viewBox="0 0 200 200"
            style={{ filter: "drop-shadow(0px 0px 8px rgba(255,255,255,0.2))" }}
        >
            <path
                d="M94 122 L18 98 L186 28 L94 122 L92 166 L114 140 L132 168 L186 28"
                fill="none"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ vectorEffect: "non-scaling-stroke" }}
            />
        </svg>
    )
}
