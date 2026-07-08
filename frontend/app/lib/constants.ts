import type {
    AppIconName,
    ApplicationFormValues,
    ApplicationStatus,
    ImportCaptureValues,
    ImportReviewValues,
    WeeklyRangeWeeks,
} from "./types";

export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
export const ACCESS_TOKEN_KEY = "jobappledger_access_token";
export const USER_EMAIL_KEY = "jobappledger_user_email";

export const STATUSES = [
    "SAVED",
    "APPLIED",
    "INTERVIEWING",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
] as const;

export const DASHBOARD_STATUSES = [
    "SAVED",
    "APPLIED",
    "INTERVIEWING",
    "OFFER",
    "REJECTED",
    "WITHDRAWN",
] as const;

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
    SAVED: "Saved",
    APPLIED: "Applied",
    INTERVIEWING: "Interviewing",
    OFFER: "Offer",
    REJECTED: "Rejected",
    WITHDRAWN: "Withdrawn",
};

export const SOURCES = [
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

export const SOURCE_OPTIONS = ["", ...SOURCES, "Company Careers", "Referral", "Other"];

export const SOURCE_ALIASES: Record<string, string> = {
    "company careers": "Company Site",
    referral: "Referrals",
};

export const SOURCE_DOTS = [
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

export const WEEKLY_RANGE_OPTIONS = [
    { label: "Last 4 weeks", weeks: 4 },
    { label: "Last 6 weeks", weeks: 6 },
    { label: "Last 12 weeks", weeks: 12 },
] as const;

export const DEFAULT_WEEKLY_RANGE: WeeklyRangeWeeks = 6;

export const NAV_ITEMS: Array<{ label: string; icon: AppIconName }> = [
    { label: "Dashboard", icon: "dashboard" },
    { label: "Pipeline", icon: "pipeline" },
    { label: "Applications", icon: "applications" },
    { label: "Import Job", icon: "import" },
    { label: "Interviews", icon: "calendar" },
    { label: "Tasks", icon: "checklist" },
    { label: "Contacts", icon: "contacts" },
    { label: "Analytics", icon: "analytics" },
    { label: "Settings", icon: "settings" },
];

export const EMPTY_APPLICATION_FORM: ApplicationFormValues = {
    title: "",
    companyName: "",
    status: "SAVED",
    source: "",
    sourceUrl: "",
    location: "",
    notes: "",
    dateApplied: "",
};

export const EMPTY_IMPORT_CAPTURE: ImportCaptureValues = {
    sourceUrl: "",
    pageTitle: "",
    rawText: "",
};

export const EMPTY_IMPORT_REVIEW: ImportReviewValues = {
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

export const PIPELINE_WIDTH = 820;
export const PIPELINE_HEIGHT = 150;
export const WEEKLY_CHART_HEIGHT = 132;
export const WEEKLY_CHART_WIDTH = 540;
