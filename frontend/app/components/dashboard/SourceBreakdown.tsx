"use client";

import { SOURCES, SOURCE_DOTS } from "../../lib/constants";
import { normalizeSource } from "../../lib/application-analytics";
import type { Application } from "../../lib/types";
import { AppIcon } from "../AppIcon";

type SourceBreakdownProps = {
    applications: Application[];
};

export function SourceBreakdown({ applications }: SourceBreakdownProps) {
    const sourceCounts = SOURCES.map(
        (source) =>
            applications.filter(
                (app) => normalizeSource(app.source)?.toLowerCase() === source.toLowerCase(),
            ).length,
    );
    const totalSourceCount = sourceCounts.reduce((sum, count) => sum + count, 0);
    const sourceSegments = sourceCounts.map((count, index) => {
        const start = sourceCounts
            .slice(0, index)
            .reduce((sum, sourceCount) => sum + sourceCount, 0);
        const end = start + count;
        return {
            count,
            color: SOURCE_DOTS[index],
            startPercent: totalSourceCount ? (start / totalSourceCount) * 100 : 0,
            endPercent: totalSourceCount ? (end / totalSourceCount) * 100 : 0,
            percentage: totalSourceCount
                ? Math.round((count / totalSourceCount) * 100)
                : 0,
        };
    });
    const donutBackground = totalSourceCount
        ? `radial-gradient(circle, white 42%, transparent 43%), conic-gradient(${sourceSegments
            .filter((segment) => segment.count > 0)
            .map((segment) => `${segment.color} ${segment.startPercent}% ${segment.endPercent}%`)
            .join(", ")})`
        : undefined;

    return (
        <div className="panel sources">
            <h2>
                <span className="heading-icon">
                    <AppIcon name="source" size={16} />
                </span>
                Application Sources
                <span className="info-icon" aria-label="Application sources information">
                    <AppIcon name="info" size={14} />
                </span>
            </h2>
            <div className="sources-chart">
                <div
                    className={`donut${totalSourceCount ? " has-data" : ""}`}
                    style={donutBackground ? { background: donutBackground } : undefined}
                    aria-label={`${totalSourceCount} applications with tracked sources`}
                >
                    <strong>{totalSourceCount}</strong>
                    <span>{totalSourceCount === 1 ? "source" : "sources"}</span>
                </div>
                <div className="source-list">
                    {SOURCES.map((source, index) => (
                        <span key={source}>
                            <b style={{ background: SOURCE_DOTS[index] }} />
                            {source}
                            <em>
                                {sourceCounts[index]} ({sourceSegments[index].percentage}%)
                            </em>
                        </span>
                    ))}
                </div>
            </div>
            <p>
                {totalSourceCount
                    ? "Your source breakdown updates as applications are added or edited."
                    : "Import jobs or add sources to see your source breakdown."}
            </p>
        </div>
    );
}
