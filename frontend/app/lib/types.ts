import type {
    DASHBOARD_STATUSES,
    INTERVIEW_OUTCOMES,
    INTERVIEW_TYPES,
    STATUSES,
    WEEKLY_RANGE_OPTIONS,
} from "./constants";

export type ApplicationStatus = (typeof STATUSES)[number];
export type DashboardStatus = (typeof DASHBOARD_STATUSES)[number];
export type InterviewType = (typeof INTERVIEW_TYPES)[number];
export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number];
export type WeeklyRangeWeeks = (typeof WEEKLY_RANGE_OPTIONS)[number]["weeks"];

export type Mode = "signup" | "login";
export type AuthStatus = "checking" | "signedOut" | "signedIn";
export type DashboardView = "dashboard" | "applications" | "interviews" | "account";

export type Application = {
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

export type ImportDraft = {
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

export type ParserDebug = Record<string, unknown>;

export type ActivityLog = {
    id: string;
    applicationId: string;
    type: string;
    message: string;
    metadata: unknown | null;
    createdAt: string;
};

export type Interview = {
    id: string;
    applicationId: string;
    type: string;
    scheduledAt: string;
    durationMinutes: number | null;
    location: string | null;
    meetingUrl: string | null;
    interviewerName: string | null;
    notes: string | null;
    outcome: string;
    applicationTitle: string | null;
    companyName: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ApplicationFormValues = {
    title: string;
    companyName: string;
    status: string;
    source: string;
    sourceUrl: string;
    location: string;
    notes: string;
    dateApplied: string;
};

export type InterviewFormValues = {
    applicationId: string;
    type: string;
    scheduledDate: string;
    scheduledTime: string;
    durationMinutes: string;
    location: string;
    meetingUrl: string;
    interviewerName: string;
    notes: string;
    outcome: string;
};

export type ImportCaptureValues = {
    sourceUrl: string;
    pageTitle: string;
    rawText: string;
};

export type ImportReviewValues = {
    title: string;
    companyName: string;
    status: string;
    source: string;
    sourceUrl: string;
    location: string;
    salaryMin: string;
    salaryMax: string;
    description: string;
    notes: string;
    dateApplied: string;
};

export type ApplicationFilters = {
    status: string;
    source: string;
    company: string;
    startDate: string;
    endDate: string;
};

export type AppIconName =
    | "account"
    | "analytics"
    | "applications"
    | "arrow-left"
    | "arrow-right"
    | "bell"
    | "calendar"
    | "checklist"
    | "chevron-down"
    | "clock"
    | "contacts"
    | "dashboard"
    | "document"
    | "edit"
    | "filter"
    | "history"
    | "import"
    | "info"
    | "ledger"
    | "logout"
    | "minus"
    | "pipeline"
    | "plus"
    | "search"
    | "settings"
    | "source"
    | "trash"
    | "trend";

export type IconTone = "blue" | "green" | "purple" | "orange";
