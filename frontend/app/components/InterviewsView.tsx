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

type SortKey = "scheduledAt" | "applicationTitle" | "companyName" | "type" | "outcome";
type SortDirection = "asc" | "desc";

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

function getInterviewLocationLabel(interview: Interview) {
    const location = interview.location?.trim();
    if (location) return location;
    if (interview.meetingUrl?.trim()) return "Meeting link saved";
    return "Not set";
}

function getPrepIssues(interview: Interview) {
    const issues: string[] = [];

    if (!interview.interviewerName?.trim()) issues.push("Missing interviewer");
    if (!hasInterviewLocation(interview)) issues.push("Missing location");

    return issues;
}

function getSortValue(interview: Interview, sortKey: SortKey) {
    if (sortKey === "scheduledAt") return getInterviewTimestamp(interview);
    if (sortKey === "type") return getInterviewTypeLabel(interview.type).toLowerCase();
    if (sortKey === "outcome")
        return getInterviewOutcomeLabel(interview.outcome).toLowerCase();

    return (interview[sortKey] ?? "").toString().toLowerCase();
}

export function InterviewsView({
    applications,
    interviews,
    onCreateInterview,
    onRemoveInterview,
    onStartEdit,
}: InterviewsViewProps) {
    const [filters, setFilters] = useState<InterviewFilters>(INITIAL_FILTERS);
    const [sortKey, setSortKey] = useState<SortKey>("scheduledAt");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(
        null,
    );
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

    const sortedInterviews = useMemo(() => {
        return [...filteredInterviews].sort((left, right) => {
            const leftValue = getSortValue(left, sortKey);
            const rightValue = getSortValue(right, sortKey);
            const directionMultiplier = sortDirection === "asc" ? 1 : -1;

            if (typeof leftValue === "number" && typeof rightValue === "number") {
                return (leftValue - rightValue) * directionMultiplier;
            }

            return String(leftValue).localeCompare(String(rightValue)) * directionMultiplier;
        });
    }, [filteredInterviews, sortDirection, sortKey]);

    const selectedInterview =
        sortedInterviews.find((interview) => interview.id === selectedInterviewId) ??
        sortedInterviews[0] ??
        null;
    const selectedPrepIssues = selectedInterview
        ? getPrepIssues(selectedInterview)
        : [];

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

    function updateSort(nextSortKey: SortKey) {
        if (nextSortKey === sortKey) {
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
            return;
        }

        setSortKey(nextSortKey);
        setSortDirection("asc");
    }

    function renderSortButton(label: string, nextSortKey: SortKey) {
        const isActive = sortKey === nextSortKey;

        return (
            <button
                type="button"
                className={isActive ? "table-sort-button active" : "table-sort-button"}
                onClick={() => updateSort(nextSortKey)}
            >
                <span>{label}</span>
                <AppIcon
                    name="chevron-down"
                    size={14}
                    className={
                        isActive && sortDirection === "asc"
                            ? "sort-icon ascending"
                            : "sort-icon"
                    }
                />
            </button>
        );
    }

    return (
        <section className="applications-page interviews-page">
            <header className="applications-header">
                <div>
                    <p>Interviews</p>
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

            <div className="applications-split-panel interviews-split-panel">
                <aside className="application-list-panel interviews-list-panel">
                    <div className="application-list-header">
                        <div>
                            <h2>Interviews</h2>
                            <span>
                                {sortedInterviews.length} shown from {interviews.length}{" "}
                                total
                            </span>
                        </div>
                    </div>

                    <div className="application-list-sort" aria-label="Sort interviews">
                        <span>Sort</span>
                        {renderSortButton("When", "scheduledAt")}
                        {renderSortButton("Role", "applicationTitle")}
                        {renderSortButton("Company", "companyName")}
                        {renderSortButton("Stage", "type")}
                        {renderSortButton("Status", "outcome")}
                    </div>

                    {sortedInterviews.length > 0 ? (
                        <div className="application-list" role="list">
                            {sortedInterviews.map((interview) => {
                                const isSelected =
                                    selectedInterview?.id === interview.id;

                                return (
                                    <button
                                        key={interview.id}
                                        type="button"
                                        className={
                                            isSelected
                                                ? "application-list-item interview-list-item active"
                                                : "application-list-item interview-list-item"
                                        }
                                        aria-current={isSelected ? "true" : undefined}
                                        onClick={() =>
                                            setSelectedInterviewId(interview.id)
                                        }
                                    >
                                        <span className="application-list-icon interview-list-icon">
                                            <AppIcon name="calendar" size={19} />
                                        </span>
                                        <span className="application-list-copy">
                                            <strong>
                                                {interview.applicationTitle ??
                                                    "Unknown role"}
                                            </strong>
                                            <span>
                                                {interview.companyName ??
                                                    "Unknown company"}
                                            </span>
                                            <em>
                                                {formatInterviewDateLabel(
                                                    interview.scheduledAt,
                                                )}
                                                {" at "}
                                                {formatInterviewTimeLabel(
                                                    interview.scheduledAt,
                                                )}
                                                {" - "}
                                                {getInterviewTypeLabel(interview.type)}
                                            </em>
                                        </span>
                                        <span
                                            className={`status-pill ${interview.outcome.toLowerCase()}`}
                                        >
                                            {getInterviewOutcomeLabel(interview.outcome)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="applications-empty application-list-empty interviews-empty">
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

                    {sortedInterviews.length > 0 && (
                        <div className="interviews-list-footer">
                            Showing {sortedInterviews.length} of {interviews.length}{" "}
                            {pluralize(interviews.length, "interview")}
                        </div>
                    )}
                </aside>

                <aside
                    className="application-detail-panel interview-detail-panel"
                    aria-label="Selected interview"
                >
                    {selectedInterview ? (
                        <>
                            <header className="application-detail-header">
                                <div className="application-detail-top-row">
                                    <span className="application-detail-kicker">
                                        <AppIcon name="calendar" size={16} />
                                        Interview details
                                    </span>
                                    <div
                                        className="application-detail-header-actions"
                                        aria-label="Interview actions"
                                    >
                                        <button
                                            type="button"
                                            className="secondary"
                                            onClick={() => onStartEdit(selectedInterview)}
                                        >
                                            <AppIcon name="edit" size={15} />
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="danger application-detail-delete"
                                            onClick={() =>
                                                onRemoveInterview(selectedInterview.id)
                                            }
                                        >
                                            <AppIcon name="trash" size={15} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <div className="application-detail-title-row">
                                    <div className="application-detail-title-block">
                                        <div className="application-detail-title-line">
                                            <h2>
                                                {selectedInterview.applicationTitle ??
                                                    "Unknown role"}
                                            </h2>
                                            <span
                                                className={`status-pill ${selectedInterview.outcome.toLowerCase()}`}
                                            >
                                                {getInterviewOutcomeLabel(
                                                    selectedInterview.outcome,
                                                )}
                                            </span>
                                        </div>
                                        <div className="application-detail-subline">
                                            <span className="company-line">
                                                {selectedInterview.companyName ??
                                                    "Unknown company"}
                                            </span>
                                            <span className="interview-stage-line">
                                                {getInterviewTypeLabel(
                                                    selectedInterview.type,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </header>

                            <div className="application-detail-layout">
                                <div className="application-detail-main">
                                    <section className="application-detail-section interview-prep-section">
                                        <div className="application-detail-section-heading">
                                            <div>
                                                <h3>Prep status</h3>
                                                <span>
                                                    {selectedPrepIssues.length > 0
                                                        ? `${selectedPrepIssues.length} ${pluralize(
                                                              selectedPrepIssues.length,
                                                              "missing detail",
                                                          )}`
                                                        : "Ready"}
                                                </span>
                                            </div>
                                        </div>
                                        {selectedPrepIssues.length > 0 ? (
                                            <div className="prep-list interview-detail-prep-list">
                                                {selectedPrepIssues.map((issue) => (
                                                    <span
                                                        className="prep-warning"
                                                        key={issue}
                                                    >
                                                        <AppIcon name="warning" size={16} />
                                                        {issue}
                                                    </span>
                                                ))}
                                                <button
                                                    type="button"
                                                    className="prep-action"
                                                    onClick={() =>
                                                        onStartEdit(selectedInterview)
                                                    }
                                                >
                                                    Add details
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="prep-ready interview-detail-ready">
                                                <AppIcon name="check" size={16} />
                                                Ready for prep
                                            </span>
                                        )}
                                    </section>

                                    <section className="application-detail-section">
                                        <h3>Notes</h3>
                                        <p>
                                            {selectedInterview.notes?.trim() ||
                                                "No notes saved for this interview."}
                                        </p>
                                    </section>
                                </div>

                                <aside
                                    className="application-detail-meta"
                                    aria-label="Interview details"
                                >
                                    <h3>Schedule</h3>
                                    <dl className="application-detail-meta-list">
                                        <div className="application-detail-meta-item">
                                            <dt>
                                                <AppIcon name="calendar" size={15} />
                                                Date
                                            </dt>
                                            <dd>
                                                {formatInterviewDateLabel(
                                                    selectedInterview.scheduledAt,
                                                    true,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="application-detail-meta-item">
                                            <dt>
                                                <AppIcon name="clock" size={15} />
                                                Time
                                            </dt>
                                            <dd>
                                                {formatInterviewTimeLabel(
                                                    selectedInterview.scheduledAt,
                                                )}
                                                {" - "}
                                                {formatInterviewDuration(
                                                    selectedInterview.durationMinutes,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="application-detail-meta-item">
                                            <dt>
                                                <AppIcon name="account" size={15} />
                                                Interviewer
                                            </dt>
                                            <dd>
                                                {selectedInterview.interviewerName ||
                                                    "Not set"}
                                            </dd>
                                        </div>
                                        <div className="application-detail-meta-item">
                                            <dt>
                                                <AppIcon name="location" size={15} />
                                                Location
                                            </dt>
                                            <dd>
                                                {getInterviewLocationLabel(
                                                    selectedInterview,
                                                )}
                                            </dd>
                                        </div>
                                        {selectedInterview.meetingUrl && (
                                            <div className="application-detail-meta-item">
                                                <dt>
                                                    <AppIcon
                                                        name="external-link"
                                                        size={15}
                                                    />
                                                    Meeting
                                                </dt>
                                                <dd>
                                                    <a
                                                        className="interview-detail-link"
                                                        href={selectedInterview.meetingUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Open link
                                                    </a>
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                </aside>
                            </div>
                        </>
                    ) : (
                        <div className="applications-empty application-detail-empty">
                            <span className="empty-illustration">
                                <AppIcon name="calendar" size={31} />
                            </span>
                            <h2>Select an interview</h2>
                            <p>Choose an interview from the list to review its details.</p>
                        </div>
                    )}
                </aside>
            </div>
        </section>
    );
}
