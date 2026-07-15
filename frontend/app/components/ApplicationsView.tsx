"use client";

import { useMemo, useState } from "react";

import {
    countApplicationsByStatus,
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
import { formatTaskDueDate, getTaskDueState, sortTasksByDueDate } from "../lib/task-utils";
import { SOURCES, STATUSES, STATUS_LABELS } from "../lib/constants";
import type { Application, Interview, Task } from "../lib/types";
import { AppIcon } from "./AppIcon";
import { InitialsBadge } from "./InitialsBadge";

type ApplicationsViewProps = {
    applications: Application[];
    focusedApplicationId?: string | null;
    interviews: Interview[];
    tasks: Task[];
    onCreateApplication: () => void;
    onCreateInterview: (applicationId?: string) => void;
    onCreateTask: (applicationId?: string) => void;
    onCompleteTask: (id: string) => void | Promise<void>;
    onImportOpen: () => void;
    onRemoveApplication: (id: string) => void;
    onRemoveInterview: (id: string) => void | Promise<void>;
    onStartEdit: (application: Application) => void;
    onStartEditInterview: (interview: Interview) => void;
    onStatusChange: (id: string, status: string) => void;
    onUpdateNotes: (application: Application, notes: string) => Promise<void>;
    onViewInterview: (interviewId: string) => void;
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

    return "Salary not specified";
}

function formatTaskRemaining(value: string | null) {
    if (!value) return "";
    const due = new Date(`${value.slice(0, 10)}T23:59:59`);
    if (Number.isNaN(due.getTime())) return "";
    const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
    if (days === 0) return "Due today";
    return `${days} day${days === 1 ? "" : "s"} remaining`;
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
    tasks,
    onCreateApplication,
    onCreateInterview,
    onCreateTask,
    onCompleteTask,
    onImportOpen,
    onRemoveApplication,
    onRemoveInterview,
    onStartEdit,
    onStartEditInterview,
    onStatusChange,
    onUpdateNotes,
    onViewInterview,
}: ApplicationsViewProps) {
    const [filters, setFilters] =
        useState<ApplicationsTableFilters>(INITIAL_FILTERS);
    const [sortKey, setSortKey] = useState<SortKey>("dateApplied");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [isApplicationMenuOpen, setIsApplicationMenuOpen] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [notesDraft, setNotesDraft] = useState("");
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [openInterviewMenuId, setOpenInterviewMenuId] = useState<string | null>(null);
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
    const applicationStatusSummary = useMemo(() => {
        const counts = countApplicationsByStatus(applications);
        const populatedStatuses = STATUSES.filter((status) => counts[status] > 0);
        const statusesToShow =
            populatedStatuses.length > 0 ? populatedStatuses : STATUSES;

        return statusesToShow.map((status) => ({
            status,
            count: counts[status],
            label: STATUS_LABELS[status].toLowerCase(),
        }));
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
    const selectedNotes = selectedApplication?.notes?.trim() ?? "";
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
    const selectedTasks = selectedApplication
        ? sortTasksByDueDate(
            tasks.filter(
                (task) =>
                    task.applicationId === selectedApplication.id && !task.completedAt,
            ),
        )
        : [];
    const nextTask = selectedTasks[0] ?? null;
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
        <section className="applications-page">
            <header className="applications-header">
                <div>
                    <p>Applications</p>
                    <span
                        className="applications-status-meta"
                        aria-label="Application totals by status"
                    >
                        {applicationStatusSummary.map(({ status, count, label }) => (
                            <strong
                                key={status}
                                className={`applications-status-count ${status.toLowerCase()}`}
                            >
                                {count} {label}
                            </strong>
                        ))}
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

                    {sortedApplications.length > 0 ? (
                        <div className="application-list" role="list">
                            <div className="application-table-header applications-table-columns" role="row" aria-label="Application columns and sorting">
                                {renderSortButton("Role", "title")}
                                {renderSortButton("Company", "companyName")}
                                {renderSortButton("Applied date", "dateApplied")}
                                {renderSortButton("Status", "status")}
                            </div>
                            {sortedApplications.map((application) => {
                                const isSelected =
                                    selectedApplication?.id === application.id;

                                return (
                                    <button
                                        key={application.id}
                                        type="button"
                                        className={
                                            isSelected
                                                ? "application-list-item applications-table-columns active"
                                                : "application-list-item applications-table-columns"
                                        }
                                        aria-current={isSelected ? "true" : undefined}
                                        onClick={() => {
                                            setSelectedApplicationId(application.id);
                                            setIsEditingNotes(false);
                                        }}
                                    >
                                        <span className="application-primary-cell">
                                            <InitialsBadge
                                                label={application.companyName}
                                                fallback={application.title}
                                            />
                                            <strong>{application.title}</strong>
                                        </span>
                                        <span className="application-table-cell" data-label="Company">
                                            {application.companyName || "Unknown company"}
                                        </span>
                                        <span className="application-table-cell" data-label="Applied date">
                                            {formatDisplayDate(application.dateApplied)}
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
                                    <div className="application-detail-heading">
                                        <h2>{selectedApplication.title}</h2>
                                    </div>

                                    <div
                                        className="application-detail-header-actions"
                                        aria-label="Application actions"
                                    >
                                        <button
                                            type="button"
                                            className="alternative"
                                            onClick={() => onStartEdit(selectedApplication)}
                                        >
                                            <AppIcon name="edit" size={20} />
                                        </button>
                                        <div className="application-detail-menu" onBlur={(event) => {
                                            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsApplicationMenuOpen(false);
                                        }}>
                                            <button type="button" className="application-detail-menu-trigger" aria-label="More application actions" aria-haspopup="menu" aria-expanded={isApplicationMenuOpen} onClick={() => setIsApplicationMenuOpen((open) => !open)}>
                                                <AppIcon name="dots-vertical" size={20} />
                                            </button>
                                            {isApplicationMenuOpen && (
                                                <div className="application-detail-menu-popover" role="menu">
                                                    <button type="button" role="menuitem" onClick={() => { setIsApplicationMenuOpen(false); onRemoveApplication(selectedApplication.id); }}>
                                                        <AppIcon name="trash" size={20} /> Delete application
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <p className="application-detail-company-location">
                                    <span>{selectedApplication.companyName || "Unknown company"}</span>
                                    <span aria-hidden="true">·</span>
                                    <span>{selectedApplication.location || "Location not set"}</span>
                                    <span aria-hidden="true">·</span>
                                    <label className="application-detail-status-control">
                                        <select
                                            aria-label="Application status"
                                            className={`status-select ${selectedApplication.status.toLowerCase()}`}
                                            value={selectedApplication.status}
                                            onChange={(event) =>
                                                onStatusChange(
                                                    selectedApplication.id,
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            {STATUSES.map((status) => (
                                                <option key={status} value={status}>
                                                    {STATUS_LABELS[status]}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </p>
                                <div className="application-detail-summary" aria-label="Application summary">
                                    <span><AppIcon name="calendar" size={17} /> Applied {formatDisplayDate(selectedApplication.dateApplied)}</span>
                                    <span><AppIcon name="source" size={17} /> {selectedApplication.source || "No source"}</span>
                                    <span><AppIcon name="salary" size={17} /> {selectedApplication.salaryMin !== null || selectedApplication.salaryMax !== null ? `Salary: ${formatSalaryRange(selectedApplication)}` : formatSalaryRange(selectedApplication)}</span>
                                    {selectedApplication.sourceUrl && (
                                        <span><AppIcon name="external-link" size={17} className="application-detail-external-link-icon" />
                                            <a className="application-detail-posting-link" href={selectedApplication.sourceUrl} target="_blank" rel="noreferrer">
                                                Original posting
                                            </a>
                                        </span>
                                    )}
                                </div>

                            </header>

                            <div className="application-detail-layout">
                                <div className="application-detail-main">
                                    <section className="application-detail-section application-detail-card-section application-next-action-section">
                                        <div className="application-detail-section-heading">
                                            <h3>Next action</h3>
                                            <button type="button" className="alternative application-section-action" onClick={() => onCreateTask(selectedApplication.id)}>
                                                <AppIcon name="plus" size={15} /> Add task
                                            </button>
                                        </div>
                                        {nextTask ? (
                                            <div className="application-next-action-card">
                                                <button type="button" className={`application-task-checkbox ${getTaskDueState(nextTask)}`} aria-label={`Mark ${nextTask.title} complete`} onClick={() => onCompleteTask(nextTask.id)}>
                                                    <AppIcon name="check" size={15} />
                                                </button>
                                                <div>
                                                    <strong>{nextTask.title}</strong>
                                                    <p>
                                                        {nextTask.dueDate
                                                            ? `Due ${formatTaskDueDate(nextTask.dueDate)} · ${formatTaskRemaining(nextTask.dueDate)}`
                                                            : "No due date"}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : <p className="application-detail-empty-copy">No next action set.</p>}
                                    </section>

                                    <section className="application-detail-section application-detail-card-section application-detail-interviews-section">
                                        <div className="application-detail-section-heading">
                                            <div>
                                                <div className="interview-detail-section-title">
                                                    <div className="interview-notes-card-title">
                                                        <h3>Interviews</h3>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="alternative application-section-action"
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

                                                        <div className="application-interview-copy">
                                                            <strong>
                                                                {getInterviewTypeLabel(
                                                                    interview.type,
                                                                )}
                                                            </strong>
                                                            <span >
                                                                <AppIcon
                                                                    name="calendar"
                                                                    size={18}
                                                                />
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
                                                        <div className="application-interview-actions">
                                                            <button type="button" className="application-interview-icon-button" aria-label={`Edit ${getInterviewTypeLabel(interview.type)} interview`} onClick={() => onStartEditInterview(interview)}>
                                                                <AppIcon name="edit" size={18} />
                                                            </button>
                                                            <div className="application-detail-menu" onBlur={(event) => {
                                                                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpenInterviewMenuId(null);
                                                            }}>
                                                                <button type="button" className="application-interview-icon-button" aria-label="More interview actions" aria-haspopup="menu" aria-expanded={openInterviewMenuId === interview.id} onClick={() => setOpenInterviewMenuId((current) => current === interview.id ? null : interview.id)}>
                                                                    <AppIcon name="dots-vertical" size={18} />
                                                                </button>
                                                                {openInterviewMenuId === interview.id && (
                                                                    <div className="application-detail-menu-popover application-interview-menu-popover" role="menu">
                                                                        <button type="button" role="menuitem" onClick={() => { setOpenInterviewMenuId(null); onViewInterview(interview.id); }}>
                                                                            <AppIcon name="view" size={18} /> View interview
                                                                        </button>
                                                                        <button type="button" role="menuitem" className="danger-text" onClick={() => { setOpenInterviewMenuId(null); onRemoveInterview(interview.id); }}>
                                                                            <AppIcon name="trash" size={18} /> Delete interview
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </article>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="application-interviews-empty">No interviews yet</div>
                                        )}
                                    </section>

                                    <section className="application-detail-section application-detail-card-section application-notes-card interview-notes-card">
                                        <div className="interview-detail-section-title">
                                            <div className="interview-notes-card-title">
                                                <h3>Notes</h3>
                                            </div>
                                            {!isEditingNotes && (
                                                <button type="button" className="alternative application-section-action" onClick={() => { setNotesDraft(selectedNotes); setIsEditingNotes(true); }}>
                                                    Edit notes
                                                </button>
                                            )}
                                        </div>
                                        {isEditingNotes ? (
                                            <div className="application-notes-editor">
                                                <textarea aria-label="Application notes" autoFocus value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} placeholder="Write a note…" />
                                                <div className="application-notes-editor-actions">
                                                    <button type="button" className="secondary" disabled={isSavingNotes} onClick={() => setIsEditingNotes(false)}>Cancel</button>
                                                    <button type="button" className="primary" disabled={isSavingNotes} onClick={async () => { setIsSavingNotes(true); try { await onUpdateNotes(selectedApplication, notesDraft); setIsEditingNotes(false); } catch { /* The page-level message reports the API error. */ } finally { setIsSavingNotes(false); } }}>
                                                        {isSavingNotes ? "Saving…" : "Save notes"}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className={selectedNotes ? "" : "is-empty"}>{selectedNotes || "No notes added"}</p>
                                        )}
                                    </section>
                                </div>
                            </div>


                        </>
                    ) : (
                        <div className="applications-empty">
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
