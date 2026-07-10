"use client";

import type { ReactNode } from "react";

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
            <aside className="sidebar">
                <div className="brand">
                    <span className="brand-mark">
                        <AppIcon name="ledger" size={19} strokeWidth={1.9} />
                    </span>
                    <strong>JobAppLedger</strong>
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
                    <div className="search">
                        <AppIcon name="search" size={18} />
                        <span>Search jobs, companies, contacts...</span>
                        <kbd>Ctrl K</kbd>
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
