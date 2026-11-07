"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

const STEPS = [
    {
        title: "Choose a passphrase",
        subtitle: "Only you know it",
        content: "It never leaves this device. It's stretched through 600,000 rounds of PBKDF2 to protect your master key.",
    },
    {
        title: "Add your files",
        subtitle: "Encrypted on arrival",
        content: "Every file is sealed with AES-256-GCM before it's written to storage, along with its name and type.",
    },
    {
        title: "Lock it away",
        subtitle: "One click, or automatic",
        content: "Lock with one click, or let auto-lock do it. The key is released, and only ciphertext remains.",
    },
    {
        title: "Open with confidence",
        subtitle: "Tampering can't hide",
        content: "Each file carries an authentication tag. If a single byte changes, the vault refuses it and tells you.",
    },
    {
        title: "Back it up",
        subtitle: "Yours to keep",
        content: "Export one encrypted file and store it anywhere. It restores on any browser with your passphrase.",
    },
];

export default function DraftCarousel() {
    const scrollRef = useRef(null);
    const [edges, setEdges] = useState({ start: true, end: false });

    const updateEdges = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setEdges({
            start: el.scrollLeft <= 4,
            end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
        });
    }, []);

    useEffect(() => {
        updateEdges();
        window.addEventListener("resize", updateEdges);
        return () => window.removeEventListener("resize", updateEdges);
    }, [updateEdges]);

    const scroll = (direction) => {
        const el = scrollRef.current;
        if (!el) return;
        const card = el.querySelector(".carousel-card");
        const step = card.offsetWidth + 40; // one card plus the gap
        el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
    };

    const arrowClass =
        "absolute top-1/2 -translate-y-1/2 w-14 h-14 rounded-full border border-white/30 bg-[#2f6fa8]/80 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-[#2f6fa8] transition-all duration-300 z-10 disabled:opacity-30 disabled:pointer-events-none";

    return (
        <section id="how-it-works" className="carousel-section relative pt-20 pb-40 bg-[#2f6fa8] overflow-hidden scroll-mt-16">
            <div className="max-w-7xl mx-auto w-[90%] mb-4">
                <p className="text-xs font-bold tracking-widest text-white/70 uppercase">How it works</p>
                <h2 className="mt-3 text-[2.5rem] md:text-[3.5rem] leading-tight font-serif text-white">
                    Five steps. No account.
                </h2>
            </div>

            <div className="carousel-wrapper relative w-[90%] mx-auto max-w-7xl">

                {/* Navigation Arrows */}
                <button
                    onClick={() => scroll("left")}
                    disabled={edges.start}
                    aria-label="Previous step"
                    className={`${arrowClass} left-[-20px] md:left-[-40px]`}
                >
                    <ArrowLeft size={24} />
                </button>

                <button
                    onClick={() => scroll("right")}
                    disabled={edges.end}
                    aria-label="Next step"
                    className={`${arrowClass} right-[-20px] md:right-[-40px]`}
                >
                    <ArrowRight size={24} />
                </button>

                {/* Scroll Container */}
                <div
                    ref={scrollRef}
                    onScroll={updateEdges}
                    className="carousel-container flex gap-10 overflow-x-auto snap-x snap-mandatory py-10 px-1 scrollbar-hide"
                >
                    {STEPS.map((step, index) => (
                        <div
                            key={step.title}
                            className="carousel-card w-[280px] md:w-[420px] min-h-[440px] md:min-h-[480px] bg-[#f5f5f5] rounded-[20px] snap-center flex-shrink-0 transition-all duration-300 ease-out hover:-translate-y-4 hover:shadow-[0_30px_80px_rgba(0,0,0,0.25)] flex flex-col justify-between p-8 md:p-12 group"
                        >
                            <div className="card-inner">
                                <span className="text-xs font-bold tracking-widest text-[#2f6fa8] uppercase mb-4 block opacity-80">Step {index + 1}</span>
                                <h3 className="text-3xl font-serif text-[#1b1b1b] mb-6 group-hover:text-[#2f6fa8] transition-colors">{step.title}</h3>
                                <h4 className="text-lg font-medium text-gray-500 mb-4">{step.subtitle}</h4>
                                <p className="text-gray-600 leading-relaxed font-serif text-lg italic">
                                    {step.content}
                                </p>
                            </div>

                            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mt-6">
                                <div className="h-full bg-[#2f6fa8]" style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* TORN DIVIDER, leading into the dark section below */}
            <div className="absolute bottom-0 left-0 w-full translate-y-[1px]" aria-hidden="true">
                <svg viewBox="0 0 1440 200" className="w-full h-[100px] block" preserveAspectRatio="none">
                    <path
                        fill="#0b0c10"
                        d="M0,80 C200,120 400,40 600,90 C800,140 1000,60 1200,100 C1350,120 1440,80 1440,80 L1440,200 L0,200 Z"
                    />
                </svg>
            </div>
        </section>
    );
}
