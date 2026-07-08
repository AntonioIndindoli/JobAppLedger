"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

import { AccountView } from "./components/AccountView";
import { ApplicationsView } from "./components/ApplicationsView";
import { ApplicationDrawer } from "./components/ApplicationDrawer";
import { AuthPanel } from "./components/AuthPanel";
import { DashboardShell } from "./components/DashboardShell";
import { ImportDrawer } from "./components/ImportDrawer";
import { DashboardHome } from "./components/dashboard/DashboardHome";
import { countActiveApplications } from "./lib/application-analytics";
import {
    ACCESS_TOKEN_KEY,
    API_BASE_URL,
    DEFAULT_WEEKLY_RANGE,
    EMPTY_APPLICATION_FORM,
    EMPTY_IMPORT_CAPTURE,
    EMPTY_IMPORT_REVIEW,
    STATUSES,
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
    Mode,
    ParserDebug,
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
    const [form, setForm] = useState<ApplicationFormValues>(EMPTY_APPLICATION_FORM);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isApplicationFormOpen, setIsApplicationFormOpen] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
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
        if (authStatus === "signedIn" && token) loadApplications(token);
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
        loadApplicationHistories(activeToken);
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

    function resetApplicationForm() {
        setForm(EMPTY_APPLICATION_FORM);
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
    }

    async function saveApplication(event: FormEvent) {
        event.preventDefault();
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
        loadHistory(id);
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
            onCurrentViewChange={setCurrentView}
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
                    onCreateApplication={openCreateApplication}
                    onImportOpen={openImportDrawer}
                    onRemoveApplication={removeApplication}
                    onStartEdit={startEdit}
                />
            ) : (
                <DashboardHome
                    activePipeline={activePipeline}
                    applications={applications}
                    appliedTrackerFilters={appliedTrackerFilters}
                    filters={filters}
                    firstName={firstName}
                    historyByApp={historyByApp}
                    openTimelineId={openTimelineId}
                    weeklyRangeWeeks={weeklyRangeWeeks}
                    onApplyTrackerFilters={() => setAppliedTrackerFilters(filters)}
                    onCreateApplication={openCreateApplication}
                    onFiltersChange={setFilters}
                    onImportOpen={openImportDrawer}
                    onRemoveApplication={removeApplication}
                    onStartEdit={startEdit}
                    onToggleTimeline={toggleTimeline}
                    onTransitionStatus={transitionStatus}
                    onWeeklyRangeChange={setWeeklyRangeWeeks}
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
