"use client";

import type { FormEvent } from "react";

import type { AuthStatus, Mode } from "../lib/types";

type AuthPanelProps = {
    mode: Mode;
    email: string;
    password: string;
    authStatus: AuthStatus;
    message: string;
    onModeChange: (mode: Mode) => void;
    onEmailChange: (email: string) => void;
    onPasswordChange: (password: string) => void;
    onSubmit: (event: FormEvent) => void;
};

export function AuthPanel({
    mode,
    email,
    password,
    authStatus,
    message,
    onModeChange,
    onEmailChange,
    onPasswordChange,
    onSubmit,
}: AuthPanelProps) {
    return (
        <main className="p-8 max-w-xl mx-auto">
            <h1 className="text-2xl font-semibold mb-4">JobAppLedger</h1>
            <form onSubmit={onSubmit} className="space-y-3">
                <div className="flex gap-2">
                    <button
                        type="button"
                        className="border px-3 py-2"
                        onClick={() => onModeChange("signup")}
                    >
                        Sign up
                    </button>
                    <button
                        type="button"
                        className="border px-3 py-2"
                        onClick={() => onModeChange("login")}
                    >
                        Login
                    </button>
                </div>
                <input
                    className="w-full border px-3 py-2"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    required
                />
                <input
                    className="w-full border px-3 py-2"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    required
                />
                <button className="bg-black text-white px-4 py-2">{mode}</button>
                {authStatus === "checking" && <p>Checking session...</p>}
                {message && <p>{message}</p>}
            </form>
        </main>
    );
}
