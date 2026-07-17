"use client";

import { useMemo } from "react";

import { buildAnalyticsKpiCards } from "../lib/application-analytics";
import type {
    ActivityLog,
    Application,
    Interview,
    WeeklyRangeWeeks,
} from "../lib/types";
import { MetricIcon } from "./AppIcon";
import { ApplicationMap } from "./dashboard/ApplicationMap";
import { SourceBreakdown } from "./dashboard/SourceBreakdown";
import { SourceQualityTable } from "./dashboard/SourceQualityTable";
import { WeeklyApplications } from "./dashboard/WeeklyApplications";

type AnalyticsViewProps = {
    applications: Application[];
    historyByApp: Record<string, ActivityLog[]>;
    interviews: Interview[];
    weeklyRangeWeeks: WeeklyRangeWeeks;
    onViewApplication: (applicationId: string) => void;
    onWeeklyRangeChange: (weeks: WeeklyRangeWeeks) => void;
};

export function AnalyticsView({
    applications,
    historyByApp,
    interviews,
    weeklyRangeWeeks,
    onViewApplication,
    onWeeklyRangeChange,
}: AnalyticsViewProps) {
    const kpiCards = useMemo(
        () => buildAnalyticsKpiCards(applications, historyByApp, interviews),
        [applications, historyByApp, interviews],
    );

    return (
        <section className="applications-page analytics-page">
            <header className="page-header">
                <div>
                    <p>Analytics</p>
                    <span>
                        Source mix and application activity across{" "}
                        {applications.length} tracked{" "}
                        {applications.length === 1 ? "application" : "applications"}.
                    </span>
                </div>
            </header>

            <section
                className="analytics-kpi-grid"
                aria-label="Analytics key performance indicators"
            >
                {kpiCards.map((card) => (
                    <article className="analytics-kpi-card" key={card.label}>
                        <div>
                            <p>{card.label}</p>
                            <strong>{card.value}</strong>
                            <span>{card.comparison}</span>
                        </div>
                        <MetricIcon name={card.icon} tone={card.tone} />
                    </article>
                ))}
            </section>

            <section className="analytics-page-grid">
                <SourceQualityTable
                    applications={applications}
                    historyByApp={historyByApp}
                    interviews={interviews}
                />
                <ApplicationMap
                    applications={applications}
                    onViewApplication={onViewApplication}
                />
                <SourceBreakdown applications={applications} />
                <WeeklyApplications
                    applications={applications}
                    weeklyRangeWeeks={weeklyRangeWeeks}
                    onWeeklyRangeChange={onWeeklyRangeChange}
                />
            </section>
        </section>
    );
}
