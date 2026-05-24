"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const ACCESS_TOKEN_KEY = "jobappledger_access_token";

type Mode = "signup" | "login";

export default function MainPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const submitLabel = useMemo(() => (mode === "signup" ? "Create account" : "Login"), [mode]);

  useEffect(() => {
    const stored = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (token) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.message ?? "Request failed.");
        setToken("");
        return;
      }

      setMessage(`${mode === "signup" ? "Signed up" : "Logged in"} as ${data.user.email}`);
      setToken(data.accessToken ?? "");
    } catch {
      setMessage("Unable to connect to API.");
      setToken("");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchProtectedProfile() {
    if (!token) {
      setMessage("Login first.");
      return;
    }

    let currentToken = token;
    const request = async (accessToken: string) =>
      fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include",
      });

    let response = await request(currentToken);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" });
      if (!refreshResponse.ok) {
        setToken("");
        setMessage("Session expired. Please login again.");
        return;
      }

      const refreshed = await refreshResponse.json();
      currentToken = refreshed.accessToken;
      setToken(currentToken);
      response = await request(currentToken);
    }

    const data = await response.json();
    setMessage(response.ok ? `Authenticated as ${data.user.email}` : data?.message ?? "Auth check failed.");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold">JobAppLedger Auth</h1>
      <p className="mb-6 text-gray-600">Sign up or login using the backend auth API.</p>

      <div className="mb-4 flex gap-2">
        <button className="rounded border px-4 py-2" onClick={() => setMode("signup")} type="button">Sign up</button>
        <button className="rounded border px-4 py-2" onClick={() => setMode("login")} type="button">Login</button>
      </div>

      <form className="space-y-3 rounded border p-4" onSubmit={onSubmit}>
        {mode === "signup" && (
          <input className="w-full rounded border px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className="w-full rounded border px-3 py-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded border px-3 py-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div className="flex gap-2">
          <button className="rounded bg-black px-4 py-2 text-white disabled:opacity-50" disabled={isLoading} type="submit">
            {isLoading ? "Submitting..." : submitLabel}
          </button>
          <button className="rounded border px-4 py-2" onClick={fetchProtectedProfile} type="button">Test protected route</button>
        </div>
      </form>

      {message && <p className="mt-4 text-sm">{message}</p>}
      {token && (
        <div className="mt-4">
          <p className="text-sm font-medium">Access token:</p>
          <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-xs">{token}</pre>
        </div>
      )}
    </main>
  );
}
