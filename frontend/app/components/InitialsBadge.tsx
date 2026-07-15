type InitialsBadgeProps = {
    label?: string | null;
    fallback?: string | null;
    className?: string;
};

function getInitials(value: string) {
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "?";

    const initials =
        words.length === 1
            ? words[0].slice(0, 2)
            : `${words[0][0]}${words[words.length - 1][0]}`;

    return initials.toLocaleUpperCase();
}

export function InitialsBadge({ label, fallback, className = "" }: InitialsBadgeProps) {
    const source = label?.trim() || fallback?.trim() || "Unknown";

    return (
        <span
            className={`application-list-icon initials-badge ${className}`.trim()}
            aria-hidden="true"
            title={source}
        >
            {getInitials(source)}
        </span>
    );
}
