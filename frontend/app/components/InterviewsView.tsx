"use client";

import { useMemo, useState } from "react";

import {
    getInterviewOutcomeLabel,
    getInterviewTimestamp,
    getInterviewTypeLabel,
    formatInterviewDuration,
    sortInterviewsBySchedule,
} from "../lib/interview-utils";
import { INTERVIEW_OUTCOMES, INTERVIEW_TYPES } from "../lib/constants";
import type { Application, Interview } from "../lib/types";
import { AddInterviewButton } from "./AddInterviewButton";
import { AppIcon } from "./AppIcon";

type InterviewsViewProps = {
    applications: Application[];
    interviews: Interview[];
    onCreateInterview: () => void;
    onRemoveInterview: (id: string) => void;
    onStartEdit: (interview: Interview) => void;
};

type InterviewFilters = {
    query: string;
    type: string;
    outcome: string;
};

const INITIAL_FILTERS: InterviewFilters = {
    query: "",
    type: "",
    outcome: "",
};

function getSearchableInterviewText(interview: Interview) {
    return [
        interview.applicationTitle,
        interview.companyName,
        interview.interviewerName,
        interview.location,
        interview.meetingUrl,
        interview.notes,
        getInterviewTypeLabel(interview.type),
        getInterviewOutcomeLabel(interview.outcome),
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
    return count === 1 ? singular : plural;
}

function getValidInterviewDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatInterviewDateLabel(value: string, includeYear = false) {
    const date = getValidInterviewDate(value);
    if (!date) return "Not set";

    return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        ...(includeYear ? { year: "numeric" } : {}),
    }).format(date);
}

function formatInterviewTimeLabel(value: string) {
    const date = getValidInterviewDate(value);
    if (!date) return "Not set";

    return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

function getCurrentWeekRange(referenceTime: number) {
    const start = new Date(referenceTime);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return {
        startTime: start.getTime(),
        endTime: end.getTime(),
    };
}

function hasInterviewLocation(interview: Interview) {
    return Boolean(interview.location?.trim() || interview.meetingUrl?.trim());
}

function getPrepIssues(interview: Interview) {
    const issues: string[] = [];

    if (!interview.interviewerName?.trim()) issues.push("Missing interviewer");
    if (!hasInterviewLocation(interview)) issues.push("Missing location");

    return issues;
}

export function InterviewsView({
    applications,
    interviews,
    onCreateInterview,
    onRemoveInterview,
    onStartEdit,
}: InterviewsViewProps) {
    const [filters, setFilters] = useState<InterviewFilters>(INITIAL_FILTERS);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [nowTime] = useState(() => Date.now());
    const canCreateInterview = applications.length > 0;

    const filteredInterviews = useMemo(() => {
        const query = filters.query.trim().toLowerCase();

        return interviews.filter((interview) => {
            if (query && !getSearchableInterviewText(interview).includes(query))
                return false;
            if (filters.type && interview.type !== filters.type) return false;
            if (filters.outcome && interview.outcome !== filters.outcome) return false;

            return true;
        });
    }, [filters, interviews]);

    const sortedInterviews = useMemo(
        () => sortInterviewsBySchedule(filteredInterviews, "asc"),
        [filteredInterviews],
    );

    const upcomingInterviews = useMemo(
        () =>
            sortInterviewsBySchedule(
                interviews.filter(
                    (interview) =>
                        interview.outcome === "SCHEDULED" &&
                        getInterviewTimestamp(interview) >= nowTime,
                ),
                "asc",
            ),
        [interviews, nowTime],
    );

    const nextInterview = upcomingInterviews[0] ?? null;

    const upcomingNextSevenDaysCount = useMemo(() => {
        const sevenDaysFromNow = nowTime + 7 * 24 * 60 * 60 * 1000;

        return interviews.filter((interview) => {
            const scheduledTime = getInterviewTimestamp(interview);
            return (
                interview.outcome === "SCHEDULED" &&
                scheduledTime >= nowTime &&
                scheduledTime <= sevenDaysFromNow
            );
        }).length;
    }, [interviews, nowTime]);

    const thisWeekCount = useMemo(() => {
        const { startTime, endTime } = getCurrentWeekRange(nowTime);

        return interviews.filter((interview) => {
            const scheduledTime = getInterviewTimestamp(interview);
            return scheduledTime >= startTime && scheduledTime < endTime;
        }).length;
    }, [interviews, nowTime]);

    const missingDetailsCount = useMemo(
        () =>
            interviews.filter((interview) => getPrepIssues(interview).length > 0)
                .length,
        [interviews],
    );

    const hasActiveFilters = Object.values(filters).some(Boolean);

    return (
        <section className="applications-page interviews-page">
            <header className="applications-header">
                <div>
                    <p>Interviews</p>
                    <h1>All interviews</h1>
                    <span className="interviews-header-meta">
                        {upcomingInterviews.length}{" "}
                        {pluralize(
                            upcomingInterviews.length,
                            "upcoming interview",
                            "upcoming interviews",
                        )}
                        <span aria-hidden="true">&bull;</span>
                        <strong className={missingDetailsCount ? "attention" : ""}>
                            {missingDetailsCount}{" "}
                            {pluralize(
                                missingDetailsCount,
                                "interview missing details",
                                "interviews missing details",
                            )}
                        </strong>
                    </span>
                </div>
                <div className="applications-actions">
                    <AddInterviewButton
                        className="primary"
                        onClick={onCreateInterview}
                        disabled={!canCreateInterview}
                    />
                </div>
            </header>

            <div className="interview-stats-grid" aria-label="Interview summary">
                <article className="interview-stat-card">
                    <span className="interview-stat-icon">
                        <AppIcon name="calendar" size={30} strokeWidth={1.75} />
                    </span>
                    <div>
                        <span>Upcoming</span>
                        <strong>{upcomingNextSevenDaysCount}</strong>
                        <em>Next 7 days</em>
                    </div>
                </article>
                <article className="interview-stat-card purple">
                    <span className="interview-stat-icon">
                        <AppIcon name="calendar" size={30} strokeWidth={1.75} />
                    </span>
                    <div>
                        <span>This week</span>
                        <strong>{thisWeekCount}</strong>
                        <em>Interviews this week</em>
                    </div>
                </article>
                <article className="interview-stat-card orange">
                    <span className="interview-stat-icon">
                        <AppIcon name="warning" size={31} strokeWidth={1.75} />
                    </span>
                    <div>
                        <span>Missing details</span>
                        <strong>{missingDetailsCount}</strong>
                        <em>Need your attention</em>
                    </div>
                </article>
            </div>

            <div
                className="interviews-control-panel"
                aria-label="Interview table filters"
            >
                <label className="interviews-search-field">
                    <AppIcon name="search" size={18} />
                    <input
                        value={filters.query}
                        onChange={(event) =>
                            setFilters({ ...filters, query: event.target.value })
                        }
                        placeholder="Search interviews"
                    />
                </label>
                <label className="interviews-select-field">
                    <span>Type</span>
                    <select
                        value={filters.type}
                        onChange={(event) =>
                            setFilters({ ...filters, type: event.target.value })
                        }
                    >
                        <option value="">All types</option>
                        {INTERVIEW_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {getInterviewTypeLabel(type)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="interviews-select-field">
                    <span>Status</span>
                    <select
                        value={filters.outcome}
                        onChange={(event) =>
                            setFilters({ ...filters, outcome: event.target.value })
                        }
                    >
                        <option value="">All statuses</option>
                        {INTERVIEW_OUTCOMES.map((outcome) => (
                            <option key={outcome} value={outcome}>
                                {getInterviewOutcomeLabel(outcome)}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="button"
                    className="secondary interview-filter-button"
                    aria-label="Show interview filters"
                >
                    <AppIcon name="filter" size={16} />
                    Filters
                </button>
                <button
                    type="button"
                    className="interviews-reset-button"
                    onClick={() => setFilters(INITIAL_FILTERS)}
                    disabled={!hasActiveFilters}
                >
                    <AppIcon name="history" size={15} />
                    Reset
                </button>
            </div>

            <div className="interviews-content-grid">
                <div className="applications-table-panel interviews-table-panel">
                    <div className="interviews-panel-title">
                        <h2>Interviews</h2>
                    </div>

                    {sortedInterviews.length > 0 ? (
                        <>
                            <div className="applications-table-scroll">
                                <table className="applications-table interviews-table">
                                    <thead>
                                        <tr>
                                            <th scope="col">When</th>
                                            <th scope="col">Role</th>
                                            <th scope="col">Stage</th>
                                            <th scope="col">Status</th>
                                            <th scope="col">Prep</th>
                                            <th scope="col" aria-label="Actions" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedInterviews.map((interview) => {
                                            const prepIssues = getPrepIssues(interview);

                                            return (
                                                <tr key={interview.id}>
                                                    <td>
                                                        <div className="interview-when-cell">
                                                            <span className="interview-date-icon">
                                                                <AppIcon
                                                                    name="calendar"
                                                                    size={21}
                                                                />
                                                            </span>
                                                            <span className="interview-when-copy">
                                                                <strong>
                                                                    {formatInterviewDateLabel(
                                                                        interview.scheduledAt,
                                                                    )}
                                                                </strong>
                                                                <span>
                                                                    {formatInterviewTimeLabel(
                                                                        interview.scheduledAt,
                                                                    )}
                                                                </span>
                                                                <span>
                                                                    {formatInterviewDuration(
                                                                        interview.durationMinutes,
                                                                    )}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="interview-role-cell">
                                                            <strong>
                                                                {interview.applicationTitle ??
                                                                    "Unknown role"}
                                                            </strong>
                                                            <span className="company-line">
                                                                {interview.companyName ??
                                                                    "Unknown company"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {getInterviewTypeLabel(
                                                            interview.type,
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`status-pill ${interview.outcome.toLowerCase()}`}
                                                        >
                                                            {getInterviewOutcomeLabel(
                                                                interview.outcome,
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="prep-list">
                                                            {prepIssues.length > 0 ? (
                                                                <>
                                                                    {prepIssues.map((issue) => (
                                                                        <span
                                                                            className="prep-warning"
                                                                            key={issue}
                                                                        >
                                                                            <AppIcon
                                                                                name="warning"
                                                                                size={16}
                                                                            />
                                                                            {issue}
                                                                        </span>
                                                                    ))}
                                                                    <button
                                                                        type="button"
                                                                        className="prep-action"
                                                                        onClick={() =>
                                                                            onStartEdit(interview)
                                                                        }
                                                                    >
                                                                        Add details
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span className="prep-ready">
                                                                    <AppIcon
                                                                        name="check"
                                                                        size={16}
                                                                    />
                                                                    Ready
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="interview-actions-cell">
                                                        <div
                                                            className="interview-row-menu"
                                                            onBlur={(event) => {
                                                                if (
                                                                    !event.currentTarget.contains(
                                                                        event.relatedTarget as Node | null,
                                                                    )
                                                                ) {
                                                                    setOpenMenuId(null);
                                                                }
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                className="interview-menu-trigger"
                                                                aria-haspopup="menu"
                                                                aria-expanded={
                                                                    openMenuId === interview.id
                                                                }
                                                                onClick={() =>
                                                                    setOpenMenuId((current) =>
                                                                        current === interview.id
                                                                            ? null
                                                                            : interview.id,
                                                                    )
                                                                }
                                                            >
                                                                <AppIcon
                                                                    name="dots-vertical"
                                                                    size={18}
                                                                />
                                                            </button>
                                                            {openMenuId === interview.id && (
                                                                <div
                                                                    className="interview-menu"
                                                                    role="menu"
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        onClick={() => {
                                                                            setOpenMenuId(null);
                                                                            onStartEdit(interview);
                                                                        }}
                                                                    >
                                                                        <AppIcon
                                                                            name="edit"
                                                                            size={14}
                                                                        />
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        onClick={() => {
                                                                            setOpenMenuId(null);
                                                                            onRemoveInterview(
                                                                                interview.id,
                                                                            );
                                                                        }}
                                                                    >
                                                                        <AppIcon
                                                                            name="trash"
                                                                            size={14}
                                                                        />
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="interviews-table-footer">
                                <span>
                                    Showing {sortedInterviews.length} of{" "}
                                    {interviews.length}{" "}
                                    {pluralize(interviews.length, "interview")}
                                </span>
                                <div
                                    className="interviews-pagination"
                                    aria-label="Interview pagination"
                                >
                                    <button type="button" disabled aria-label="Previous page">
                                        <AppIcon name="arrow-left" size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        className="active"
                                        aria-current="page"
                                    >
                                        1
                                    </button>
                                    <button type="button" disabled aria-label="Next page">
                                        <AppIcon name="arrow-right" size={16} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="applications-empty interviews-empty">
                            <span className="empty-illustration">
                                <AppIcon name="calendar" size={31} />
                            </span>
                            <h2>
                                {interviews.length === 0
                                    ? "No interviews scheduled"
                                    : "No interviews match these filters"}
                            </h2>
                            <p>
                                {interviews.length === 0
                                    ? "Schedule interviews from an application to track next steps."
                                    : "Clear filters or adjust the search terms to expand the table."}
                            </p>
                            <AddInterviewButton
                                className="secondary"
                                onClick={onCreateInterview}
                                disabled={!canCreateInterview}
                            />
                        </div>
                    )}
                </div>

                <aside className="next-interview-card" aria-label="Next interview">
                    <div className="next-interview-header">
                        <h2>Next interview</h2>
                        <span>
                            <AppIcon name="calendar" size={21} />
                        </span>
                    </div>
                    {nextInterview ? (
                        <div className="next-interview-body">
                            <div>
                                <h3>
                                    {nextInterview.applicationTitle ?? "Unknown role"}
                                </h3>
                                <span className="company-line">
                                    {nextInterview.companyName ?? "Unknown company"}
                                </span>
                            </div>

                            <div className="next-detail-list">
                                <span>
                                    <AppIcon name="calendar" size={17} />
                                    {formatInterviewDateLabel(
                                        nextInterview.scheduledAt,
                                        true,
                                    )}
                                </span>
                                <span>
                                    <AppIcon name="clock" size={17} />
                                    {formatInterviewTimeLabel(nextInterview.scheduledAt)} (
                                    {formatInterviewDuration(
                                        nextInterview.durationMinutes,
                                    )}
                                    )
                                </span>
                                <span
                                    className={
                                        nextInterview.interviewerName
                                            ? undefined
                                            : "attention"
                                    }
                                >
                                    <AppIcon name="account" size={17} />
                                    {nextInterview.interviewerName ?? "Add interviewer"}
                                </span>
                                <span
                                    className={
                                        hasInterviewLocation(nextInterview)
                                            ? undefined
                                            : "attention"
                                    }
                                >
                                    <AppIcon name="location" size={17} />
                                    {nextInterview.location ??
                                        (nextInterview.meetingUrl
                                            ? "Meeting link added"
                                            : "Add meeting location")}
                                </span>
                            </div>

                            <div className="next-actions">
                                <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => onStartEdit(nextInterview)}
                                >
                                    Open details
                                    <AppIcon name="external-link" size={15} />
                                </button>
                                <button
                                    type="button"
                                    className="primary"
                                    onClick={() => onStartEdit(nextInterview)}
                                >
                                    <AppIcon name="edit" size={17} />
                                    Prepare
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="next-interview-empty">
                            <span className="empty-illustration">
                                <AppIcon name="calendar" size={31} />
                            </span>
                            <h3>No upcoming interviews</h3>
                            <p>Schedule the next conversation to keep prep visible.</p>
                        </div>
                    )}
                </aside>
            </div>
        </section>
    );
}
