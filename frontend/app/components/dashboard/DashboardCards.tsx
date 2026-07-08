"use client";

import { AppIcon } from "../AppIcon";

type DashboardCardsProps = {
    onImportOpen: () => void;
};

export function DashboardCards({ onImportOpen }: DashboardCardsProps) {
    return (
        <section className="mini-grid">
            <div className="panel empty-card">
                <h2>
                    <span>
                        <span className="heading-icon">
                            <AppIcon name="calendar" size={16} />
                        </span>
                        Upcoming Interviews
                    </span>
                    <a>View all</a>
                </h2>
                <div className="empty-illustration">
                    <AppIcon name="calendar" size={38} strokeWidth={1.5} />
                </div>
                <h3>No interviews scheduled yet</h3>
                <p>When you schedule interviews, they&apos;ll appear here.</p>
                <button className="secondary small">
                    <AppIcon name="calendar" size={15} />
                    Add Interview
                </button>
            </div>
            <div className="panel empty-card">
                <h2>
                    <span>
                        <span className="heading-icon">
                            <AppIcon name="checklist" size={16} />
                        </span>
                        Tasks & Follow-Ups
                    </span>
                    <a>View all</a>
                </h2>
                <div className="empty-illustration">
                    <AppIcon name="checklist" size={38} strokeWidth={1.5} />
                </div>
                <h3>No tasks yet</h3>
                <p>Create follow-up tasks and never miss a beat.</p>
                <button className="secondary small">
                    <AppIcon name="plus" size={15} />
                    Create Task
                </button>
            </div>
            <div className="panel empty-card">
                <h2>
                    <span>
                        <span className="heading-icon">
                            <AppIcon name="import" size={16} />
                        </span>
                        Recent Imports
                    </span>
                    <a>View all</a>
                </h2>
                <div className="empty-illustration">
                    <AppIcon name="document" size={38} strokeWidth={1.5} />
                </div>
                <h3>No imports yet</h3>
                <p>
                    Import jobs from LinkedIn, Indeed, Greenhouse, Lever, Workday, and
                    more.
                </p>
                <button className="secondary small" onClick={onImportOpen}>
                    <AppIcon name="import" size={15} />
                    Import Job
                </button>
            </div>
        </section>
    );
}
