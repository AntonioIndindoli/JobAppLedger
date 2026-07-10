"use client";

import type { Application, WeeklyRangeWeeks } from "../lib/types";
import { SourceBreakdown } from "./dashboard/SourceBreakdown";
import { WeeklyApplications } from "./dashboard/WeeklyApplications";

type AnalyticsViewProps = {
    applications: Application[];
    weeklyRangeWeeks: WeeklyRangeWeeks;
    onWeeklyRangeChange: (weeks: WeeklyRangeWeeks) => void;
};

export function AnalyticsView({
    applications,
    weeklyRangeWeeks,
    onWeeklyRangeChange,
}: AnalyticsViewProps) {
    return (
        <section className="applications-page analytics-page">
            <header className="applications-header">
                <div>
                    <p>Analytics</p>
                    <span>
                        Source mix and application activity across{" "}
                        {applications.length} tracked{" "}
                        {applications.length === 1 ? "application" : "applications"}.
                    </span>
                </div>
            </header>

            <section className="analytics-page-grid">
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
