"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { NAV_ITEMS } from "../lib/constants";
import type { DashboardView } from "../lib/types";
import { AppIcon } from "./AppIcon";

type DashboardShellProps = {
    children: ReactNode;
    currentView: DashboardView;
    firstName: string;
    isProfileMenuOpen: boolean;
    onCurrentViewChange: (view: DashboardView) => void;
    onImportOpen: () => void;
    onProfileMenuChange: (isOpen: boolean | ((isOpen: boolean) => boolean)) => void;
    onSignOut: () => void;
};

export function DashboardShell({
    children,
    currentView,
    firstName,
    isProfileMenuOpen,
    onCurrentViewChange,
    onImportOpen,
    onProfileMenuChange,
    onSignOut,
}: DashboardShellProps) {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const mobileNavToggleRef = useRef<HTMLButtonElement>(null);
    const mobileNavCloseRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isMobileNavOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        mobileNavCloseRef.current?.focus();

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsMobileNavOpen(false);
                mobileNavToggleRef.current?.focus();
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isMobileNavOpen]);

    useEffect(() => {
        const desktopQuery = window.matchMedia("(min-width: 701px)");

        function closeNavOnDesktop(event: MediaQueryListEvent) {
            if (event.matches) setIsMobileNavOpen(false);
        }

        desktopQuery.addEventListener("change", closeNavOnDesktop);
        return () => desktopQuery.removeEventListener("change", closeNavOnDesktop);
    }, []);

    function closeMobileNav({ restoreFocus = false } = {}) {
        setIsMobileNavOpen(false);
        if (restoreFocus) mobileNavToggleRef.current?.focus();
    }

    function getNavItemView(label: string): DashboardView | null {
        if (label === "Dashboard") return "dashboard";
        if (label === "Applications") return "applications";
        if (label === "Analytics") return "analytics";
        if (label === "Interviews") return "interviews";
        if (label === "Tasks") return "tasks";
        return null;
    }

    return (
        <div className="dashboard-shell">
            <button
                type="button"
                className={isMobileNavOpen ? "sidebar-backdrop open" : "sidebar-backdrop"}
                aria-label="Close navigation menu"
                tabIndex={isMobileNavOpen ? 0 : -1}
                onClick={() => closeMobileNav({ restoreFocus: true })}
            />
            <aside
                id="primary-navigation"
                className={isMobileNavOpen ? "sidebar mobile-open" : "sidebar"}
                aria-label="Primary navigation"
            >
                <div className="brand">
                    <span className="brand-mark">
                        <AppIcon name="ledger" size={19} strokeWidth={1.9} />
                    </span>
                    <strong>JobAppLedger</strong>
                    <button
                        ref={mobileNavCloseRef}
                        type="button"
                        className="mobile-sidebar-close"
                        aria-label="Close navigation menu"
                        onClick={() => closeMobileNav({ restoreFocus: true })}
                    >
                        <AppIcon name="x" size={21} />
                    </button>
                </div>
                {NAV_ITEMS.map((item) => {
                    const view = getNavItemView(item.label);

                    return (
                        <button
                            key={item.label}
                            type="button"
                            className={
                                view && currentView === view
                                    ? "nav-item active"
                                    : "nav-item"
                            }
                            onClick={() => {
                                if (view) onCurrentViewChange(view);
                                if (item.label === "Import Job") onImportOpen();
                                closeMobileNav();
                            }}
                        >
                            <AppIcon name={item.icon} size={18} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </aside>
            <main className="dashboard-main">
                <header className="topbar">
                    <button
                        ref={mobileNavToggleRef}
                        type="button"
                        className="mobile-nav-toggle"
                        aria-label="Open navigation menu"
                        aria-controls="primary-navigation"
                        aria-expanded={isMobileNavOpen}
                        onClick={() => setIsMobileNavOpen(true)}
                    >
                        <AppIcon name="menu" size={23} />
                    </button>
                    <div className="search">
                        <AppIcon name="search" size={18} />
                        <span>Search jobs, companies, contacts...</span>
                    </div>
                    <div
                        className="profile"
                        onBlur={(event) => {
                            if (
                                !event.currentTarget.contains(
                                    event.relatedTarget as Node | null,
                                )
                            )
                                onProfileMenuChange(false);
                        }}
                    >
                        <span className="bell">
                            <AppIcon name="bell" size={21} />
                            <b>2</b>
                        </span>
                        <button
                            type="button"
                            className="profile-trigger"
                            aria-haspopup="menu"
                            aria-expanded={isProfileMenuOpen}
                            onClick={() => onProfileMenuChange((open) => !open)}
                        >
                            <span className="avatar">
                                <AppIcon name="account" size={21} />
                            </span>
                            <strong>{firstName}</strong>
                            <AppIcon name="chevron-down" size={16} />
                        </button>
                        {isProfileMenuOpen && (
                            <div className="profile-menu" role="menu">
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        onCurrentViewChange("account");
                                        onProfileMenuChange(false);
                                    }}
                                >
                                    <AppIcon name="account" size={16} />
                                    View account
                                </button>
                                <button type="button" role="menuitem" onClick={onSignOut}>
                                    <AppIcon name="logout" size={16} />
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </header>
                {children}
            </main>
        </div>
    );
}
