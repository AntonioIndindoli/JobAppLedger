"use client";

import { useMemo, useState } from "react";

import {
    getApplicationTimestamp,
    isApplicationStatus,
} from "../lib/application-analytics";
import {
    formatInterviewDateTime,
    formatInterviewDuration,
    getInterviewOutcomeLabel,
    getInterviewTypeLabel,
    sortInterviewsBySchedule,
} from "../lib/interview-utils";
import { SOURCES, STATUSES, STATUS_LABELS } from "../lib/constants";
import type { Application, Interview } from "../lib/types";
import { AppIcon } from "./AppIcon";

type ApplicationsViewProps = {
    applications: Application[];
    focusedApplicationId?: string | null;
    interviews: Interview[];
    onCreateApplication: () => void;
    onCreateInterview: (applicationId?: string) => void;
    onImportOpen: () => void;
    onRemoveApplication: (id: string) => void;
    onStartEdit: (application: Application) => void;
};

type ApplicationsTableFilters = {
    query: string;
    status: string;
    source: string;
    startDate: string;
    endDate: string;
};

type SortKey =
    | "title"
    | "companyName"
    | "status"
    | "source"
    | "location"
    | "dateApplied";

type SortDirection = "asc" | "desc";

const INITIAL_FILTERS: ApplicationsTableFilters = {
    query: "",
    status: "",
    source: "",
    startDate: "",
    endDate: "",
};

function formatDisplayDate(value: string | null) {
    if (!value) return "Not set";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function formatSalaryRange(application: Application) {
    const { salaryMin, salaryMax } = application;
    const moneyFormatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    });

    if (salaryMin !== null && salaryMax !== null) {
        return `${moneyFormatter.format(salaryMin)} - ${moneyFormatter.format(
            salaryMax,
        )}`;
    }

    if (salaryMin !== null) return `From ${moneyFormatter.format(salaryMin)}`;
    if (salaryMax !== null) return `Up to ${moneyFormatter.format(salaryMax)}`;

    return "Not set";
}

function getSortValue(application: Application, sortKey: SortKey) {
    if (sortKey === "dateApplied") return getApplicationTimestamp(application);
    if (sortKey === "status") return getStatusLabel(application.status);

    return (application[sortKey] ?? "").toString().toLowerCase();
}

function getStatusLabel(status: string) {
    return isApplicationStatus(status) ? STATUS_LABELS[status] : status;
}

function getInterviewLocationLabel(interview: Interview) {
    const location = interview.location?.trim();
    if (location) return location;
    if (interview.meetingUrl?.trim()) return "Meeting link saved";
    return "Location not set";
}

export function ApplicationsView({
    applications,
    focusedApplicationId,
    interviews,
    onCreateApplication,
    onCreateInterview,
    onImportOpen,
    onRemoveApplication,
    onStartEdit,
}: ApplicationsViewProps) {
    const [filters, setFilters] =
        useState<ApplicationsTableFilters>(INITIAL_FILTERS);
    const [sortKey, setSortKey] = useState<SortKey>("dateApplied");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [selectedApplicationId, setSelectedApplicationId] = useState<
        string | null
    >(focusedApplicationId ?? null);
    const sourceOptions = useMemo(() => {
        const sources = new Set<string>(SOURCES);
        applications.forEach((application) => {
            if (application.source) sources.add(application.source);
        });
        return Array.from(sources).sort((a, b) => a.localeCompare(b));
    }, [applications]);

    const filteredApplications = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        const startTime = filters.startDate
            ? new Date(`${filters.startDate}T00:00:00`).getTime()
            : null;
        const endTime = filters.endDate
            ? new Date(`${filters.endDate}T23:59:59`).getTime()
            : null;

        return applications.filter((application) => {
            const searchableText = [
                application.title,
                application.companyName,
                application.location,
                application.source,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            if (query && !searchableText.includes(query)) return false;
            if (filters.status && application.status !== filters.status) return false;
            if (
                filters.source &&
                application.source?.toLowerCase() !== filters.source.toLowerCase()
            )
                return false;

            const applicationTime = getApplicationTimestamp(application);
            if (startTime !== null && applicationTime < startTime) return false;
            if (endTime !== null && applicationTime > endTime) return false;

            return true;
        });
    }, [applications, filters]);

    const sortedApplications = useMemo(() => {
        return [...filteredApplications].sort((left, right) => {
            const leftValue = getSortValue(left, sortKey);
            const rightValue = getSortValue(right, sortKey);
            const directionMultiplier = sortDirection === "asc" ? 1 : -1;

            if (typeof leftValue === "number" && typeof rightValue === "number") {
                return (leftValue - rightValue) * directionMultiplier;
            }

            return String(leftValue).localeCompare(String(rightValue)) * directionMultiplier;
        });
    }, [filteredApplications, sortDirection, sortKey]);

    const selectedApplication =
        sortedApplications.find(
            (application) => application.id === selectedApplicationId,
        ) ??
        sortedApplications[0] ??
        null;
    const selectedApplicationIdForInterviews = selectedApplication?.id ?? null;
    const selectedInterviews = selectedApplicationIdForInterviews
        ? sortInterviewsBySchedule(
            interviews.filter(
                (interview) =>
                    interview.applicationId === selectedApplicationIdForInterviews,
            ),
            "asc",
        )
        : [];
    function updateSort(nextSortKey: SortKey) {
        if (nextSortKey === sortKey) {
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
            return;
        }

        setSortKey(nextSortKey);
        setSortDirection(nextSortKey === "dateApplied" ? "desc" : "asc");
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
        <section className="applications-page">
            <header className="applications-header">
                <div>
                    <p>Applications</p>
                    <span>
                        {sortedApplications.length} of {applications.length} applications shown
                    </span>
                </div>
                <div className="applications-actions">
                    <button type="button" className="primary" onClick={onImportOpen}>
                        <AppIcon name="import" size={18} />
                        Import Job
                    </button>
                    <button
                        type="button"
                        className="secondary"
                        onClick={onCreateApplication}
                    >
                        <AppIcon name="plus" size={18} />
                        Add Application
                    </button>
                </div>
            </header>

            <div className="applications-toolbar" aria-label="Application table filters">
                <label className="applications-search-field">
                    <AppIcon name="search" size={18} />
                    <input
                        aria-label="Search applications"
                        value={filters.query}
                        onChange={(event) =>
                            setFilters({ ...filters, query: event.target.value })
                        }
                        placeholder="Search title, company, location, source"
                    />
                </label>
                <select
                    value={filters.status}
                    onChange={(event) =>
                        setFilters({ ...filters, status: event.target.value })
                    }
                >
                    <option value="">All statuses</option>
                    {STATUSES.map((status) => (
                        <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                        </option>
                    ))}
                </select>
                <select
                    value={filters.source}
                    onChange={(event) =>
                        setFilters({ ...filters, source: event.target.value })
                    }
                >
                    <option value="">All sources</option>
                    {sourceOptions.map((source) => (
                        <option key={source} value={source}>
                            {source}
                        </option>
                    ))}
                </select>
                <input
                    type="date"
                    aria-label="Start date"
                    value={filters.startDate}
                    onChange={(event) =>
                        setFilters({ ...filters, startDate: event.target.value })
                    }
                />
                <input
                    type="date"
                    aria-label="End date"
                    value={filters.endDate}
                    onChange={(event) =>
                        setFilters({ ...filters, endDate: event.target.value })
                    }
                />
                <button
                    type="button"
                    className="interviews-reset-button"
                    onClick={() => setFilters(INITIAL_FILTERS)}
                >
                    <AppIcon name="history" size={15} />
                    Reset
                </button>
            </div>

            <div className="applications-split-panel">
                <aside className="application-list-panel">
                    <div className="application-list-header">
                        <div>
                            <h2>Applications</h2>
                            <span>
                                {sortedApplications.length} shown from{" "}
                                {applications.length} total
                            </span>
                        </div>
                    </div>

                    <div className="application-list-sort" aria-label="Sort applications">
                        <span>Sort</span>
                        {renderSortButton("Role", "title")}
                        {renderSortButton("Company", "companyName")}
                        {renderSortButton("Status", "status")}
                        {renderSortButton("Applied", "dateApplied")}
                    </div>

                    {sortedApplications.length > 0 ? (
                        <div className="application-list" role="list">
                            {sortedApplications.map((application) => {
                                const isSelected =
                                    selectedApplication?.id === application.id;

                                return (
                                    <button
                                        key={application.id}
                                        type="button"
                                        className={
                                            isSelected
                                                ? "application-list-item active"
                                                : "application-list-item"
                                        }
                                        aria-current={isSelected ? "true" : undefined}
                                        onClick={() =>
                                            setSelectedApplicationId(application.id)
                                        }
                                    >
                                        <span className="application-list-icon">
                                            <AppIcon name="applications" size={19} />
                                        </span>
                                        <span className="application-list-copy">
                                            <strong>{application.title}</strong>
                                            <span>
                                                {application.companyName ||
                                                    "Unknown company"}
                                            </span>
                                            <em>
                                                {formatDisplayDate(
                                                    application.dateApplied,
                                                )}
                                            </em>
                                        </span>
                                        <span
                                            className={`status-pill ${application.status.toLowerCase()}`}
                                        >
                                            {getStatusLabel(application.status)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="applications-empty application-list-empty">
                            <span className="empty-illustration">
                                <AppIcon name="applications" size={31} />
                            </span>
                            <h2>
                                {applications.length === 0
                                    ? "No applications yet"
                                    : "No applications match these filters"}
                            </h2>
                            <p>
                                {applications.length === 0
                                    ? "Add or import a role to start tracking your search."
                                    : "Clear filters or adjust the search terms to expand the list."}
                            </p>
                            <button
                                type="button"
                                className="secondary"
                                onClick={onCreateApplication}
                            >
                                <AppIcon name="plus" size={18} />
                                Add Application
                            </button>
                        </div>
                    )}
                </aside>

                <aside className="application-detail-panel">
                    {selectedApplication ? (
                        <>
                            <header className="application-detail-header">
                                <div className="application-detail-top-row">
                                    <span className="application-detail-kicker">
                                        <AppIcon name="document" size={16} />
                                        Application details
                                    </span>
                                    <div
                                        className="application-detail-header-actions"
                                        aria-label="Application actions"
                                    >
                                        <button
                                            type="button"
                                            className="secondary"
                                            onClick={() => onStartEdit(selectedApplication)}
                                        >
                                            <AppIcon name="edit" size={15} />
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="danger application-detail-delete"
                                            onClick={() =>
                                                onRemoveApplication(selectedApplication.id)
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
                                            <h2>{selectedApplication.title}</h2>
                                            <span
                                                className={`status-pill ${selectedApplication.status.toLowerCase()}`}
                                            >
                                                {getStatusLabel(selectedApplication.status)}
                                            </span>
                                        </div>
                                        <div className="application-detail-subline">
                                            <span className="company-line">
                                                {selectedApplication.companyName ||
                                                    "Unknown company"}
                                            </span>
                                            {selectedApplication.sourceUrl && (
                                                <a
                                                    className="application-detail-posting-link"
                                                    href={selectedApplication.sourceUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <AppIcon
                                                        name="external-link"
                                                        size={15}
                                                    />
                                                    View posting
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </header>

                            <div className="application-detail-layout">
                                <div className="application-detail-main">
                                    <section className="application-detail-section application-detail-interviews-section">
                                        <div className="application-detail-section-heading">
                                            <div>
                                                <h3>Interviews</h3>
                                                <span>
                                                    {selectedInterviews.length === 1
                                                        ? "1 interview"
                                                        : `${selectedInterviews.length} interviews`}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                className="secondary application-interviews-add"
                                                onClick={() =>
                                                    onCreateInterview(selectedApplication.id)
                                                }
                                            >
                                                <AppIcon name="plus" size={15} />
                                                Add interview
                                            </button>
                                        </div>
                                        {selectedInterviews.length > 0 ? (
                                            <div className="application-interview-list">
                                                {selectedInterviews.map((interview) => (
                                                    <article
                                                        key={interview.id}
                                                        className="application-interview-item"
                                                    >
                                                        <span className="application-interview-icon">
                                                            <AppIcon
                                                                name="calendar"
                                                                size={18}
                                                            />
                                                        </span>
                                                        <div className="application-interview-copy">
                                                            <strong>
                                                                {getInterviewTypeLabel(
                                                                    interview.type,
                                                                )}
                                                            </strong>
                                                            <span>
                                                                {formatInterviewDateTime(
                                                                    interview.scheduledAt,
                                                                )}
                                                            </span>
                                                            <small>
                                                                {formatInterviewDuration(
                                                                    interview.durationMinutes,
                                                                )}
                                                                {" - "}
                                                                {interview.interviewerName ||
                                                                    "Interviewer not set"}
                                                                {" - "}
                                                                {getInterviewLocationLabel(
                                                                    interview,
                                                                )}
                                                            </small>
                                                        </div>
                                                        <span
                                                            className={`status-pill ${interview.outcome.toLowerCase()}`}
                                                        >
                                                            {getInterviewOutcomeLabel(
                                                                interview.outcome,
                                                            )}
                                                        </span>
                                                    </article>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="application-interviews-empty">
                                                <span>
                                                    <AppIcon name="calendar" size={19} />
                                                </span>
                                                <div>
                                                    <strong>No interviews added</strong>
                                                    <p>
                                                        Add interview details when this
                                                        application moves forward.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                </div>

                                <aside
                                    className="application-detail-meta"
                                    aria-label="Application details"
                                >
                                    <h3>Details</h3>
                                    <dl className="application-detail-meta-list">
                                        <div className="application-detail-meta-item">
                                            <dt>
                                                <AppIcon name="calendar" size={15} />
                                                Applied
                                            </dt>
                                            <dd>
                                                {formatDisplayDate(
                                                    selectedApplication.dateApplied,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="application-detail-meta-item">
                                            <dt>
                                                <AppIcon name="location" size={15} />
                                                Location
                                            </dt>
                                            <dd>
                                                {selectedApplication.location || "Not set"}
                                            </dd>
                                        </div>
                                        <div className="application-detail-meta-item">
                                            <dt>
                                                <AppIcon name="source" size={15} />
                                                Source
                                            </dt>
                                            <dd>
                                                {selectedApplication.source || "No source"}
                                            </dd>
                                        </div>
                                        <div className="application-detail-meta-item">
                                            <dt>
                                                <AppIcon name="analytics" size={15} />
                                                Salary
                                            </dt>
                                            <dd>{formatSalaryRange(selectedApplication)}</dd>
                                        </div>
                                    </dl>
                                </aside>
                            </div>

                            <section className="application-detail-section">
                                <h3>Notes</h3>
                                <p>
                                    {selectedApplication.notes?.trim() ||
                                        "No notes saved for this application."}
                                </p>
                            </section>
                        </>
                    ) : (
                        <div className="applications-empty application-detail-empty">
                            <span className="empty-illustration">
                                <AppIcon name="applications" size={31} />
                            </span>
                            <h2>Select an application</h2>
                            <p>
                                Choose an application from the list to review its
                                details.
                            </p>
                        </div>
                    )}
                </aside>
            </div>
        </section>
    );
}
