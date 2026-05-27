"use client";

import { FormEvent, useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const ACCESS_TOKEN_KEY = "jobappledger_access_token";

type Mode = "signup" | "login";
type Application = { id: string; title: string; status: string; source: string | null; companyName: string | null; createdAt: string; sourceUrl: string | null; location: string | null; notes: string | null; dateApplied: string | null };

const emptyForm = { title: "", companyName: "", status: "SAVED", source: "", sourceUrl: "", location: "", notes: "", dateApplied: "" };

export default function MainPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: "", source: "", company: "", startDate: "", endDate: "" });

  useEffect(() => { const stored = localStorage.getItem(ACCESS_TOKEN_KEY); if (stored) setToken(stored); }, []);
  useEffect(() => { token ? localStorage.setItem(ACCESS_TOKEN_KEY, token) : localStorage.removeItem(ACCESS_TOKEN_KEY); }, [token]);

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

  return <main className="p-8"><h1 className="text-2xl font-semibold">Applications</h1><div className="my-4 grid gap-2 grid-cols-5">{Object.keys(filters).map((k)=><input key={k} className="border px-2 py-1" placeholder={k} value={(filters as any)[k]} onChange={(e)=>setFilters({...filters,[k]:e.target.value})} />)}<button className="border px-2" onClick={()=>loadApplications()}>Apply filters</button></div><form onSubmit={saveApplication} className="grid grid-cols-4 gap-2 mb-6">{Object.entries(form).map(([k,v])=><input key={k} type={k.includes("date")?"date":"text"} className="border px-2 py-1" placeholder={k} value={v} onChange={(e)=>setForm({...form,[k]:e.target.value})} required={k==="title"} />)}<button className="bg-black text-white px-2 py-1 col-span-1">{editingId?"Update":"Create"}</button></form>{message && <p className="mb-2">{message}</p>}<table className="w-full border-collapse"><thead><tr>{["Title","Company","Status","Source","Created","Actions"].map(h=><th key={h} className="border p-2 text-left">{h}</th>)}</tr></thead><tbody>{applications.map(a=><tr key={a.id}><td className="border p-2">{a.title}</td><td className="border p-2">{a.companyName}</td><td className="border p-2">{a.status}</td><td className="border p-2">{a.source}</td><td className="border p-2">{new Date(a.createdAt).toLocaleDateString()}</td><td className="border p-2"><button className="mr-2 underline" onClick={()=>startEdit(a)}>Edit</button><button className="underline" onClick={()=>removeApplication(a.id)}>Delete</button></td></tr>)}</tbody></table></main>;
}
