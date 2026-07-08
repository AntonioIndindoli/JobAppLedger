import { INTERVIEW_OUTCOME_LABELS, INTERVIEW_TYPE_LABELS } from "./constants";
import type { Interview, InterviewOutcome, InterviewType } from "./types";

export function isInterviewType(type: string): type is InterviewType {
    return Object.prototype.hasOwnProperty.call(INTERVIEW_TYPE_LABELS, type);
}

export function isInterviewOutcome(outcome: string): outcome is InterviewOutcome {
    return Object.prototype.hasOwnProperty.call(INTERVIEW_OUTCOME_LABELS, outcome);
}

export function getInterviewTypeLabel(type: string) {
    return isInterviewType(type) ? INTERVIEW_TYPE_LABELS[type] : type;
}

export function getInterviewOutcomeLabel(outcome: string) {
    return isInterviewOutcome(outcome)
        ? INTERVIEW_OUTCOME_LABELS[outcome]
        : outcome;
}

export function getInterviewTimestamp(interview: Interview) {
    const timestamp = new Date(interview.scheduledAt).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function isUpcomingInterview(interview: Interview) {
    return interview.outcome === "SCHEDULED" && getInterviewTimestamp(interview) >= Date.now();
}

export function sortInterviewsBySchedule(
    interviews: Interview[],
    direction: "asc" | "desc" = "asc",
) {
    const multiplier = direction === "asc" ? 1 : -1;
    return [...interviews].sort(
        (left, right) =>
            (getInterviewTimestamp(left) - getInterviewTimestamp(right)) * multiplier,
    );
}

export function formatInterviewDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

export function formatInterviewDuration(minutes: number | null) {
    if (!minutes) return "Not set";
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function toLocalDateTimeInputs(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return { scheduledDate: "", scheduledTime: "" };
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return {
        scheduledDate: `${year}-${month}-${day}`,
        scheduledTime: `${hours}:${minutes}`,
    };
}
