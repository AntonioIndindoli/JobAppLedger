"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const ACCESS_TOKEN_KEY = "jobappledger_access_token";
const USER_EMAIL_KEY = "jobappledger_user_email";
const STATUSES = [
  "SAVED",
  "APPLIED",
  "RECRUITER_SCREEN",
  "TECHNICAL_INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;
const DASHBOARD_STATUSES = [
  "SAVED",
  "APPLIED",
  "RECRUITER_SCREEN",
  "TECHNICAL_INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER",
  "REJECTED",
] as const;
const STATUS_LABELS: Record<string, string> = {
    SAVED: "Saved",
    APPLIED: "Applied",
    RECRUITER_SCREEN: "Recruiter Screen",
    TECHNICAL_INTERVIEW: "Technical Interview",
    FINAL_INTERVIEW: "Final Interview",
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
  "Referrals",
  "Recruiter Outreach",
];
const SOURCE_OPTIONS = ["", ...SOURCES, "Company Careers", "Referral", "Other"];
const sourceDots = [
  "#1268f3",
  "#2f6ce5",
  "#22c3bb",
  "#fb8500",
  "#22c55e",
  "#ef4444",
  "#b08b47",
  "#57527f",
];

type Mode = "signup" | "login";
type AuthStatus = "checking" | "signedOut" | "signedIn";
type Application = {
  id: string;
  title: string;
  status: string;
  source: string | null;
  companyName: string | null;
  createdAt: string;
  sourceUrl: string | null;
  location: string | null;
  notes: string | null;
  dateApplied: string | null;
};
type ActivityLog = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
};

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
  const [filters, setFilters] = useState({
    status: "",
    source: "",
    company: "",
    startDate: "",
    endDate: "",
  });
  const [historyByApp, setHistoryByApp] = useState<
    Record<string, ActivityLog[]>
  >({});
  const [openTimelineId, setOpenTimelineId] = useState<string | null>(null);

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        STATUSES.map((status) => [
          status,
          applications.filter((a) => a.status === status),
        ]),
      ),
    [applications],
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
        (app) => app.source?.toLowerCase() === source.toLowerCase(),
      ).length,
  );
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
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v),
    );
    const res = await fetch(`${API_BASE_URL}/applications?${params}`, {
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
          <div className="profile">
            <span className="bell">
              ♧<b>2</b>
            </span>
            <span className="avatar">👨🏽‍💼</span>
            <strong>{firstName}</strong>
            <span>⌄</span>
          </div>
        </header>
        <section className="hero">
          <h1>Welcome back, {firstName} 👋</h1>
          <p>
            Track your job search, stay on top of interviews, and follow up
            faster.
          </p>
          <div className="actions">
            <button className="primary">☁ Import Job</button>
            <button className="secondary" onClick={openCreateApplication}>
              ＋ Add Application
            </button>
            <button className="secondary">▥ View Pipeline</button>
          </div>
        </section>
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
              <p>Active Pipeline</p>
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
        {message && <p className="notice">{message}</p>}
        <section className="panel pipeline-panel">
          <div className="panel-title">
            <div>
              <h2>
                ▣ Pipeline Snapshot <span>ⓘ</span>
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
            <button onClick={() => loadApplications()}>Apply filters</button>
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
          {applications.length === 0 && (
            <div className="empty-pipeline">
              <div>▰</div>
              <h3>Your pipeline is empty</h3>
              <p>Import jobs or add applications to start tracking.</p>
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
            <button className="secondary small">☁ Import Job</button>
          </div>
        </section>
        <section className="analytics-grid">
          <div className="panel sources">
            <h2>
              Application Sources <span>ⓘ</span>
            </h2>
            <div className="donut">No data yet</div>
            <div className="source-list">
              {SOURCES.map((source, i) => (
                <span key={source}>
                  <b style={{ background: sourceDots[i] }} />
                  {source}
                  <em>{sourceCounts[i]} (0%)</em>
                </span>
              ))}
            </div>
            <p>Import jobs to see your source breakdown.</p>
          </div>
          <div className="panel weekly">
            <h2>
              Weekly Applications <span>ⓘ</span>
              <button>Last 6 weeks⌄</button>
            </h2>
            <div className="chart">
              <i />
              <span>May 12</span>
              <span>May 19</span>
              <span>May 26</span>
              <span>Jun 2</span>
              <span>Jun 9</span>
              <span>Jun 16</span>
            </div>
            <aside>
              <small>Total</small>
              <strong>{applications.length}</strong>
              <span>applications</span>
              <em>No change</em>
            </aside>
            <p>Your weekly application trend will appear here.</p>
          </div>
        </section>
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
      </main>
    </div>
  );
}
