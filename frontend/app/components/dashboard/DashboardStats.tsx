"use client";

import { getApplicationTimestamp } from "../../lib/application-analytics";
import { MetricIcon } from "../AppIcon";
import { PipelineSankey } from "./PipelineSankey";
import { isUpcomingInterview } from "../../lib/interview-utils";
import { isTaskNeedingAttention } from "../../lib/task-utils";
import type {
    ActivityLog,
    Application,
    AppIconName,
    IconTone,
    Interview,
    Task,
} from "../../lib/types";

const WEEKLY_APPLICATION_GOAL_TARGET = 5;
const RESPONSE_STATUSES = new Set(["INTERVIEWING", "OFFER", "REJECTED", "WITHDRAWN"]);
const INTERVIEW_STATUSES = new Set(["INTERVIEWING", "OFFER"]);

type DashboardStatsProps = {
    activePipeline: number;
    applications: Application[];
    historyByApp: Record<string, ActivityLog[]>;
    interviews: Interview[];
    tasks: Task[];
};

function getMetadataObject(metadata: ActivityLog["metadata"]) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        return null;
    }

    return metadata as Record<string, unknown>;
}

function historyIncludesStatus(history: ActivityLog[], statuses: Set<string>) {
    return history.some((entry) => {
        const metadata = getMetadataObject(entry.metadata);
        return (
            statuses.has(String(metadata?.from ?? "")) ||
            statuses.has(String(metadata?.to ?? ""))
        );
    });
}

function getPercent(value: number, total: number) {
    if (!total) return 0;
    return Math.round((value / total) * 100);
}

function isThisWeek(application: Application) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(weekStart.getDate() + 7);

    const applicationTime = getApplicationTimestamp(application);
    return (
        applicationTime >= weekStart.getTime() &&
        applicationTime < nextWeekStart.getTime()
    );
}

export function DashboardStats({
    activePipeline,
    applications,
    historyByApp,
    interviews,
    tasks,
}: DashboardStatsProps) {
    const upcomingInterviewCount = interviews.filter(isUpcomingInterview).length;
    const dueTaskCount = tasks.filter(isTaskNeedingAttention).length;
    const responseCount = applications.filter(
        (application) =>
            RESPONSE_STATUSES.has(application.status) ||
            historyIncludesStatus(
                historyByApp[application.id] ?? [],
                RESPONSE_STATUSES,
            ),
    ).length;
    const interviewCount = applications.filter(
        (application) =>
            INTERVIEW_STATUSES.has(application.status) ||
            historyIncludesStatus(
                historyByApp[application.id] ?? [],
                INTERVIEW_STATUSES,
            ),
    ).length;
    const responseRate = getPercent(responseCount, applications.length);
    const interviewRate = getPercent(interviewCount, applications.length);
    const weeklyApplications = applications.filter(isThisWeek).length;
    const weeklyGoalProgress = Math.min(
        100,
        getPercent(weeklyApplications, WEEKLY_APPLICATION_GOAL_TARGET),
    );
    const stats: Array<{
        label: string;
        value: string | number;
        icon: AppIconName;
        tone?: IconTone;
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
                            <div>
                                <p>{stat.label}</p>
                                <strong>{stat.value}</strong>
                            </div>
                            <MetricIcon name={stat.icon} tone={stat.tone} />
                        </article>
                    ))}
                </div>
                <footer className="weekly-goal-summary">
                    <h3>Weekly Application Goal</h3>
                    <div className="weekly-goal-copy">
                        <span>
                            {weeklyApplications} of {WEEKLY_APPLICATION_GOAL_TARGET}{" "}
                            applications this week
                        </span>
                        <strong>{weeklyGoalProgress}% complete</strong>
                    </div>
                    <div
                        className="weekly-goal-bar"
                        role="progressbar"
                        aria-label="Weekly application goal progress"
                        aria-valuemin={0}
                        aria-valuemax={WEEKLY_APPLICATION_GOAL_TARGET}
                        aria-valuenow={Math.min(
                            weeklyApplications,
                            WEEKLY_APPLICATION_GOAL_TARGET,
                        )}
                    >
                        <span style={{ width: `${weeklyGoalProgress}%` }} />
                    </div>
                </footer>
            </section>
        </section>
    );
}
