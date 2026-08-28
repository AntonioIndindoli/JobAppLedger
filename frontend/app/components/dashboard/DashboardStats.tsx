"use client";

import { useState } from "react";

import { getApplicationTimestamp } from "../../lib/application-analytics";
import { APPLICATION_GOAL_PERIOD_OPTIONS } from "../../lib/constants";
import { hasRetainedMilestone } from "../../lib/dashboard-metrics";
import { AppIcon, MetricIcon } from "../AppIcon";
import { PipelineSankey } from "./PipelineSankey";
import { isUpcomingInterview } from "../../lib/interview-utils";
import { isTaskNeedingAttention } from "../../lib/task-utils";
import type {
    ActivityLog,
    Application,
    ApplicationGoalPeriod,
    ApplicationGoalSettings,
    AppIconName,
    IconTone,
    Interview,
    Task,
} from "../../lib/types";

const RESPONSE_STATUSES = new Set(["INTERVIEWING", "OFFER", "REJECTED", "WITHDRAWN"]);
const INTERVIEW_STATUSES = new Set(["INTERVIEWING", "OFFER"]);
const OFFER_STATUSES = new Set(["OFFER"]);
const GOAL_PERIOD_COPY: Record<
    ApplicationGoalPeriod,
    { ariaLabel: string; countLabel: string; title: string }
> = {
    daily: {
        ariaLabel: "Daily application goal progress",
        countLabel: "today",
        title: "Daily Application Goal",
    },
    weekly: {
        ariaLabel: "Weekly application goal progress",
        countLabel: "this week",
        title: "Weekly Application Goal",
    },
    monthly: {
        ariaLabel: "Monthly application goal progress",
        countLabel: "this month",
        title: "Monthly Application Goal",
    },
};

type DashboardStatsProps = {
    activePipeline: number;
    applicationGoal: ApplicationGoalSettings;
    applications: Application[];
    historyByApp: Record<string, ActivityLog[]>;
    interviews: Interview[];
    onApplicationGoalChange: (goal: ApplicationGoalSettings) => void;
    tasks: Task[];
};

type ApplicationGoalControlsProps = {
    applicationGoal: ApplicationGoalSettings;
    onApplicationGoalChange: (goal: ApplicationGoalSettings) => void;
};

function getPercent(value: number, total: number) {
    if (!total) return 0;
    return Math.round((value / total) * 100);
}

function getGoalTarget(target: number) {
    return Number.isFinite(target) ? Math.max(1, Math.floor(target)) : 1;
}

function getGoalPeriodRange(period: ApplicationGoalPeriod) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (period === "weekly") {
        start.setDate(start.getDate() - start.getDay());
    }

    if (period === "monthly") {
        start.setDate(1);
    }

    const end = new Date(start);
    if (period === "daily") end.setDate(start.getDate() + 1);
    if (period === "weekly") end.setDate(start.getDate() + 7);
    if (period === "monthly") end.setMonth(start.getMonth() + 1);

    return { end: end.getTime(), start: start.getTime() };
}

function getCurrentWeekRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return { end: end.getTime(), start: start.getTime() };
}

function ApplicationGoalControls({
    applicationGoal,
    onApplicationGoalChange,
}: ApplicationGoalControlsProps) {
    const goalTarget = getGoalTarget(applicationGoal.target);
    const [goalTargetDraft, setGoalTargetDraft] = useState(String(goalTarget));

    function updateGoalTarget(nextValue: string) {
        setGoalTargetDraft(nextValue);

        const parsedTarget = Number(nextValue);
        if (!Number.isFinite(parsedTarget) || parsedTarget < 1) return;

        onApplicationGoalChange({
            ...applicationGoal,
            target: Math.floor(parsedTarget),
        });
    }

    function commitGoalTarget() {
        const parsedTarget = Number(goalTargetDraft);
        if (!Number.isFinite(parsedTarget) || parsedTarget < 1) {
            setGoalTargetDraft(String(goalTarget));
            return;
        }

        const nextTarget = Math.floor(parsedTarget);
        setGoalTargetDraft(String(nextTarget));
        if (nextTarget === applicationGoal.target) return;

        onApplicationGoalChange({ ...applicationGoal, target: nextTarget });
    }

    function updateGoalPeriod(nextPeriod: ApplicationGoalPeriod) {
        onApplicationGoalChange({ ...applicationGoal, period: nextPeriod });
    }

    return (
        <div
            className="application-goal-controls"
            aria-label="Application goal controls"
        >
            <label className="application-goal-field">
                <span>Goal</span>
                <input
                    type="number"
                    min={1}
                    step={1}
                    value={goalTargetDraft}
                    aria-label="Application goal target"
                    onBlur={commitGoalTarget}
                    onChange={(event) => updateGoalTarget(event.target.value)}
                />
            </label>
            <label className="application-goal-field">
                <span>Period</span>
                <select
                    value={applicationGoal.period}
                    aria-label="Application goal period"
                    onChange={(event) =>
                        updateGoalPeriod(event.target.value as ApplicationGoalPeriod)
                    }
                >
                    {APPLICATION_GOAL_PERIOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}

export function DashboardStats({
    activePipeline,
    applicationGoal,
    applications,
    historyByApp,
    interviews,
    onApplicationGoalChange,
    tasks,
}: DashboardStatsProps) {
    const [isGoalEditorOpen, setIsGoalEditorOpen] = useState(false);
    const upcomingInterviewCount = interviews.filter(isUpcomingInterview).length;
    const dueTaskCount = tasks.filter(isTaskNeedingAttention).length;
    const responseCount = applications.filter(
        (application) => RESPONSE_STATUSES.has(application.status),
    ).length;
    const submittedApplications = applications.filter(
        (application) => application.status !== "SAVED",
    );
    const interviewCount = submittedApplications.filter(
        (application) =>
            hasRetainedMilestone(
                application,
                historyByApp[application.id] ?? [],
                INTERVIEW_STATUSES,
            ),
    ).length;
    const offerCount = submittedApplications.filter(
        (application) =>
            hasRetainedMilestone(
                application,
                historyByApp[application.id] ?? [],
                OFFER_STATUSES,
            ),
    ).length;
    const responseRate = getPercent(responseCount, applications.length);
    const interviewRate = getPercent(
        interviewCount,
        submittedApplications.length,
    );
    const offerRate = getPercent(offerCount, submittedApplications.length);
    const currentWeekRange = getCurrentWeekRange();
    const applicationsThisWeek = submittedApplications.filter((application) => {
        const applicationTime = getApplicationTimestamp(application);
        return (
            applicationTime >= currentWeekRange.start &&
            applicationTime < currentWeekRange.end
        );
    }).length;
    const goalPeriodRange = getGoalPeriodRange(applicationGoal.period);
    const goalTarget = getGoalTarget(applicationGoal.target);
    const goalApplications = applications.filter((application) => {
        const applicationTime = getApplicationTimestamp(application);
        return (
            applicationTime >= goalPeriodRange.start &&
            applicationTime < goalPeriodRange.end
        );
    }).length;
    const goalProgress = Math.min(
        100,
        getPercent(goalApplications, goalTarget),
    );
    const goalCopy = GOAL_PERIOD_COPY[applicationGoal.period];
    const stats: Array<{
        label: string;
        value: string | number;
        icon: AppIconName;
        tone?: IconTone;
        detail?: string;
    }> = [
            {
                label: "Total Applications",
                value: applications.length,
                icon: "applications",
            },
            {
                label: "Active Applications",
                value: activePipeline,
                icon: "trend",
                tone: "green",
            },
            {
                label: "Response Rate",
                value: `${responseRate}%`,
                icon: "clock",
            },
            {
                label: "Interview Rate",
                value: `${interviewRate}%`,
                icon: "contacts",
                tone: "purple",
            },
            {
                label: "Interviews Scheduled",
                value: upcomingInterviewCount,
                icon: "calendar",
                tone: "orange",
            },
            {
                label: "Tasks & Follow-ups Due",
                value: dueTaskCount,
                icon: "checklist",
                tone: "slate",
            },
        ];

    return (
        <section className="pipeline-stats-container">
            <PipelineSankey
                applications={applications}
                historyByApp={historyByApp}
            />
            <section className="stats-panel" aria-labelledby="stats-heading">
                <h2 id="stats-heading">Job Search Stats</h2>
                <div className="stat-grid">
                    {stats.map((stat) => (
                        <article className="stat-card" key={stat.label}>
                            <MetricIcon name={stat.icon} tone={stat.tone} />
                            <div>
                                <p>{stat.label}</p>
                                <strong>{stat.value}</strong>
                                {stat.detail && (
                                    <small className="stat-detail">{stat.detail}</small>
                                )}
                            </div>

                        </article>
                    ))}
                </div>
                <footer className="weekly-goal-summary">
                    <div className="weekly-goal-header">
                        <h3>{goalCopy.title}</h3>
                        <button
                            type="button"
                            className="goal-edit-button"
                            aria-label="Edit application goal"
                            aria-expanded={isGoalEditorOpen}
                            onClick={() => setIsGoalEditorOpen((isOpen) => !isOpen)}
                        >
                            <AppIcon name="edit" size={16} />
                        </button>
                    </div>
                    {isGoalEditorOpen && (
                        <ApplicationGoalControls
                            applicationGoal={applicationGoal}
                            onApplicationGoalChange={onApplicationGoalChange}
                        />
                    )}
                    <div className="weekly-goal-copy">
                        <span>
                            {goalApplications} of {goalTarget} applications{" "}
                            {goalCopy.countLabel}
                        </span>
                        <strong>{goalProgress}% complete</strong>
                    </div>
                    <div
                        className="weekly-goal-bar"
                        role="progressbar"
                        aria-label={goalCopy.ariaLabel}
                        aria-valuemin={0}
                        aria-valuemax={goalTarget}
                        aria-valuenow={Math.min(goalApplications, goalTarget)}
                    >
                        <span style={{ width: `${goalProgress}%` }} />
                    </div>
                </footer>
            </section>
        </section>
    );
}
