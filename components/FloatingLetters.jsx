"use client"
import { useEffect, useRef } from "react"

const CHARACTERS = "0123456789ABCDEF#0x"
const randomCharacter = () => CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]

export default function FloatingLetters() {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        let animationFrameId = null
        let letters = []

        const createLetter = () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            z: Math.random() * 2 + 0.5, // Depth 0.5 to 2.5
            char: randomCharacter(),
            opacity: Math.random() * 0.1 + 0.04,
            velX: Math.random() * 0.2 - 0.1,
            velY: Math.random() * 0.2 - 0.1,
        })

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = "#ffffff"
            for (const letter of letters) {
                ctx.globalAlpha = letter.opacity
                ctx.font = `${14 * letter.z}px "Courier New", monospace`
                ctx.fillText(letter.char, letter.x, letter.y)
            }
            ctx.globalAlpha = 1
        }

        const update = () => {
            for (const letter of letters) {
                letter.x = (letter.x + letter.velX + canvas.width) % canvas.width
                letter.y = (letter.y + letter.velY + canvas.height) % canvas.height
                // Swap characters now and then for a "data processing" feel
                if (Math.random() < 0.01) letter.char = randomCharacter()
            }
        }

        const animate = () => {
            update()
            draw()
            animationFrameId = requestAnimationFrame(animate)
        }

        const start = () => {
            if (animationFrameId === null && !reducedMotion) animate()
        }

        const stop = () => {
            if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
            animationFrameId = null
        }

        const resize = () => {
            canvas.width = canvas.clientWidth
            canvas.height = canvas.clientHeight
            const count = Math.floor((canvas.width * canvas.height) / 8000)
            letters = Array.from({ length: count }, createLetter)
            draw()
        }

        resize()
        window.addEventListener("resize", resize)

        // No reason to animate once the hero has scrolled away.
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) start()
            else stop()
        })
        observer.observe(canvas)

        return () => {
            window.removeEventListener("resize", resize)
            observer.disconnect()
            stop()
        }
    }, [])

    return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" />
}
