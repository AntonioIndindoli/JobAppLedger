"use client";

import { useMemo, useState } from "react";

import {
    getInterviewOutcomeLabel,
    getInterviewTimestamp,
    getInterviewTypeLabel,
    formatInterviewDuration,
} from "../lib/interview-utils";
import { INTERVIEW_OUTCOMES, INTERVIEW_TYPES } from "../lib/constants";
import type { Application, Interview } from "../lib/types";
import { AddInterviewButton } from "./AddInterviewButton";
import { AppIcon } from "./AppIcon";
import { InitialsBadge } from "./InitialsBadge";

type InterviewsViewProps = {
    applications: Application[];
    focusedInterviewId?: string | null;
    interviews: Interview[];
    onCreateInterview: () => void;
    onRemoveInterview: (id: string) => void;
    onStartEdit: (interview: Interview) => void;
    onViewApplication: (id: string) => void;
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

function hasInterviewLocation(interview: Interview) {
    return Boolean(interview.location?.trim() || interview.meetingUrl?.trim());
}

function getInterviewLocationLabel(interview: Interview) {
    const location = interview.location?.trim();
    if (location) return location;
    if (interview.meetingUrl?.trim()) return "Meeting link saved";
    return "Not set";
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
    focusedInterviewId,
    interviews,
    onCreateInterview,
    onRemoveInterview,
    onStartEdit,
    onViewApplication,
}: InterviewsViewProps) {
    const [filters, setFilters] = useState<InterviewFilters>(INITIAL_FILTERS);
    const [sortKey, setSortKey] = useState<SortKey>("scheduledAt");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(
        focusedInterviewId ?? null,
    );
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
    const selectedInterviewerName =
        selectedInterview?.interviewerName?.trim() ?? "";
    const selectedMeetingUrl = selectedInterview?.meetingUrl?.trim() ?? "";
    const selectedNotes = selectedInterview?.notes?.trim() ?? "";
    const selectedHasInterviewer = Boolean(selectedInterviewerName);
    const selectedHasLocation = selectedInterview
        ? hasInterviewLocation(selectedInterview)
        : false;

    const interviewStatusSummary = useMemo(() => {
        const counts = Object.fromEntries(
            INTERVIEW_OUTCOMES.map((outcome) => [outcome, 0]),
        ) as Record<(typeof INTERVIEW_OUTCOMES)[number], number>;

        interviews.forEach((interview) => {
            if ((INTERVIEW_OUTCOMES as readonly string[]).includes(interview.outcome)) {
                counts[interview.outcome as keyof typeof counts] += 1;
            }
        });

        const populatedOutcomes = INTERVIEW_OUTCOMES.filter(
            (outcome) => counts[outcome] > 0,
        );
        const outcomesToShow =
            populatedOutcomes.length > 0 ? populatedOutcomes : INTERVIEW_OUTCOMES;

        return outcomesToShow.map((outcome) => ({
            outcome,
            count: counts[outcome],
            label: getInterviewOutcomeLabel(outcome).toLowerCase(),
        }));
    }, [interviews]);

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
                aria-label={`Sort by ${label}${isActive ? `, currently ${sortDirection === "asc" ? "ascending" : "descending"}` : ""}`}
                aria-pressed={isActive}
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
                    <span
                        className="interviews-header-meta"
                        aria-label="Interview totals by status"
                    >
                        {interviewStatusSummary.map(({ outcome, count, label }) => (
                            <strong
                                key={outcome}
                                className={`interviews-status-count ${outcome.toLowerCase()}`}
                            >
                                {count} {label}
                            </strong>
                        ))}
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

            <div
                className="interviews-control-panel"
                aria-label="Interview table filters"
            >
                <label className="interviews-search-field">
                    <AppIcon name="search" size={18} />
                    <input
                        aria-label="Search interviews"
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
                    className="interviews-reset-button"
                    onClick={() => setFilters(INITIAL_FILTERS)}
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

                    {sortedInterviews.length > 0 ? (
                        <div className="application-list" role="list">
                            <div className="application-table-header interviews-table-columns" role="row" aria-label="Interview columns and sorting">
                                {renderSortButton("Role", "applicationTitle")}
                                {renderSortButton("Company", "companyName")}
                                {renderSortButton("When", "scheduledAt")}
                                {renderSortButton("Stage", "type")}
                                {renderSortButton("Status", "outcome")}
                            </div>
                            {sortedInterviews.map((interview) => {
                                const isSelected =
                                    selectedInterview?.id === interview.id;

                                return (
                                    <button
                                        key={interview.id}
                                        type="button"
                                        className={
                                            isSelected
                                                ? "application-list-item interview-list-item interviews-table-columns active"
                                                : "application-list-item interview-list-item interviews-table-columns"
                                        }
                                        aria-current={isSelected ? "true" : undefined}
                                        onClick={() =>
                                            setSelectedInterviewId(interview.id)
                                        }
                                    >
                                        <span className="application-primary-cell">
                                            <InitialsBadge
                                                label={interview.companyName}
                                                fallback={interview.applicationTitle}
                                                className="interview-list-icon"
                                            />
                                            <strong>{interview.applicationTitle ?? "Unknown role"}</strong>
                                        </span>
                                        <span className="application-table-cell" data-label="Company">
                                            {interview.companyName ?? "Unknown company"}
                                        </span>
                                        <span className="application-table-cell" data-label="When">
                                            {formatInterviewDateLabel(interview.scheduledAt)} at{" "}
                                            {formatInterviewTimeLabel(interview.scheduledAt)}
                                        </span>
                                        <span className="application-table-cell" data-label="Stage">
                                            {getInterviewTypeLabel(interview.type)}
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
                </aside>

                <aside
                    className="application-detail-panel interview-detail-panel"
                    aria-label="Selected interview"
                >
                    {selectedInterview ? (
                        <>
                            <header className="application-detail-header interview-detail-header">
                                <div className="application-detail-top-row">
                                    <div className="application-detail-title-line">
                                        <h2>
                                            {selectedInterview.applicationTitle ??
                                                "Unknown role"}
                                        </h2>
                                        <span
                                            className={`status-pill ${selectedInterview.outcome.toLowerCase()}`}
                                        >
                                            {getInterviewTypeLabel(selectedInterview.type,) == "Other" ? "" : getInterviewTypeLabel(selectedInterview.type,)} {getInterviewTypeLabel(selectedInterview.type,) == "Other" ? "" : "-"} {getInterviewOutcomeLabel(selectedInterview.outcome,)}
                                        </span>
                                    </div>
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
                                        <div className="application-detail-subline">
                                            <span className="company-line">
                                                {selectedInterview.companyName ??
                                                    "Unknown company"}
                                            </span>
                                            <button
                                                type="button"
                                                className="application-detail-posting-link"
                                                onClick={() =>
                                                    onViewApplication(
                                                        selectedInterview.applicationId,
                                                    )
                                                }
                                            >
                                                <AppIcon
                                                    name="applications"
                                                    size={15}
                                                />
                                                View application
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </header>

                            <div className="interview-detail-body">
                                <dl
                                    className="interview-detail-facts"
                                    aria-label="Interview schedule and logistics"
                                >
                                    <div className="interview-detail-fact interview-detail-fact-primary">
                                        <dt>
                                            <span className="interview-detail-fact-icon">
                                                <AppIcon name="calendar" size={18} />
                                            </span>
                                            Date
                                        </dt>
                                        <dd>
                                            <strong>
                                                {formatInterviewDateLabel(
                                                    selectedInterview.scheduledAt,
                                                    true,
                                                )}
                                            </strong>
                                            <span>
                                                {formatInterviewTimeLabel(
                                                    selectedInterview.scheduledAt,
                                                )}
                                                {" - "}
                                                {formatInterviewDuration(
                                                    selectedInterview.durationMinutes,
                                                )}
                                            </span>
                                        </dd>
                                    </div>

                                    <div
                                        className={
                                            selectedHasInterviewer
                                                ? "interview-detail-fact"
                                                : "interview-detail-fact is-missing"
                                        }
                                    >
                                        <dt>
                                            <span className="interview-detail-fact-icon">
                                                <AppIcon name="account" size={18} />
                                            </span>
                                            Interviewer
                                        </dt>
                                        <dd>
                                            <strong>
                                                {selectedInterviewerName || "Not set"}
                                            </strong>
                                            <span>
                                                {selectedHasInterviewer
                                                    ? "Contact saved"
                                                    : "Needs a name"}
                                            </span>
                                        </dd>
                                    </div>

                                    <div
                                        className={
                                            selectedHasLocation
                                                ? "interview-detail-fact"
                                                : "interview-detail-fact is-missing"
                                        }
                                    >
                                        <dt>
                                            <span className="interview-detail-fact-icon">
                                                <AppIcon name="location" size={18} />
                                            </span>
                                            Location
                                        </dt>
                                        <dd>
                                            <strong>
                                                {getInterviewLocationLabel(
                                                    selectedInterview,
                                                )}
                                            </strong>
                                            {selectedMeetingUrl ? (
                                                <a
                                                    className="interview-detail-link"
                                                    href={selectedMeetingUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Open meeting link
                                                </a>
                                            ) : (
                                                <span>
                                                    {selectedHasLocation
                                                        ? "Location saved"
                                                        : "Needs a location or link"}
                                                </span>
                                            )}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="interview-detail-content-grid">
                                    <section className="interview-notes-card">
                                        <div className="interview-detail-section-title">
                                            <div className="interview-notes-card-title">
                                                <h3>Notes</h3>
                                            </div>
                                        </div>
                                        <p className={selectedNotes ? "" : "is-empty"}>
                                            {selectedNotes ||
                                                "No notes saved for this interview."}
                                        </p>
                                    </section>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="applications-empty">
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
