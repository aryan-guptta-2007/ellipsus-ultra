"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

export default function EditorialSection() {
    const sectionRef = useRef(null);

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const ctx = gsap.context(() => {
            // Draw each scribble using its real length, so it ends as a solid line.
            gsap.utils.toArray(".scribble path").forEach((path) => {
                const length = path.getTotalLength();
                gsap.fromTo(
                    path,
                    { strokeDasharray: length, strokeDashoffset: length },
                    {
                        strokeDashoffset: 0,
                        duration: 2,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: path.closest("svg"),
                            start: "top 80%",
                        },
                    },
                );
            });

            // Illustration float animation
            gsap.to(".floating-illustration", {
                y: 20,
                repeat: -1,
                yoyo: true,
                duration: 4,
                ease: "sine.inOut",
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={sectionRef}
            className="relative bg-[#f4f1ec] text-[#1b1b1b] pt-32 pb-52 overflow-hidden -mt-10 md:-mt-20 z-10"
        >
            <div className="max-w-6xl mx-auto px-6 relative z-10">

                {/* MAIN TEXT */}
                <h2 className="text-[2.5rem] md:text-[4rem] leading-tight font-serif">
                    Plenty of tools will store your files and keep the keys for themselves.
                    {" "}<span className="relative italic inline-block">
                        That’s not us.

                        {/* RED UNDERLINE */}
                        <svg
                            className="scribble absolute left-0 -bottom-2 w-full pointer-events-none"
                            aria-hidden="true"
                            height="30"
                            viewBox="0 0 500 30"
                            fill="none"
                            preserveAspectRatio="none"
                        >
                            <path
                                d="M5 20 Q 250 40 495 18"
                                stroke="#ff4d4d"
                                strokeWidth="3"
                                fill="none"
                                strokeLinecap="round"
                            />
                        </svg>
                    </span>
                </h2>

                {/* SECOND TEXT BLOCK */}
                <p className="mt-16 text-[2.5rem] md:text-[4rem] leading-tight font-serif max-w-4xl relative z-10">
                    StealthVault encrypts everything on your own device, so the only
                    person who can ever read your files is

                    {" "}<span className="relative inline-block whitespace-nowrap">
                        you

                        {/* GREEN CIRCLE */}
                        <svg
                            className="scribble absolute -left-[20%] -top-[12%] w-[140%] h-[130%] pointer-events-none"
                            aria-hidden="true"
                            viewBox="0 0 300 120"
                            fill="none"
                            preserveAspectRatio="none"
                        >
                            <path
                                d="M150 8 C 240 6, 292 32, 290 62 C 288 96, 214 114, 142 112 C 62 110, 8 90, 10 58 C 12 26, 84 8, 176 12"
                                stroke="#3ba776"
                                strokeWidth="3"
                                fill="none"
                                strokeLinecap="round"
                                style={{ vectorEffect: "non-scaling-stroke" }}
                            />
                        </svg>

                    </span>.
                </p>

            </div>

            {/* RIGHT SIDE ILLUSTRATION PLACEHOLDER */}
            <div className="floating-illustration absolute right-[-50px] md:right-10 bottom-40 md:bottom-10 opacity-10 md:opacity-40 z-0" aria-hidden="true">
                <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    {/* Abstract Pen Sketch Placeholder */}
                    <path d="M40 160 Q 60 40 160 60" stroke="black" fill="none" strokeWidth="1" opacity="0.5" />
                    <path d="M50 150 Q 150 150 150 50" stroke="black" fill="none" strokeWidth="1" opacity="0.3" />
                    <path d="M60 170 C 80 100, 120 100, 140 70" stroke="black" fill="none" strokeWidth="1" opacity="0.6" />
                    <circle cx="100" cy="100" r="80" stroke="black" strokeWidth="0.5" strokeDasharray="4 4" fill="none" opacity="0.2" />
                </svg>
            </div>

            {/* BOTTOM TORN DIVIDER, leading into the blue section below */}
            <div className="absolute bottom-0 left-0 w-full translate-y-[1px]" aria-hidden="true">
                <svg viewBox="0 0 1440 200" className="w-full h-[120px] block" preserveAspectRatio="none">
                    <path
                        fill="#2f6fa8"
                        d="M0,80 C200,120 400,40 600,90 C800,140 1000,60 1200,100 C1350,120 1440,80 1440,80 L1440,200 L0,200 Z"
                    />
                </svg>
            </div>

        </section>
    );
}
