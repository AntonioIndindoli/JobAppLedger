const leafShape = "M0 0C4-13 17-22 33-21C30-6 18 5 0 0Z";

function GrowingBranchTree({ position }: { position: "left" | "center" | "right" }) {
    return (
        <svg
            className={`landing-hero-growth-svg landing-hero-growth-svg--${position}`}
            viewBox="0 0 1400 720"
            width="1400"
            height="720"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
        >
            <g transform={position === "center" ? undefined : "translate(1400 0) scale(-1 1)"}>
                <g className="hero-growth-vines" strokeLinecap="round" strokeLinejoin="round">
                    <path
                        className="hero-growth-path hero-growth-trunk"
                        pathLength="1"
                        d="M700 744C690 690 680 640 695 590C710 540 704 495 690 450C676 405 682 360 700 315C718 270 712 220 695 175C678 130 686 80 700 30"
                    />

                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-lower-left"
                        pathLength="1"
                        d="M695 590C602 566 520 526 445 470C368 413 305 390 245 350"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-lower-left-twig"
                        pathLength="1"
                        d="M445 470C405 442 383 405 370 370"
                    />

                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-middle-right"
                        pathLength="1"
                        d="M690 450C782 429 857 383 930 330C992 285 1061 266 1142 242"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-middle-right-twig"
                        pathLength="1"
                        d="M930 330C963 292 982 252 990 210"
                    />

                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-upper-left"
                        pathLength="1"
                        d="M700 315C616 286 550 229 490 165C430 101 352 82 258 78"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-upper-left-twig"
                        pathLength="1"
                        d="M490 165C462 132 439 101 420 72"
                    />

                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-top-right"
                        pathLength="1"
                        d="M695 175C774 155 830 133 890 112C970 84 1050 52 1160 33"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-top-right-twig"
                        pathLength="1"
                        d="M890 112C916 88 932 63 940 38"
                    />
                </g>

                <g className="hero-growth-leaves">
                    <g transform="translate(245 350) rotate(-128)"><path className="hero-growth-leaf hero-leaf-lower-left" d={leafShape} /></g>
                    <g transform="translate(370 370) rotate(-82)"><path className="hero-growth-leaf hero-leaf-lower-left-twig" d={leafShape} /></g>
                    <g transform="translate(1142 242) rotate(-28)"><path className="hero-growth-leaf hero-leaf-middle-right" d={leafShape} /></g>
                    <g transform="translate(990 210) rotate(-69)"><path className="hero-growth-leaf hero-leaf-middle-right-twig" d={leafShape} /></g>
                    <g transform="translate(258 78) rotate(-158)"><path className="hero-growth-leaf hero-leaf-upper-left" d={leafShape} /></g>
                    <g transform="translate(420 72) rotate(-96)"><path className="hero-growth-leaf hero-leaf-upper-left-twig" d={leafShape} /></g>
                    <g transform="translate(1160 33) rotate(-23)"><path className="hero-growth-leaf hero-leaf-top-right" d={leafShape} /></g>
                    <g transform="translate(940 38) rotate(-71)"><path className="hero-growth-leaf hero-leaf-top-right-twig" d={leafShape} /></g>
                    <g transform="translate(700 30) rotate(-76)"><path className="hero-growth-leaf hero-leaf-crown" d={leafShape} /></g>
                </g>
            </g>
        </svg>
    );
}

export function GrowingBranches() {
    return (
        <div className="landing-hero-growth" aria-hidden="true">
            <GrowingBranchTree position="left" />
            <GrowingBranchTree position="center" />
            <GrowingBranchTree position="right" />
        </div>
    );
}
