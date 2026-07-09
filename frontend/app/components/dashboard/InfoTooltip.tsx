"use client";

import { useId } from "react";

import { AppIcon } from "../AppIcon";

type InfoTooltipProps = {
    label: string;
    tooltip: string;
};

export function InfoTooltip({ label, tooltip }: InfoTooltipProps) {
    const tooltipId = useId();

    return (
        <span
            className="info-tooltip"
            aria-describedby={tooltipId}
            aria-label={label}
            tabIndex={0}
        >
            <span className="info-icon" aria-hidden="true">
                <AppIcon name="info" size={14} />
            </span>
            <span id={tooltipId} role="tooltip" className="info-tooltip-content">
                {tooltip}
            </span>
        </span>
    );
}
