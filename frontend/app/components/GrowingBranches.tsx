const leafShape = "M0 0C5-15 20-25 38-23C34-6 20 7 0 0Z";

function GrowingBranchTree({ position }: { position: "left" | "center" | "right" }) {
    return (
        <svg
            className={`landing-hero-growth-svg landing-hero-growth-svg--${position}`}
            viewBox="0 0 1400 800"
            width="1400"
            height="800"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
        >
            <g transform={position === "right" ? "translate(1400 0) scale(-1 1)" : undefined}>
                <g className="hero-growth-vines" strokeLinecap="round" strokeLinejoin="round">
                    <path
                        className="hero-growth-path hero-growth-trunk"
                        pathLength="1"
                        d="M700 744C690 690 680 640 695 590C710 540 704 495 690 450C676 405 682 360 700 315C718 270 712 220 695 175C678 130 686 80 700 30"
                    />

                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-lower-left"
                        pathLength="1"
                        d="M695 590C602 566 520 526 445 470C355 402 265 366 175 342"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-lower-left-twig"
                        pathLength="1"
                        d="M445 470C405 442 383 405 370 370"
                    />
                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-lower-right"
                        pathLength="1"
                        d="M695 590C782 568 858 530 922 486C953 464 983 452 1015 448"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-lower-right-twig"
                        pathLength="1"
                        d="M922 486C957 457 978 423 988 388"
                    />

                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-middle-right"
                        pathLength="1"
                        d="M690 450C782 429 857 383 930 330C1008 273 1099 240 1210 222"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-middle-right-twig"
                        pathLength="1"
                        d="M930 330C963 292 982 252 990 210"
                    />
                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-middle-left"
                        pathLength="1"
                        d="M690 450C610 426 544 389 482 344C435 310 389 290 340 278"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-middle-left-twig"
                        pathLength="1"
                        d="M482 344C451 314 432 280 423 244"
                    />

                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-upper-left"
                        pathLength="1"
                        d="M700 315C616 286 550 229 490 165C446 118 397 98 335 90"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-upper-left-twig"
                        pathLength="1"
                        d="M490 165C462 132 439 101 420 72"
                    />
                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-upper-right"
                        pathLength="1"
                        d="M700 315C778 291 842 252 902 207C980 149 1070 119 1180 104"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-upper-right-twig"
                        pathLength="1"
                        d="M902 207C934 178 954 146 964 111"
                    />

                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-top-right"
                        pathLength="1"
                        d="M695 175C774 155 830 133 890 112C958 88 1023 68 1090 54"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-top-right-twig"
                        pathLength="1"
                        d="M890 112C916 88 932 63 940 38"
                    />
                </g>

                <g className="hero-growth-leaves">
                    <g transform="translate(175 342) rotate(-140)"><path className="hero-growth-leaf hero-leaf-lower-left" d={leafShape} /></g>
                    <g transform="translate(370 370) rotate(-82)"><path className="hero-growth-leaf hero-leaf-lower-left-twig" d={leafShape} /></g>
                    <g transform="translate(1015 448) rotate(-18)"><path className="hero-growth-leaf hero-leaf-lower-right" d={leafShape} /></g>
                    <g transform="translate(988 388) rotate(-70)"><path className="hero-growth-leaf hero-leaf-lower-right-twig" d={leafShape} /></g>
                    <g transform="translate(1210 222) rotate(-22)"><path className="hero-growth-leaf hero-leaf-middle-right" d={leafShape} /></g>
                    <g transform="translate(990 210) rotate(-69)"><path className="hero-growth-leaf hero-leaf-middle-right-twig" d={leafShape} /></g>
                    <g transform="translate(340 278) rotate(-151)"><path className="hero-growth-leaf hero-leaf-middle-left" d={leafShape} /></g>
                    <g transform="translate(423 244) rotate(-104)"><path className="hero-growth-leaf hero-leaf-middle-left-twig" d={leafShape} /></g>
                    <g transform="translate(335 90) rotate(-153)"><path className="hero-growth-leaf hero-leaf-upper-left" d={leafShape} /></g>
                    <g transform="translate(420 72) rotate(-96)"><path className="hero-growth-leaf hero-leaf-upper-left-twig" d={leafShape} /></g>
                    <g transform="translate(1180 104) rotate(-22)"><path className="hero-growth-leaf hero-leaf-upper-right" d={leafShape} /></g>
                    <g transform="translate(964 111) rotate(-72)"><path className="hero-growth-leaf hero-leaf-upper-right-twig" d={leafShape} /></g>
                    <g transform="translate(1090 54) rotate(-22)"><path className="hero-growth-leaf hero-leaf-top-right" d={leafShape} /></g>
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
