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
                <g className={`hero-growth-canopy hero-growth-canopy--${position}`}>
                <g className="hero-growth-vines" strokeLinecap="round" strokeLinejoin="round">
                    <path
                        className="hero-growth-path hero-growth-trunk"
                        pathLength="1"
                        d="M700 744C690 690 680 640 695 590C710 540 704 495 690 450C676 405 682 360 700 315C718 270 712 220 695 175C678 130 686 80 700 30"
                    />

                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-lower-left"
                        pathLength="1"
                        d="M695 590C630 573 575 540 530 500C485 460 445 435 400 415"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-lower-left-twig"
                        pathLength="1"
                        d="M530 500C513 483 503 466 500 450"
                    />
                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-lower-right"
                        pathLength="1"
                        d="M695 590C735 580 765 565 790 550C820 532 845 524 870 520"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-lower-right-twig"
                        pathLength="1"
                        d="M790 550C800 536 807 523 810 510"
                    />
                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-lower-middle-right"
                        pathLength="1"
                        d="M703.4 518.1C748 510 791 495 830 480C873 462 911 441 950 430"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-lower-middle-right-twig"
                        pathLength="1"
                        d="M830 480C841 466 848 450 850 435"
                    />

                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-middle-right"
                        pathLength="1"
                        d="M690 450C760 430 820 395 870 355C925 315 975 288 1030 270"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-middle-right-twig"
                        pathLength="1"
                        d="M870 355C885 338 896 319 900 300"
                    />
                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-middle-left"
                        pathLength="1"
                        d="M690 450C660 440 638 430 620 418C598 405 579 396 560 390"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-middle-left-twig"
                        pathLength="1"
                        d="M620 418C609 404 602 389 600 375"
                    />
                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-middle-lower-left"
                        pathLength="1"
                        d="M683 382.5C646 372 608 356 570 340C529 322 493 302 460 290"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-middle-lower-left-twig"
                        pathLength="1"
                        d="M570 340C560 325 553 310 550 295"
                    />

                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-upper-left"
                        pathLength="1"
                        d="M700 315C646 295 596 263 560 230C519 191 482 160 445 145"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-upper-left-twig"
                        pathLength="1"
                        d="M560 230C547 215 539 200 535 185"
                    />
                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-upper-right"
                        pathLength="1"
                        d="M700 315C738 305 765 290 790 275C824 255 855 242 885 235"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-upper-right-twig"
                        pathLength="1"
                        d="M790 275C800 261 807 245 810 230"
                    />
                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-upper-middle-right"
                        pathLength="1"
                        d="M710.6 245C736 237 762 226 785 215C811 201 833 188 850 180"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-upper-middle-right-twig"
                        pathLength="1"
                        d="M785 215C793 202 798 188 800 175"
                    />

                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-top-right"
                        pathLength="1"
                        d="M695 175C725 168 744 148 760 122C780 91 814 76 850 72"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-top-right-twig"
                        pathLength="1"
                        d="M760 122C770 111 777 98 780 88"
                    />
                    <path
                        className="hero-growth-path hero-growth-branch hero-growth-top-left"
                        pathLength="1"
                        d="M685.9 104.4C655 102 635 90 620 72C600 49 573 42 540 44"
                    />
                    <path
                        className="hero-growth-path hero-growth-twig hero-growth-top-left-twig"
                        pathLength="1"
                        d="M620 72C614 61 611 49 610 38"
                    />
                </g>

                <g className="hero-growth-leaves">
                    <g transform="translate(400 415) rotate(-135)"><path className="hero-growth-leaf hero-leaf-lower-left" d={leafShape} /></g>
                    <g transform="translate(500 450) rotate(-82)"><path className="hero-growth-leaf hero-leaf-lower-left-twig" d={leafShape} /></g>
                    <g transform="translate(870 520) rotate(-22)"><path className="hero-growth-leaf hero-leaf-lower-right" d={leafShape} /></g>
                    <g transform="translate(810 510) rotate(-68)"><path className="hero-growth-leaf hero-leaf-lower-right-twig" d={leafShape} /></g>
                    <g transform="translate(950 430) rotate(-25)"><path className="hero-growth-leaf hero-leaf-lower-middle-right" d={leafShape} /></g>
                    <g transform="translate(850 435) rotate(-70)"><path className="hero-growth-leaf hero-leaf-lower-middle-right-twig" d={leafShape} /></g>
                    <g transform="translate(1030 270) rotate(-27)"><path className="hero-growth-leaf hero-leaf-middle-right" d={leafShape} /></g>
                    <g transform="translate(900 300) rotate(-69)"><path className="hero-growth-leaf hero-leaf-middle-right-twig" d={leafShape} /></g>
                    <g transform="translate(560 390) rotate(-150)"><path className="hero-growth-leaf hero-leaf-middle-left" d={leafShape} /></g>
                    <g transform="translate(600 375) rotate(-104)"><path className="hero-growth-leaf hero-leaf-middle-left-twig" d={leafShape} /></g>
                    <g transform="translate(460 290) rotate(-150)"><path className="hero-growth-leaf hero-leaf-middle-lower-left" d={leafShape} /></g>
                    <g transform="translate(550 295) rotate(-101)"><path className="hero-growth-leaf hero-leaf-middle-lower-left-twig" d={leafShape} /></g>
                    <g transform="translate(445 145) rotate(-150)"><path className="hero-growth-leaf hero-leaf-upper-left" d={leafShape} /></g>
                    <g transform="translate(535 185) rotate(-100)"><path className="hero-growth-leaf hero-leaf-upper-left-twig" d={leafShape} /></g>
                    <g transform="translate(885 235) rotate(-25)"><path className="hero-growth-leaf hero-leaf-upper-right" d={leafShape} /></g>
                    <g transform="translate(810 230) rotate(-70)"><path className="hero-growth-leaf hero-leaf-upper-right-twig" d={leafShape} /></g>
                    <g transform="translate(850 180) rotate(-28)"><path className="hero-growth-leaf hero-leaf-upper-middle-right" d={leafShape} /></g>
                    <g transform="translate(800 175) rotate(-72)"><path className="hero-growth-leaf hero-leaf-upper-middle-right-twig" d={leafShape} /></g>
                    <g transform="translate(850 72) rotate(-35)"><path className="hero-growth-leaf hero-leaf-top-right" d={leafShape} /></g>
                    <g transform="translate(780 88) rotate(-72)"><path className="hero-growth-leaf hero-leaf-top-right-twig" d={leafShape} /></g>
                    <g transform="translate(540 44) rotate(-168)"><path className="hero-growth-leaf hero-leaf-top-left" d={leafShape} /></g>
                    <g transform="translate(610 38) rotate(-98)"><path className="hero-growth-leaf hero-leaf-top-left-twig" d={leafShape} /></g>
                    <g transform="translate(700 30) rotate(-76)"><path className="hero-growth-leaf hero-leaf-crown" d={leafShape} /></g>
                </g>
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
