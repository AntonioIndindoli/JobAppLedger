"use client";

import { useId } from "react";

import { AppIcon } from "./AppIcon";

const NO_APPLICATIONS_INTERVIEW_HINT =
    "Add an application before scheduling an interview.";

type AddInterviewButtonProps = {
    className?: string;
    disabled: boolean;
    iconSize?: number;
    onClick: () => void;
};

export function AddInterviewButton({
    className = "secondary",
    disabled,
    iconSize = 18,
    onClick,
}: AddInterviewButtonProps) {
    const hintId = useId();

    return (
        <span
            className={`add-interview-action${disabled ? " is-disabled" : ""}`}
            aria-describedby={disabled ? hintId : undefined}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? 0 : undefined}
        >
            <button
                type="button"
                className={className + " add-interview-action"}
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
            >
                <AppIcon name="calendar" size={iconSize} />
                Add Interview
            </button>
            {disabled && (
                <span id={hintId} role="tooltip" className="add-interview-hint">
                    {NO_APPLICATIONS_INTERVIEW_HINT}
                </span>
            )}
        </span>
    );
}
