"use client";

import { useMemo } from "react";

import {
    buildSourceQualityRows,
    formatDaysToResponse,
} from "../../lib/application-analytics";
import type { ActivityLog, Application, Interview } from "../../lib/types";
import { AppIcon } from "../AppIcon";
import { InfoTooltip } from "./InfoTooltip";

type SourceQualityTableProps = {
    applications: Application[];
    historyByApp: Record<string, ActivityLog[]>;
    interviews: Interview[];
};

function formatRate(value: number) {
    return `${value}%`;
}

export function SourceQualityTable({
    applications,
    historyByApp,
    interviews,
}: SourceQualityTableProps) {
    const rows = useMemo(
        () => buildSourceQualityRows(applications, historyByApp, interviews),
        [applications, historyByApp, interviews],
    );

    return (
        <div className="panel source-quality-panel">
            <h2>
                <span className="heading-icon">
                    <AppIcon name="analytics" size={16} />
                </span>
                Source Quality
                <InfoTooltip
                    label="Source quality information"
                    tooltip="Compares application sources by responses, interviews, offers, and response speed."
                />
            </h2>

            {rows.length > 0 ? (
                <div className="source-quality-table-wrap">
                    <table className="source-quality-table">
                        <thead>
                            <tr>
                                <th scope="col">Source</th>
                                <th scope="col">Applications</th>
                                <th scope="col">Response rate</th>
                                <th scope="col">Interview rate</th>
                                <th scope="col">Offers</th>
                                <th scope="col">Avg. days to response</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.source}>
                                    <th scope="row">
                                        <span className="source-quality-source">
                                            <b />
                                            {row.source}
                                        </span>
                                    </th>
                                    <td>
                                        <strong>{row.applications}</strong>
                                        <span>
                                            {row.submittedApplications} submitted
                                        </span>
                                    </td>
                                    <td>
                                        <strong>{formatRate(row.responseRate)}</strong>
                                        <span>
                                            {row.responses} of{" "}
                                            {row.submittedApplications} submitted
                                        </span>
                                    </td>
                                    <td>
                                        <strong>{formatRate(row.interviewRate)}</strong>
                                        <span>{row.interviews} interviews</span>
                                    </td>
                                    <td>
                                        <strong>{row.offers}</strong>
                                        <span>
                                            {row.offers === 1 ? "offer" : "offers"}
                                        </span>
                                    </td>
                                    <td>
                                        <strong>
                                            {formatDaysToResponse(
                                                row.averageDaysToResponse,
                                            )}
                                        </strong>
                                        <span>
                                            {row.responses
                                                ? "from first response"
                                                : "no responses yet"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="analytics-empty-panel">
                    <span className="empty-illustration">
                        <AppIcon name="source" size={31} />
                    </span>
                    <h3>No source quality yet</h3>
                    <p>Add applications with sources to compare channel quality.</p>
                </div>
            )}
        </div>
    );
}
