const leafShape = "M0 0C5-15 20-25 38-23C34-6 20 7 0 0Z";

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
                        d="M695 590C602 566 520 526 445 470C368 413 305 390 245 350"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-lower-left-twig"
                        pathLength="1"
                        d="M445 470C405 442 383 405 370 370"
                    />
                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-lower-right"
                        pathLength="1"
                        d="M695 590C782 568 858 530 922 486C982 445 1037 429 1098 421"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-lower-right-twig"
                        pathLength="1"
                        d="M922 486C957 457 978 423 988 388"
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
                        className="hero-growth-path hero-growth-branch hero-growth-middle-left"
                        pathLength="1"
                        d="M690 450C610 426 544 389 482 344C420 299 357 278 286 264"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-middle-left-twig"
                        pathLength="1"
                        d="M482 344C451 314 432 280 423 244"
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
                        className="hero-growth-path hero-growth-branch hero-growth-upper-right"
                        pathLength="1"
                        d="M700 315C778 291 842 252 902 207C963 162 1028 142 1103 128"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-upper-right-twig"
                        pathLength="1"
                        d="M902 207C934 178 954 146 964 111"
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
                    <g transform="translate(1098 421) rotate(-25)"><path className="hero-growth-leaf hero-leaf-lower-right" d={leafShape} /></g>
                    <g transform="translate(988 388) rotate(-70)"><path className="hero-growth-leaf hero-leaf-lower-right-twig" d={leafShape} /></g>
                    <g transform="translate(1142 242) rotate(-28)"><path className="hero-growth-leaf hero-leaf-middle-right" d={leafShape} /></g>
                    <g transform="translate(990 210) rotate(-69)"><path className="hero-growth-leaf hero-leaf-middle-right-twig" d={leafShape} /></g>
                    <g transform="translate(286 264) rotate(-155)"><path className="hero-growth-leaf hero-leaf-middle-left" d={leafShape} /></g>
                    <g transform="translate(423 244) rotate(-104)"><path className="hero-growth-leaf hero-leaf-middle-left-twig" d={leafShape} /></g>
                    <g transform="translate(258 78) rotate(-158)"><path className="hero-growth-leaf hero-leaf-upper-left" d={leafShape} /></g>
                    <g transform="translate(420 72) rotate(-96)"><path className="hero-growth-leaf hero-leaf-upper-left-twig" d={leafShape} /></g>
                    <g transform="translate(1103 128) rotate(-26)"><path className="hero-growth-leaf hero-leaf-upper-right" d={leafShape} /></g>
                    <g transform="translate(964 111) rotate(-72)"><path className="hero-growth-leaf hero-leaf-upper-right-twig" d={leafShape} /></g>
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
