"use client";

import Image from "next/image";
import { useEffect, useRef, type ComponentProps, type PointerEvent } from "react";

import type { AuthStatus, Mode } from "../lib/types";
import { AppIcon } from "./AppIcon";
import { AuthPanel } from "./AuthPanel";
import { GrowingBranches } from "./GrowingBranches";

type LandingPageProps = {
    authStatus: AuthStatus;
    email: string;
    isAuthOpen: boolean;
    message: string;
    mode: Mode;
    password: string;
    onAuthClose: () => void;
    onAuthOpen: (mode: Mode) => void;
    onEmailChange: (email: string) => void;
    onModeChange: (mode: Mode) => void;
    onPasswordChange: (password: string) => void;
    onSubmit: ComponentProps<typeof AuthPanel>["onSubmit"];
};

const features = [
    {
        icon: "applications" as const,
        title: "One clear pipeline",
        description:
            "Keep every role, company, status, and deadline organized in one calm workspace.",
    },
    {
        icon: "analytics" as const,
        title: "See what is working",
        description:
            "Understand your momentum, strongest sources, and conversion rate without a spreadsheet.",
    },
    {
        icon: "checklist" as const,
        title: "Never miss a follow-up",
        description:
            "Turn interviews and applications into timely tasks so the right next step is always visible.",
    },
];

export function LandingPage({
    authStatus,
    email,
    isAuthOpen,
    message,
    mode,
    password,
    onAuthClose,
    onAuthOpen,
    onEmailChange,
    onModeChange,
    onPasswordChange,
    onSubmit,
}: LandingPageProps) {
    const pageRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const page = pageRef.current;
        if (!page) return;

        const revealItems = Array.from(page.querySelectorAll<HTMLElement>("[data-reveal]"));
        page.classList.add("landing-motion-ready");

        if (!("IntersectionObserver" in window)) {
            revealItems.forEach((item) => item.classList.add("is-visible"));
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            },
            { threshold: 0.16 },
        );

        revealItems.forEach((item) => observer.observe(item));
        return () => observer.disconnect();
    }, []);

    function movePreview(event: PointerEvent<HTMLDivElement>) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        event.currentTarget.style.setProperty("--preview-x", `${x * 9}px`);
        event.currentTarget.style.setProperty("--preview-y", `${y * 7}px`);
        event.currentTarget.style.setProperty("--preview-rotate-x", `${y * -1.4}deg`);
        event.currentTarget.style.setProperty("--preview-rotate-y", `${x * 1.8 - 4}deg`);
    }

    function resetPreview(event: PointerEvent<HTMLDivElement>) {
        event.currentTarget.style.removeProperty("--preview-x");
        event.currentTarget.style.removeProperty("--preview-y");
        event.currentTarget.style.removeProperty("--preview-rotate-x");
        event.currentTarget.style.removeProperty("--preview-rotate-y");
    }

    return (
        <main className="landing-page" ref={pageRef}>
            <header className="landing-nav" aria-label="Primary navigation">
                <a className="landing-brand" href="#top" aria-label="JobHazel home">
                    <Image src="/JobHazelIcon.png" alt="" width={38} height={38} priority />
                    <span>JobHazel</span>
                </a>

                <nav className="landing-nav-links" aria-label="Landing page">

                </nav>

                <div className="landing-nav-actions">
                    <button type="button" className="landing-text-button" onClick={() => onAuthOpen("login")}>
                        Sign in
                    </button>
                    <button type="button" className="landing-button landing-button-small" onClick={() => onAuthOpen("signup")}>
                        Get started
                    </button>
                </div>
            </header>

            <section className="landing-hero" id="top">
                <GrowingBranches />
                <div className="landing-hero-copy landing-hero-entrance">
                    <h1>
                        Less tracking. More <span>growing.</span>
                    </h1>
                    <p>
                        JobHazel brings applications, interviews, contacts, and follow-ups together so you can focus on landing the right role.
                    </p>
                    <div className="landing-hero-actions">
                        <button type="button" className="landing-button" onClick={() => onAuthOpen("signup")}>
                            Start tracking for free
                            <AppIcon name="arrow-right" size={18} />
                        </button>
                        <a className="landing-secondary-button" href="#how-it-works">
                            See how it works
                        </a>
                    </div>
                    <div className="landing-proof">
                        <span><AppIcon name="check" size={15} /> Free to get started</span>
                        <span><AppIcon name="check" size={15} /> No credit card</span>
                    </div>
                </div>

                <div
                    className="landing-product-wrap"
                    aria-label="Preview of the JobHazel dashboard"
                    onPointerMove={movePreview}
                    onPointerLeave={resetPreview}
                >
                    <div className="landing-product">
                        <div className="landing-product-sidebar">
                            <div className="landing-product-logo">
                                <Image src="/JobHazelIcon.png" alt="" width={25} height={25} />
                                <span>JobHazel</span>
                            </div>
                            {[
                                ["dashboard", "Dashboard"],
                                ["applications", "Applications"],
                                ["calendar", "Interviews"],
                                ["checklist", "Tasks"],
                                ["contacts", "Contacts"],
                            ].map(([icon, label], index) => (
                                <div className={`landing-product-nav ${index === 0 ? "active" : ""}`} key={label}>
                                    <AppIcon name={icon as "dashboard"} size={13} />
                                    <span>{label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="landing-product-main">
                            <div className="landing-product-heading">
                                <div>
                                    <span>Good morning, Alex</span>
                                    <strong>Here&apos;s your job search at a glance.</strong>
                                </div>
                                <div className="landing-product-avatar">A</div>
                            </div>
                            <div className="landing-product-stats">
                                <div><span>Active pipeline</span><strong>18</strong><small>+3 this week</small></div>
                                <div><span>Interviews</span><strong>4</strong><small>2 upcoming</small></div>
                                <div><span>Response rate</span><strong>32%</strong><small>+5% this month</small></div>
                            </div>
                            <div className="landing-product-grid">
                                <div className="landing-chart-card">
                                    <div className="landing-card-label"><strong>Application activity</strong><span>Last 6 weeks</span></div>
                                    <div className="landing-chart" aria-hidden="true">
                                        {[38, 57, 46, 72, 62, 88, 76].map((height, index) => (
                                            <span key={index} style={{ height: `${height}%` }} />
                                        ))}
                                    </div>
                                </div>
                                <div className="landing-next-card">
                                    <div className="landing-card-label"><strong>Up next</strong><span>View all</span></div>
                                    <div className="landing-next-item">
                                        <span className="landing-date"><b>14</b>SEP</span>
                                        <span><strong>Product interview</strong><small>Northstar Labs · 10:30 AM</small></span>
                                    </div>
                                    <div className="landing-next-item">
                                        <span className="landing-date teal"><b>16</b>SEP</span>
                                        <span><strong>Follow up</strong><small>Brightside · Tomorrow</small></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="landing-float-card landing-float-interview">
                        <span className="landing-float-icon"><AppIcon name="calendar" size={18} /></span>
                        <span><small>Next interview</small><strong>Tomorrow, 10:30 AM</strong></span>
                    </div>
                    <div className="landing-float-card landing-float-progress">
                        <span className="landing-ring"><b>72%</b></span>
                        <span><small>Weekly goal</small><strong>Great momentum!</strong></span>
                    </div>
                </div>
            </section>

            <section className="landing-feature-section" id="features">
                <div className="landing-section-heading" data-reveal>
                    <span>Everything in one place</span>
                    <h2>A smarter home for your job search</h2>
                    <p>Built to reduce busywork and help you take the next best action.</p>
                </div>
                <div className="landing-feature-grid">
                    {features.map((feature) => (
                        <article className="landing-feature-card" data-reveal key={feature.title}>
                            <div className="landing-feature-icon"><AppIcon name={feature.icon} size={24} /></div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="landing-steps-section" id="how-it-works">
                <div className="landing-steps-copy" data-reveal>
                    <span>Simple by design</span>
                    <h2>From saved role to signed offer.</h2>
                    <p>Your entire search stays clear, current, and ready for whatever comes next.</p>
                    <button type="button" className="landing-button" onClick={() => onAuthOpen("signup")}>
                        Build your pipeline <AppIcon name="arrow-right" size={18} />
                    </button>
                </div>
                <ol className="landing-steps">
                    <li data-reveal><b>01</b><span><strong>Capture every opportunity</strong><small>Add a role manually or import the job details.</small></span></li>
                    <li data-reveal><b>02</b><span><strong>Move through your pipeline</strong><small>Track each stage from saved to offer.</small></span></li>
                    <li data-reveal><b>03</b><span><strong>Follow through with confidence</strong><small>Keep interviews, contacts, and tasks connected.</small></span></li>
                </ol>
            </section>

            <section className="landing-cta" data-reveal>
                <Image src="/JobHazelIcon.png" alt="" width={52} height={52} />
                <h2>Your next opportunity deserves a clear plan.</h2>
                <p>Start building a job search that feels focused, not frantic.</p>
                <button type="button" className="landing-button landing-button-light" onClick={() => onAuthOpen("signup")}>
                    Get started for free <AppIcon name="arrow-right" size={18} />
                </button>
            </section>

            <footer className="landing-footer">
                <a className="landing-brand" href="#top">
                    <Image src="/JobHazelIcon.png" alt="" width={30} height={30} />
                    <span>JobHazel</span>
                </a>
                <p>Keep your search moving.</p>
                <span>© {new Date().getFullYear()} JobHazel</span>
            </footer>

            {isAuthOpen && (
                <AuthPanel
                    mode={mode}
                    email={email}
                    password={password}
                    authStatus={authStatus}
                    message={message}
                    onClose={onAuthClose}
                    onModeChange={onModeChange}
                    onEmailChange={onEmailChange}
                    onPasswordChange={onPasswordChange}
                    onSubmit={onSubmit}
                />
            )}
        </main>
    );
}
