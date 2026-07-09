"use client";

import { useMemo } from "react";

import {
    filterApplications,
    groupDashboardApplications,
} from "../../lib/application-analytics";
import {
    isUpcomingInterview,
    sortInterviewsBySchedule,
} from "../../lib/interview-utils";
import type {
    ActivityLog,
    Application,
    ApplicationFilters,
    Interview,
    WeeklyRangeWeeks,
} from "../../lib/types";
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
    historyByApp: Record<string, ActivityLog[]>;
    interviews: Interview[];
    openTimelineId: string | null;
    weeklyRangeWeeks: WeeklyRangeWeeks;
    onApplyTrackerFilters: () => void;
    onCreateApplication: () => void;
    onCreateInterview: (applicationId?: string) => void;
    onFiltersChange: (filters: ApplicationFilters) => void;
    onImportOpen: () => void;
    onRemoveApplication: (id: string) => void;
    onStartEdit: (application: Application) => void;
    onToggleTimeline: (id: string) => void | Promise<void>;
    onTransitionStatus: (id: string, nextStatus: string) => void | Promise<void>;
    onViewApplication: (id: string) => void;
    onViewInterviews: () => void;
    onWeeklyRangeChange: (weeks: WeeklyRangeWeeks) => void;
};

export function DashboardHome({
    activePipeline,
    applications,
    appliedTrackerFilters,
    filters,
    historyByApp,
    interviews,
    openTimelineId,
    weeklyRangeWeeks,
    onApplyTrackerFilters,
    onCreateApplication,
    onCreateInterview,
    onFiltersChange,
    onImportOpen,
    onRemoveApplication,
    onStartEdit,
    onToggleTimeline,
    onTransitionStatus,
    onViewApplication,
    onViewInterviews,
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
    const upcomingInterviews = useMemo(
        () =>
            sortInterviewsBySchedule(
                interviews.filter(isUpcomingInterview),
                "asc",
            ),
        [interviews],
    );

    return (
        <>
            <section className="hero">
                <h1>Your job search at a glance</h1>
                <p>
                    Track applications, interviews, offers, and follow-ups in one place.
                </p>
            </section>
            <DashboardStats
                activePipeline={activePipeline}
                applications={applications}
                historyByApp={historyByApp}
                interviews={interviews}
            />
            <ApplicationTracker
                applications={applications}
                filters={filters}
                groupedApplications={groupedApplications}
                historyByApp={historyByApp}
                interviews={interviews}
                openTimelineId={openTimelineId}
                trackerApplications={trackerApplications}
                onApplyFilters={onApplyTrackerFilters}
                onImportOpen={onImportOpen}
                onCreateApplication={onCreateApplication}
                onFiltersChange={onFiltersChange}
                onRemoveApplication={onRemoveApplication}
                onStartEdit={onStartEdit}
                onToggleTimeline={onToggleTimeline}
                onTransitionStatus={onTransitionStatus}
                onViewApplication={onViewApplication}
            />
            <DashboardCards
                canCreateInterview={applications.length > 0}
                upcomingInterviews={upcomingInterviews}
                onCreateInterview={() => onCreateInterview()}
                onImportOpen={onImportOpen}
                onViewInterviews={onViewInterviews}
            />
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
