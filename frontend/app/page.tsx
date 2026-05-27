"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const ACCESS_TOKEN_KEY = "jobappledger_access_token";
const STATUSES = ["SAVED", "APPLIED", "RECRUITER_SCREEN", "TECHNICAL_INTERVIEW", "FINAL_INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"] as const;

type Mode = "signup" | "login";
type Application = { id: string; title: string; status: string; source: string | null; companyName: string | null; createdAt: string; sourceUrl: string | null; location: string | null; notes: string | null; dateApplied: string | null };
type ActivityLog = { id: string; type: string; message: string; createdAt: string };

const emptyForm = { title: "", companyName: "", status: "SAVED", source: "", sourceUrl: "", location: "", notes: "", dateApplied: "" };

export default function MainPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(() => (typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) ?? "" : ""));
  const [message, setMessage] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: "", source: "", company: "", startDate: "", endDate: "" });
  const [historyByApp, setHistoryByApp] = useState<Record<string, ActivityLog[]>>({});
  const [openTimelineId, setOpenTimelineId] = useState<string | null>(null);

  const grouped = useMemo(() => Object.fromEntries(STATUSES.map((status) => [status, applications.filter((a) => a.status === status)])), [applications]);

  useEffect(() => {
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (token) loadApplications(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function authSubmit(e: FormEvent) {
    e.preventDefault();
    const response = await fetch(`${API_BASE_URL}/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email, password }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message ?? "Auth failed");
    setToken(data.accessToken); setMessage(`Welcome ${data.user.email}`); loadApplications(data.accessToken);
  }

  async function authedFetch(path: string, init: RequestInit = {}) {
    const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) }, credentials: "include" });
    if (res.status === 401) { setMessage("Unauthorized. Log in again."); setToken(""); }
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

  if (!token) return <main className="p-8 max-w-xl mx-auto"><h1 className="text-2xl font-semibold mb-4">JobAppLedger</h1><form onSubmit={authSubmit} className="space-y-3"><div className="flex gap-2"><button type="button" className="border px-3 py-2" onClick={()=>setMode("signup")}>Sign up</button><button type="button" className="border px-3 py-2" onClick={()=>setMode("login")}>Login</button></div><input className="w-full border px-3 py-2" type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required /><input className="w-full border px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required /><button className="bg-black text-white px-4 py-2">{mode}</button>{message && <p>{message}</p>}</form></main>;

  return <main className="p-8 space-y-4"><h1 className="text-2xl font-semibold">Pipeline</h1><div className="my-4 grid gap-2 grid-cols-6">{Object.keys(filters).map((k)=><input key={k} className="border px-2 py-1" placeholder={k} value={filters[k as keyof typeof filters]} onChange={(e)=>setFilters({...filters,[k]:e.target.value})} />)}<button className="border px-2" onClick={()=>loadApplications()}>Apply filters</button></div><form onSubmit={saveApplication} className="grid grid-cols-4 gap-2">{Object.entries(form).map(([k,v])=> k==="status" ? <select key={k} className="border px-2 py-1" value={v} onChange={(e)=>setForm({...form,[k]:e.target.value})}>{STATUSES.map((s)=><option key={s}>{s}</option>)}</select> : <input key={k} type={k.includes("date")?"date":"text"} className="border px-2 py-1" placeholder={k} value={v} onChange={(e)=>setForm({...form,[k]:e.target.value})} required={k==="title"} />)}<button className="bg-black text-white px-2 py-1">{editingId?"Update":"Create"}</button></form>{message && <p>{message}</p>}
  <div className="grid grid-cols-4 gap-3">{STATUSES.map((status)=><section key={status} className="border p-2 rounded" onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{const id=e.dataTransfer.getData("text/plain"); if (id) transitionStatus(id,status);}}><h2 className="font-semibold text-sm mb-2">{status} ({grouped[status].length})</h2><div className="space-y-2">{grouped[status].map((a)=><article key={a.id} className="border rounded p-2 bg-white text-black" draggable onDragStart={(e)=>e.dataTransfer.setData("text/plain",a.id)}><div className="font-medium">{a.title}</div><div className="text-xs">{a.companyName ?? "Unknown"}</div><div className="text-xs">{a.source ?? "-"}</div><div className="mt-2 flex gap-2 text-xs"><button className="underline" onClick={()=>startEdit(a)}>Edit</button><button className="underline" onClick={()=>removeApplication(a.id)}>Delete</button><button className="underline" onClick={async ()=>{const next=openTimelineId===a.id?null:a.id; setOpenTimelineId(next); if (next && !historyByApp[a.id]) await loadHistory(a.id);}}>History</button></div>{openTimelineId===a.id && <ul className="mt-2 text-xs border-t pt-2 space-y-1">{(historyByApp[a.id] ?? []).map((entry)=><li key={entry.id}><strong>{entry.type}</strong> — {entry.message}<br />{new Date(entry.createdAt).toLocaleString()}</li>)}</ul>}</article>)}</div></section>)}</div></main>;
}
