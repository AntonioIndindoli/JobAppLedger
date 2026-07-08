"use client";

import {
    sankey,
    sankeyLinkHorizontal,
    type SankeyGraph,
    type SankeyLink,
    type SankeyNode,
} from "d3-sankey";
import { useMemo } from "react";

import { PIPELINE_HEIGHT, PIPELINE_WIDTH } from "../../lib/constants";
import { countApplicationsByStatus } from "../../lib/application-analytics";
import type { Application } from "../../lib/types";

type PipelineNodeDatum = {
    id: string;
    label: string;
    color: string;
    fixedValue?: number;
};

type PipelineLinkDatum = {
    color: string;
    label: string;
};

type PipelineGraph = SankeyGraph<PipelineNodeDatum, PipelineLinkDatum>;

function buildPipelineSankey(applications: Application[]) {
    const counts = countApplicationsByStatus(applications);
    const total =
        counts.APPLIED +
        counts.INTERVIEWING +
        counts.OFFER +
        counts.REJECTED +
        counts.WITHDRAWN;
    if (!total) return { counts, total, graph: null, offerRate: 0, exitCount: 0 };

    const exitCount = counts.REJECTED + counts.WITHDRAWN;
    const reachedInterviewing = counts.INTERVIEWING + counts.OFFER;

    const nodeCatalog: PipelineNodeDatum[] = [
        { id: "applied", label: "Applied", color: "#1268f3", fixedValue: total },
        {
            id: "interviewing",
            label: "Interview",
            color: "#6d5dfc",
            fixedValue: reachedInterviewing,
        },
        { id: "no-response", label: "No Response", color: "#64748b" },
        { id: "offer", label: "Offer", color: "#16a34a" },
        { id: "rejected", label: "Rejected", color: "#dc2626" },
        { id: "withdrawn", label: "Withdrawn", color: "#475569" },
    ];
    const usedNodeIds = new Set<string>(["applied"]);
    const rawLinks: Array<SankeyLink<PipelineNodeDatum, PipelineLinkDatum>> = [];
    const addLink = (
        source: string,
        target: string,
        value: number,
        color: string,
        label: string,
    ) => {
        if (value <= 0) return;
        usedNodeIds.add(source);
        usedNodeIds.add(target);
        rawLinks.push({ source, target, value, color, label });
    };

    addLink("applied", "interviewing", reachedInterviewing, "#a78bfa", "Applied to interviewing");
    addLink("applied", "no-response", counts.APPLIED, "#94a3b8", "Applied to no response");
    addLink("applied", "rejected", counts.REJECTED, "#f87171", "Applied to rejected");
    addLink("applied", "withdrawn", counts.WITHDRAWN, "#94a3b8", "Applied to withdrawn");
    addLink("interviewing", "offer", counts.OFFER, "#4ade80", "Interviewing to offer");

    const graphInput: PipelineGraph = {
        nodes: nodeCatalog
            .filter((node) => usedNodeIds.has(node.id))
            .map((node) => ({ ...node })),
        links: rawLinks.map((link) => ({ ...link })),
    };

    if (!graphInput.links.length) {
        const node = graphInput.nodes[0];
        const y0 = 16;
        const y1 = PIPELINE_HEIGHT - 34;
        return {
            counts,
            total,
            graph: {
                nodes: [
                    {
                        ...node,
                        index: 0,
                        depth: 0,
                        height: 0,
                        value: total,
                        x0: 18,
                        x1: 23,
                        y0,
                        y1,
                    },
                ],
                links: [],
            },
            offerRate: Math.round((counts.OFFER / Math.max(total, 1)) * 100),
            exitCount,
        };
    }

    const graph = sankey<PipelineNodeDatum, PipelineLinkDatum>()
        .nodeId((node) => node.id)
        .nodeWidth(5)
        .nodePadding(5)
        .nodeAlign((node) => node.depth ?? 0)
        .nodeSort(null)
        .linkSort(null)
        .iterations(40)
        .extent([
            [18, 16],
            [PIPELINE_WIDTH - 18, PIPELINE_HEIGHT - 34],
        ])(graphInput);

    return {
        counts,
        total,
        graph,
        offerRate: Math.round((counts.OFFER / Math.max(total, 1)) * 100),
        exitCount,
    };
}

function getSankeyEndLabel(
    end: string | number | SankeyNode<PipelineNodeDatum, PipelineLinkDatum>,
) {
    return typeof end === "object" ? end.label : String(end);
}

export function PipelineSankey({ applications }: { applications: Application[] }) {
    const pipeline = useMemo(
        () => buildPipelineSankey(applications),
        [applications],
    );
    const linkPath = useMemo(
        () => sankeyLinkHorizontal<PipelineNodeDatum, PipelineLinkDatum>(),
        [],
    );

    return (
        <section className="pipeline-graph" aria-labelledby="pipeline-heading">
            <header className="pipeline-header">
                <div>
                    <p>Pipeline</p>
                    <h2 id="pipeline-heading">Application Flow</h2>
                </div>
                <strong>{pipeline.total}</strong>
            </header>
            {pipeline.graph ? (
                <>
                    <div className="sankey-frame">
                        <svg
                            className="sankey-canvas"
                            viewBox={`0 0 ${PIPELINE_WIDTH} ${PIPELINE_HEIGHT}`}
                            role="img"
                            aria-label="Sankey diagram of applications flowing through applied, no response, interview, offer, and exit statuses"
                            preserveAspectRatio="xMidYMid meet"
                        >
                            <g className="sankey-links">
                                {pipeline.graph.links.map((link) => {
                                    const source = getSankeyEndLabel(link.source);
                                    const target = getSankeyEndLabel(link.target);
                                    return (
                                        <path
                                            key={`${source}-${target}`}
                                            d={linkPath(link) ?? undefined}
                                            stroke={link.color}
                                            strokeWidth={Math.max(1, link.width ?? 1)}
                                            className="sankey-link"
                                        >
                                            <title>{`${source} to ${target}: ${link.value}`}</title>
                                        </path>
                                    );
                                })}
                            </g>
                            <g className="sankey-nodes">
                                {pipeline.graph.nodes.map((node) => {
                                    const x0 = node.x0 ?? 0;
                                    const x1 = node.x1 ?? 0;
                                    const y0 = node.y0 ?? 0;
                                    const y1 = node.y1 ?? 0;
                                    const labelOnRight = x0 < PIPELINE_WIDTH - 180;
                                    return (
                                        <g key={node.id} className="sankey-node">
                                            <rect
                                                x={x0}
                                                y={y0}
                                                width={Math.max(2, x1 - x0)}
                                                height={Math.max(2, y1 - y0)}
                                                rx="0"
                                                fill={node.color}
                                            />
                                            <text
                                                x={labelOnRight ? x1 + 8 : x0 - 8}
                                                y={(y0 + y1) / 2}
                                                textAnchor={labelOnRight ? "start" : "end"}
                                                dominantBaseline="middle"
                                            >
                                                <tspan className="sankey-label">{node.label}</tspan>
                                                <tspan
                                                    className="sankey-value"
                                                    x={labelOnRight ? x1 + 8 : x0 - 8}
                                                    dy="14"
                                                >
                                                    {node.value ?? 0}
                                                </tspan>
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>
                    </div>
                    <footer className="pipeline-insights">
                        <span>
                            <b>{pipeline.counts.OFFER}</b> offers
                        </span>
                        <span>
                            <b>{pipeline.offerRate}%</b> offer rate
                        </span>
                        <span>
                            <b>{pipeline.exitCount}</b> exits
                        </span>
                    </footer>
                </>
            ) : (
                <div className="pipeline-empty-state">
                    <h3>No application flow yet</h3>
                    <p>Add applications to render the Sankey pipeline.</p>
                </div>
            )}
        </section>
    );
}
