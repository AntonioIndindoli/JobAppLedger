"use client";

import { DASHBOARD_STATUSES, SOURCES, STATUSES, STATUS_LABELS } from "../../lib/constants";
import type {
    ActivityLog,
    Application,
    ApplicationFilters,
    DashboardStatus,
} from "../../lib/types";
import { AppIcon } from "../AppIcon";

type ApplicationTrackerProps = {
    applications: Application[];
    filters: ApplicationFilters;
    groupedApplications: Record<DashboardStatus, Application[]>;
    historyByApp: Record<string, ActivityLog[]>;
    openTimelineId: string | null;
    trackerApplications: Application[];
    onApplyFilters: () => void;
    onImportOpen: () => void;
    onCreateApplication: () => void;
    onCreateInterview: (applicationId?: string) => void;
    onFiltersChange: (filters: ApplicationFilters) => void;
    onRemoveApplication: (id: string) => void;
    onStartEdit: (application: Application) => void;
    onToggleTimeline: (id: string) => void | Promise<void>;
    onTransitionStatus: (id: string, nextStatus: string) => void | Promise<void>;
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

export function ApplicationTracker({
    applications,
    filters,
    groupedApplications,
    historyByApp,
    openTimelineId,
    trackerApplications,
    onApplyFilters,
    onImportOpen,
    onCreateApplication,
    onCreateInterview,
    onFiltersChange,
    onRemoveApplication,
    onStartEdit,
    onToggleTimeline,
    onTransitionStatus,
}: ApplicationTrackerProps) {
    return (
        <section className="panel tracker-panel">
            <div className="panel-title">
                <div>
                    <h2>
                        <span className="heading-icon">
                            <AppIcon name="applications" size={17} />
                        </span>
                        Application Tracker
                        <span
                            className="info-icon"
                            aria-label="Application tracker information"
                        >
                            <AppIcon name="info" size={14} />
                        </span>
                    </h2>
                </div>
                <div className="panel-title">
                    <button className="primary" onClick={onImportOpen}>
                        <AppIcon name="import" size={18} />
                        Import Job
                    </button>
                    <button className="secondary" onClick={onCreateApplication}>
                        <AppIcon name="plus" size={18} />
                        Add Application
                    </button>
                </div>
            </div>
            <div className="filter-row" aria-label="Application filters">
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
                    placeholder="Company"
                    value={filters.company}
                    onChange={(event) =>
                        onFiltersChange({ ...filters, company: event.target.value })
                    }
                />
                <input
                    type="date"
                    aria-label="Start date"
                    value={filters.startDate}
                    onChange={(event) =>
                        onFiltersChange({ ...filters, startDate: event.target.value })
                    }
                />
                <input
                    type="date"
                    aria-label="End date"
                    value={filters.endDate}
                    onChange={(event) =>
                        onFiltersChange({ ...filters, endDate: event.target.value })
                    }
                />
                <button onClick={onApplyFilters}>
                    <AppIcon name="filter" size={16} />
                    Apply filters
                </button>
            </div>
            <div className="kanban">
                {DASHBOARD_STATUSES.map((status) => (
                    <section
                        key={status}
                        className={`lane ${status.toLowerCase()}`}
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
                            {groupedApplications[status].map((application) => (
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
                                    <b>{application.title}</b>
                                    <span>{application.companyName ?? "Unknown"}</span>
                                    <small className="applied-date">
                                        <AppIcon name="calendar" size={12} />
                                        {formatAppliedDate(application.dateApplied)}
                                    </small>
                                    <div>
                                        <button onClick={() => onStartEdit(application)}>
                                            <AppIcon name="edit" size={13} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onRemoveApplication(application.id)}
                                        >
                                            <AppIcon name="trash" size={13} />
                                            Delete
                                        </button>
                                        <button
                                            onClick={() =>
                                                onCreateInterview(application.id)
                                            }
                                        >
                                            <AppIcon name="calendar" size={13} />
                                            Interview
                                        </button>
                                        <button
                                            onClick={() => onToggleTimeline(application.id)}
                                        >
                                            <AppIcon name="history" size={13} />
                                            History
                                        </button>
                                    </div>
                                    {openTimelineId === application.id && (
                                        <ul>
                                            {(historyByApp[application.id] ?? []).map((entry) => (
                                                <li key={entry.id}>{entry.message}</li>
                                            ))}
                                        </ul>
                                    )}
                                </article>
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
