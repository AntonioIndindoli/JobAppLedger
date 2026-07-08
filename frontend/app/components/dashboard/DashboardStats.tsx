"use client";

import { MetricIcon } from "../AppIcon";
import { PipelineSankey } from "./PipelineSankey";
import type { ActivityLog, Application } from "../../lib/types";

type DashboardStatsProps = {
    activePipeline: number;
    applications: Application[];
    historyByApp: Record<string, ActivityLog[]>;
};

export function DashboardStats({
    activePipeline,
    applications,
    historyByApp,
}: DashboardStatsProps) {
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
                        <strong>0</strong>
                        <span>Upcoming</span>
                    </div>
                </div>
                <div className="stat-card">
                    <MetricIcon name="checklist" tone="orange" />
                    <div>
                        <p>Tasks Due</p>
                        <strong>0</strong>
                        <span>Needs attention</span>
                    </div>
                </div>
            </section>
        </section>
    );
}
