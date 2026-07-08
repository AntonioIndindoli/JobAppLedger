"use client";

import { useMemo } from "react";

import {
    filterApplications,
    groupDashboardApplications,
} from "../../lib/application-analytics";
import type {
    ActivityLog,
    Application,
    ApplicationFilters,
    WeeklyRangeWeeks,
} from "../../lib/types";
import { AppIcon } from "../AppIcon";
import { ApplicationTracker } from "./ApplicationTracker";
import { DashboardCards } from "./DashboardCards";
import { DashboardStats } from "./DashboardStats";
import { SourceBreakdown } from "./SourceBreakdown";
import { WeeklyApplications } from "./WeeklyApplications";

type DashboardHomeProps = {
    activePipeline: number;
    applications: Application[];
    appliedTrackerFilters: ApplicationFilters;
    filters: ApplicationFilters;
    firstName: string;
    historyByApp: Record<string, ActivityLog[]>;
    message: string;
    openTimelineId: string | null;
    weeklyRangeWeeks: WeeklyRangeWeeks;
    onApplyTrackerFilters: () => void;
    onCreateApplication: () => void;
    onFiltersChange: (filters: ApplicationFilters) => void;
    onImportOpen: () => void;
    onRemoveApplication: (id: string) => void;
    onStartEdit: (application: Application) => void;
    onToggleTimeline: (id: string) => void | Promise<void>;
    onTransitionStatus: (id: string, nextStatus: string) => void | Promise<void>;
    onWeeklyRangeChange: (weeks: WeeklyRangeWeeks) => void;
};

export function DashboardHome({
    activePipeline,
    applications,
    appliedTrackerFilters,
    filters,
    firstName,
    historyByApp,
    message,
    openTimelineId,
    weeklyRangeWeeks,
    onApplyTrackerFilters,
    onCreateApplication,
    onFiltersChange,
    onImportOpen,
    onRemoveApplication,
    onStartEdit,
    onToggleTimeline,
    onTransitionStatus,
    onWeeklyRangeChange,
}: DashboardHomeProps) {
    const trackerApplications = useMemo(
        () => filterApplications(applications, appliedTrackerFilters),
        [applications, appliedTrackerFilters],
    );
    const groupedApplications = useMemo(
        () => groupDashboardApplications(trackerApplications),
        [trackerApplications],
    );

    return (
        <>
            <section className="hero">
                <h1>Welcome back, {firstName}</h1>
                <p>
                    Track your job search, stay on top of interviews, and follow up
                    faster.
                </p>
                <div className="actions">
                    <button className="primary" onClick={onImportOpen}>
                        <AppIcon name="import" size={18} />
                        Import Job
                    </button>
                    <button className="secondary" onClick={onCreateApplication}>
                        <AppIcon name="plus" size={18} />
                        Add Application
                    </button>
                </div>
            </section>
            <DashboardStats activePipeline={activePipeline} applications={applications} />
            {message && <p className="notice">{message}</p>}
            <ApplicationTracker
                applications={applications}
                filters={filters}
                groupedApplications={groupedApplications}
                historyByApp={historyByApp}
                openTimelineId={openTimelineId}
                trackerApplications={trackerApplications}
                onApplyFilters={onApplyTrackerFilters}
                onCreateApplication={onCreateApplication}
                onFiltersChange={onFiltersChange}
                onRemoveApplication={onRemoveApplication}
                onStartEdit={onStartEdit}
                onToggleTimeline={onToggleTimeline}
                onTransitionStatus={onTransitionStatus}
            />
            <DashboardCards onImportOpen={onImportOpen} />
            <section className="analytics-grid">
                <SourceBreakdown applications={applications} />
                <WeeklyApplications
                    applications={applications}
                    weeklyRangeWeeks={weeklyRangeWeeks}
                    onWeeklyRangeChange={onWeeklyRangeChange}
                />
            </section>
        </>
    );
}
