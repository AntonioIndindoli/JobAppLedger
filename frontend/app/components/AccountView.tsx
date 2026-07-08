"use client";

import { AppIcon } from "./AppIcon";

type AccountViewProps = {
    activePipeline: number;
    applicationCount: number;
    email: string;
    firstName: string;
    onReturnToDashboard: () => void;
    onSignOut: () => void;
};

export function AccountView({
    activePipeline,
    applicationCount,
    email,
    firstName,
    onReturnToDashboard,
    onSignOut,
}: AccountViewProps) {
    return (
        <section className="account-page">
            <div className="account-card">
                <div className="account-avatar">
                    <AppIcon name="account" size={38} strokeWidth={1.55} />
                </div>
                <div>
                    <p>Account</p>
                    <h1>{firstName}</h1>
                    <span>{email}</span>
                </div>
            </div>
            <div className="account-grid">
                <article>
                    <span className="account-stat-icon">
                        <AppIcon name="account" size={19} />
                    </span>
                    <span>Email address</span>
                    <strong>{email}</strong>
                </article>
                <article>
                    <span className="account-stat-icon">
                        <AppIcon name="applications" size={19} />
                    </span>
                    <span>Applications tracked</span>
                    <strong>{applicationCount}</strong>
                </article>
                <article>
                    <span className="account-stat-icon">
                        <AppIcon name="pipeline" size={19} />
                    </span>
                    <span>Active pipeline</span>
                    <strong>{activePipeline}</strong>
                </article>
            </div>
            <div className="account-actions">
                <button type="button" className="primary" onClick={onReturnToDashboard}>
                    <AppIcon name="arrow-left" size={17} />
                    Return to dashboard
                </button>
                <button type="button" className="danger" onClick={onSignOut}>
                    <AppIcon name="logout" size={17} />
                    Sign out
                </button>
            </div>
        </section>
    );
}
