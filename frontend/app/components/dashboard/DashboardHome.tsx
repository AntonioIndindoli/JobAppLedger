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
    Task,
} from "../../lib/types";
import { ApplicationTracker } from "./ApplicationTracker";
import { DashboardCards } from "./DashboardCards";
import { DashboardStats } from "./DashboardStats";

type DashboardHomeProps = {
    activePipeline: number;
    applications: Application[];
    appliedTrackerFilters: ApplicationFilters;
    filters: ApplicationFilters;
    historyByApp: Record<string, ActivityLog[]>;
    interviews: Interview[];
    openTimelineId: string | null;
    tasks: Task[];
    onApplyTrackerFilters: () => void;
    onCreateApplication: () => void;
    onCreateInterview: (applicationId?: string) => void;
    onCreateTask: () => void;
    onFiltersChange: (filters: ApplicationFilters) => void;
    onImportOpen: () => void;
    onRemoveApplication: (id: string) => void;
    onStartEdit: (application: Application) => void;
    onToggleTimeline: (id: string) => void | Promise<void>;
    onTransitionStatus: (id: string, nextStatus: string) => void | Promise<void>;
    onViewApplications: () => void;
    onViewApplication: (id: string) => void;
    onViewInterviews: () => void;
    onViewTasks: () => void;
};

export function DashboardHome({
    activePipeline,
    applications,
    appliedTrackerFilters,
    filters,
    historyByApp,
    interviews,
    openTimelineId,
    tasks,
    onApplyTrackerFilters,
    onCreateApplication,
    onCreateInterview,
    onCreateTask,
    onFiltersChange,
    onImportOpen,
    onRemoveApplication,
    onStartEdit,
    onToggleTimeline,
    onTransitionStatus,
    onViewApplications,
    onViewApplication,
    onViewInterviews,
    onViewTasks,
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
                tasks={tasks}
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
                applications={applications}
                canCreateInterview={applications.length > 0}
                tasks={tasks}
                upcomingInterviews={upcomingInterviews}
                onCreateApplication={onCreateApplication}
                onCreateInterview={() => onCreateInterview()}
                onCreateTask={onCreateTask}
                onViewApplications={onViewApplications}
                onViewInterviews={onViewInterviews}
                onViewTasks={onViewTasks}
            />
        </>
    );
}
