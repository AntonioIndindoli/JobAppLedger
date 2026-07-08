"use client";

import { useMemo } from "react";

import {
    WEEKLY_CHART_HEIGHT,
    WEEKLY_CHART_WIDTH,
    WEEKLY_RANGE_OPTIONS,
} from "../../lib/constants";
import { buildWeeklyApplications } from "../../lib/application-analytics";
import type { Application, WeeklyRangeWeeks } from "../../lib/types";
import { AppIcon } from "../AppIcon";

type WeeklyApplicationsProps = {
    applications: Application[];
    weeklyRangeWeeks: WeeklyRangeWeeks;
    onWeeklyRangeChange: (weeks: WeeklyRangeWeeks) => void;
};

export function WeeklyApplications({
    applications,
    weeklyRangeWeeks,
    onWeeklyRangeChange,
}: WeeklyApplicationsProps) {
    const weeklyRangeLabel =
        WEEKLY_RANGE_OPTIONS.find((option) => option.weeks === weeklyRangeWeeks)?.label ??
        WEEKLY_RANGE_OPTIONS[1].label;
    const weeklyApplications = useMemo(
        () => buildWeeklyApplications(applications, weeklyRangeWeeks),
        [applications, weeklyRangeWeeks],
    );
    const maxWeeklyCount = Math.max(
        1,
        ...weeklyApplications.weeks.map((week) => week.count),
    );
    const weeklyPoints = weeklyApplications.weeks.map((week, index) => {
        const x =
            24 +
            (index * (WEEKLY_CHART_WIDTH - 48)) /
                Math.max(weeklyApplications.weeks.length - 1, 1);
        const y =
            WEEKLY_CHART_HEIGHT -
            24 -
            (week.count / maxWeeklyCount) * (WEEKLY_CHART_HEIGHT - 42);
        return { x, y, ...week };
    });
    const weeklyPath = weeklyPoints
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
        .join(" ");

    return (
        <div className="panel weekly">
            <h2>
                <span className="heading-icon">
                    <AppIcon name="trend" size={16} />
                </span>
                Weekly Applications
                <span className="info-icon" aria-label="Weekly applications information">
                    <AppIcon name="info" size={14} />
                </span>
                <select
                    aria-label="Weekly applications timeframe"
                    value={weeklyRangeWeeks}
                    onChange={(event) =>
                        onWeeklyRangeChange(Number(event.target.value) as WeeklyRangeWeeks)
                    }
                >
                    {WEEKLY_RANGE_OPTIONS.map((option) => (
                        <option key={option.weeks} value={option.weeks}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </h2>
            <div className="chart">
                <svg
                    viewBox={`0 0 ${WEEKLY_CHART_WIDTH} ${WEEKLY_CHART_HEIGHT}`}
                    role="img"
                    aria-label={`Applications submitted in the ${weeklyRangeLabel.toLowerCase()}`}
                    preserveAspectRatio="none"
                >
                    <path
                        className="weekly-line-fill"
                        d={`${weeklyPath} L ${weeklyPoints.at(-1)?.x ?? 0} ${
                            WEEKLY_CHART_HEIGHT - 22
                        } L ${weeklyPoints[0]?.x ?? 0} ${WEEKLY_CHART_HEIGHT - 22} Z`}
                    />
                    <path className="weekly-line" d={weeklyPath} />
                    {weeklyPoints.map((point) => (
                        <g key={point.label}>
                            <circle cx={point.x} cy={point.y} r="4" />
                            <text x={point.x} y={point.y - 10}>
                                {point.count}
                            </text>
                        </g>
                    ))}
                </svg>
                <div
                    className="week-labels"
                    style={{
                        gridTemplateColumns: `repeat(${weeklyApplications.weeks.length}, 1fr)`,
                    }}
                >
                    {weeklyApplications.weeks.map((week, index) => {
                        const showLabel =
                            weeklyApplications.weeks.length <= 6 ||
                            index % 2 === 0 ||
                            index === weeklyApplications.weeks.length - 1;

                        return <span key={week.label}>{showLabel ? week.label : ""}</span>;
                    })}
                </div>
            </div>
            <aside>
                <small>Total</small>
                <strong>{weeklyApplications.total}</strong>
                <span>applications</span>
                <em>{weeklyApplications.trend}</em>
            </aside>
            <p>
                {weeklyApplications.total
                    ? "Showing applications by applied date (or created date when applied date is missing)."
                    : "Your weekly application trend will appear here."}
            </p>
        </div>
    );
}
