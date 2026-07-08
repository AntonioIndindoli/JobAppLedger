"use client";

import {
    formatInterviewDateTime,
    getInterviewTypeLabel,
} from "../../lib/interview-utils";
import type { Interview } from "../../lib/types";
import { AppIcon } from "../AppIcon";

type DashboardCardsProps = {
    upcomingInterviews: Interview[];
    onCreateInterview: () => void;
    onImportOpen: () => void;
    onViewInterviews: () => void;
};

export function DashboardCards({
    upcomingInterviews,
    onCreateInterview,
    onImportOpen,
    onViewInterviews,
}: DashboardCardsProps) {
    const visibleInterviews = upcomingInterviews.slice(0, 3);

    return (
        <section className="mini-grid">
            <div
                className={
                    visibleInterviews.length
                        ? "panel empty-card upcoming-card"
                        : "panel empty-card"
                }
            >
                <h2>
                    <span>
                        <span className="heading-icon">
                            <AppIcon name="calendar" size={16} />
                        </span>
                        Upcoming Interviews
                    </span>
                    <button
                        type="button"
                        className="card-link"
                        onClick={onViewInterviews}
                    >
                        View all
                    </button>
                </h2>
                {visibleInterviews.length ? (
                    <div className="interview-card-list">
                        {visibleInterviews.map((interview) => (
                            <article key={interview.id} className="interview-card-item">
                                <strong>
                                    {interview.applicationTitle ?? "Unknown role"}
                                </strong>
                                <span>
                                    {interview.companyName ?? "Unknown company"}
                                </span>
                                <small>
                                    <AppIcon name="clock" size={13} />
                                    {formatInterviewDateTime(interview.scheduledAt)}
                                </small>
                                <em>{getInterviewTypeLabel(interview.type)}</em>
                            </article>
                        ))}
                        <button
                            type="button"
                            className="secondary small"
                            onClick={onCreateInterview}
                        >
                            <AppIcon name="calendar" size={15} />
                            Add Interview
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="empty-illustration">
                            <AppIcon name="calendar" size={38} strokeWidth={1.5} />
                        </div>
                        <h3>No interviews scheduled yet</h3>
                        <p>When you schedule interviews, they&apos;ll appear here.</p>
                        <button
                            type="button"
                            className="secondary small"
                            onClick={onCreateInterview}
                        >
                            <AppIcon name="calendar" size={15} />
                            Add Interview
                        </button>
                    </>
                )}
            </div>
            <div className="panel empty-card">
                <h2>
                    <span>
                        <span className="heading-icon">
                            <AppIcon name="checklist" size={16} />
                        </span>
                        Tasks & Follow-Ups
                    </span>
                    <button type="button" className="card-link">
                        View all
                    </button>
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
                    <button type="button" className="card-link">
                        View all
                    </button>
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
