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
    ApplicationGoalSettings,
    Interview,
    Task,
} from "../../lib/types";
import { AppIcon } from "../AppIcon";
import { ApplicationTracker } from "./ApplicationTracker";
import { DashboardCards } from "./DashboardCards";
import { DashboardStats } from "./DashboardStats";

type DashboardHomeProps = {
    activePipeline: number;
    applicationGoal: ApplicationGoalSettings;
    applications: Application[];
    filters: ApplicationFilters;
    historyByApp: Record<string, ActivityLog[]>;
    interviews: Interview[];
    openTimelineId: string | null;
    tasks: Task[];
    onApplicationGoalChange: (goal: ApplicationGoalSettings) => void;
    onCreateApplication: () => void;
    onCreateInterview: (applicationId?: string) => void;
    onCreateTask: () => void;
    onFiltersChange: (filters: ApplicationFilters) => void;
    onImportOpen: () => void;
    onRemoveApplication: (id: string) => void;
    onRemoveHistoryEvent: (
        applicationId: string,
        activityLogId: string,
    ) => void | Promise<void>;
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
    applicationGoal,
    applications,
    filters,
    historyByApp,
    interviews,
    openTimelineId,
    tasks,
    onApplicationGoalChange,
    onCreateApplication,
    onCreateInterview,
    onCreateTask,
    onFiltersChange,
    onImportOpen,
    onRemoveApplication,
    onRemoveHistoryEvent,
    onStartEdit,
    onToggleTimeline,
    onTransitionStatus,
    onViewApplications,
    onViewApplication,
    onViewInterviews,
    onViewTasks,
}: DashboardHomeProps) {
    const trackerApplications = useMemo(
        () => filterApplications(applications, filters),
        [applications, filters],
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
            <section className="hero dashboard-hero">
                <header className="dashboard-hero-header">
                    <div>
                        <p className="page-header-text">Dashboard</p>
                    </div>
                </header>
            </section>
            <DashboardStats
                activePipeline={activePipeline}
                applicationGoal={applicationGoal}
                applications={applications}
                historyByApp={historyByApp}
                interviews={interviews}
                onApplicationGoalChange={onApplicationGoalChange}
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
                onImportOpen={onImportOpen}
                onCreateApplication={onCreateApplication}
                onFiltersChange={onFiltersChange}
                onRemoveApplication={onRemoveApplication}
                onRemoveHistoryEvent={onRemoveHistoryEvent}
                onStartEdit={onStartEdit}
                onToggleTimeline={onToggleTimeline}
                onTransitionStatus={onTransitionStatus}
                onViewApplication={onViewApplication}
            />
        </>
    );
}
