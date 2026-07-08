"use client";

import { useMemo, useState } from "react";

import {
    getInterviewOutcomeLabel,
    getInterviewTimestamp,
    getInterviewTypeLabel,
    formatInterviewDateTime,
    formatInterviewDuration,
    sortInterviewsBySchedule,
} from "../lib/interview-utils";
import { INTERVIEW_OUTCOMES, INTERVIEW_TYPES } from "../lib/constants";
import type { Application, Interview } from "../lib/types";
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
    startDate: string;
    endDate: string;
};

const INITIAL_FILTERS: InterviewFilters = {
    query: "",
    type: "",
    outcome: "",
    startDate: "",
    endDate: "",
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

export function InterviewsView({
    applications,
    interviews,
    onCreateInterview,
    onRemoveInterview,
    onStartEdit,
}: InterviewsViewProps) {
    const [filters, setFilters] = useState<InterviewFilters>(INITIAL_FILTERS);

    const filteredInterviews = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        const startTime = filters.startDate
            ? new Date(`${filters.startDate}T00:00:00`).getTime()
            : null;
        const endTime = filters.endDate
            ? new Date(`${filters.endDate}T23:59:59`).getTime()
            : null;

        return interviews.filter((interview) => {
            if (query && !getSearchableInterviewText(interview).includes(query))
                return false;
            if (filters.type && interview.type !== filters.type) return false;
            if (filters.outcome && interview.outcome !== filters.outcome) return false;

            const scheduledTime = getInterviewTimestamp(interview);
            if (startTime !== null && scheduledTime < startTime) return false;
            if (endTime !== null && scheduledTime > endTime) return false;

            return true;
        });
    }, [filters, interviews]);

    const sortedInterviews = useMemo(
        () => sortInterviewsBySchedule(filteredInterviews, "asc"),
        [filteredInterviews],
    );

    return (
        <section className="applications-page interviews-page">
            <header className="applications-header">
                <div>
                    <p>Interviews</p>
                    <h1>All interviews</h1>
                    <span>
                        {sortedInterviews.length} of {interviews.length} interviews shown
                    </span>
                </div>
                <div className="applications-actions">
                    <button
                        type="button"
                        className="primary"
                        onClick={onCreateInterview}
                        disabled={applications.length === 0}
                    >
                        <AppIcon name="calendar" size={18} />
                        Add Interview
                    </button>
                </div>
            </header>

            <div
                className="applications-toolbar interviews-toolbar"
                aria-label="Interview table filters"
            >
                <input
                    value={filters.query}
                    onChange={(event) =>
                        setFilters({ ...filters, query: event.target.value })
                    }
                    placeholder="Search application, company, interviewer, notes"
                />
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
                <select
                    value={filters.outcome}
                    onChange={(event) =>
                        setFilters({ ...filters, outcome: event.target.value })
                    }
                >
                    <option value="">All outcomes</option>
                    {INTERVIEW_OUTCOMES.map((outcome) => (
                        <option key={outcome} value={outcome}>
                            {getInterviewOutcomeLabel(outcome)}
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
                    <table className="applications-table interviews-table">
                        <thead>
                            <tr>
                                <th scope="col">When</th>
                                <th scope="col">Application</th>
                                <th scope="col">Type</th>
                                <th scope="col">Outcome</th>
                                <th scope="col">Details</th>
                                <th scope="col">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedInterviews.map((interview) => (
                                <tr key={interview.id}>
                                    <td>
                                        <strong>
                                            {formatInterviewDateTime(interview.scheduledAt)}
                                        </strong>
                                        <span>
                                            {formatInterviewDuration(
                                                interview.durationMinutes,
                                            )}
                                        </span>
                                    </td>
                                    <td>
                                        <strong>
                                            {interview.applicationTitle ?? "Unknown role"}
                                        </strong>
                                        <span>
                                            {interview.companyName ?? "Unknown company"}
                                        </span>
                                    </td>
                                    <td>{getInterviewTypeLabel(interview.type)}</td>
                                    <td>
                                        <span
                                            className={`status-pill ${interview.outcome.toLowerCase()}`}
                                        >
                                            {getInterviewOutcomeLabel(interview.outcome)}
                                        </span>
                                    </td>
                                    <td>
                                        <span>
                                            {interview.interviewerName ?? "No interviewer"}
                                        </span>
                                        <span>{interview.location ?? "No location"}</span>
                                        {interview.meetingUrl && (
                                            <a
                                                href={interview.meetingUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open meeting
                                            </a>
                                        )}
                                    </td>
                                    <td>
                                        <div className="applications-row-actions">
                                            <button
                                                type="button"
                                                onClick={() => onStartEdit(interview)}
                                            >
                                                <AppIcon name="edit" size={14} />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onRemoveInterview(interview.id)
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

                {sortedInterviews.length === 0 && (
                    <div className="applications-empty">
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
                        <button
                            type="button"
                            className="secondary"
                            onClick={onCreateInterview}
                            disabled={applications.length === 0}
                        >
                            <AppIcon name="calendar" size={18} />
                            Add Interview
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
