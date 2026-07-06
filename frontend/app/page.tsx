"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const ACCESS_TOKEN_KEY = "jobappledger_access_token";
const USER_EMAIL_KEY = "jobappledger_user_email";
const STATUSES = ["SAVED", "APPLIED", "RECRUITER_SCREEN", "TECHNICAL_INTERVIEW", "FINAL_INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"] as const;
const DASHBOARD_STATUSES = ["SAVED", "APPLIED", "RECRUITER_SCREEN", "TECHNICAL_INTERVIEW", "FINAL_INTERVIEW", "OFFER", "REJECTED"] as const;
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
const SOURCES = ["LinkedIn", "Indeed", "Greenhouse", "Lever", "Company Site", "Workday", "Referrals", "Recruiter Outreach"];
const sourceDots = ["#1268f3", "#2f6ce5", "#22c3bb", "#fb8500", "#22c55e", "#ef4444", "#b08b47", "#57527f"];

const STATUS_LABELS: Record<(typeof STATUSES)[number], string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  RECRUITER_SCREEN: "Recruiter Screen",
  TECHNICAL_INTERVIEW: "Technical Interview",
  FINAL_INTERVIEW: "Final Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const SOURCE_OPTIONS = ["LinkedIn", "Indeed", "Greenhouse", "Lever", "Workday", "Company site", "Referral", "Recruiter", "Other"];

type Mode = "signup" | "login";
<<<<<<< ours
type AuthStatus = "checking" | "signedOut" | "signedIn";
=======
type ApplicationStatus = (typeof STATUSES)[number];
>>>>>>> theirs
type Application = { id: string; title: string; status: string; source: string | null; companyName: string | null; createdAt: string; sourceUrl: string | null; location: string | null; notes: string | null; dateApplied: string | null };
type ActivityLog = { id: string; type: string; message: string; createdAt: string };

type ApplicationForm = {
  title: string;
  companyName: string;
  status: ApplicationStatus;
  source: string;
  sourceUrl: string;
  location: string;
  notes: string;
  dateApplied: string;
};

const emptyForm: ApplicationForm = { title: "", companyName: "", status: "SAVED", source: "", sourceUrl: "", location: "", notes: "", dateApplied: "" };

function Icon({ children, tone = "blue" }: { children: string; tone?: "blue" | "green" | "purple" | "orange" }) {
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
  const [form, setForm] = useState<ApplicationForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filters, setFilters] = useState({ status: "", source: "", company: "", startDate: "", endDate: "" });
  const [historyByApp, setHistoryByApp] = useState<Record<string, ActivityLog[]>>({});
  const [openTimelineId, setOpenTimelineId] = useState<string | null>(null);

  const grouped = useMemo(() => Object.fromEntries(STATUSES.map((status) => [status, applications.filter((a) => a.status === status)])), [applications]);
  const firstName = useMemo(() => {
    const name = (userEmail || email).split("@")[0]?.split(/[._-]/)[0];
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : "Antonio";
  }, [email, userEmail]);
  const activePipeline = applications.filter((a) => !["SAVED", "REJECTED", "WITHDRAWN"].includes(a.status)).length;
  const sourceCounts = SOURCES.map((source) => applications.filter((app) => app.source?.toLowerCase() === source.toLowerCase()).length);

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
        const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${storedToken}` }, credentials: "include" });
        if (ignore) return;

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setToken(storedToken);
          setUserEmail(data.user?.email ?? storedEmail);
          setAuthStatus("signedIn");
          return;
        }
      }

      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" });
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
    const response = await fetch(`${API_BASE_URL}/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email, password }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message ?? "Auth failed");
    setToken(data.accessToken); setUserEmail(data.user.email); setAuthStatus("signedIn"); setMessage(`Welcome ${data.user.email}`); loadApplications(data.accessToken);
  }

  async function authedFetch(path: string, init: RequestInit = {}) {
    const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) }, credentials: "include" });
    if (res.status === 401) { setMessage("Unauthorized. Log in again."); setToken(""); setUserEmail(""); setAuthStatus("signedOut"); }
    return res;
  }

  async function loadApplications(activeToken = token) {
    if (!activeToken) return;
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    const res = await fetch(`${API_BASE_URL}/applications?${params}`, { headers: { Authorization: `Bearer ${activeToken}` } });
    const data = await res.json();
    if (!res.ok) return setMessage(data.message ?? "Failed loading applications");
    setApplications(data.applications);
  }

  async function loadHistory(id: string) {
    const res = await authedFetch(`/applications/${id}/history`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(data.message ?? "Failed loading history");
    setHistoryByApp((prev) => ({ ...prev, [id]: data.history }));
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  }

  function validateForm() {
    if (!form.title.trim()) return "Job title is required.";
    if (form.sourceUrl && !/^https?:\/\/.+/i.test(form.sourceUrl)) return "Job URL must start with http:// or https://.";
    if (form.dateApplied) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(`${form.dateApplied}T00:00:00`);
      if (selectedDate > today) return "Date applied cannot be in the future.";
    }
    return "";
  }

  async function saveApplication(e: FormEvent) {
    e.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) return setMessage(validationMessage);
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/applications/${editingId}` : "/applications";
    const payload = { ...form, dateApplied: form.dateApplied || null };
    const res = await authedFetch(url, { method, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(data.message ?? "Save failed");
    closeForm(); setMessage(editingId ? "Application updated." : "Application saved."); loadApplications();
  }

  async function transitionStatus(id: string, nextStatus: string) {
    const original = applications;
    setApplications((prev) => prev.map((app) => app.id === id ? { ...app, status: nextStatus } : app));
    const res = await authedFetch(`/applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setApplications(original);
      return setMessage(data.message ?? "Failed to move card");
    }
    setApplications((prev) => prev.map((app) => app.id === id ? data.application : app));
    if (openTimelineId === id) loadHistory(id);
  }

  async function removeApplication(id: string) {
    const res = await authedFetch(`/applications/${id}`, { method: "DELETE" });
    if (!res.ok) return setMessage("Delete failed");
    if (editingId === id) closeForm();
    loadApplications();
  }

  function startEdit(app: Application) {
    setEditingId(app.id);
    setForm({ title: app.title, companyName: app.companyName ?? "", status: STATUSES.includes(app.status as ApplicationStatus) ? app.status as ApplicationStatus : "SAVED", source: app.source ?? "", sourceUrl: app.sourceUrl ?? "", location: app.location ?? "", notes: app.notes ?? "", dateApplied: app.dateApplied ? app.dateApplied.slice(0,10) : "" });
    setIsFormOpen(true);
  }

<<<<<<< ours
  if (authStatus !== "signedIn" || !token) return <main className="p-8 max-w-xl mx-auto"><h1 className="text-2xl font-semibold mb-4">JobAppLedger</h1><form onSubmit={authSubmit} className="space-y-3"><div className="flex gap-2"><button type="button" className="border px-3 py-2" onClick={()=>setMode("signup")}>Sign up</button><button type="button" className="border px-3 py-2" onClick={()=>setMode("login")}>Login</button></div><input className="w-full border px-3 py-2" type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required /><input className="w-full border px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required /><button className="bg-black text-white px-4 py-2">{mode}</button>{authStatus === "checking" && <p>Checking session...</p>}{message && <p>{message}</p>}</form></main>;

  return <div className="dashboard-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">▣</span><strong>JobAppLedger</strong></div>{["⌂ Dashboard", "▥ Pipeline", "▣ Applications", "☁ Import Job", "▤ Interviews", "☑ Tasks", "▧ Contacts", "⌁ Analytics", "⚙ Settings"].map((item, i)=><button key={item} className={i === 0 ? "nav-item active" : "nav-item"}>{item}</button>)}</aside>
    <main className="dashboard-main">
      <header className="topbar"><div className="search">⌕ <span>Search jobs, companies, contacts...</span><kbd>⌘ K</kbd></div><div className="profile"><span className="bell">♧<b>2</b></span><span className="avatar">👨🏽‍💼</span><strong>{firstName}</strong><span>⌄</span></div></header>
      <section className="hero"><h1>Welcome back, {firstName} 👋</h1><p>Track your job search, stay on top of interviews, and follow up faster.</p><div className="actions"><button className="primary">☁ Import Job</button><button className="secondary" onClick={() => document.getElementById("application-form")?.scrollIntoView({ behavior: "smooth" })}>＋ Add Application</button><button className="secondary">▥ View Pipeline</button></div></section>
      <section className="stat-grid"><div className="stat-card"><Icon>▣</Icon><div><p>Total Applications</p><strong>{applications.length}</strong><span>All time</span></div><em>−</em></div><div className="stat-card"><Icon tone="green">▥</Icon><div><p>Active Pipeline</p><strong>{activePipeline}</strong><span>In progress</span></div><em>−</em></div><div className="stat-card"><Icon tone="purple">▤</Icon><div><p>Interviews Scheduled</p><strong>0</strong><span>Upcoming</span></div><em>−</em></div><div className="stat-card"><Icon tone="orange">☑</Icon><div><p>Tasks Due</p><strong>0</strong><span>Needs attention</span></div><em>−</em></div></section>
      {message && <p className="notice">{message}</p>}
      <section className="panel pipeline-panel"><div className="panel-title"><div><h2>▣ Pipeline Snapshot <span>ⓘ</span></h2><p>Track your applications across stages.</p></div></div><div className="kanban">{DASHBOARD_STATUSES.map((status)=><section key={status} className={`lane ${status.toLowerCase()}`} onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{const id=e.dataTransfer.getData("text/plain"); if (id) transitionStatus(id,status);}}><h3>{STATUS_LABELS[status]}</h3><strong>{grouped[status].length}</strong><div className="dropzone">{grouped[status].map((a)=><article key={a.id} className="job-card" draggable onDragStart={(e)=>e.dataTransfer.setData("text/plain",a.id)}><b>{a.title}</b><span>{a.companyName ?? "Unknown"}</span><small>{a.source ?? "No source"}</small><div><button onClick={()=>startEdit(a)}>Edit</button><button onClick={()=>removeApplication(a.id)}>Delete</button><button onClick={async ()=>{const next=openTimelineId===a.id?null:a.id; setOpenTimelineId(next); if (next && !historyByApp[a.id]) await loadHistory(a.id);}}>History</button></div>{openTimelineId===a.id && <ul>{(historyByApp[a.id] ?? []).map((entry)=><li key={entry.id}>{entry.message}</li>)}</ul>}</article>)}</div></section>)}</div>{applications.length === 0 && <div className="empty-pipeline"><div>▰</div><h3>Your pipeline is empty</h3><p>Import jobs or add applications to start tracking.</p><button className="secondary">☁ Import Job</button></div>}</section>
      <section className="mini-grid"><div className="panel empty-card"><h2>▤ Upcoming Interviews <a>View all</a></h2><div className="empty-illustration">🗓️</div><h3>No interviews scheduled yet</h3><p>When you schedule interviews, they&apos;ll appear here.</p><button className="secondary small">▤ Add Interview</button></div><div className="panel empty-card"><h2>☑ Tasks & Follow-Ups <a>View all</a></h2><div className="empty-illustration">📋</div><h3>No tasks yet</h3><p>Create follow-up tasks and never miss a beat.</p><button className="secondary small">＋ Create Task</button></div><div className="panel empty-card"><h2>☁ Recent Imports <a>View all</a></h2><div className="empty-illustration">🧾</div><h3>No imports yet</h3><p>Import jobs from LinkedIn, Indeed, Greenhouse, Lever, Workday, and more.</p><button className="secondary small">☁ Import Job</button></div></section>
      <section className="analytics-grid"><div className="panel sources"><h2>Application Sources <span>ⓘ</span></h2><div className="donut">No data yet</div><div className="source-list">{SOURCES.map((source, i)=><span key={source}><b style={{background: sourceDots[i]}} />{source}<em>{sourceCounts[i]} (0%)</em></span>)}</div><p>Import jobs to see your source breakdown.</p></div><div className="panel weekly"><h2>Weekly Applications <span>ⓘ</span><button>Last 6 weeks⌄</button></h2><div className="chart"><i /><span>May 12</span><span>May 19</span><span>May 26</span><span>Jun 2</span><span>Jun 9</span><span>Jun 16</span></div><aside><small>Total</small><strong>{applications.length}</strong><span>applications</span><em>No change</em></aside><p>Your weekly application trend will appear here.</p></div></section>
      <section className="panel form-panel" id="application-form"><h2>{editingId ? "Update Application" : "Add Application"}</h2><div className="filter-row">{Object.keys(filters).map((k)=><input key={k} placeholder={k} value={filters[k as keyof typeof filters]} onChange={(e)=>setFilters({...filters,[k]:e.target.value})} />)}<button onClick={()=>loadApplications()}>Apply filters</button></div><form onSubmit={saveApplication}>{Object.entries(form).map(([k,v])=> k==="status" ? <select key={k} value={v} onChange={(e)=>setForm({...form,[k]:e.target.value})}>{STATUSES.map((s)=><option key={s}>{s}</option>)}</select> : <input key={k} type={k.includes("date")?"date":"text"} placeholder={k} value={v} onChange={(e)=>setForm({...form,[k]:e.target.value})} required={k==="title"} />)}<button className="primary">{editingId?"Update":"Create"}</button></form></section>
    </main>
  </div>;
=======
  if (!token) return <main className="p-8 max-w-xl mx-auto"><h1 className="text-2xl font-semibold mb-4">JobAppLedger</h1><form onSubmit={authSubmit} className="space-y-3"><div className="flex gap-2"><button type="button" className="border px-3 py-2" onClick={()=>setMode("signup")}>Sign up</button><button type="button" className="border px-3 py-2" onClick={()=>setMode("login")}>Login</button></div><input className="w-full border px-3 py-2" type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required /><input className="w-full border px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required /><button className="bg-black text-white px-4 py-2">{mode}</button>{message && <p>{message}</p>}</form></main>;

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-950 sm:p-8"><div className="mx-auto max-w-7xl space-y-6"><header className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-slate-500">JobAppLedger</p><h1 className="text-3xl font-semibold">Pipeline</h1><p className="mt-1 text-sm text-slate-600">Track each opportunity from saved job to final decision.</p></div><button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800" onClick={openCreateForm}>+ Add Application</button></header>
  <section className="rounded-2xl bg-white p-4 shadow-sm"><div className="grid gap-3 md:grid-cols-6">{Object.keys(filters).map((k)=><input key={k} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500" placeholder={k} value={filters[k as keyof typeof filters]} onChange={(e)=>setFilters({...filters,[k]:e.target.value})} />)}<button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100" onClick={()=>loadApplications()}>Apply filters</button></div></section>{message && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p>}
  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{STATUSES.map((status)=><section key={status} className="min-h-48 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{const id=e.dataTransfer.getData("text/plain"); if (id) transitionStatus(id,status);}}><h2 className="mb-3 flex items-center justify-between text-sm font-semibold"><span>{STATUS_LABELS[status]}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{grouped[status].length}</span></h2><div className="space-y-2">{grouped[status].map((a)=><article key={a.id} className="rounded-xl border border-slate-200 bg-white p-3 text-slate-950 shadow-sm" draggable onDragStart={(e)=>e.dataTransfer.setData("text/plain",a.id)}><div className="font-medium">{a.title}</div><div className="text-sm text-slate-600">{a.companyName ?? "Unknown company"}</div><div className="text-xs text-slate-500">{a.source ?? "No source"}</div><div className="mt-3 flex gap-3 text-xs"><button className="font-medium text-slate-700 underline" onClick={()=>startEdit(a)}>Edit</button><button className="font-medium text-red-700 underline" onClick={()=>removeApplication(a.id)}>Delete</button><button className="font-medium text-slate-700 underline" onClick={async ()=>{const next=openTimelineId===a.id?null:a.id; setOpenTimelineId(next); if (next && !historyByApp[a.id]) await loadHistory(a.id);}}>History</button></div>{openTimelineId===a.id && <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">{(historyByApp[a.id] ?? []).map((entry)=><li key={entry.id}><strong>{entry.type}</strong> — {entry.message}<br />{new Date(entry.createdAt).toLocaleString()}</li>)}</ul>}</article>)}</div></section>)}</div></div>
  {isFormOpen && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"><button aria-label="Close application form" className="hidden flex-1 cursor-default sm:block" onClick={closeForm} /><aside className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"><form onSubmit={saveApplication} className="flex min-h-0 flex-1 flex-col"><div className="border-b border-slate-200 p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold">{editingId ? "Edit application" : "Add application"}</h2><p className="mt-1 text-sm text-slate-600">{editingId ? "Update the saved details for this opportunity." : "Save the role, company, source, and next-step notes."}</p></div><button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-sm" onClick={closeForm}>Close</button></div></div><div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6"><section className="space-y-4"><h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Primary details</h3><label className="block text-sm font-medium">Job title *<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Senior Frontend Engineer" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} required /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Company<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Stripe" value={form.companyName} onChange={(e)=>setForm({...form,companyName:e.target.value})} /></label><label className="block text-sm font-medium">Location<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Remote, New York, NY" value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})} /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Status<select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.status} onChange={(e)=>setForm({...form,status:e.target.value as ApplicationStatus})}>{STATUSES.map((s)=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></label><label className="block text-sm font-medium">Date applied<input type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.dateApplied} onChange={(e)=>setForm({...form,dateApplied:e.target.value})} /></label></div></section><section className="space-y-4"><h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Source details</h3><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Source<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" list="source-options" placeholder="LinkedIn" value={form.source} onChange={(e)=>setForm({...form,source:e.target.value})} /><datalist id="source-options">{SOURCE_OPTIONS.map((source)=><option key={source} value={source} />)}</datalist></label><label className="block text-sm font-medium">Job URL<input type="url" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="https://..." value={form.sourceUrl} onChange={(e)=>setForm({...form,sourceUrl:e.target.value})} /></label></div></section><section className="space-y-4"><h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Notes</h3><label className="block text-sm font-medium">Application notes<textarea className="mt-1 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Paste recruiter messages, follow-up reminders, or interview prep notes." value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} /></label></section></div><div className="flex items-center justify-between gap-3 border-t border-slate-200 p-6"><div>{editingId && <button type="button" className="text-sm font-medium text-red-700 underline" onClick={()=>removeApplication(editingId)}>Delete application</button>}</div><div className="flex gap-3"><button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium" onClick={closeForm}>Cancel</button><button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">{editingId ? "Update application" : "Save application"}</button></div></div></form></aside></div>}
  </main>;
>>>>>>> theirs
}
