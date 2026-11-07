/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                serif: ['var(--font-playfair)', 'serif'],
            },
            keyframes: {
                shimmer: {
                    "0%": { transform: "translateX(-100%)" },
                    "100%": { transform: "translateX(300%)" },
                },
            },
            animation: {
                shimmer: "shimmer 3s ease-in-out infinite",
                "spin-slow-reverse": "spin 40s linear infinite reverse",
            },
        },
    },
    plugins: [],
}
