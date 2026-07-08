import {
    DASHBOARD_STATUSES,
    SOURCE_ALIASES,
    STATUSES,
} from "./constants";
import type {
    Application,
    ApplicationFilters,
    ApplicationStatus,
    DashboardStatus,
    WeeklyRangeWeeks,
} from "./types";

export function normalizeSource(source: string | null) {
    if (!source) return null;
    const normalized = source.trim().toLowerCase();
    return SOURCE_ALIASES[normalized] ?? source.trim();
}

export function getApplicationTimestamp(app: Application) {
    const rawDate = app.dateApplied ?? app.createdAt;
    const timestamp = new Date(rawDate).getTime();
    return Number.isNaN(timestamp) ? new Date(app.createdAt).getTime() : timestamp;
}

function getStartOfWeek(date: Date) {
    const weekStart = new Date(date);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return weekStart;
}

function formatWeekLabel(date: Date) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function buildWeeklyApplications(
    applications: Application[],
    weekCount: WeeklyRangeWeeks,
) {
    const thisWeekStart = getStartOfWeek(new Date());
    const weeks = Array.from({ length: weekCount }, (_, index) => {
        const start = new Date(thisWeekStart);
        start.setDate(thisWeekStart.getDate() - (weekCount - 1 - index) * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        return { start, end, label: formatWeekLabel(start), count: 0 };
    });

    applications.forEach((app) => {
        const timestamp = getApplicationTimestamp(app);
        const week = weeks.find(
            ({ start, end }) => timestamp >= start.getTime() && timestamp < end.getTime(),
        );
        if (week) week.count += 1;
    });

    const total = weeks.reduce((sum, week) => sum + week.count, 0);
    const comparisonWeeks = weekCount / 2;
    const previousPeriod = weeks
        .slice(0, comparisonWeeks)
        .reduce((sum, week) => sum + week.count, 0);
    const latestPeriod = weeks
        .slice(comparisonWeeks)
        .reduce((sum, week) => sum + week.count, 0);
    const delta = latestPeriod - previousPeriod;
    const trend =
        delta === 0
            ? "No change"
            : `${delta > 0 ? "+" : ""}${delta} vs previous ${comparisonWeeks} weeks`;

    return { weeks, total, trend };
}

export function isApplicationStatus(status: string): status is ApplicationStatus {
    return (STATUSES as readonly string[]).includes(status);
}

export function countApplicationsByStatus(applications: Application[]) {
    const counts = Object.fromEntries(
        STATUSES.map((status) => [status, 0]),
    ) as Record<ApplicationStatus, number>;

    applications.forEach((app) => {
        if (isApplicationStatus(app.status)) counts[app.status] += 1;
    });

    return counts;
}

export function filterApplications(
    applications: Application[],
    filters: ApplicationFilters,
) {
    const companyFilter = filters.company.trim().toLowerCase();
    const startTime = filters.startDate
        ? new Date(`${filters.startDate}T00:00:00`).getTime()
        : null;
    const endTime = filters.endDate
        ? new Date(`${filters.endDate}T23:59:59`).getTime()
        : null;

    return applications.filter((app) => {
        if (filters.status && app.status !== filters.status) return false;
        if (
            filters.source &&
            app.source?.toLowerCase() !== filters.source.toLowerCase()
        )
            return false;
        if (
            companyFilter &&
            !(app.companyName ?? "").toLowerCase().includes(companyFilter)
        )
            return false;

        const applicationTime = getApplicationTimestamp(app);
        if (startTime !== null && applicationTime < startTime) return false;
        if (endTime !== null && applicationTime > endTime) return false;

        return true;
    });
}

export function groupDashboardApplications(applications: Application[]) {
    return Object.fromEntries(
        DASHBOARD_STATUSES.map((status) => [
            status,
            applications.filter((app) => app.status === status),
        ]),
    ) as Record<DashboardStatus, Application[]>;
}

export function countActiveApplications(applications: Application[]) {
    return applications.filter(
        (app) => !["SAVED", "REJECTED", "WITHDRAWN"].includes(app.status),
    ).length;
}
