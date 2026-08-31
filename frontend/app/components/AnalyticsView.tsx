"use client";

import { useMemo, useState } from "react";

import {
    ANALYTICS_TIMEFRAME_OPTIONS,
    buildAnalyticsKpiCards,
    DEFAULT_ANALYTICS_TIMEFRAME,
} from "../lib/application-analytics";
import type { AnalyticsTimeframeDays } from "../lib/application-analytics";
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
    const [kpiTimeframeDays, setKpiTimeframeDays] =
        useState<AnalyticsTimeframeDays>(DEFAULT_ANALYTICS_TIMEFRAME);
    const kpiCards = useMemo(
        () =>
            buildAnalyticsKpiCards(
                applications,
                historyByApp,
                interviews,
                kpiTimeframeDays,
            ),
        [applications, historyByApp, interviews, kpiTimeframeDays],
    );

    return (
        <section className="applications-page analytics-page">
            <section className="analytics-kpi-section" aria-labelledby="analytics-kpi-title">
                <header className="analytics-kpi-toolbar">
                    <h2 id="analytics-kpi-title">Key performance indicators</h2>
                    <label>
                        <span>Time frame</span>
                        <select
                            aria-label="KPI time frame"
                            value={kpiTimeframeDays}
                            onChange={(event) =>
                                setKpiTimeframeDays(
                                    Number(event.target.value) as AnalyticsTimeframeDays,
                                )
                            }
                        >
                            {ANALYTICS_TIMEFRAME_OPTIONS.map((option) => (
                                <option key={option.days} value={option.days}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </header>
                <div className="analytics-kpi-grid">
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
                </div>
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
