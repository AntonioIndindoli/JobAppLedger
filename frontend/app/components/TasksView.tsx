"use client";

import { useMemo, useState } from "react";

import { TASK_TYPES } from "../lib/constants";
import {
    formatTaskDueDate,
    getTaskDueState,
    getTaskTypeLabel,
    isOpenTask,
    sortTasksByDueDate,
    type TaskDueState,
} from "../lib/task-utils";
import type {
    Application,
    Task,
    TaskAutomationPreferences,
} from "../lib/types";
import { AppIcon } from "./AppIcon";
import { InitialsBadge } from "./InitialsBadge";

type TasksViewProps = {
    applications: Application[];
    preferences: TaskAutomationPreferences;
    tasks: Task[];
    onCompleteTask: (id: string) => void | Promise<void>;
    onCreateTask: (applicationId?: string) => void;
    onPreferenceChange: (
        preferences: Partial<TaskAutomationPreferences>,
    ) => void | Promise<void>;
    onRemoveTask: (id: string) => void | Promise<void>;
    onStartEdit: (task: Task) => void;
    onViewApplication: (id: string) => void;
};

type TaskFilters = {
    query: string;
    type: string;
    status: "" | TaskDueState;
    applicationId: string;
};

type SortKey = "dueDate" | "title" | "applicationTitle" | "type" | "status";
type SortDirection = "asc" | "desc";

const INITIAL_FILTERS: TaskFilters = {
    query: "",
    type: "",
    status: "",
    applicationId: "",
};

const TASK_STATUS_LABELS: Record<TaskDueState, string> = {
    completed: "Completed",
    overdue: "Overdue",
    today: "Due today",
    upcoming: "Upcoming",
    unscheduled: "No due date",
};

const TASK_STATUS_FILTERS: Array<{ value: TaskFilters["status"]; label: string }> = [
    { value: "", label: "All statuses" },
    { value: "overdue", label: "Overdue" },
    { value: "today", label: "Due today" },
    { value: "upcoming", label: "Upcoming" },
    { value: "unscheduled", label: "No due date" },
    { value: "completed", label: "Completed" },
];

function getSearchableTaskText(task: Task) {
    return [
        task.title,
        task.description,
        task.applicationTitle,
        task.companyName,
        getTaskTypeLabel(task.type),
        TASK_STATUS_LABELS[getTaskDueState(task)],
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

function getSortValue(task: Task, sortKey: SortKey) {
    if (sortKey === "dueDate") return sortTasksByDueDate([task])[0]?.dueDate ?? "";
    if (sortKey === "type") return getTaskTypeLabel(task.type).toLowerCase();
    if (sortKey === "status") return TASK_STATUS_LABELS[getTaskDueState(task)];

    return (task[sortKey] ?? "").toString().toLowerCase();
}

function getTaskApplicationLabel(task: Task) {
    if (!task.applicationTitle) return "No linked application";
    return `${task.applicationTitle} at ${task.companyName ?? "Unknown company"}`;
}

function getTaskStatusClass(task: Task) {
    return getTaskDueState(task).replace("unscheduled", "no-due-date");
}

export function TasksView({
    applications,
    preferences,
    tasks,
    onCompleteTask,
    onCreateTask,
    onPreferenceChange,
    onRemoveTask,
    onStartEdit,
    onViewApplication,
}: TasksViewProps) {
    const [filters, setFilters] = useState<TaskFilters>(INITIAL_FILTERS);
    const [sortKey, setSortKey] = useState<SortKey>("dueDate");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    const taskSummary = useMemo(() => {
        const summary = {
            open: 0,
            overdue: 0,
            today: 0,
            completed: 0,
        };

        tasks.forEach((task) => {
            const state = getTaskDueState(task);
            if (state === "completed") summary.completed += 1;
            else summary.open += 1;
            if (state === "overdue") summary.overdue += 1;
            if (state === "today") summary.today += 1;
        });

        return summary;
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        const query = filters.query.trim().toLowerCase();

        return tasks.filter((task) => {
            if (query && !getSearchableTaskText(task).includes(query)) return false;
            if (filters.type && task.type !== filters.type) return false;
            if (filters.status && getTaskDueState(task) !== filters.status)
                return false;
            if (filters.applicationId && task.applicationId !== filters.applicationId)
                return false;

            return true;
        });
    }, [filters, tasks]);

    const sortedTasks = useMemo(() => {
        const baseTasks =
            sortKey === "dueDate" ? sortTasksByDueDate(filteredTasks) : [...filteredTasks];

        if (sortKey === "dueDate") {
            return sortDirection === "asc" ? baseTasks : [...baseTasks].reverse();
        }

        return baseTasks.sort((left, right) => {
            const leftValue = getSortValue(left, sortKey);
            const rightValue = getSortValue(right, sortKey);
            const directionMultiplier = sortDirection === "asc" ? 1 : -1;
            return String(leftValue).localeCompare(String(rightValue)) * directionMultiplier;
        });
    }, [filteredTasks, sortDirection, sortKey]);

    const selectedTask =
        sortedTasks.find((task) => task.id === selectedTaskId) ?? sortedTasks[0] ?? null;
    const selectedDescription = selectedTask?.description?.trim() ?? "";
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

    function renderPreferenceSwitch(
        label: string,
        meta: string,
        checked: boolean,
        keyName: keyof TaskAutomationPreferences,
    ) {
        return (
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                className={checked ? "task-switch active" : "task-switch"}
                onClick={() => onPreferenceChange({ [keyName]: !checked })}
            >
                <span className="task-switch-track" aria-hidden="true">
                    <span />
                </span>
                <span className="task-switch-copy">
                    <strong>{label}</strong>
                    <small>{meta}</small>
                </span>
            </button>
        );
    }

    return (
        <section className="applications-page tasks-page">
            <header className="applications-header">
                <div>
                    <p>Tasks & Follow-Ups</p>
                    <span className="tasks-header-meta" aria-label="Task summary">
                        <strong>{taskSummary.open} open</strong>
                        <strong>{taskSummary.overdue} overdue</strong>
                        <strong>{taskSummary.today} due today</strong>
                        <strong>{taskSummary.completed} completed</strong>
                    </span>
                </div>
                <div className="applications-actions">
                    <button
                        type="button"
                        className="primary"
                        onClick={() => onCreateTask()}
                    >
                        <AppIcon name="plus" size={18} />
                        Create Task
                    </button>
                </div>
            </header>

            <section className="task-automation-panel" aria-label="Task automation">
                <div className="task-automation-title">
                    <span>
                        <AppIcon name="checklist" size={18} />
                    </span>
                    <div>
                        <h2>Automation</h2>
                        <p>Follow-ups and thank-you notes can be created from job activity.</p>
                    </div>
                </div>
                <div className="task-automation-switches">
                    {renderPreferenceSwitch(
                        "Applied follow-ups",
                        "7 days after Applied",
                        preferences.autoCreateFollowUpTasks,
                        "autoCreateFollowUpTasks",
                    )}
                    {renderPreferenceSwitch(
                        "Interview thank-you notes",
                        "1 day after interview",
                        preferences.autoCreateThankYouTasks,
                        "autoCreateThankYouTasks",
                    )}
                </div>
            </section>

            <div className="interviews-control-panel tasks-control-panel">
                <label className="interviews-search-field tasks-search-field">
                    <AppIcon name="search" size={18} />
                    <input
                        aria-label="Search tasks"
                        value={filters.query}
                        onChange={(event) =>
                            setFilters({ ...filters, query: event.target.value })
                        }
                        placeholder="Search tasks"
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
                        {TASK_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {getTaskTypeLabel(type)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="interviews-select-field">
                    <span>Status</span>
                    <select
                        value={filters.status}
                        onChange={(event) =>
                            setFilters({
                                ...filters,
                                status: event.target.value as TaskFilters["status"],
                            })
                        }
                    >
                        {TASK_STATUS_FILTERS.map((status) => (
                            <option key={status.value || "all"} value={status.value}>
                                {status.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="interviews-select-field">
                    <span>Application</span>
                    <select
                        value={filters.applicationId}
                        onChange={(event) =>
                            setFilters({
                                ...filters,
                                applicationId: event.target.value,
                            })
                        }
                    >
                        <option value="">All applications</option>
                        {applications.map((application) => (
                            <option key={application.id} value={application.id}>
                                {application.title}
                                {application.companyName
                                    ? ` at ${application.companyName}`
                                    : ""}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="button"
                    className="interviews-reset-button"
                    disabled={!hasActiveFilters}
                    onClick={() => setFilters(INITIAL_FILTERS)}
                >
                    <AppIcon name="history" size={15} />
                    Reset
                </button>
            </div>

            <div className="applications-split-panel tasks-split-panel">
                <aside className="application-list-panel tasks-list-panel">
                    <div className="application-list-header">
                        <div>
                            <h2>Tasks</h2>
                            <span>
                                {sortedTasks.length} shown from {tasks.length} total
                            </span>
                        </div>
                    </div>

                    {sortedTasks.length > 0 ? (
                        <div className="application-list" role="list">
                            <div className="application-table-header tasks-table-columns" role="row" aria-label="Task columns and sorting">
                                {renderSortButton("Task", "title")}
                                {renderSortButton("Application", "applicationTitle")}
                                {renderSortButton("Due", "dueDate")}
                                {renderSortButton("Type", "type")}
                                {renderSortButton("Status", "status")}
                            </div>
                            {sortedTasks.map((task) => {
                                const state = getTaskDueState(task);
                                const isSelected = selectedTask?.id === task.id;
                                const isCompleted = !isOpenTask(task);

                                return (
                                    <button
                                        key={task.id}
                                        type="button"
                                        className={
                                            isSelected
                                                ? "application-list-item task-list-item tasks-table-columns active"
                                                : "application-list-item task-list-item tasks-table-columns"
                                        }
                                        aria-current={isSelected ? "true" : undefined}
                                        onClick={() => setSelectedTaskId(task.id)}
                                    >
                                        <span className="application-primary-cell">
                                            <InitialsBadge
                                                label={task.companyName}
                                                fallback={task.title}
                                                className={isCompleted ? "task-list-icon completed" : "task-list-icon"}
                                            />
                                            <strong>{task.title}</strong>
                                        </span>
                                        <span className="application-table-cell" data-label="Application">
                                            {getTaskApplicationLabel(task)}
                                        </span>
                                        <span className="application-table-cell" data-label="Due">
                                            {formatTaskDueDate(task.dueDate)}
                                        </span>
                                        <span className="application-table-cell" data-label="Type">
                                            {getTaskTypeLabel(task.type)}
                                        </span>
                                        <span
                                            className={`status-pill ${getTaskStatusClass(task)}`}
                                        >
                                            {TASK_STATUS_LABELS[state]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="applications-empty application-list-empty tasks-empty">
                            <span className="empty-illustration">
                                <AppIcon name="checklist" size={31} />
                            </span>
                            <h2>
                                {tasks.length === 0
                                    ? "No tasks yet"
                                    : "No tasks match these filters"}
                            </h2>
                            <p>
                                {tasks.length === 0
                                    ? "Create a task or enable automation to track follow-ups."
                                    : "Clear filters or adjust the search terms to expand the list."}
                            </p>
                            <button
                                type="button"
                                className="secondary"
                                onClick={() => onCreateTask()}
                            >
                                <AppIcon name="plus" size={18} />
                                Create Task
                            </button>
                        </div>
                    )}
                </aside>

                <aside
                    className="application-detail-panel task-detail-panel"
                    aria-label="Selected task"
                >
                    {selectedTask ? (
                        <>
                            <header className="application-detail-header task-detail-header">
                                <div className="application-detail-top-row">
                                    <div className="application-detail-title-line">
                                        <h2>{selectedTask.title}</h2>
                                        <span
                                            className={`status-pill ${getTaskStatusClass(selectedTask)}`}
                                        >
                                            {TASK_STATUS_LABELS[getTaskDueState(selectedTask)]}
                                        </span>
                                    </div>
                                    <div className="application-detail-header-actions">
                                        {isOpenTask(selectedTask) && (
                                            <button
                                                type="button"
                                                className="secondary task-complete-button"
                                                onClick={() => onCompleteTask(selectedTask.id)}
                                            >
                                                <AppIcon name="check" size={15} />
                                                Complete
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="secondary"
                                            onClick={() => onStartEdit(selectedTask)}
                                        >
                                            <AppIcon name="edit" size={15} />
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="danger application-detail-delete"
                                            onClick={() => onRemoveTask(selectedTask.id)}
                                        >
                                            <AppIcon name="trash" size={15} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <div className="application-detail-subline">
                                    <span className="task-type-pill">
                                        {getTaskTypeLabel(selectedTask.type)}
                                    </span>
                                    {selectedTask.applicationId ? (
                                        <button
                                            type="button"
                                            className="application-detail-posting-link"
                                            onClick={() => {
                                                if (selectedTask.applicationId) {
                                                    onViewApplication(
                                                        selectedTask.applicationId,
                                                    );
                                                }
                                            }}
                                        >
                                            <AppIcon name="applications" size={15} />
                                            View application
                                        </button>
                                    ) : (
                                        <span className="company-line">
                                            No linked application
                                        </span>
                                    )}
                                </div>
                            </header>

                            <div className="interview-detail-body task-detail-body">
                                <dl className="interview-detail-facts task-detail-facts">
                                    <div className="interview-detail-fact interview-detail-fact-primary">
                                        <dt>
                                            <span className="interview-detail-fact-icon">
                                                <AppIcon name="calendar" size={18} />
                                            </span>
                                            Due
                                        </dt>
                                        <dd>
                                            <strong>
                                                {formatTaskDueDate(selectedTask.dueDate)}
                                            </strong>
                                            <span>
                                                {
                                                    TASK_STATUS_LABELS[
                                                        getTaskDueState(selectedTask)
                                                    ]
                                                }
                                            </span>
                                        </dd>
                                    </div>

                                    <div className="interview-detail-fact">
                                        <dt>
                                            <span className="interview-detail-fact-icon">
                                                <AppIcon name="applications" size={18} />
                                            </span>
                                            Application
                                        </dt>
                                        <dd>
                                            <strong>
                                                {selectedTask.applicationTitle ??
                                                    "Not linked"}
                                            </strong>
                                            <span>
                                                {selectedTask.companyName ??
                                                    "No company linked"}
                                            </span>
                                        </dd>
                                    </div>

                                    <div className="interview-detail-fact">
                                        <dt>
                                            <span className="interview-detail-fact-icon">
                                                <AppIcon name="checklist" size={18} />
                                            </span>
                                            Type
                                        </dt>
                                        <dd>
                                            <strong>
                                                {getTaskTypeLabel(selectedTask.type)}
                                            </strong>
                                            <span>
                                                {selectedTask.completedAt
                                                    ? `Completed ${formatTaskDueDate(
                                                        selectedTask.completedAt,
                                                    )}`
                                                    : "Open task"}
                                            </span>
                                        </dd>
                                    </div>
                                </dl>

                                <section className="interview-notes-card task-notes-card">
                                    <div className="interview-detail-section-title">
                                        <div className="interview-notes-card-title">
                                            <h3>Description</h3>
                                        </div>
                                    </div>
                                    <p className={selectedDescription ? "" : "is-empty"}>
                                        {selectedDescription ||
                                            "No description saved for this task."}
                                    </p>
                                </section>
                            </div>
                        </>
                    ) : (
                        <div className="applications-empty">
                            <span className="empty-illustration">
                                <AppIcon name="checklist" size={31} />
                            </span>
                            <h2>Select a task</h2>
                            <p>Choose a task from the list to review its details.</p>
                        </div>
                    )}
                </aside>
            </div>
        </section>
    );
}
