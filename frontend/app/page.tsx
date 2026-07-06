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

type Mode = "signup" | "login";
type AuthStatus = "checking" | "signedOut" | "signedIn";
type Application = { id: string; title: string; status: string; source: string | null; companyName: string | null; createdAt: string; sourceUrl: string | null; location: string | null; notes: string | null; dateApplied: string | null };
type ActivityLog = { id: string; type: string; message: string; createdAt: string };

const emptyForm = { title: "", companyName: "", status: "SAVED", source: "", sourceUrl: "", location: "", notes: "", dateApplied: "" };

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
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  async function saveApplication(e: FormEvent) {
    e.preventDefault();
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/applications/${editingId}` : "/applications";
    const payload = { ...form, dateApplied: form.dateApplied || null };
    const res = await authedFetch(url, { method, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(data.message ?? "Save failed");
    setForm(emptyForm); setEditingId(null); setMessage("Saved."); loadApplications();
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
    loadApplications();
  }

  function startEdit(app: Application) {
    setEditingId(app.id);
    setForm({ title: app.title, companyName: app.companyName ?? "", status: app.status, source: app.source ?? "", sourceUrl: app.sourceUrl ?? "", location: app.location ?? "", notes: app.notes ?? "", dateApplied: app.dateApplied ? app.dateApplied.slice(0,10) : "" });
  }

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
}