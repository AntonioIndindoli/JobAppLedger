import type { ActivityLog, Application } from "./types";

const ROLLED_BACK_STATUSES = new Set(["SAVED", "APPLIED"]);

function getMetadataObject(metadata: ActivityLog["metadata"]) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        return null;
    }

    return metadata as Record<string, unknown>;
}

function historyIncludesStatus(history: ActivityLog[], statuses: Set<string>) {
    return history.some((entry) => {
        const metadata = getMetadataObject(entry.metadata);
        return (
            statuses.has(String(metadata?.from ?? "")) ||
            statuses.has(String(metadata?.to ?? ""))
        );
    });
}

export function hasRetainedMilestone(
    application: Application,
    history: ActivityLog[],
    statuses: Set<string>,
) {
    // Applied and Saved are explicit funnel rollbacks. Terminal statuses retain
    // milestones reached earlier so rejected/withdrawn applications still count.
    if (ROLLED_BACK_STATUSES.has(application.status)) return false;

    return (
        statuses.has(application.status) ||
        historyIncludesStatus(history, statuses)
    );
}
