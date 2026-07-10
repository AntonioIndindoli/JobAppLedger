"use client";

import { MetricIcon } from "../AppIcon";
import { PipelineSankey } from "./PipelineSankey";
import { isUpcomingInterview } from "../../lib/interview-utils";
import { isTaskNeedingAttention } from "../../lib/task-utils";
import type { ActivityLog, Application, Interview, Task } from "../../lib/types";

type DashboardStatsProps = {
    activePipeline: number;
    applications: Application[];
    historyByApp: Record<string, ActivityLog[]>;
    interviews: Interview[];
    tasks: Task[];
};

export function DashboardStats({
    activePipeline,
    applications,
    historyByApp,
    interviews,
    tasks,
}: DashboardStatsProps) {
    const upcomingInterviewCount = interviews.filter(isUpcomingInterview).length;
    const dueTaskCount = tasks.filter(isTaskNeedingAttention).length;

    return (
        <section className="pipeline-stats-container">
            <PipelineSankey
                applications={applications}
                historyByApp={historyByApp}
            />
            <section className="stat-grid">
                <div className="stat-card">
                    <MetricIcon name="applications" />
                    <div>
                        <p>Total Applications</p>
                        <strong>{applications.length}</strong>
                        <span>All time</span>
                    </div>
                </div>
                <div className="stat-card">
                    <MetricIcon name="pipeline" tone="green" />
                    <div>
                        <p>Active Applications</p>
                        <strong>{activePipeline}</strong>
                        <span>In progress</span>
                    </div>
                </div>
                <div className="stat-card">
                    <MetricIcon name="calendar" tone="purple" />
                    <div>
                        <p>Interviews Scheduled</p>
                        <strong>{upcomingInterviewCount}</strong>
                        <span>Upcoming</span>
                    </div>
                </div>
                <div className="stat-card">
                    <MetricIcon name="checklist" tone="orange" />
                    <div>
                        <p>Tasks Due</p>
                        <strong>{dueTaskCount}</strong>
                        <span>Needs attention</span>
                    </div>
                </div>
            </section>
        </section>
    );
}
