"use client";

import { useEffect, useState } from "react";

type ColorTheme = "light" | "dark";

export function ThemeToggle() {
    const [theme, setTheme] = useState<ColorTheme>("light");

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            setTheme(
                document.documentElement.dataset.theme === "dark" ? "dark" : "light",
            );
        });

        return () => window.cancelAnimationFrame(frame);
    }, []);

    function toggleTheme() {
        const nextTheme: ColorTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        document.documentElement.dataset.theme = nextTheme;

        try {
            localStorage.setItem("jobhazel-theme", nextTheme);
        } catch {
            // The selected theme still applies for this session if storage is unavailable.
        }
    }

    return (
        <button
            type="button"
            role="switch"
            className={theme === "dark" ? "appearance-switch active" : "appearance-switch"}
            aria-label="Dark mode"
            aria-checked={theme === "dark"}
            onClick={toggleTheme}
        >
            <span className="account-switch-track" aria-hidden="true">
                <span />
            </span>
        </button>
    );
}
