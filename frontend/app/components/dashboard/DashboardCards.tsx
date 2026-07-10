"use client";

import {
    formatInterviewDateTime,
    getInterviewTypeLabel,
} from "../../lib/interview-utils";
import {
    formatTaskDueDate,
    getTaskDueState,
    getTaskTypeLabel,
    isOpenTask,
    sortTasksByDueDate,
} from "../../lib/task-utils";
import type { Interview, Task } from "../../lib/types";
import { AddInterviewButton } from "../AddInterviewButton";
import { AppIcon } from "../AppIcon";

type DashboardCardsProps = {
    canCreateInterview: boolean;
    tasks: Task[];
    upcomingInterviews: Interview[];
    onCreateInterview: () => void;
    onCreateTask: () => void;
    onImportOpen: () => void;
    onViewInterviews: () => void;
    onViewTasks: () => void;
};

export function DashboardCards({
    canCreateInterview,
    tasks,
    upcomingInterviews,
    onCreateInterview,
    onCreateTask,
    onImportOpen,
    onViewInterviews,
    onViewTasks,
}: DashboardCardsProps) {
    const visibleInterviews = upcomingInterviews.slice(0, 3);
    const visibleTasks = sortTasksByDueDate(tasks.filter(isOpenTask)).slice(0, 3);

    return (
        <section className="mini-grid">
            <div
                className={
                    visibleInterviews.length
                        ? "panel empty-card upcoming-card"
                        : "panel empty-card"
                }
            >
                <h2>
                    <span>
                        <span className="heading-icon">
                            <AppIcon name="calendar" size={16} />
                        </span>
                        Upcoming Interviews
                    </span>
                    <button
                        type="button"
                        className="card-link"
                        onClick={onViewInterviews}
                    >
                        View all
                    </button>
                </h2>
                {visibleInterviews.length ? (
                    <div className="interview-card-list">
                        {visibleInterviews.map((interview) => (
                            <article key={interview.id} className="interview-card-item">
                                <strong>
                                    {interview.applicationTitle ?? "Unknown role"}
                                </strong>
                                <span>
                                    {interview.companyName ?? "Unknown company"}
                                </span>
                                <div className="interview-card-item-container">
                                    <small>
                                        <AppIcon name="clock" size={13} />
                                        {formatInterviewDateTime(interview.scheduledAt)}
                                    </small>
                                    <em>{getInterviewTypeLabel(interview.type)}</em>
                                </div>
                            </article>
                        ))}
                        <AddInterviewButton
                            className="secondary small"
                            onClick={onCreateInterview}
                            disabled={!canCreateInterview}
                            iconSize={15}
                        />
                    </div>
                ) : (
                    <>
                        <div className="empty-illustration">
                            <AppIcon name="calendar" size={38} strokeWidth={1.5} />
                        </div>
                        <h3>No interviews scheduled yet</h3>
                        <p>When you schedule interviews, they&apos;ll appear here.</p>
                        <AddInterviewButton
                            className="secondary small"
                            onClick={onCreateInterview}
                            disabled={!canCreateInterview}
                            iconSize={15}
                        />
                    </>
                )}
            </div>
            <div
                className={
                    visibleTasks.length
                        ? "panel empty-card upcoming-card task-card"
                        : "panel empty-card"
                }
            >
                <h2>
                    <span>
                        <span className="heading-icon">
                            <AppIcon name="checklist" size={16} />
                        </span>
                        Tasks & Follow-Ups
                    </span>
                    <button type="button" className="card-link" onClick={onViewTasks}>
                        View all
                    </button>
                </h2>
                {visibleTasks.length ? (
                    <div className="interview-card-list task-card-list">
                        {visibleTasks.map((task) => (
                            <article key={task.id} className="interview-card-item">
                                <strong>{task.title}</strong>
                                <span>
                                    {task.applicationTitle
                                        ? `${task.applicationTitle} at ${
                                            task.companyName ?? "Unknown company"
                                        }`
                                        : "No linked application"}
                                </span>
                                <div className="interview-card-item-container">
                                    <small>
                                        <AppIcon name="clock" size={13} />
                                        {formatTaskDueDate(task.dueDate)}
                                    </small>
                                    <em className={getTaskDueState(task)}>
                                        {getTaskTypeLabel(task.type)}
                                    </em>
                                </div>
                            </article>
                        ))}
                        <button
                            type="button"
                            className="secondary small"
                            onClick={onCreateTask}
                        >
                            <AppIcon name="plus" size={15} />
                            Create Task
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="empty-illustration">
                            <AppIcon name="checklist" size={38} strokeWidth={1.5} />
                        </div>
                        <h3>No tasks yet</h3>
                        <p>Create follow-up tasks and never miss a beat.</p>
                        <button
                            type="button"
                            className="secondary small"
                            onClick={onCreateTask}
                        >
                            <AppIcon name="plus" size={15} />
                            Create Task
                        </button>
                    </>
                )}
            </div>
            <div className="panel empty-card">
                <h2>
                    <span>
                        <span className="heading-icon">
                            <AppIcon name="import" size={16} />
                        </span>
                        PLACEHOLDER TITLE
                    </span>
                    <button type="button" className="card-link">
                        View all
                    </button>
                </h2>
                <div className="empty-illustration">
                    <AppIcon name="document" size={38} strokeWidth={1.5} />
                </div>
                <h3>PLACEHOLDER TEXT</h3>
                <p>
                    lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nisl nec
                </p>
                <button className="secondary small" onClick={onImportOpen}>
                    <AppIcon name="import" size={15} />
                    Placeholder Button
                </button>
            </div>
        </section>
    );
}
