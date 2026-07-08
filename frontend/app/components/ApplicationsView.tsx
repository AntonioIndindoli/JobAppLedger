"use client";

import { useMemo, useState } from "react";

import {
    getApplicationTimestamp,
    isApplicationStatus,
} from "../lib/application-analytics";
import { SOURCES, STATUSES, STATUS_LABELS } from "../lib/constants";
import type { Application } from "../lib/types";
import { AppIcon } from "./AppIcon";

type ApplicationsViewProps = {
    applications: Application[];
    onCreateApplication: () => void;
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

function getSortValue(application: Application, sortKey: SortKey) {
    if (sortKey === "dateApplied") return getApplicationTimestamp(application);
    if (sortKey === "status") return getStatusLabel(application.status);

    return (application[sortKey] ?? "").toString().toLowerCase();
}

function getStatusLabel(status: string) {
    return isApplicationStatus(status) ? STATUS_LABELS[status] : status;
}

export function ApplicationsView({
    applications,
    onCreateApplication,
    onImportOpen,
    onRemoveApplication,
    onStartEdit,
}: ApplicationsViewProps) {
    const [filters, setFilters] =
        useState<ApplicationsTableFilters>(INITIAL_FILTERS);
    const [sortKey, setSortKey] = useState<SortKey>("dateApplied");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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
                className="table-sort-button"
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
                    <h1>All applications</h1>
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
                <input
                    value={filters.query}
                    onChange={(event) =>
                        setFilters({ ...filters, query: event.target.value })
                    }
                    placeholder="Search title, company, location, source"
                />
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
                    className="secondary"
                    onClick={() => setFilters(INITIAL_FILTERS)}
                >
                    <AppIcon name="filter" size={16} />
                    Reset
                </button>
            </div>

            <div className="applications-table-panel">
                <div className="applications-table-scroll">
                    <table className="applications-table">
                        <thead>
                            <tr>
                                <th
                                    scope="col"
                                    aria-sort={
                                        sortKey === "title"
                                            ? sortDirection === "asc"
                                                ? "ascending"
                                                : "descending"
                                            : "none"
                                    }
                                >
                                    {renderSortButton("Role", "title")}
                                </th>
                                <th
                                    scope="col"
                                    aria-sort={
                                        sortKey === "companyName"
                                            ? sortDirection === "asc"
                                                ? "ascending"
                                                : "descending"
                                            : "none"
                                    }
                                >
                                    {renderSortButton("Company", "companyName")}
                                </th>
                                <th
                                    scope="col"
                                    aria-sort={
                                        sortKey === "status"
                                            ? sortDirection === "asc"
                                                ? "ascending"
                                                : "descending"
                                            : "none"
                                    }
                                >
                                    {renderSortButton("Status", "status")}
                                </th>
                                <th
                                    scope="col"
                                    aria-sort={
                                        sortKey === "source"
                                            ? sortDirection === "asc"
                                                ? "ascending"
                                                : "descending"
                                            : "none"
                                    }
                                >
                                    {renderSortButton("Source", "source")}
                                </th>
                                <th
                                    scope="col"
                                    aria-sort={
                                        sortKey === "location"
                                            ? sortDirection === "asc"
                                                ? "ascending"
                                                : "descending"
                                            : "none"
                                    }
                                >
                                    {renderSortButton("Location", "location")}
                                </th>
                                <th
                                    scope="col"
                                    aria-sort={
                                        sortKey === "dateApplied"
                                            ? sortDirection === "asc"
                                                ? "ascending"
                                                : "descending"
                                            : "none"
                                    }
                                >
                                    {renderSortButton("Applied", "dateApplied")}
                                </th>
                                <th scope="col">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedApplications.map((application) => (
                                <tr key={application.id}>
                                    <td>
                                        <strong>{application.title}</strong>
                                        {application.sourceUrl && (
                                            <a
                                                href={application.sourceUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                View posting
                                            </a>
                                        )}
                                    </td>
                                    <td>{application.companyName || "Unknown"}</td>
                                    <td>
                                        <span
                                            className={`status-pill ${application.status.toLowerCase()}`}
                                        >
                                            {getStatusLabel(application.status)}
                                        </span>
                                    </td>
                                    <td>{application.source || "No source"}</td>
                                    <td>{application.location || "Not set"}</td>
                                    <td>{formatDisplayDate(application.dateApplied)}</td>
                                    <td>
                                        <div className="applications-row-actions">
                                            <button
                                                type="button"
                                                onClick={() => onStartEdit(application)}
                                            >
                                                <AppIcon name="edit" size={14} />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onRemoveApplication(application.id)
                                                }
                                            >
                                                <AppIcon name="trash" size={14} />
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {sortedApplications.length === 0 && (
                    <div className="applications-empty">
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
                                : "Clear filters or adjust the search terms to expand the table."}
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
            </div>
        </section>
    );
}
