"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { DASHBOARD_STATUSES, SOURCES, STATUSES, STATUS_LABELS } from "../../lib/constants";
import {
    getInterviewTimestamp,
    getInterviewTypeLabel,
} from "../../lib/interview-utils";
import type {
    ActivityLog,
    Application,
    ApplicationFilters,
    DashboardStatus,
    Interview,
} from "../../lib/types";
import { AppIcon } from "../AppIcon";
import { InfoTooltip } from "./InfoTooltip";

type ApplicationTrackerProps = {
    applications: Application[];
    filters: ApplicationFilters;
    groupedApplications: Record<DashboardStatus, Application[]>;
    historyByApp: Record<string, ActivityLog[]>;
    interviews: Interview[];
    openTimelineId: string | null;
    trackerApplications: Application[];
    onImportOpen: () => void;
    onCreateApplication: () => void;
    onFiltersChange: (filters: ApplicationFilters) => void;
    onRemoveApplication: (id: string) => void;
    onRemoveHistoryEvent: (
        applicationId: string,
        activityLogId: string,
    ) => void | Promise<void>;
    onStartEdit: (application: Application) => void;
    onToggleTimeline: (id: string) => void | Promise<void>;
    onTransitionStatus: (id: string, nextStatus: string) => void | Promise<void>;
    onViewApplication: (id: string) => void;
};

function formatAppliedDate(dateApplied: string | null) {
    if (!dateApplied) return "No applied date";

    const date = new Date(dateApplied);
    if (Number.isNaN(date.getTime())) return "No applied date";

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function getDisplayInterview(interviews: Interview[]) {
    const now = Date.now();
    const validInterviews = interviews.filter(
        (interview) => getInterviewTimestamp(interview) > 0,
    );
    const sourceInterviews = validInterviews.length ? validInterviews : interviews;
    const upcomingInterview = sourceInterviews
        .filter(
            (interview) =>
                interview.outcome === "SCHEDULED" &&
                getInterviewTimestamp(interview) >= now,
        )
        .sort(
            (left, right) =>
                getInterviewTimestamp(left) - getInterviewTimestamp(right),
        )[0];

    if (upcomingInterview) return upcomingInterview;

    return [...sourceInterviews].sort(
        (left, right) =>
            getInterviewTimestamp(right) - getInterviewTimestamp(left),
    )[0];
}

export function ApplicationTracker({
    applications,
    filters,
    groupedApplications,
    historyByApp,
    interviews,
    openTimelineId,
    trackerApplications,
    onImportOpen,
    onCreateApplication,
    onFiltersChange,
    onRemoveApplication,
    onRemoveHistoryEvent,
    onStartEdit,
    onToggleTimeline,
    onTransitionStatus,
    onViewApplication,
}: ApplicationTrackerProps) {
    const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [mobileActiveStatus, setMobileActiveStatus] =
        useState<DashboardStatus>(
            () =>
                DASHBOARD_STATUSES.find(
                    (status) => groupedApplications[status].length > 0,
                ) ?? "APPLIED",
        );
    const mobileFiltersToggleRef = useRef<HTMLButtonElement>(null);
    const mobileFiltersCloseRef = useRef<HTMLButtonElement>(null);
    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    useEffect(() => {
        if (!isMobileFiltersOpen) return;

        const previousOverflow = document.body.style.overflow;
        const filterToggle = mobileFiltersToggleRef.current;
        document.body.style.overflow = "hidden";
        mobileFiltersCloseRef.current?.focus();

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setIsMobileFiltersOpen(false);
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
            filterToggle?.focus();
        };
    }, [isMobileFiltersOpen]);
    const interviewByApplicationId = useMemo(() => {
        const groupedInterviews = new Map<string, Interview[]>();

        interviews.forEach((interview) => {
            const existing = groupedInterviews.get(interview.applicationId) ?? [];
            groupedInterviews.set(interview.applicationId, [...existing, interview]);
        });

        const selectedInterviews = new Map<string, Interview>();
        groupedInterviews.forEach((applicationInterviews, applicationId) => {
            const interview = getDisplayInterview(applicationInterviews);
            if (interview) selectedInterviews.set(applicationId, interview);
        });

        return selectedInterviews;
    }, [interviews]);

    return (
        <section className="panel tracker-panel">
            <div className="panel-title tracker-heading-row">
                <div>
                    <h2>
                        <span className="heading-icon">
                            <AppIcon name="applications" size={17} />
                        </span>
                        Application Tracker
                        <InfoTooltip
                            label="Application tracker information"
                            tooltip="Filter applications and move cards between stages to keep your pipeline current."
                        />
                    </h2>
                </div>
                <div className="panel-title tracker-actions">
                    <button className="primary" onClick={onCreateApplication}>
                        <AppIcon name="plus" size={18} />
                        Add Application
                    </button>
                    <button className="secondary" onClick={onImportOpen}>
                        <AppIcon name="import" size={18} />
                        Import Job
                    </button>
                </div>
            </div>
            <button
                ref={mobileFiltersToggleRef}
                type="button"
                className="dashboard-filter-toggle"
                aria-controls="dashboard-application-filters"
                aria-expanded={isMobileFiltersOpen}
                onClick={() => setIsMobileFiltersOpen(true)}
            >
                <AppIcon name="filter" size={17} />
                Filters
                {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
            {isMobileFiltersOpen && (
                <button
                    type="button"
                    className="dashboard-filter-backdrop"
                    aria-label="Close application filters"
                    onClick={() => setIsMobileFiltersOpen(false)}
                />
            )}
            <div
                id="dashboard-application-filters"
                className={
                    isMobileFiltersOpen
                        ? "filter-row dashboard-filters-open"
                        : "filter-row"
                }
                aria-label="Application filters"
            >
                <div className="dashboard-filter-sheet-header">
                    <strong>Filter applications</strong>
                    <button
                        ref={mobileFiltersCloseRef}
                        type="button"
                        aria-label="Close application filters"
                        onClick={() => setIsMobileFiltersOpen(false)}
                    >
                        <AppIcon name="x" size={20} />
                    </button>
                </div>
                <label className="tracker-search-field">
                    <AppIcon name="search" size={17} />
                    <input
                        aria-label="Search applications"
                        placeholder="Search applications..."
                        value={filters.query}
                        onChange={(event) =>
                            onFiltersChange({ ...filters, query: event.target.value })
                        }
                    />
                </label>
                <select
                    value={filters.status}
                    onChange={(event) =>
                        onFiltersChange({ ...filters, status: event.target.value })
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
                        onFiltersChange({ ...filters, source: event.target.value })
                    }
                >
                    <option value="">All sources</option>
                    {SOURCES.map((source) => (
                        <option key={source}>{source}</option>
                    ))}
                </select>
                <input
                    aria-label="Filter by company or job title"
                    placeholder="Company or job title"
                    value={filters.company}
                    onChange={(event) =>
                        onFiltersChange({ ...filters, company: event.target.value })
                    }
                />
                <button
                    className="dashboard-filter-done"
                    onClick={() => {
                        if (
                            DASHBOARD_STATUSES.includes(
                                filters.status as DashboardStatus,
                            )
                        ) {
                            setMobileActiveStatus(
                                filters.status as DashboardStatus,
                            );
                        }
                        setIsMobileFiltersOpen(false);
                    }}
                >
                    Show results
                </button>
            </div>
            <div className="mobile-stage-tabs-shell">
                <div
                    className="mobile-stage-tabs"
                    aria-label="Application stages"
                >
                    {DASHBOARD_STATUSES.map((status) => (
                        <button
                            key={status}
                            type="button"
                            aria-pressed={mobileActiveStatus === status}
                            onClick={() => setMobileActiveStatus(status)}
                        >
                            {STATUS_LABELS[status]}
                            <span>{groupedApplications[status].length}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="kanban">
                {DASHBOARD_STATUSES.map((status) => (
                    <section
                        key={status}
                        className={`lane ${status.toLowerCase()}${
                            mobileActiveStatus === status ? " mobile-active" : ""
                        }`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                            const id = event.dataTransfer.getData("text/plain");
                            if (id) onTransitionStatus(id, status);
                        }}
                    >
                        <h3 className="lane-header">
                            <span className="lane-title">
                                <span className="lane-dot" aria-hidden="true" />
                                {STATUS_LABELS[status]}
                            </span>
                            <strong>{groupedApplications[status].length}</strong>
                        </h3>
                        <div className={`dropzone ${status.toLowerCase()}`}>
                            {groupedApplications[status].length === 0 &&
                                trackerApplications.length > 0 && (
                                    <div className="lane-empty">
                                        <span aria-hidden="true">
                                            <AppIcon
                                                name="x"
                                                size={23}
                                            />
                                        </span>
                                        <p>No applications yet</p>
                                    </div>
                                )}
                            {groupedApplications[status].map((application) => (
                                (() => {
                                    const interview = interviewByApplicationId.get(
                                        application.id,
                                    );
                                    const history = historyByApp[application.id] ?? [];

                                    return (
                                        <article
                                            key={application.id}
                                            className="job-card"
                                            draggable
                                            onDragStart={(event) =>
                                                event.dataTransfer.setData(
                                                    "text/plain",
                                                    application.id,
                                                )
                                            }
                                        >
                                            <div className="job-card-header">
                                                <div className="job-card-title-group">
                                                    <b>{application.title}</b>
                                                    <span className="job-card-company">
                                                        {application.companyName ?? "Unknown"}
                                                    </span>
                                                </div>
                                                <div
                                                    className="job-card-menu"
                                                    onBlur={(event) => {
                                                        if (
                                                            !event.currentTarget.contains(
                                                                event.relatedTarget as Node | null,
                                                            )
                                                        ) {
                                                            setOpenCardMenuId(null);
                                                        }
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        className="job-card-menu-trigger"
                                                        aria-label={`Open actions for ${application.title}`}
                                                        aria-haspopup="menu"
                                                        aria-expanded={
                                                            openCardMenuId === application.id
                                                        }
                                                        onClick={() =>
                                                            setOpenCardMenuId((current) =>
                                                                current === application.id
                                                                    ? null
                                                                    : application.id,
                                                            )
                                                        }
                                                    >
                                                        <AppIcon
                                                            name="dots-vertical"
                                                            size={17}
                                                        />
                                                    </button>
                                                    {openCardMenuId === application.id && (
                                                        <div
                                                            className="job-card-menu-popover"
                                                            role="menu"
                                                        >
                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                onClick={() => {
                                                                    setOpenCardMenuId(null);
                                                                    onViewApplication(
                                                                        application.id,
                                                                    );
                                                                }}
                                                            >
                                                                <AppIcon
                                                                    name="view"
                                                                    size={14}
                                                                />
                                                                View application
                                                            </button>
                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                onClick={() => {
                                                                    setOpenCardMenuId(null);
                                                                    onToggleTimeline(
                                                                        application.id,
                                                                    );
                                                                }}
                                                            >
                                                                <AppIcon
                                                                    name="history"
                                                                    size={14}
                                                                />
                                                                View history
                                                            </button>
                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                onClick={() => {
                                                                    setOpenCardMenuId(null);
                                                                    onStartEdit(application);
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
                                                                    setOpenCardMenuId(null);
                                                                    onRemoveApplication(
                                                                        application.id,
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
                                            </div>
                                            <div
                                                className="job-card-footer"
                                            >
                                                <small className="applied-date">
                                                    <AppIcon name="calendar" size={12} />
                                                    {formatAppliedDate(
                                                        application.dateApplied,
                                                    )}
                                                </small>
                                                <label className="mobile-status-control">
                                                    <span>Status</span>
                                                    <select
                                                        aria-label={`Change status for ${application.title}`}
                                                        value={application.status}
                                                        onChange={(event) =>
                                                            onTransitionStatus(
                                                                application.id,
                                                                event.target.value,
                                                            )
                                                        }
                                                    >
                                                        {DASHBOARD_STATUSES.map(
                                                            (nextStatus) => (
                                                                <option
                                                                    key={nextStatus}
                                                                    value={nextStatus}
                                                                >
                                                                    {
                                                                        STATUS_LABELS[
                                                                            nextStatus
                                                                        ]
                                                                    }
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                </label>
                                            </div>
                                            {openTimelineId === application.id && (
                                                <ul className="job-card-history">
                                                    {history.length ? (
                                                        history.map((entry) => (
                                                            <li
                                                                key={entry.id}
                                                                className="job-card-history-event"
                                                            >
                                                                <span>{entry.message}</span>
                                                                <button
                                                                    type="button"
                                                                    className="job-card-history-remove"
                                                                    aria-label="Remove history event"
                                                                    onClick={() =>
                                                                        onRemoveHistoryEvent(
                                                                            application.id,
                                                                            entry.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <AppIcon name="x" size={12} />
                                                                </button>
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="job-card-history-empty">
                                                            No history yet.
                                                        </li>
                                                    )}
                                                </ul>
                                            )}
                                        </article>
                                    );
                                })()
                            ))}
                        </div>
                    </section>
                ))}
            </div>
            {trackerApplications.length === 0 && (
                <div className="empty-tracker">
                    <span className="empty-tracker-icon" aria-hidden="true">
                        <AppIcon name="check" size={25} />
                    </span>
                    <div className="empty-tracker-copy">
                        <h3>
                            {applications.length === 0
                                ? "Your pipeline is empty"
                                : "No applications match these filters"}
                        </h3>
                        <p>
                            {applications.length === 0
                                ? "Add your first application to start tracking your job search."
                                : "Adjust the Application Tracker filters to see more applications."}
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}
