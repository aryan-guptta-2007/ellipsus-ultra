export default function AnimatedWaveDivider() {
    return (
        <div
            aria-hidden="true"
            className="relative w-full overflow-hidden leading-none -mb-1 z-30 pointer-events-none bg-[#000]"
        >
            <svg
                className="w-full h-[140px] block"
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
            >
                <path
                    fill="#f4f1ec"
                    d="M0,192L80,181.3C160,171,320,149,480,154.7C640,160,800,192,960,202.7C1120,213,1280,203,1360,197.3L1440,192L1440,320L0,320Z"
                >
                    <animate
                        attributeName="d"
                        dur="8s"
                        repeatCount="indefinite"
                        values="
            M0,192L80,181.3C160,171,320,149,480,154.7C640,160,800,192,960,202.7C1120,213,1280,203,1360,197.3L1440,192L1440,320L0,320Z;

            M0,160L80,170C160,180,320,200,480,208C640,213,800,203,960,181C1120,160,1280,128,1360,112L1440,96L1440,320L0,320Z;

            M0,192L80,181.3C160,171,320,149,480,154.7C640,160,800,192,960,202.7C1120,213,1280,203,1360,197.3L1440,192L1440,320L0,320Z
            "
                    />
                </path>
            </svg>
        </div>
    )
}
