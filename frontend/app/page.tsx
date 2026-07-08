"use client";

import {
    sankey,
    sankeyLinkHorizontal,
    type SankeyGraph,
    type SankeyLink,
    type SankeyNode,
} from "d3-sankey";
import { type FormEvent, useEffect, useMemo, useState } from "react";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const ACCESS_TOKEN_KEY = "jobappledger_access_token";
const USER_EMAIL_KEY = "jobappledger_user_email";
const STATUSES = [
    "SAVED",
    "APPLIED",
    "INTERVIEWING",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
] as const;
type ApplicationStatus = (typeof STATUSES)[number];
const DASHBOARD_STATUSES = [
    "SAVED",
    "APPLIED",
    "INTERVIEWING",
    "OFFER",
    "REJECTED",
] as const;
const STATUS_LABELS: Record<ApplicationStatus, string> = {
    SAVED: "Saved",
    APPLIED: "Applied",
    INTERVIEWING: "Interviewing",
    OFFER: "Offer",
    REJECTED: "Rejected",
    WITHDRAWN: "Withdrawn",
};
const SOURCES = [
    "LinkedIn",
    "Indeed",
    "Greenhouse",
    "Lever",
    "Company Site",
    "Workday",
    "Ashby",
    "Wellfound",
    "Referrals",
    "Recruiter Outreach",
];
const SOURCE_OPTIONS = ["", ...SOURCES, "Company Careers", "Referral", "Other"];
const SOURCE_ALIASES: Record<string, string> = {
    "company careers": "Company Site",
    referral: "Referrals",
};
const sourceDots = [
    "#0a66c2",
    "#c026d3",
    "#0f766e",
    "#f97316",
    "#16a34a",
    "#dc2626",
    "#0891b2",
    "#7c3aed",
    "#ca8a04",
    "#475569",
];
const WEEKLY_RANGE_OPTIONS = [
    { label: "Last 4 weeks", weeks: 4 },
    { label: "Last 6 weeks", weeks: 6 },
    { label: "Last 12 weeks", weeks: 12 },
] as const;
type WeeklyRangeWeeks = (typeof WEEKLY_RANGE_OPTIONS)[number]["weeks"];
const DEFAULT_WEEKLY_RANGE: WeeklyRangeWeeks = 6;

type Mode = "signup" | "login";
type AuthStatus = "checking" | "signedOut" | "signedIn";
type DashboardView = "dashboard" | "account";
type Application = {
    id: string;
    title: string;
    status: string;
    source: string | null;
    companyName: string | null;
    createdAt: string;
    sourceUrl: string | null;
    location: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    description: string | null;
    notes: string | null;
    dateApplied: string | null;
};
type ImportDraft = {
    id: string;
    sourceUrl: string | null;
    sourceDomain: string | null;
    source: string | null;
    pageTitle: string | null;
    rawText: string | null;
    parsedTitle: string | null;
    parsedCompany: string | null;
    parsedLocation: string | null;
    parsedSalaryMin: number | null;
    parsedSalaryMax: number | null;
    parsedDescription: string | null;
    confidence: number | null;
    createdAt: string;
    convertedAt: string | null;
};
type ParserDebug = Record<string, unknown>;
type ActivityLog = {
    id: string;
    type: string;
    message: string;
    createdAt: string;
};
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

const emptyForm = {
    title: "",
    companyName: "",
    status: "SAVED",
    source: "",
    sourceUrl: "",
    location: "",
    notes: "",
    dateApplied: "",
};
const emptyImportCapture = {
    sourceUrl: "",
    pageTitle: "",
    rawText: "",
};
const emptyImportReview = {
    title: "",
    companyName: "",
    status: "SAVED",
    source: "",
    sourceUrl: "",
    location: "",
    salaryMin: "",
    salaryMax: "",
    description: "",
    notes: "",
    dateApplied: "",
};

const PIPELINE_WIDTH = 820;
const PIPELINE_HEIGHT = 150;
const WEEKLY_CHART_HEIGHT = 132;
const WEEKLY_CHART_WIDTH = 540;

function normalizeSource(source: string | null) {
    if (!source) return null;
    const normalized = source.trim().toLowerCase();
    return SOURCE_ALIASES[normalized] ?? source.trim();
}

function getApplicationTimestamp(app: Application) {
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

function buildWeeklyApplications(applications: Application[], weekCount: WeeklyRangeWeeks) {
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
    const trend = delta === 0 ? "No change" : `${delta > 0 ? "+" : ""}${delta} vs previous ${comparisonWeeks} weeks`;

    return { weeks, total, trend };
}

function isApplicationStatus(status: string): status is ApplicationStatus {
    return (STATUSES as readonly string[]).includes(status);
}

function countApplicationsByStatus(applications: Application[]) {
    const counts = Object.fromEntries(
        STATUSES.map((status) => [status, 0]),
    ) as Record<ApplicationStatus, number>;

    applications.forEach((app) => {
        if (isApplicationStatus(app.status)) counts[app.status] += 1;
    });

    return counts;
}

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

function PipelineSankey({ applications }: { applications: Application[] }) {
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
                            aria-label="Sankey diagram of applications flowing through saved, applied, interview, offer, and exit statuses"
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

function Icon({
    children,
    tone = "blue",
}: {
    children: string;
    tone?: "blue" | "green" | "purple" | "orange";
}) {
    return <span className={`icon-bubble ${tone}`}>{children}</span>;
}

export default function MainPage() {
    const [mode, setMode] = useState<Mode>("signup");
    const [email, setEmail] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [password, setPassword] = useState("");
    const [token, setToken] = useState("");
    const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
    const [message, setMessage] = useState("");
    const [applications, setApplications] = useState<Application[]>([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isApplicationFormOpen, setIsApplicationFormOpen] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
    const [importStep, setImportStep] = useState<"capture" | "review">("capture");
    const [importCapture, setImportCapture] = useState(emptyImportCapture);
    const [importReview, setImportReview] = useState(emptyImportReview);
    const [importDraft, setImportDraft] = useState<ImportDraft | null>(null);
    const [parserDebug, setParserDebug] = useState<ParserDebug | null>(null);
    const [importErrors, setImportErrors] = useState<Record<string, string>>({});
    const [importDuplicates, setImportDuplicates] = useState<Application[]>([]);
    const [isImportSubmitting, setIsImportSubmitting] = useState(false);
    const [filters, setFilters] = useState({
        status: "",
        source: "",
        company: "",
        startDate: "",
        endDate: "",
    });
    const [appliedTrackerFilters, setAppliedTrackerFilters] =
        useState(filters);
    const [historyByApp, setHistoryByApp] = useState<
        Record<string, ActivityLog[]>
    >({});
    const [openTimelineId, setOpenTimelineId] = useState<string | null>(null);
    const [weeklyRangeWeeks, setWeeklyRangeWeeks] =
        useState<WeeklyRangeWeeks>(DEFAULT_WEEKLY_RANGE);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState<DashboardView>("dashboard");

    const trackerApplications = useMemo(() => {
        const companyFilter = appliedTrackerFilters.company.trim().toLowerCase();
        const startTime = appliedTrackerFilters.startDate
            ? new Date(`${appliedTrackerFilters.startDate}T00:00:00`).getTime()
            : null;
        const endTime = appliedTrackerFilters.endDate
            ? new Date(`${appliedTrackerFilters.endDate}T23:59:59`).getTime()
            : null;

        return applications.filter((app) => {
            if (appliedTrackerFilters.status && app.status !== appliedTrackerFilters.status)
                return false;
            if (
                appliedTrackerFilters.source &&
                app.source?.toLowerCase() !== appliedTrackerFilters.source.toLowerCase()
            )
                return false;
            if (
                companyFilter &&
                !(app.companyName ?? "").toLowerCase().includes(companyFilter)
            )
                return false;

            const applicationDate = app.dateApplied ?? app.createdAt;
            const applicationTime = new Date(applicationDate).getTime();
            if (startTime !== null && applicationTime < startTime) return false;
            if (endTime !== null && applicationTime > endTime) return false;

            return true;
        });
    }, [applications, appliedTrackerFilters]);

    const grouped = useMemo(
        () =>
            Object.fromEntries(
                STATUSES.map((status) => [
                    status,
                    trackerApplications.filter((a) => a.status === status),
                ]),
            ),
        [trackerApplications],
    );
    const firstName = useMemo(() => {
        const name = (userEmail || email).split("@")[0]?.split(/[._-]/)[0];
        return name ? name.charAt(0).toUpperCase() + name.slice(1) : "Antonio";
    }, [email, userEmail]);
    const activePipeline = applications.filter(
        (a) => !["SAVED", "REJECTED", "WITHDRAWN"].includes(a.status),
    ).length;
    const sourceCounts = SOURCES.map(
        (source) =>
            applications.filter(
                (app) => normalizeSource(app.source)?.toLowerCase() === source.toLowerCase(),
            ).length,
    );
    const totalSourceCount = sourceCounts.reduce((sum, count) => sum + count, 0);
    const sourceSegments = sourceCounts.map((count, index) => {
        const start = sourceCounts.slice(0, index).reduce((sum, sourceCount) => sum + sourceCount, 0);
        const end = start + count;
        return {
            count,
            color: sourceDots[index],
            startPercent: totalSourceCount ? (start / totalSourceCount) * 100 : 0,
            endPercent: totalSourceCount ? (end / totalSourceCount) * 100 : 0,
            percentage: totalSourceCount ? Math.round((count / totalSourceCount) * 100) : 0,
        };
    });
    const donutBackground = totalSourceCount
        ? `radial-gradient(circle, white 42%, transparent 43%), conic-gradient(${sourceSegments
              .filter((segment) => segment.count > 0)
              .map((segment) => `${segment.color} ${segment.startPercent}% ${segment.endPercent}%`)
              .join(", ")})`
        : undefined;
    const weeklyRangeLabel =
        WEEKLY_RANGE_OPTIONS.find((option) => option.weeks === weeklyRangeWeeks)?.label ??
        WEEKLY_RANGE_OPTIONS[1].label;
    const weeklyApplications = useMemo(
        () => buildWeeklyApplications(applications, weeklyRangeWeeks),
        [applications, weeklyRangeWeeks],
    );
    const maxWeeklyCount = Math.max(1, ...weeklyApplications.weeks.map((week) => week.count));
    const weeklyPoints = weeklyApplications.weeks.map((week, index) => {
        const x = 24 + (index * (WEEKLY_CHART_WIDTH - 48)) / Math.max(weeklyApplications.weeks.length - 1, 1);
        const y = WEEKLY_CHART_HEIGHT - 24 - (week.count / maxWeeklyCount) * (WEEKLY_CHART_HEIGHT - 42);
        return { x, y, ...week };
    });
    const weeklyPath = weeklyPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    const isEditing = Boolean(editingId);
    const duplicateMatch = useMemo(
        () =>
            applications.find((app) => {
                if (editingId && app.id === editingId) return false;
                const sameTitle =
                    app.title.trim().toLowerCase() === form.title.trim().toLowerCase();
                const sameCompany =
                    (app.companyName ?? "").trim().toLowerCase() ===
                    form.companyName.trim().toLowerCase();
                const sameUrl =
                    form.sourceUrl.trim() &&
                    (app.sourceUrl ?? "").trim().toLowerCase() ===
                    form.sourceUrl.trim().toLowerCase();
                return (
                    form.title.trim() &&
                    (sameUrl || (sameTitle && sameCompany && form.companyName.trim()))
                );
            }),
        [applications, editingId, form.companyName, form.sourceUrl, form.title],
    );

    useEffect(() => {
        if (authStatus === "checking") return;
        if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
        else localStorage.removeItem(ACCESS_TOKEN_KEY);
    }, [authStatus, token]);

    useEffect(() => {
        if (authStatus === "checking") return;
        if (userEmail) localStorage.setItem(USER_EMAIL_KEY, userEmail);
        else localStorage.removeItem(USER_EMAIL_KEY);
    }, [authStatus, userEmail]);

    useEffect(() => {
        let ignore = false;

        async function verifySession() {
            const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
            const storedEmail = localStorage.getItem(USER_EMAIL_KEY) ?? "";

            if (storedToken) {
                const res = await fetch(`${API_BASE_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${storedToken}` },
                    credentials: "include",
                });
                if (ignore) return;

                if (res.ok) {
                    const data = await res.json().catch(() => ({}));
                    setToken(storedToken);
                    setUserEmail(data.user?.email ?? storedEmail);
                    setAuthStatus("signedIn");
                    return;
                }
            }

            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: "POST",
                credentials: "include",
            });
            if (ignore) return;

            if (refreshRes.ok) {
                const data = await refreshRes.json().catch(() => ({}));
                setToken(data.accessToken ?? "");
                setUserEmail(data.user?.email ?? "");
                setAuthStatus(data.accessToken ? "signedIn" : "signedOut");
                return;
            }

            setToken("");
            setUserEmail("");
            setAuthStatus("signedOut");
        }

        verifySession().catch(() => {
            if (ignore) return;
            setToken("");
            setUserEmail("");
            setAuthStatus("signedOut");
        });

        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (authStatus === "signedIn" && token) loadApplications(token);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authStatus, token]);

    async function authSubmit(e: FormEvent) {
        e.preventDefault();
        const response = await fetch(`${API_BASE_URL}/auth/${mode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) return setMessage(data.message ?? "Auth failed");
        setToken(data.accessToken);
        setUserEmail(data.user.email);
        setAuthStatus("signedIn");
        setMessage(`Welcome ${data.user.email}`);
        loadApplications(data.accessToken);
    }

    async function signOut() {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",
        }).catch(() => undefined);
        setToken("");
        setUserEmail("");
        setPassword("");
        setApplications([]);
        setHistoryByApp({});
        setOpenTimelineId(null);
        resetImportFlow();
        setIsImportDrawerOpen(false);
        setIsProfileMenuOpen(false);
        setCurrentView("dashboard");
        setAuthStatus("signedOut");
        setMessage("Signed out successfully.");
    }

    async function authedFetch(path: string, init: RequestInit = {}) {
        const res = await fetch(`${API_BASE_URL}${path}`, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(init.headers || {}),
            },
            credentials: "include",
        });
        if (res.status === 401) {
            setMessage("Unauthorized. Log in again.");
            setToken("");
            setUserEmail("");
            setAuthStatus("signedOut");
        }
        return res;
    }

    async function loadApplications(activeToken = token) {
        if (!activeToken) return;
        const res = await fetch(`${API_BASE_URL}/applications`, {
            headers: { Authorization: `Bearer ${activeToken}` },
        });
        const data = await res.json();
        if (!res.ok)
            return setMessage(data.message ?? "Failed loading applications");
        setApplications(data.applications);
    }

    async function loadHistory(id: string) {
        const res = await authedFetch(`/applications/${id}/history`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setMessage(data.message ?? "Failed loading history");
        setHistoryByApp((prev) => ({ ...prev, [id]: data.history }));
    }

    function resetApplicationForm() {
        setForm(emptyForm);
        setEditingId(null);
        setFormErrors({});
    }

    function openCreateApplication() {
        resetApplicationForm();
        setIsApplicationFormOpen(true);
    }

    function closeApplicationForm() {
        resetApplicationForm();
        setIsApplicationFormOpen(false);
    }

    function resetImportFlow() {
        setImportStep("capture");
        setImportCapture(emptyImportCapture);
        setImportReview(emptyImportReview);
        setImportDraft(null);
        setParserDebug(null);
        setImportErrors({});
        setImportDuplicates([]);
        setIsImportSubmitting(false);
    }

    function openImportDrawer() {
        resetImportFlow();
        setIsApplicationFormOpen(false);
        setIsImportDrawerOpen(true);
    }

    function closeImportDrawer() {
        resetImportFlow();
        setIsImportDrawerOpen(false);
    }

    function buildImportReview(draft: ImportDraft) {
        return {
            title: draft.parsedTitle ?? "",
            companyName: draft.parsedCompany ?? "",
            status: "SAVED",
            source: draft.source ?? "",
            sourceUrl: draft.sourceUrl ?? "",
            location: draft.parsedLocation ?? "",
            salaryMin: draft.parsedSalaryMin ? String(draft.parsedSalaryMin) : "",
            salaryMax: draft.parsedSalaryMax ? String(draft.parsedSalaryMax) : "",
            description: draft.parsedDescription ?? "",
            notes: "",
            dateApplied: "",
        };
    }

    function validateApplicationForm() {
        const errors: Record<string, string> = {};
        if (!form.title.trim()) errors.title = "Job title is required.";
        if (form.sourceUrl.trim()) {
            try {
                new URL(form.sourceUrl);
            } catch {
                errors.sourceUrl = "Enter a valid URL, including https://.";
            }
        }
        if (form.dateApplied) {
            const selected = new Date(`${form.dateApplied}T00:00:00`);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selected > today)
                errors.dateApplied = "Date applied cannot be in the future.";
        }
        if (!STATUSES.includes(form.status as (typeof STATUSES)[number]))
            errors.status = "Choose a valid status.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }

    function validateImportCapture() {
        const errors: Record<string, string> = {};
        const hasInput =
            importCapture.sourceUrl.trim() ||
            importCapture.pageTitle.trim() ||
            importCapture.rawText.trim();
        if (!hasInput) errors.rawText = "Add a job URL, page title, or description.";
        if (importCapture.sourceUrl.trim()) {
            try {
                new URL(importCapture.sourceUrl);
            } catch {
                errors.sourceUrl = "Enter a valid URL, including https://.";
            }
        }
        setImportErrors(errors);
        return Object.keys(errors).length === 0;
    }

    function validateImportReview() {
        const errors: Record<string, string> = {};
        if (!importReview.title.trim()) errors.title = "Job title is required.";
        if (!STATUSES.includes(importReview.status as (typeof STATUSES)[number]))
            errors.status = "Choose a valid status.";
        if (importReview.sourceUrl.trim()) {
            try {
                new URL(importReview.sourceUrl);
            } catch {
                errors.sourceUrl = "Enter a valid URL, including https://.";
            }
        }
        const salaryMin = importReview.salaryMin.trim()
            ? Number(importReview.salaryMin)
            : null;
        const salaryMax = importReview.salaryMax.trim()
            ? Number(importReview.salaryMax)
            : null;
        if (salaryMin !== null && !Number.isInteger(salaryMin))
            errors.salaryMin = "Use whole dollars.";
        if (salaryMax !== null && !Number.isInteger(salaryMax))
            errors.salaryMax = "Use whole dollars.";
        if (
            salaryMin !== null &&
            salaryMax !== null &&
            Number.isInteger(salaryMin) &&
            Number.isInteger(salaryMax) &&
            salaryMin > salaryMax
        )
            errors.salaryMax = "Max must be greater than min.";
        if (importReview.dateApplied) {
            const selected = new Date(`${importReview.dateApplied}T00:00:00`);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selected > today)
                errors.dateApplied = "Date applied cannot be in the future.";
        }
        setImportErrors(errors);
        return Object.keys(errors).length === 0;
    }

    async function createImportDraft(e: FormEvent) {
        e.preventDefault();
        if (!validateImportCapture()) return;
        setIsImportSubmitting(true);
        const res = await authedFetch("/imports/create-draft", {
            method: "POST",
            body: JSON.stringify({ ...importCapture, debug: true }),
        });
        const data = await res.json().catch(() => ({}));
        setIsImportSubmitting(false);
        if (!res.ok) return setMessage(data.message ?? "Import failed");

        setImportDraft(data.importDraft);
        setImportReview(buildImportReview(data.importDraft));
        setParserDebug(data.debug ?? null);
        setImportDuplicates(data.duplicateCandidates ?? []);
        setImportErrors({});
        setImportStep("review");
        setMessage(
            data.duplicateCandidates?.length
                ? "Possible duplicate found. Review before saving."
                : "Import draft ready.",
        );
    }

    async function convertImportDraft(e: FormEvent) {
        e.preventDefault();
        if (!importDraft || !validateImportReview()) return;
        setIsImportSubmitting(true);
        const payload = {
            ...importReview,
            salaryMin: importReview.salaryMin.trim()
                ? Number(importReview.salaryMin)
                : null,
            salaryMax: importReview.salaryMax.trim()
                ? Number(importReview.salaryMax)
                : null,
            dateApplied: importReview.dateApplied || null,
        };
        const res = await authedFetch(`/imports/${importDraft.id}/convert`, {
            method: "POST",
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        setIsImportSubmitting(false);
        if (res.status === 409 && data.duplicates) {
            setImportDuplicates(data.duplicates);
            return setMessage("Possible duplicate detected. Save was blocked.");
        }
        if (!res.ok) return setMessage(data.message ?? "Import conversion failed");

        closeImportDrawer();
        setMessage("Imported job saved.");
        loadApplications();
    }

    async function saveApplication(e: FormEvent) {
        e.preventDefault();
        if (!validateApplicationForm()) return;
        const wasEditing = Boolean(editingId);
        const method = editingId ? "PUT" : "POST";
        const url = editingId ? `/applications/${editingId}` : "/applications";
        const payload = { ...form, dateApplied: form.dateApplied || null };
        const res = await authedFetch(url, {
            method,
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setMessage(data.message ?? "Save failed");
        resetApplicationForm();
        setIsApplicationFormOpen(false);
        setMessage(wasEditing ? "Application updated." : "Application saved.");
        loadApplications();
    }

    async function transitionStatus(id: string, nextStatus: string) {
        const original = applications;
        setApplications((prev) =>
            prev.map((app) => (app.id === id ? { ...app, status: nextStatus } : app)),
        );
        const res = await authedFetch(`/applications/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: nextStatus }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setApplications(original);
            return setMessage(data.message ?? "Failed to move card");
        }
        setApplications((prev) =>
            prev.map((app) => (app.id === id ? data.application : app)),
        );
        if (openTimelineId === id) loadHistory(id);
    }

    async function removeApplication(id: string) {
        const res = await authedFetch(`/applications/${id}`, { method: "DELETE" });
        if (!res.ok) return setMessage("Delete failed");
        if (editingId === id) closeApplicationForm();
        loadApplications();
    }

    function startEdit(app: Application) {
        setEditingId(app.id);
        setFormErrors({});
        setForm({
            title: app.title,
            companyName: app.companyName ?? "",
            status: app.status,
            source: app.source ?? "",
            sourceUrl: app.sourceUrl ?? "",
            location: app.location ?? "",
            notes: app.notes ?? "",
            dateApplied: app.dateApplied ? app.dateApplied.slice(0, 10) : "",
        });
        setIsApplicationFormOpen(true);
    }

    if (authStatus !== "signedIn" || !token)
        return (
            <main className="p-8 max-w-xl mx-auto">
                <h1 className="text-2xl font-semibold mb-4">JobAppLedger</h1>
                <form onSubmit={authSubmit} className="space-y-3">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="border px-3 py-2"
                            onClick={() => setMode("signup")}
                        >
                            Sign up
                        </button>
                        <button
                            type="button"
                            className="border px-3 py-2"
                            onClick={() => setMode("login")}
                        >
                            Login
                        </button>
                    </div>
                    <input
                        className="w-full border px-3 py-2"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        className="w-full border px-3 py-2"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button className="bg-black text-white px-4 py-2">{mode}</button>
                    {authStatus === "checking" && <p>Checking session...</p>}
                    {message && <p>{message}</p>}
                </form>
            </main>
        );

    return (
        <div className="dashboard-shell">
            <aside className="sidebar">
                <div className="brand">
                    <span className="brand-mark">▣</span>
                    <strong>JobAppLedger</strong>
                </div>
                {[
                    "⌂ Dashboard",
                    "▥ Pipeline",
                    "▣ Applications",
                    "☁ Import Job",
                    "▤ Interviews",
                    "☑ Tasks",
                    "▧ Contacts",
                    "⌁ Analytics",
                    "⚙ Settings",
                ].map((item, i) => (
                    <button
                        key={item}
                        className={i === 0 ? "nav-item active" : "nav-item"}
                    >
                        {item}
                    </button>
                ))}
            </aside>
            <main className="dashboard-main">
                <header className="topbar">
                    <div className="search">
                        ⌕ <span>Search jobs, companies, contacts...</span>
                        <kbd>⌘ K</kbd>
                    </div>
                    <div className="profile" onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsProfileMenuOpen(false);
                    }}>
                        <span className="bell">
                            ♧<b>2</b>
                        </span>
                        <button
                            type="button"
                            className="profile-trigger"
                            aria-haspopup="menu"
                            aria-expanded={isProfileMenuOpen}
                            onClick={() => setIsProfileMenuOpen((open) => !open)}
                        >
                            <span className="avatar">👨🏽‍💼</span>
                            <strong>{firstName}</strong>
                            <span aria-hidden="true">⌄</span>
                        </button>
                        {isProfileMenuOpen && (
                            <div className="profile-menu" role="menu">
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setCurrentView("account");
                                        setIsProfileMenuOpen(false);
                                    }}
                                >
                                    View account
                                </button>
                                <button type="button" role="menuitem" onClick={signOut}>
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </header>
                {currentView === "account" ? (
                    <section className="account-page">
                        <div className="account-card">
                            <div className="account-avatar">👨🏽‍💼</div>
                            <div>
                                <p>Account</p>
                                <h1>{firstName}</h1>
                                <span>{userEmail || email}</span>
                            </div>
                        </div>
                        <div className="account-grid">
                            <article>
                                <span>Email address</span>
                                <strong>{userEmail || email}</strong>
                            </article>
                            <article>
                                <span>Applications tracked</span>
                                <strong>{applications.length}</strong>
                            </article>
                            <article>
                                <span>Active pipeline</span>
                                <strong>{activePipeline}</strong>
                            </article>
                        </div>
                        <div className="account-actions">
                            <button type="button" className="primary" onClick={() => setCurrentView("dashboard")}>
                                Return to dashboard
                            </button>
                            <button type="button" className="danger" onClick={signOut}>
                                Sign out
                            </button>
                        </div>
                    </section>
                ) : (
                    <>
                <section className="hero">
                    <h1>Welcome back, {firstName} 👋</h1>
                    <p>
                        Track your job search, stay on top of interviews, and follow up
                        faster.
                    </p>
                    <div className="actions">
                        <button className="primary" onClick={openImportDrawer}>
                            ☁ Import Job
                        </button>
                        <button className="secondary" onClick={openCreateApplication}>
                            ＋ Add Application
                        </button>
                    </div>
                </section>
                <section className="pipeline-stats-container">
                    <PipelineSankey applications={applications} />
                    <section className="stat-grid">
                        <div className="stat-card">
                            <Icon>▣</Icon>
                            <div>
                                <p>Total Applications</p>
                                <strong>{applications.length}</strong>
                                <span>All time</span>
                            </div>
                            <em>−</em>
                        </div>
                        <div className="stat-card">
                            <Icon tone="green">▥</Icon>
                            <div>
                                <p>Active Applications</p>
                                <strong>{activePipeline}</strong>
                                <span>In progress</span>
                            </div>
                            <em>−</em>
                        </div>
                        <div className="stat-card">
                            <Icon tone="purple">▤</Icon>
                            <div>
                                <p>Interviews Scheduled</p>
                                <strong>0</strong>
                                <span>Upcoming</span>
                            </div>
                            <em>−</em>
                        </div>
                        <div className="stat-card">
                            <Icon tone="orange">☑</Icon>
                            <div>
                                <p>Tasks Due</p>
                                <strong>0</strong>
                                <span>Needs attention</span>
                            </div>
                            <em>−</em>
                        </div>
                    </section>
                </section>

                {message && <p className="notice">{message}</p>}
                <section className="panel tracker-panel">
                    <div className="panel-title">
                        <div>
                            <h2>
                                ▣ Application Tracker <span>ⓘ</span>
                            </h2>
                            <p>Track your applications across stages.</p>
                        </div>
                        <button className="primary" onClick={openCreateApplication}>
                            ＋ Add Application
                        </button>
                    </div>
                    <div className="filter-row" aria-label="Application filters">
                        <select
                            value={filters.status}
                            onChange={(e) =>
                                setFilters({ ...filters, status: e.target.value })
                            }
                        >
                            <option value="">All statuses</option>
                            {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {STATUS_LABELS[s]}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filters.source}
                            onChange={(e) =>
                                setFilters({ ...filters, source: e.target.value })
                            }
                        >
                            <option value="">All sources</option>
                            {SOURCES.map((source) => (
                                <option key={source}>{source}</option>
                            ))}
                        </select>
                        <input
                            placeholder="Company"
                            value={filters.company}
                            onChange={(e) =>
                                setFilters({ ...filters, company: e.target.value })
                            }
                        />
                        <input
                            type="date"
                            aria-label="Start date"
                            value={filters.startDate}
                            onChange={(e) =>
                                setFilters({ ...filters, startDate: e.target.value })
                            }
                        />
                        <input
                            type="date"
                            aria-label="End date"
                            value={filters.endDate}
                            onChange={(e) =>
                                setFilters({ ...filters, endDate: e.target.value })
                            }
                        />
                        <button onClick={() => setAppliedTrackerFilters(filters)}>
                            Apply filters
                        </button>
                    </div>
                    <div className="kanban">
                        {DASHBOARD_STATUSES.map((status) => (
                            <section
                                key={status}
                                className={`lane ${status.toLowerCase()}`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    const id = e.dataTransfer.getData("text/plain");
                                    if (id) transitionStatus(id, status);
                                }}
                            >
                                <h3>{STATUS_LABELS[status]}</h3>
                                <strong>{grouped[status].length}</strong>
                                <div className="dropzone">
                                    {grouped[status].map((a) => (
                                        <article
                                            key={a.id}
                                            className="job-card"
                                            draggable
                                            onDragStart={(e) =>
                                                e.dataTransfer.setData("text/plain", a.id)
                                            }
                                        >
                                            <b>{a.title}</b>
                                            <span>{a.companyName ?? "Unknown"}</span>
                                            <small>{a.source ?? "No source"}</small>
                                            <div>
                                                <button onClick={() => startEdit(a)}>Edit</button>
                                                <button onClick={() => removeApplication(a.id)}>
                                                    Delete
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const next = openTimelineId === a.id ? null : a.id;
                                                        setOpenTimelineId(next);
                                                        if (next && !historyByApp[a.id])
                                                            await loadHistory(a.id);
                                                    }}
                                                >
                                                    History
                                                </button>
                                            </div>
                                            {openTimelineId === a.id && (
                                                <ul>
                                                    {(historyByApp[a.id] ?? []).map((entry) => (
                                                        <li key={entry.id}>{entry.message}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                    {trackerApplications.length === 0 && (
                        <div className="empty-tracker">
                            <h3>
                                {applications.length === 0
                                    ? "Your pipeline is empty"
                                    : "No applications match these filters"}
                            </h3>
                            <p>
                                {applications.length === 0
                                    ? "Import jobs or add applications to start tracking."
                                    : "Adjust the Application Tracker filters to see more applications."}
                            </p>
                            <button className="secondary" onClick={openCreateApplication}>
                                ＋ Add Application
                            </button>
                        </div>
                    )}
                </section>
                <section className="mini-grid">
                    <div className="panel empty-card">
                        <h2>
                            ▤ Upcoming Interviews <a>View all</a>
                        </h2>
                        <div className="empty-illustration">🗓️</div>
                        <h3>No interviews scheduled yet</h3>
                        <p>When you schedule interviews, they&apos;ll appear here.</p>
                        <button className="secondary small">▤ Add Interview</button>
                    </div>
                    <div className="panel empty-card">
                        <h2>
                            ☑ Tasks & Follow-Ups <a>View all</a>
                        </h2>
                        <div className="empty-illustration">📋</div>
                        <h3>No tasks yet</h3>
                        <p>Create follow-up tasks and never miss a beat.</p>
                        <button className="secondary small">＋ Create Task</button>
                    </div>
                    <div className="panel empty-card">
                        <h2>
                            ☁ Recent Imports <a>View all</a>
                        </h2>
                        <div className="empty-illustration">🧾</div>
                        <h3>No imports yet</h3>
                        <p>
                            Import jobs from LinkedIn, Indeed, Greenhouse, Lever, Workday, and
                            more.
                        </p>
                        <button className="secondary small" onClick={openImportDrawer}>
                            ☁ Import Job
                        </button>
                    </div>
                </section>
                <section className="analytics-grid">
                    <div className="panel sources">
                        <h2>
                            Application Sources <span>ⓘ</span>
                        </h2>
                        <div
                            className={`donut${totalSourceCount ? " has-data" : ""}`}
                            style={donutBackground ? { background: donutBackground } : undefined}
                            aria-label={`${totalSourceCount} applications with tracked sources`}
                        >
                            <strong>{totalSourceCount}</strong>
                            <span>{totalSourceCount === 1 ? "source" : "sources"}</span>
                        </div>
                        <div className="source-list">
                            {SOURCES.map((source, i) => (
                                <span key={source}>
                                    <b style={{ background: sourceDots[i] }} />
                                    {source}
                                    <em>{sourceCounts[i]} ({sourceSegments[i].percentage}%)</em>
                                </span>
                            ))}
                        </div>
                        <p>
                            {totalSourceCount
                                ? "Your source breakdown updates as applications are added or edited."
                                : "Import jobs or add sources to see your source breakdown."}
                        </p>
                    </div>
                    <div className="panel weekly">
                        <h2>
                            Weekly Applications <span>ⓘ</span>
                            <select
                                aria-label="Weekly applications timeframe"
                                value={weeklyRangeWeeks}
                                onChange={(e) =>
                                    setWeeklyRangeWeeks(Number(e.target.value) as WeeklyRangeWeeks)
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
                                    d={`${weeklyPath} L ${weeklyPoints.at(-1)?.x ?? 0} ${WEEKLY_CHART_HEIGHT - 22} L ${weeklyPoints[0]?.x ?? 0} ${WEEKLY_CHART_HEIGHT - 22} Z`}
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
                </section>
                </>
                )}
                {isApplicationFormOpen && (
                    <div className="drawer-backdrop" onClick={closeApplicationForm}>
                        <aside
                            className="application-drawer"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="application-drawer-title"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <form onSubmit={saveApplication}>
                                <header className="drawer-header">
                                    <button
                                        type="button"
                                        className="drawer-close"
                                        onClick={closeApplicationForm}
                                    >
                                        ←
                                    </button>
                                    <div>
                                        <h2 id="application-drawer-title">
                                            {isEditing ? "Edit application" : "Add application"}
                                        </h2>
                                        <p>
                                            {isEditing
                                                ? "Update role details without losing your place in the pipeline."
                                                : "Track a role in your search and keep next steps organized."}
                                        </p>
                                    </div>
                                </header>
                                {duplicateMatch && (
                                    <p className="duplicate-warning">
                                        Possible duplicate: {duplicateMatch.title} at{" "}
                                        {duplicateMatch.companyName ?? "Unknown company"}.
                                    </p>
                                )}
                                <section className="form-section">
                                    <h3>Primary details</h3>
                                    <label>
                                        Job title *
                                        <input
                                            value={form.title}
                                            onChange={(e) =>
                                                setForm({ ...form, title: e.target.value })
                                            }
                                            placeholder="e.g. Senior Frontend Engineer"
                                            required
                                        />
                                    </label>
                                    {formErrors.title && (
                                        <span className="field-error">{formErrors.title}</span>
                                    )}
                                    <label>
                                        Company
                                        <input
                                            value={form.companyName}
                                            onChange={(e) =>
                                                setForm({ ...form, companyName: e.target.value })
                                            }
                                            placeholder="e.g. Stripe"
                                        />
                                    </label>
                                    <label>
                                        Status
                                        <select
                                            value={form.status}
                                            onChange={(e) =>
                                                setForm({ ...form, status: e.target.value })
                                            }
                                        >
                                            {STATUSES.map((s) => (
                                                <option key={s} value={s}>
                                                    {STATUS_LABELS[s]}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    {formErrors.status && (
                                        <span className="field-error">{formErrors.status}</span>
                                    )}
                                    <label>
                                        Location
                                        <input
                                            value={form.location}
                                            onChange={(e) =>
                                                setForm({ ...form, location: e.target.value })
                                            }
                                            placeholder="e.g. Remote, New York, NY"
                                        />
                                    </label>
                                    <label>
                                        Date applied
                                        <input
                                            type="date"
                                            value={form.dateApplied}
                                            onChange={(e) =>
                                                setForm({ ...form, dateApplied: e.target.value })
                                            }
                                        />
                                    </label>
                                    {formErrors.dateApplied && (
                                        <span className="field-error">
                                            {formErrors.dateApplied}
                                        </span>
                                    )}
                                </section>
                                <section className="form-section">
                                    <h3>Source details</h3>
                                    <label>
                                        Source
                                        <select
                                            value={form.source}
                                            onChange={(e) =>
                                                setForm({ ...form, source: e.target.value })
                                            }
                                        >
                                            {SOURCE_OPTIONS.map((source) => (
                                                <option key={source || "blank"} value={source}>
                                                    {source || "Select a source"}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        Job URL
                                        <input
                                            type="url"
                                            value={form.sourceUrl}
                                            onChange={(e) =>
                                                setForm({ ...form, sourceUrl: e.target.value })
                                            }
                                            placeholder="https://..."
                                        />
                                    </label>
                                    {formErrors.sourceUrl && (
                                        <span className="field-error">{formErrors.sourceUrl}</span>
                                    )}
                                </section>
                                <section className="form-section">
                                    <h3>Notes</h3>
                                    <label>
                                        Notes
                                        <textarea
                                            value={form.notes}
                                            onChange={(e) =>
                                                setForm({ ...form, notes: e.target.value })
                                            }
                                            placeholder="Paste notes, recruiter messages, or next steps..."
                                            rows={6}
                                        />
                                    </label>
                                </section>
                                <footer className="drawer-footer">
                                    {isEditing && editingId && (
                                        <button
                                            type="button"
                                            className="danger"
                                            onClick={() => removeApplication(editingId)}
                                        >
                                            Delete application
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="secondary"
                                        onClick={closeApplicationForm}
                                    >
                                        Cancel
                                    </button>
                                    <button className="primary">
                                        {isEditing ? "Update application" : "Save application"}
                                    </button>
                                </footer>
                            </form>
                        </aside>
                    </div>
                )}
                {isImportDrawerOpen && (
                    <div className="drawer-backdrop" onClick={closeImportDrawer}>
                        <aside
                            className="application-drawer import-drawer"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="import-drawer-title"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {importStep === "capture" ? (
                                <form onSubmit={createImportDraft}>
                                    <header className="drawer-header">
                                        <button
                                            type="button"
                                            className="drawer-close"
                                            onClick={closeImportDrawer}
                                        >
                                            ←
                                        </button>
                                        <div>
                                            <h2 id="import-drawer-title">Import job</h2>
                                            <p>Paste the posting details and create a review draft.</p>
                                        </div>
                                    </header>
                                    <section className="form-section">
                                        <h3>Posting source</h3>
                                        <label>
                                            Job URL
                                            <input
                                                type="url"
                                                value={importCapture.sourceUrl}
                                                onChange={(e) =>
                                                    setImportCapture({
                                                        ...importCapture,
                                                        sourceUrl: e.target.value,
                                                    })
                                                }
                                                placeholder="https://..."
                                            />
                                        </label>
                                        {importErrors.sourceUrl && (
                                            <span className="field-error">
                                                {importErrors.sourceUrl}
                                            </span>
                                        )}
                                        <label>
                                            Page title
                                            <input
                                                value={importCapture.pageTitle}
                                                onChange={(e) =>
                                                    setImportCapture({
                                                        ...importCapture,
                                                        pageTitle: e.target.value,
                                                    })
                                                }
                                                placeholder="Senior Frontend Engineer - ExampleCo"
                                            />
                                        </label>
                                    </section>
                                    <section className="form-section">
                                        <h3>Job description</h3>
                                        <label>
                                            Posting text
                                            <textarea
                                                value={importCapture.rawText}
                                                onChange={(e) =>
                                                    setImportCapture({
                                                        ...importCapture,
                                                        rawText: e.target.value,
                                                    })
                                                }
                                                placeholder="Paste the job description..."
                                                rows={10}
                                            />
                                        </label>
                                        {importErrors.rawText && (
                                            <span className="field-error">
                                                {importErrors.rawText}
                                            </span>
                                        )}
                                    </section>
                                    <footer className="drawer-footer">
                                        <button
                                            type="button"
                                            className="secondary"
                                            onClick={closeImportDrawer}
                                        >
                                            Cancel
                                        </button>
                                        <button className="primary" disabled={isImportSubmitting}>
                                            {isImportSubmitting ? "Creating..." : "Create draft"}
                                        </button>
                                    </footer>
                                </form>
                            ) : (
                                <form onSubmit={convertImportDraft}>
                                    <header className="drawer-header">
                                        <button
                                            type="button"
                                            className="drawer-close"
                                            onClick={closeImportDrawer}
                                        >
                                            ←
                                        </button>
                                        <div>
                                            <h2 id="import-drawer-title">Review import</h2>
                                            <p>Confirm the parsed job before saving it.</p>
                                        </div>
                                    </header>
                                    {typeof importDraft?.confidence === "number" && (
                                        <div className="import-confidence">
                                            <span>Confidence</span>
                                            <strong>{Math.round(importDraft.confidence * 100)}%</strong>
                                        </div>
                                    )}
                                    {parserDebug && (
                                        <details className="parser-debug">
                                            <summary>Parser debug</summary>
                                            <pre>{JSON.stringify(parserDebug, null, 2)}</pre>
                                        </details>
                                    )}
                                    {importDuplicates.length > 0 && (
                                        <div className="duplicate-warning import-warning">
                                            <strong>Possible duplicate</strong>
                                            <ul className="import-duplicate-list">
                                                {importDuplicates.map((duplicate) => (
                                                    <li key={duplicate.id}>
                                                        {duplicate.title} at{" "}
                                                        {duplicate.companyName ?? "Unknown company"}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <section className="form-section">
                                        <h3>Primary details</h3>
                                        <label>
                                            Job title *
                                            <input
                                                value={importReview.title}
                                                onChange={(e) =>
                                                    setImportReview({
                                                        ...importReview,
                                                        title: e.target.value,
                                                    })
                                                }
                                                required
                                            />
                                        </label>
                                        {importErrors.title && (
                                            <span className="field-error">{importErrors.title}</span>
                                        )}
                                        <label>
                                            Company
                                            <input
                                                value={importReview.companyName}
                                                onChange={(e) =>
                                                    setImportReview({
                                                        ...importReview,
                                                        companyName: e.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <label>
                                            Status
                                            <select
                                                value={importReview.status}
                                                onChange={(e) =>
                                                    setImportReview({
                                                        ...importReview,
                                                        status: e.target.value,
                                                    })
                                                }
                                            >
                                                {STATUSES.map((s) => (
                                                    <option key={s} value={s}>
                                                        {STATUS_LABELS[s]}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        {importErrors.status && (
                                            <span className="field-error">
                                                {importErrors.status}
                                            </span>
                                        )}
                                        <label>
                                            Location
                                            <input
                                                value={importReview.location}
                                                onChange={(e) =>
                                                    setImportReview({
                                                        ...importReview,
                                                        location: e.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        <label>
                                            Date applied
                                            <input
                                                type="date"
                                                value={importReview.dateApplied}
                                                onChange={(e) =>
                                                    setImportReview({
                                                        ...importReview,
                                                        dateApplied: e.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        {importErrors.dateApplied && (
                                            <span className="field-error">
                                                {importErrors.dateApplied}
                                            </span>
                                        )}
                                    </section>
                                    <section className="form-section">
                                        <h3>Source details</h3>
                                        <label>
                                            Source
                                            <select
                                                value={importReview.source}
                                                onChange={(e) =>
                                                    setImportReview({
                                                        ...importReview,
                                                        source: e.target.value,
                                                    })
                                                }
                                            >
                                                {importReview.source &&
                                                    !SOURCE_OPTIONS.includes(importReview.source) && (
                                                        <option value={importReview.source}>
                                                            {importReview.source}
                                                        </option>
                                                    )}
                                                {SOURCE_OPTIONS.map((source) => (
                                                    <option key={source || "blank"} value={source}>
                                                        {source || "Select a source"}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label>
                                            Job URL
                                            <input
                                                type="url"
                                                value={importReview.sourceUrl}
                                                onChange={(e) =>
                                                    setImportReview({
                                                        ...importReview,
                                                        sourceUrl: e.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                        {importErrors.sourceUrl && (
                                            <span className="field-error">
                                                {importErrors.sourceUrl}
                                            </span>
                                        )}
                                    </section>
                                    <section className="form-section">
                                        <h3>Compensation</h3>
                                        <div className="form-grid-two">
                                            <label>
                                                Salary min
                                                <input
                                                    inputMode="numeric"
                                                    value={importReview.salaryMin}
                                                    onChange={(e) =>
                                                        setImportReview({
                                                            ...importReview,
                                                            salaryMin: e.target.value,
                                                        })
                                                    }
                                                    placeholder="120000"
                                                />
                                            </label>
                                            <label>
                                                Salary max
                                                <input
                                                    inputMode="numeric"
                                                    value={importReview.salaryMax}
                                                    onChange={(e) =>
                                                        setImportReview({
                                                            ...importReview,
                                                            salaryMax: e.target.value,
                                                        })
                                                    }
                                                    placeholder="160000"
                                                />
                                            </label>
                                        </div>
                                        {importErrors.salaryMin && (
                                            <span className="field-error">
                                                {importErrors.salaryMin}
                                            </span>
                                        )}
                                        {importErrors.salaryMax && (
                                            <span className="field-error">
                                                {importErrors.salaryMax}
                                            </span>
                                        )}
                                    </section>
                                    <section className="form-section">
                                        <h3>Description</h3>
                                        <label>
                                            Job description
                                            <textarea
                                                value={importReview.description}
                                                onChange={(e) =>
                                                    setImportReview({
                                                        ...importReview,
                                                        description: e.target.value,
                                                    })
                                                }
                                                rows={8}
                                            />
                                        </label>
                                        <label>
                                            Notes
                                            <textarea
                                                value={importReview.notes}
                                                onChange={(e) =>
                                                    setImportReview({
                                                        ...importReview,
                                                        notes: e.target.value,
                                                    })
                                                }
                                                rows={4}
                                            />
                                        </label>
                                    </section>
                                    <footer className="drawer-footer">
                                        <button
                                            type="button"
                                            className="secondary"
                                            onClick={() => setImportStep("capture")}
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            className="secondary"
                                            onClick={closeImportDrawer}
                                        >
                                            Cancel
                                        </button>
                                        <button className="primary" disabled={isImportSubmitting}>
                                            {isImportSubmitting ? "Saving..." : "Save application"}
                                        </button>
                                    </footer>
                                </form>
                            )}
                        </aside>
                    </div>
                )}
            </main>
        </div>
    );
}
