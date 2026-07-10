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
import {
    buildApplicationPipelinePath,
    countApplicationsByStatus,
    type ApplicationPipelineNode,
} from "../../lib/application-analytics";
import type { ActivityLog, Application } from "../../lib/types";

type PipelineNodeId = ApplicationPipelineNode;

type PipelineNodeDatum = {
    id: PipelineNodeId;
    label: string;
    color: string;
};

type PipelineLinkDatum = {
    color: string;
    label: string;
};

type PipelineGraph = SankeyGraph<PipelineNodeDatum, PipelineLinkDatum>;

const PIPELINE_NODE_ORDER: PipelineNodeId[] = [
    "APPLIED",
    "INTERVIEWING",
    "NO_RESPONSE",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
];

const NODE_COLUMN: Record<PipelineNodeId, number> = {
    APPLIED: 0,
    INTERVIEWING: 1,
    NO_RESPONSE: 2,
    OFFER: 2,
    REJECTED: 2,
    WITHDRAWN: 2,
};

const NODE_ORDER: Record<PipelineNodeId, number> = {
    APPLIED: 0,
    INTERVIEWING: 0,
    OFFER: 0,
    REJECTED: 1,
    WITHDRAWN: 2,
    NO_RESPONSE: 3,
};

const LINK_ORDER: Record<PipelineNodeId, Partial<Record<PipelineNodeId, number>>> = {
    APPLIED: {
        INTERVIEWING: 0,
        REJECTED: 1,
        WITHDRAWN: 2,
        NO_RESPONSE: 3,
    },
    INTERVIEWING: {
        OFFER: 0,
        REJECTED: 1,
        WITHDRAWN: 2,
    },
    OFFER: {},
    REJECTED: {},
    WITHDRAWN: {},
    NO_RESPONSE: {},
};

const NODE_CATALOG: Record<PipelineNodeId, PipelineNodeDatum> = {
    APPLIED: { id: "APPLIED", label: "Applied", color: "#1268f3" },
    INTERVIEWING: { id: "INTERVIEWING", label: "Interview", color: "#6d5dfc" },
    NO_RESPONSE: { id: "NO_RESPONSE", label: "No Response", color: "#1268f3" },
    OFFER: { id: "OFFER", label: "Offer", color: "#16a34a" },
    REJECTED: { id: "REJECTED", label: "Rejected", color: "#dc2626" },
    WITHDRAWN: { id: "WITHDRAWN", label: "Withdrawn", color: "#475569" },
};

const LINK_COLORS: Record<PipelineNodeId, string> = {
    APPLIED: "#1268f3",
    INTERVIEWING: "#a78bfa",
    NO_RESPONSE: "#1268f3",
    OFFER: "#4ade80",
    REJECTED: "#f87171",
    WITHDRAWN: "#94a3b8",
};

const ALLOWED_TRANSITIONS: Record<PipelineNodeId, PipelineNodeId[]> = {
    APPLIED: ["INTERVIEWING", "NO_RESPONSE", "REJECTED", "WITHDRAWN"],
    INTERVIEWING: ["OFFER", "REJECTED", "WITHDRAWN"],
    OFFER: [],
    REJECTED: [],
    WITHDRAWN: [],
    NO_RESPONSE: [],
};

function canAddLink(source: PipelineNodeId, target: PipelineNodeId) {
    return ALLOWED_TRANSITIONS[source].includes(target);
}

function getSankeyEndId(
    end: string | number | SankeyNode<PipelineNodeDatum, PipelineLinkDatum>,
) {
    return typeof end === "object" ? end.id : String(end);
}

function compareNodes(
    first: SankeyNode<PipelineNodeDatum, PipelineLinkDatum>,
    second: SankeyNode<PipelineNodeDatum, PipelineLinkDatum>,
) {
    return NODE_ORDER[first.id] - NODE_ORDER[second.id];
}

function compareLinks(
    first: SankeyLink<PipelineNodeDatum, PipelineLinkDatum>,
    second: SankeyLink<PipelineNodeDatum, PipelineLinkDatum>,
) {
    const firstSource = getSankeyEndId(first.source) as PipelineNodeId;
    const secondSource = getSankeyEndId(second.source) as PipelineNodeId;
    const firstTarget = getSankeyEndId(first.target) as PipelineNodeId;
    const secondTarget = getSankeyEndId(second.target) as PipelineNodeId;

    const firstOrder =
        LINK_ORDER[firstSource]?.[firstTarget] ?? NODE_ORDER[firstTarget];
    const secondOrder =
        LINK_ORDER[secondSource]?.[secondTarget] ?? NODE_ORDER[secondTarget];

    if (firstOrder !== secondOrder) return firstOrder - secondOrder;
    return NODE_ORDER[firstSource] - NODE_ORDER[secondSource];
}

function buildPipelineSankey(
    applications: Application[],
    historyByApp: Record<string, ActivityLog[]>,
) {
    const counts = countApplicationsByStatus(applications);
    const total =
        counts.APPLIED +
        counts.INTERVIEWING +
        counts.OFFER +
        counts.REJECTED +
        counts.WITHDRAWN;
    if (!total) return { counts, total, graph: null, offerRate: 0, exitCount: 0 };

    const exitCount = counts.REJECTED + counts.WITHDRAWN;
    const linkTotals = new Map<
        string,
        { source: PipelineNodeId; target: PipelineNodeId; value: number }
    >();
    const usedNodeIds = new Set<PipelineNodeId>();

    const addLink = (source: PipelineNodeId, target: PipelineNodeId) => {
        if (!canAddLink(source, target)) return;
        usedNodeIds.add(source);
        usedNodeIds.add(target);

        const key = `${source}->${target}`;
        const existing = linkTotals.get(key);
        if (existing) existing.value += 1;
        else linkTotals.set(key, { source, target, value: 1 });
    };

    applications.forEach((application) => {
        const path = buildApplicationPipelinePath(
            application,
            historyByApp[application.id] ?? [],
        );
        path.forEach((node, index) => {
            const nextNode = path[index + 1];
            if (nextNode) addLink(node, nextNode);
        });
    });

    const rawLinks: Array<SankeyLink<PipelineNodeDatum, PipelineLinkDatum>> =
        Array.from(linkTotals.values()).map(({ source, target, value }) => ({
            source,
            target,
            value,
            color: LINK_COLORS[target],
            label: `${NODE_CATALOG[source].label} to ${NODE_CATALOG[target].label}`,
        }));

    const graphInput: PipelineGraph = {
        nodes: PIPELINE_NODE_ORDER.map((nodeId) => NODE_CATALOG[nodeId])
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
        .nodePadding(14)
        .nodeAlign((node, columns) => Math.min(NODE_COLUMN[node.id], columns - 1))
        .nodeSort(compareNodes)
        .linkSort(compareLinks)
        .iterations(64)
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

type PipelineSankeyProps = {
    applications: Application[];
    historyByApp: Record<string, ActivityLog[]>;
};

export function PipelineSankey({
    applications,
    historyByApp,
}: PipelineSankeyProps) {
    const pipeline = useMemo(
        () => buildPipelineSankey(applications, historyByApp),
        [applications, historyByApp],
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
                                                <tspan className="sankey-label">{node.label}: {node.value ?? 0}</tspan>
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>
                    </div>
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
