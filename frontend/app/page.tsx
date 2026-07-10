"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

import { AccountView } from "./components/AccountView";
import { AnalyticsView } from "./components/AnalyticsView";
import { ApplicationsView } from "./components/ApplicationsView";
import { ApplicationDrawer } from "./components/ApplicationDrawer";
import { AuthPanel } from "./components/AuthPanel";
import { DashboardShell } from "./components/DashboardShell";
import { ImportDrawer } from "./components/ImportDrawer";
import { InterviewDrawer } from "./components/InterviewDrawer";
import { InterviewsView } from "./components/InterviewsView";
import { TaskDrawer } from "./components/TaskDrawer";
import { TasksView } from "./components/TasksView";
import { DashboardHome } from "./components/dashboard/DashboardHome";
import { countActiveApplications } from "./lib/application-analytics";
import { toLocalDateTimeInputs } from "./lib/interview-utils";
import { toTaskDueDateInput, toTaskDueDatePayload } from "./lib/task-utils";
import {
    ACCESS_TOKEN_KEY,
    API_BASE_URL,
    DEFAULT_WEEKLY_RANGE,
    EMPTY_APPLICATION_FORM,
    EMPTY_IMPORT_CAPTURE,
    EMPTY_INTERVIEW_FORM,
    EMPTY_IMPORT_REVIEW,
    EMPTY_TASK_FORM,
    INTERVIEW_OUTCOMES,
    INTERVIEW_TYPES,
    STATUSES,
    TASK_TYPES,
    USER_EMAIL_KEY,
} from "./lib/constants";
import type {
    ActivityLog,
    Application,
    ApplicationFilters,
    ApplicationFormValues,
    AuthStatus,
    DashboardView,
    ImportDraft,
    ImportReviewValues,
    Interview,
    InterviewFormValues,
    Mode,
    ParserDebug,
    Task,
    TaskAutomationPreferences,
    TaskFormValues,
    WeeklyRangeWeeks,
} from "./lib/types";

const INITIAL_FILTERS: ApplicationFilters = {
    status: "",
    source: "",
    company: "",
    startDate: "",
    endDate: "",
};

export default function MainPage() {
    const [mode, setMode] = useState<Mode>("signup");
    const [email, setEmail] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [password, setPassword] = useState("");
    const [token, setToken] = useState("");
    const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
    const [message, setMessage] = useState("");
    const [applications, setApplications] = useState<Application[]>([]);
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [form, setForm] = useState<ApplicationFormValues>(EMPTY_APPLICATION_FORM);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isApplicationFormOpen, setIsApplicationFormOpen] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [interviewForm, setInterviewForm] =
        useState<InterviewFormValues>(EMPTY_INTERVIEW_FORM);
    const [interviewEditingId, setInterviewEditingId] = useState<string | null>(
        null,
    );
    const [isInterviewFormOpen, setIsInterviewFormOpen] = useState(false);
    const [interviewErrors, setInterviewErrors] = useState<Record<string, string>>(
        {},
    );
    const [taskForm, setTaskForm] = useState<TaskFormValues>(EMPTY_TASK_FORM);
    const [taskEditingId, setTaskEditingId] = useState<string | null>(null);
    const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
    const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});
    const [taskPreferences, setTaskPreferences] =
        useState<TaskAutomationPreferences>({
            autoCreateFollowUpTasks: false,
            autoCreateThankYouTasks: false,
        });
    const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
    const [importStep, setImportStep] = useState<"capture" | "review">("capture");
    const [importCapture, setImportCapture] = useState(EMPTY_IMPORT_CAPTURE);
    const [importReview, setImportReview] = useState(EMPTY_IMPORT_REVIEW);
    const [importDraft, setImportDraft] = useState<ImportDraft | null>(null);
    const [parserDebug, setParserDebug] = useState<ParserDebug | null>(null);
    const [importErrors, setImportErrors] = useState<Record<string, string>>({});
    const [importDuplicates, setImportDuplicates] = useState<Application[]>([]);
    const [isImportSubmitting, setIsImportSubmitting] = useState(false);
    const [filters, setFilters] = useState<ApplicationFilters>(INITIAL_FILTERS);
    const [appliedTrackerFilters, setAppliedTrackerFilters] =
        useState<ApplicationFilters>(INITIAL_FILTERS);
    const [historyByApp, setHistoryByApp] = useState<Record<string, ActivityLog[]>>(
        {},
    );
    const [openTimelineId, setOpenTimelineId] = useState<string | null>(null);
    const [weeklyRangeWeeks, setWeeklyRangeWeeks] =
        useState<WeeklyRangeWeeks>(DEFAULT_WEEKLY_RANGE);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState<DashboardView>("dashboard");
    const [focusedApplicationId, setFocusedApplicationId] = useState<string | null>(
        null,
    );
    const [focusedInterviewId, setFocusedInterviewId] = useState<string | null>(
        null,
    );

    const firstName = useMemo(() => {
        const name = (userEmail || email).split("@")[0]?.split(/[._-]/)[0];
        return name ? name.charAt(0).toUpperCase() + name.slice(1) : "Antonio";
    }, [email, userEmail]);

    const activePipeline = useMemo(
        () => countActiveApplications(applications),
        [applications],
    );

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
        if (authStatus === "signedIn" && token) {
            loadApplications(token);
            loadInterviews(token);
            loadTasks(token);
            loadTaskAutomationPreferences(token);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authStatus, token]);

    async function authSubmit(event: FormEvent) {
        event.preventDefault();
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
        loadInterviews(data.accessToken);
        loadTasks(data.accessToken);
        loadTaskAutomationPreferences(data.accessToken);
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
        setInterviews([]);
        setTasks([]);
        setTaskPreferences({
            autoCreateFollowUpTasks: false,
            autoCreateThankYouTasks: false,
        });
        setHistoryByApp({});
        setOpenTimelineId(null);
        resetInterviewForm();
        resetTaskForm();
        resetImportFlow();
        setIsImportDrawerOpen(false);
        setIsInterviewFormOpen(false);
        setIsTaskFormOpen(false);
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
        loadApplicationHistories(activeToken);
    }

    async function loadInterviews(activeToken = token) {
        if (!activeToken) return;
        const res = await fetch(`${API_BASE_URL}/interviews`, {
            headers: { Authorization: `Bearer ${activeToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setMessage(data.message ?? "Failed loading interviews");
        setInterviews(data.interviews ?? []);
    }

    async function loadTasks(activeToken = token) {
        if (!activeToken) return;
        const res = await fetch(`${API_BASE_URL}/tasks`, {
            headers: { Authorization: `Bearer ${activeToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setMessage(data.message ?? "Failed loading tasks");
        setTasks(data.tasks ?? []);
    }

    async function loadTaskAutomationPreferences(activeToken = token) {
        if (!activeToken) return;
        const res = await fetch(`${API_BASE_URL}/tasks/preferences`, {
            headers: { Authorization: `Bearer ${activeToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
            return setMessage(data.message ?? "Failed loading task preferences");
        setTaskPreferences({
            autoCreateFollowUpTasks:
                data.preferences?.autoCreateFollowUpTasks ?? false,
            autoCreateThankYouTasks: data.preferences?.autoCreateThankYouTasks ?? false,
        });
    }

    async function loadApplicationHistories(activeToken = token) {
        if (!activeToken) return;
        const res = await fetch(`${API_BASE_URL}/applications/history`, {
            headers: { Authorization: `Bearer ${activeToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
            return setMessage(data.message ?? "Failed loading application history");
        setHistoryByApp(data.historyByApp ?? {});
    }

    async function loadHistory(id: string) {
        const res = await authedFetch(`/applications/${id}/history`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setMessage(data.message ?? "Failed loading history");
        setHistoryByApp((prev) => ({ ...prev, [id]: data.history }));
    }

    async function removeHistoryEvent(applicationId: string, activityLogId: string) {
        const res = await authedFetch(
            `/applications/${applicationId}/history/${activityLogId}`,
            { method: "DELETE" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
            return setMessage(data.message ?? "History event delete failed");

        setHistoryByApp((prev) => ({
            ...prev,
            [applicationId]: (prev[applicationId] ?? []).filter(
                (entry) => entry.id !== activityLogId,
            ),
        }));
        setMessage("History event removed.");
    }

    function resetApplicationForm() {
        setForm(EMPTY_APPLICATION_FORM);
        setEditingId(null);
        setFormErrors({});
    }

    function openCreateApplication() {
        resetApplicationForm();
        setIsInterviewFormOpen(false);
        setIsTaskFormOpen(false);
        setIsImportDrawerOpen(false);
        setIsApplicationFormOpen(true);
    }

    function closeApplicationForm() {
        resetApplicationForm();
        setIsApplicationFormOpen(false);
    }

    function resetInterviewForm(applicationId = "") {
        setInterviewForm({ ...EMPTY_INTERVIEW_FORM, applicationId });
        setInterviewEditingId(null);
        setInterviewErrors({});
    }

    function resetTaskForm(applicationId = "") {
        setTaskForm({ ...EMPTY_TASK_FORM, applicationId });
        setTaskEditingId(null);
        setTaskErrors({});
    }

    function openCreateInterview(applicationId = "") {
        if (applications.length === 0) {
            setMessage("Add an application before scheduling an interview.");
            return;
        }

        const selectedApplicationId = applications.some(
            (application) => application.id === applicationId,
        )
            ? applicationId
            : "";

        resetInterviewForm(selectedApplicationId);
        setIsApplicationFormOpen(false);
        setIsTaskFormOpen(false);
        setIsImportDrawerOpen(false);
        setIsInterviewFormOpen(true);
    }

    function openCreateTask(applicationId = "") {
        const selectedApplicationId = applications.some(
            (application) => application.id === applicationId,
        )
            ? applicationId
            : "";

        resetTaskForm(selectedApplicationId);
        setIsApplicationFormOpen(false);
        setIsInterviewFormOpen(false);
        setIsImportDrawerOpen(false);
        setIsTaskFormOpen(true);
    }

    function viewApplication(applicationId: string) {
        setFocusedInterviewId(null);
        setFocusedApplicationId(applicationId);
        setCurrentView("applications");
    }

    function viewInterview(interviewId: string) {
        setFocusedInterviewId(interviewId);
        setCurrentView("interviews");
    }

    function changeCurrentView(view: DashboardView) {
        if (view === "interviews") setFocusedInterviewId(null);
        setCurrentView(view);
    }

    function closeInterviewForm() {
        resetInterviewForm();
        setIsInterviewFormOpen(false);
    }

    function closeTaskForm() {
        resetTaskForm();
        setIsTaskFormOpen(false);
    }

    function resetImportFlow() {
        setImportStep("capture");
        setImportCapture(EMPTY_IMPORT_CAPTURE);
        setImportReview(EMPTY_IMPORT_REVIEW);
        setImportDraft(null);
        setParserDebug(null);
        setImportErrors({});
        setImportDuplicates([]);
        setIsImportSubmitting(false);
    }

    function openImportDrawer() {
        resetImportFlow();
        setIsApplicationFormOpen(false);
        setIsInterviewFormOpen(false);
        setIsTaskFormOpen(false);
        setIsImportDrawerOpen(true);
    }

    function closeImportDrawer() {
        resetImportFlow();
        setIsImportDrawerOpen(false);
    }

    function buildImportReview(draft: ImportDraft): ImportReviewValues {
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
        const salaryMin = form.salaryMin.trim() ? Number(form.salaryMin) : null;
        const salaryMax = form.salaryMax.trim() ? Number(form.salaryMax) : null;
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
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }

    function validateInterviewForm() {
        const errors: Record<string, string> = {};
        if (!interviewForm.applicationId) {
            errors.applicationId = "Choose an application.";
        } else if (
            !applications.some(
                (application) => application.id === interviewForm.applicationId,
            )
        ) {
            errors.applicationId = "Choose a valid application.";
        }

        if (
            !INTERVIEW_TYPES.includes(
                interviewForm.type as (typeof INTERVIEW_TYPES)[number],
            )
        )
            errors.type = "Choose a valid interview type.";

        if (!interviewForm.scheduledDate) {
            errors.scheduledDate = "Choose an interview date.";
        }
        if (!interviewForm.scheduledTime) {
            errors.scheduledTime = "Choose an interview time.";
        }
        if (interviewForm.scheduledDate && interviewForm.scheduledTime) {
            const scheduledAt = new Date(
                `${interviewForm.scheduledDate}T${interviewForm.scheduledTime}:00`,
            );
            if (Number.isNaN(scheduledAt.getTime()))
                errors.scheduledDate = "Choose a valid interview date and time.";
        }

        if (interviewForm.durationMinutes.trim()) {
            const durationMinutes = Number(interviewForm.durationMinutes);
            if (!Number.isInteger(durationMinutes)) {
                errors.durationMinutes = "Use whole minutes.";
            } else if (durationMinutes < 1 || durationMinutes > 1440) {
                errors.durationMinutes = "Duration must be between 1 and 1440 minutes.";
            }
        }

        if (interviewForm.meetingUrl.trim()) {
            try {
                const parsed = new URL(interviewForm.meetingUrl);
                if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
            } catch {
                errors.meetingUrl = "Enter a valid URL, including https://.";
            }
        }

        if (
            !INTERVIEW_OUTCOMES.includes(
                interviewForm.outcome as (typeof INTERVIEW_OUTCOMES)[number],
            )
        )
            errors.outcome = "Choose a valid outcome.";

        setInterviewErrors(errors);
        return Object.keys(errors).length === 0;
    }

    function validateTaskForm() {
        const errors: Record<string, string> = {};
        if (!taskForm.title.trim()) errors.title = "Task title is required.";

        if (
            taskForm.applicationId &&
            !applications.some(
                (application) => application.id === taskForm.applicationId,
            )
        ) {
            errors.applicationId = "Choose a valid application.";
        }

        if (!TASK_TYPES.includes(taskForm.type as (typeof TASK_TYPES)[number]))
            errors.type = "Choose a valid task type.";

        if (taskForm.dueDate) {
            const dueDate = new Date(`${taskForm.dueDate}T12:00:00`);
            if (Number.isNaN(dueDate.getTime()))
                errors.dueDate = "Choose a valid due date.";
        }

        setTaskErrors(errors);
        return Object.keys(errors).length === 0;
    }

    function buildInterviewPayload() {
        const scheduledAt = new Date(
            `${interviewForm.scheduledDate}T${interviewForm.scheduledTime}:00`,
        );

        return {
            applicationId: interviewForm.applicationId,
            type: interviewForm.type,
            scheduledAt: scheduledAt.toISOString(),
            durationMinutes: interviewForm.durationMinutes.trim()
                ? Number(interviewForm.durationMinutes)
                : null,
            location: interviewForm.location,
            meetingUrl: interviewForm.meetingUrl,
            interviewerName: interviewForm.interviewerName,
            notes: interviewForm.notes,
            outcome: interviewForm.outcome,
        };
    }

    function buildTaskPayload() {
        return {
            title: taskForm.title,
            description: taskForm.description,
            applicationId: taskForm.applicationId || null,
            dueDate: toTaskDueDatePayload(taskForm.dueDate),
            type: taskForm.type,
        };
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

    async function createImportDraft(event: FormEvent) {
        event.preventDefault();
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

    async function convertImportDraft(event: FormEvent) {
        event.preventDefault();
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
        loadTasks();
    }

    async function saveApplication(event: FormEvent) {
        event.preventDefault();
        if (!validateApplicationForm()) return;
        const wasEditing = Boolean(editingId);
        const method = editingId ? "PUT" : "POST";
        const url = editingId ? `/applications/${editingId}` : "/applications";
        const payload = {
            ...form,
            salaryMin: form.salaryMin.trim() ? Number(form.salaryMin) : null,
            salaryMax: form.salaryMax.trim() ? Number(form.salaryMax) : null,
            dateApplied: form.dateApplied || null,
        };
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
        loadTasks();
    }

    async function saveInterview(event: FormEvent) {
        event.preventDefault();
        if (!validateInterviewForm()) return;

        const wasEditing = Boolean(interviewEditingId);
        const method = interviewEditingId ? "PATCH" : "POST";
        const url = interviewEditingId
            ? `/interviews/${interviewEditingId}`
            : "/interviews";
        const res = await authedFetch(url, {
            method,
            body: JSON.stringify(buildInterviewPayload()),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setMessage(data.message ?? "Interview save failed");

        closeInterviewForm();
        setMessage(wasEditing ? "Interview updated." : "Interview saved.");
        loadInterviews();
        loadApplications();
        loadTasks();
    }

    async function saveTask(event: FormEvent) {
        event.preventDefault();
        if (!validateTaskForm()) return;

        const wasEditing = Boolean(taskEditingId);
        const method = taskEditingId ? "PATCH" : "POST";
        const url = taskEditingId ? `/tasks/${taskEditingId}` : "/tasks";
        const res = await authedFetch(url, {
            method,
            body: JSON.stringify(buildTaskPayload()),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setMessage(data.message ?? "Task save failed");

        closeTaskForm();
        setMessage(wasEditing ? "Task updated." : "Task saved.");
        loadTasks();
        if (data.task?.applicationId) loadHistory(data.task.applicationId);
    }

    async function completeTask(id: string) {
        const res = await authedFetch(`/tasks/${id}/complete`, { method: "PATCH" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setMessage(data.message ?? "Task completion failed");

        setTasks((prev) => prev.map((task) => (task.id === id ? data.task : task)));
        setMessage("Task completed.");
        if (data.task?.applicationId) loadHistory(data.task.applicationId);
    }

    async function updateTaskAutomationPreferences(
        nextPreferences: Partial<TaskAutomationPreferences>,
    ) {
        const previousPreferences = taskPreferences;
        setTaskPreferences((current) => ({ ...current, ...nextPreferences }));
        const res = await authedFetch("/tasks/preferences", {
            method: "PATCH",
            body: JSON.stringify(nextPreferences),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setTaskPreferences(previousPreferences);
            return setMessage(data.message ?? "Task preference update failed");
        }

        setTaskPreferences({
            autoCreateFollowUpTasks:
                data.preferences?.autoCreateFollowUpTasks ?? false,
            autoCreateThankYouTasks:
                data.preferences?.autoCreateThankYouTasks ?? false,
        });
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
        loadHistory(id);
        loadTasks();
    }

    async function removeApplication(id: string) {
        const res = await authedFetch(`/applications/${id}`, { method: "DELETE" });
        if (!res.ok) return setMessage("Delete failed");
        if (editingId === id) closeApplicationForm();
        loadApplications();
        loadInterviews();
        loadTasks();
    }

    async function removeInterview(id: string) {
        const res = await authedFetch(`/interviews/${id}`, { method: "DELETE" });
        if (!res.ok) return setMessage("Interview delete failed");
        if (interviewEditingId === id) closeInterviewForm();
        setInterviews((prev) => prev.filter((interview) => interview.id !== id));
        setMessage("Interview deleted.");
    }

    async function removeTask(id: string) {
        const res = await authedFetch(`/tasks/${id}`, { method: "DELETE" });
        if (!res.ok) return setMessage("Task delete failed");
        if (taskEditingId === id) closeTaskForm();
        setTasks((prev) => prev.filter((task) => task.id !== id));
        setMessage("Task deleted.");
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
            salaryMin: app.salaryMin === null ? "" : String(app.salaryMin),
            salaryMax: app.salaryMax === null ? "" : String(app.salaryMax),
            description: app.description ?? "",
            notes: app.notes ?? "",
            dateApplied: app.dateApplied ? app.dateApplied.slice(0, 10) : "",
        });
        setIsInterviewFormOpen(false);
        setIsTaskFormOpen(false);
        setIsImportDrawerOpen(false);
        setIsApplicationFormOpen(true);
    }

    function startEditInterview(interview: Interview) {
        const { scheduledDate, scheduledTime } = toLocalDateTimeInputs(
            interview.scheduledAt,
        );

        setInterviewEditingId(interview.id);
        setInterviewErrors({});
        setInterviewForm({
            applicationId: interview.applicationId,
            type: interview.type,
            scheduledDate,
            scheduledTime,
            durationMinutes: interview.durationMinutes
                ? String(interview.durationMinutes)
                : "",
            location: interview.location ?? "",
            meetingUrl: interview.meetingUrl ?? "",
            interviewerName: interview.interviewerName ?? "",
            notes: interview.notes ?? "",
            outcome: interview.outcome,
        });
        setIsApplicationFormOpen(false);
        setIsTaskFormOpen(false);
        setIsImportDrawerOpen(false);
        setIsInterviewFormOpen(true);
    }

    function startEditTask(task: Task) {
        setTaskEditingId(task.id);
        setTaskErrors({});
        setTaskForm({
            title: task.title,
            description: task.description ?? "",
            applicationId: task.applicationId ?? "",
            dueDate: toTaskDueDateInput(task.dueDate),
            type: task.type,
        });
        setIsApplicationFormOpen(false);
        setIsInterviewFormOpen(false);
        setIsImportDrawerOpen(false);
        setIsTaskFormOpen(true);
    }

    async function toggleTimeline(id: string) {
        const next = openTimelineId === id ? null : id;
        setOpenTimelineId(next);
        if (next && !historyByApp[id]) await loadHistory(id);
    }

    if (authStatus !== "signedIn" || !token)
        return (
            <AuthPanel
                mode={mode}
                email={email}
                password={password}
                authStatus={authStatus}
                message={message}
                onModeChange={setMode}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onSubmit={authSubmit}
            />
        );

    return (
        <DashboardShell
            currentView={currentView}
            firstName={firstName}
            isProfileMenuOpen={isProfileMenuOpen}
            onCurrentViewChange={changeCurrentView}
            onImportOpen={openImportDrawer}
            onProfileMenuChange={setIsProfileMenuOpen}
            onSignOut={signOut}
        >
            {currentView === "account" ? (
                <AccountView
                    activePipeline={activePipeline}
                    applicationCount={applications.length}
                    email={userEmail || email}
                    firstName={firstName}
                    onReturnToDashboard={() => setCurrentView("dashboard")}
                    onSignOut={signOut}
                />
            ) : currentView === "applications" ? (
                <ApplicationsView
                    applications={applications}
                    focusedApplicationId={focusedApplicationId}
                    interviews={interviews}
                    onCreateApplication={openCreateApplication}
                    onCreateInterview={openCreateInterview}
                    onImportOpen={openImportDrawer}
                    onRemoveApplication={removeApplication}
                    onStartEdit={startEdit}
                    onViewInterview={viewInterview}
                />
            ) : currentView === "analytics" ? (
                <AnalyticsView
                    applications={applications}
                    historyByApp={historyByApp}
                    interviews={interviews}
                    weeklyRangeWeeks={weeklyRangeWeeks}
                    onWeeklyRangeChange={setWeeklyRangeWeeks}
                />
            ) : currentView === "interviews" ? (
                <InterviewsView
                    key={focusedInterviewId ?? "all-interviews"}
                    applications={applications}
                    focusedInterviewId={focusedInterviewId}
                    interviews={interviews}
                    onCreateInterview={() => openCreateInterview()}
                    onRemoveInterview={removeInterview}
                    onStartEdit={startEditInterview}
                    onViewApplication={viewApplication}
                />
            ) : currentView === "tasks" ? (
                <TasksView
                    applications={applications}
                    preferences={taskPreferences}
                    tasks={tasks}
                    onCompleteTask={completeTask}
                    onCreateTask={openCreateTask}
                    onPreferenceChange={updateTaskAutomationPreferences}
                    onRemoveTask={removeTask}
                    onStartEdit={startEditTask}
                    onViewApplication={viewApplication}
                />
            ) : (
                <DashboardHome
                    activePipeline={activePipeline}
                    applications={applications}
                    appliedTrackerFilters={appliedTrackerFilters}
                    filters={filters}
                    historyByApp={historyByApp}
                    interviews={interviews}
                    openTimelineId={openTimelineId}
                    tasks={tasks}
                    onApplyTrackerFilters={() => setAppliedTrackerFilters(filters)}
                    onCreateApplication={openCreateApplication}
                    onCreateInterview={openCreateInterview}
                    onCreateTask={() => openCreateTask()}
                    onFiltersChange={setFilters}
                    onImportOpen={openImportDrawer}
                    onRemoveApplication={removeApplication}
                    onRemoveHistoryEvent={removeHistoryEvent}
                    onStartEdit={startEdit}
                    onToggleTimeline={toggleTimeline}
                    onTransitionStatus={transitionStatus}
                    onViewApplications={() => {
                        setFocusedApplicationId(null);
                        changeCurrentView("applications");
                    }}
                    onViewApplication={viewApplication}
                    onViewInterviews={() => changeCurrentView("interviews")}
                    onViewTasks={() => changeCurrentView("tasks")}
                />
            )}

            {isApplicationFormOpen && (
                <ApplicationDrawer
                    duplicateMatch={duplicateMatch}
                    editingId={editingId}
                    form={form}
                    formErrors={formErrors}
                    onClose={closeApplicationForm}
                    onFormChange={setForm}
                    onRemoveApplication={removeApplication}
                    onSubmit={saveApplication}
                />
            )}

            {isInterviewFormOpen && (
                <InterviewDrawer
                    applications={applications}
                    editingId={interviewEditingId}
                    form={interviewForm}
                    formErrors={interviewErrors}
                    onClose={closeInterviewForm}
                    onFormChange={setInterviewForm}
                    onRemoveInterview={removeInterview}
                    onSubmit={saveInterview}
                />
            )}

            {isTaskFormOpen && (
                <TaskDrawer
                    applications={applications}
                    editingId={taskEditingId}
                    form={taskForm}
                    formErrors={taskErrors}
                    onClose={closeTaskForm}
                    onFormChange={setTaskForm}
                    onRemoveTask={removeTask}
                    onSubmit={saveTask}
                />
            )}

            {isImportDrawerOpen && (
                <ImportDrawer
                    importCapture={importCapture}
                    importDraft={importDraft}
                    importDuplicates={importDuplicates}
                    importErrors={importErrors}
                    importReview={importReview}
                    importStep={importStep}
                    isImportSubmitting={isImportSubmitting}
                    parserDebug={parserDebug}
                    onCaptureChange={setImportCapture}
                    onClose={closeImportDrawer}
                    onCreateDraft={createImportDraft}
                    onReviewChange={setImportReview}
                    onReviewSubmit={convertImportDraft}
                    onStepChange={setImportStep}
                />
            )}
        </DashboardShell>
    );
}
