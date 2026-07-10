"use client";

import { useMemo, useState } from "react";

import { STATUS_LABELS } from "../../lib/constants";
import {
    getApplicationTimestamp,
    isApplicationStatus,
} from "../../lib/application-analytics";
import type { Application } from "../../lib/types";
import { AppIcon } from "../AppIcon";
import { InfoTooltip } from "./InfoTooltip";

type ApplicationMapProps = {
    applications: Application[];
    onViewApplication: (applicationId: string) => void;
};

type GeoCoordinate = {
    lat: number;
    lng: number;
};

type ApplicationMapPoint = {
    application: Application;
    x: number;
    y: number;
    locationLabel: string;
    locationType: "matched" | "remote" | "fallback";
};

const MAP_WIDTH = 760;
const MAP_HEIGHT = 380;
const MIN_LAT = 24;
const MAX_LAT = 50;
const MIN_LNG = -125;
const MAX_LNG = -66;
const REMOTE_COORDINATE = { lat: 39.5, lng: -98.35 };
const FALLBACK_COORDINATE = { lat: 28.6, lng: -72.2 };

const LOCATION_COORDINATES = {
    "ann arbor": { lat: 42.28, lng: -83.74 },
    arlington: { lat: 38.88, lng: -77.1 },
    atlanta: { lat: 33.75, lng: -84.39 },
    austin: { lat: 30.27, lng: -97.74 },
    "bay area": { lat: 37.77, lng: -122.42 },
    bellevue: { lat: 47.61, lng: -122.2 },
    berkeley: { lat: 37.87, lng: -122.27 },
    boston: { lat: 42.36, lng: -71.06 },
    boulder: { lat: 40.02, lng: -105.27 },
    brooklyn: { lat: 40.68, lng: -73.94 },
    cambridge: { lat: 42.37, lng: -71.11 },
    charlotte: { lat: 35.23, lng: -80.84 },
    chicago: { lat: 41.88, lng: -87.63 },
    cincinnati: { lat: 39.1, lng: -84.51 },
    cleveland: { lat: 41.5, lng: -81.69 },
    columbus: { lat: 39.96, lng: -82.99 },
    "costa mesa": { lat: 33.64, lng: -117.92 },
    "culver city": { lat: 34.02, lng: -118.4 },
    dallas: { lat: 32.78, lng: -96.8 },
    denver: { lat: 39.74, lng: -104.99 },
    detroit: { lat: 42.33, lng: -83.05 },
    durham: { lat: 35.99, lng: -78.9 },
    houston: { lat: 29.76, lng: -95.37 },
    indianapolis: { lat: 39.77, lng: -86.16 },
    irvine: { lat: 33.68, lng: -117.83 },
    "jersey city": { lat: 40.72, lng: -74.04 },
    "kansas city": { lat: 39.1, lng: -94.58 },
    lehi: { lat: 40.39, lng: -111.85 },
    "los angeles": { lat: 34.05, lng: -118.24 },
    manhattan: { lat: 40.78, lng: -73.97 },
    miami: { lat: 25.76, lng: -80.19 },
    minneapolis: { lat: 44.98, lng: -93.27 },
    "mountain view": { lat: 37.39, lng: -122.08 },
    nashville: { lat: 36.16, lng: -86.78 },
    "new york": { lat: 40.71, lng: -74.01 },
    "new york city": { lat: 40.71, lng: -74.01 },
    "newport beach": { lat: 33.62, lng: -117.93 },
    nyc: { lat: 40.71, lng: -74.01 },
    oakland: { lat: 37.8, lng: -122.27 },
    omaha: { lat: 41.26, lng: -95.94 },
    "orange county": { lat: 33.72, lng: -117.83 },
    orlando: { lat: 28.54, lng: -81.38 },
    "palo alto": { lat: 37.44, lng: -122.14 },
    pasadena: { lat: 34.15, lng: -118.14 },
    philadelphia: { lat: 39.95, lng: -75.17 },
    phoenix: { lat: 33.45, lng: -112.07 },
    pittsburgh: { lat: 40.44, lng: -79.99 },
    portland: { lat: 45.52, lng: -122.68 },
    provo: { lat: 40.23, lng: -111.66 },
    raleigh: { lat: 35.78, lng: -78.64 },
    redmond: { lat: 47.67, lng: -122.12 },
    "redwood city": { lat: 37.49, lng: -122.24 },
    sacramento: { lat: 38.58, lng: -121.49 },
    "salt lake city": { lat: 40.76, lng: -111.89 },
    "san antonio": { lat: 29.42, lng: -98.49 },
    "san diego": { lat: 32.72, lng: -117.16 },
    "san francisco": { lat: 37.77, lng: -122.42 },
    "san jose": { lat: 37.34, lng: -121.89 },
    "san mateo": { lat: 37.56, lng: -122.33 },
    "santa monica": { lat: 34.02, lng: -118.49 },
    seattle: { lat: 47.61, lng: -122.33 },
    "sf bay area": { lat: 37.77, lng: -122.42 },
    "silicon valley": { lat: 37.39, lng: -122.08 },
    "st louis": { lat: 38.63, lng: -90.2 },
    sunnyvale: { lat: 37.37, lng: -122.04 },
    tampa: { lat: 27.95, lng: -82.46 },
    "washington dc": { lat: 38.9, lng: -77.04 },
    "washington d.c.": { lat: 38.9, lng: -77.04 },
    vancouver: { lat: 49.28, lng: -123.12 },
    toronto: { lat: 43.65, lng: -79.38 },
    montreal: { lat: 45.5, lng: -73.57 },
    ottawa: { lat: 45.42, lng: -75.69 },
    waterloo: { lat: 43.46, lng: -80.52 },
} satisfies Record<string, GeoCoordinate>;

const STATE_COORDINATES = {
    AL: { lat: 32.8, lng: -86.8 },
    AK: { lat: 61.4, lng: -152.4 },
    AZ: { lat: 34.2, lng: -111.7 },
    AR: { lat: 34.8, lng: -92.2 },
    CA: { lat: 36.8, lng: -119.4 },
    CO: { lat: 39.0, lng: -105.5 },
    CT: { lat: 41.6, lng: -72.7 },
    DC: { lat: 38.9, lng: -77.04 },
    DE: { lat: 39.0, lng: -75.5 },
    FL: { lat: 28.1, lng: -81.6 },
    GA: { lat: 32.7, lng: -83.4 },
    HI: { lat: 20.8, lng: -156.3 },
    IA: { lat: 42.1, lng: -93.5 },
    ID: { lat: 44.2, lng: -114.6 },
    IL: { lat: 40.0, lng: -89.2 },
    IN: { lat: 39.9, lng: -86.3 },
    KS: { lat: 38.5, lng: -98.0 },
    KY: { lat: 37.7, lng: -85.0 },
    LA: { lat: 31.0, lng: -92.0 },
    MA: { lat: 42.2, lng: -71.8 },
    MD: { lat: 39.0, lng: -76.7 },
    ME: { lat: 45.3, lng: -69.2 },
    MI: { lat: 44.3, lng: -85.6 },
    MN: { lat: 46.3, lng: -94.2 },
    MO: { lat: 38.5, lng: -92.5 },
    MS: { lat: 32.7, lng: -89.7 },
    MT: { lat: 46.9, lng: -110.4 },
    NC: { lat: 35.5, lng: -79.4 },
    ND: { lat: 47.4, lng: -100.5 },
    NE: { lat: 41.5, lng: -99.8 },
    NH: { lat: 43.7, lng: -71.6 },
    NJ: { lat: 40.1, lng: -74.7 },
    NM: { lat: 34.4, lng: -106.1 },
    NV: { lat: 39.3, lng: -116.6 },
    NY: { lat: 42.9, lng: -75.5 },
    OH: { lat: 40.3, lng: -82.8 },
    OK: { lat: 35.6, lng: -97.5 },
    OR: { lat: 44.0, lng: -120.5 },
    PA: { lat: 40.9, lng: -77.8 },
    RI: { lat: 41.7, lng: -71.5 },
    SC: { lat: 33.8, lng: -80.9 },
    SD: { lat: 44.4, lng: -100.2 },
    TN: { lat: 35.8, lng: -86.4 },
    TX: { lat: 31.0, lng: -99.9 },
    UT: { lat: 39.3, lng: -111.7 },
    VA: { lat: 37.5, lng: -78.7 },
    VT: { lat: 44.0, lng: -72.7 },
    WA: { lat: 47.4, lng: -120.7 },
    WI: { lat: 44.6, lng: -89.8 },
    WV: { lat: 38.6, lng: -80.6 },
    WY: { lat: 43.0, lng: -107.6 },
    BC: { lat: 53.7, lng: -124.7 },
    ON: { lat: 50.0, lng: -85.0 },
    QC: { lat: 52.0, lng: -71.9 },
} satisfies Record<string, GeoCoordinate>;

const STATE_NAME_TO_CODE = {
    alabama: "AL",
    alaska: "AK",
    arizona: "AZ",
    arkansas: "AR",
    california: "CA",
    colorado: "CO",
    connecticut: "CT",
    delaware: "DE",
    florida: "FL",
    georgia: "GA",
    hawaii: "HI",
    idaho: "ID",
    illinois: "IL",
    indiana: "IN",
    iowa: "IA",
    kansas: "KS",
    kentucky: "KY",
    louisiana: "LA",
    maine: "ME",
    maryland: "MD",
    massachusetts: "MA",
    michigan: "MI",
    minnesota: "MN",
    mississippi: "MS",
    missouri: "MO",
    montana: "MT",
    nebraska: "NE",
    nevada: "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    ohio: "OH",
    oklahoma: "OK",
    oregon: "OR",
    pennsylvania: "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    tennessee: "TN",
    texas: "TX",
    utah: "UT",
    vermont: "VT",
    virginia: "VA",
    washington: "WA",
    "washington dc": "DC",
    "washington d.c.": "DC",
    "west virginia": "WV",
    wisconsin: "WI",
    wyoming: "WY",
    "british columbia": "BC",
    ontario: "ON",
    quebec: "QC",
} satisfies Record<string, keyof typeof STATE_COORDINATES>;

const LOCATION_KEYS = (
    Object.keys(LOCATION_COORDINATES) as Array<keyof typeof LOCATION_COORDINATES>
).sort(
    (first, second) => second.length - first.length,
);

function normalizeLocation(value: string) {
    return value
        .toLowerCase()
        .replace(/d\.c\./g, "dc")
        .replace(/[^a-z0-9\s.]/g, " ")
        .replace(/\b(greater|metro|area|office|offices|hybrid|onsite|on site)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isRemoteLocation(value: string) {
    return /\b(remote|virtual|anywhere|distributed)\b/i.test(value);
}

function projectCoordinate(coordinate: GeoCoordinate) {
    if (
        coordinate.lat < MIN_LAT ||
        coordinate.lat > MAX_LAT ||
        coordinate.lng < MIN_LNG ||
        coordinate.lng > MAX_LNG
    ) {
        return null;
    }

    return {
        x: ((coordinate.lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * MAP_WIDTH,
        y: ((MAX_LAT - coordinate.lat) / (MAX_LAT - MIN_LAT)) * MAP_HEIGHT,
    };
}

function resolveCoordinate(location: string | null) {
    const rawLocation = location?.trim();
    if (!rawLocation) {
        return {
            coordinate: FALLBACK_COORDINATE,
            label: "Location not set",
            type: "fallback" as const,
        };
    }

    const normalizedLocation = normalizeLocation(rawLocation);
    const locationKey = LOCATION_KEYS.find((key) =>
        normalizedLocation.includes(key),
    );
    if (locationKey) {
        return {
            coordinate: LOCATION_COORDINATES[locationKey],
            label: rawLocation,
            type: "matched" as const,
        };
    }

    const stateCode = rawLocation.match(/\b([A-Z]{2})\b/)?.[1] as
        | keyof typeof STATE_COORDINATES
        | undefined;
    if (stateCode && STATE_COORDINATES[stateCode]) {
        return {
            coordinate: STATE_COORDINATES[stateCode],
            label: rawLocation,
            type: "matched" as const,
        };
    }

    const stateName = (
        Object.keys(STATE_NAME_TO_CODE) as Array<keyof typeof STATE_NAME_TO_CODE>
    ).find((name) => normalizedLocation.includes(name));
    if (stateName) {
        return {
            coordinate: STATE_COORDINATES[STATE_NAME_TO_CODE[stateName]],
            label: rawLocation,
            type: "matched" as const,
        };
    }

    if (isRemoteLocation(rawLocation)) {
        return {
            coordinate: REMOTE_COORDINATE,
            label: rawLocation,
            type: "remote" as const,
        };
    }

    if (/\b(united states|usa|u\.s\.|us)\b/i.test(rawLocation)) {
        return {
            coordinate: REMOTE_COORDINATE,
            label: rawLocation,
            type: "matched" as const,
        };
    }

    return {
        coordinate: FALLBACK_COORDINATE,
        label: rawLocation,
        type: "fallback" as const,
    };
}

function offsetPoint(x: number, y: number, index: number) {
    if (index === 0) return { x, y };

    const ring = Math.ceil(index / 8);
    const angle = ((index - 1) % 8) * (Math.PI / 4);
    const radius = 8 + ring * 5;

    return {
        x: Math.min(MAP_WIDTH - 16, Math.max(16, x + Math.cos(angle) * radius)),
        y: Math.min(MAP_HEIGHT - 16, Math.max(16, y + Math.sin(angle) * radius)),
    };
}

function buildApplicationMapPoints(
    applications: Application[],
): ApplicationMapPoint[] {
    const occurrenceByLocation = new Map<string, number>();

    return applications
        .map((application) => {
            const resolved = resolveCoordinate(application.location);
            const projected =
                projectCoordinate(resolved.coordinate) ??
                projectCoordinate(FALLBACK_COORDINATE);
            const basePoint = projected ?? { x: MAP_WIDTH - 70, y: MAP_HEIGHT - 56 };
            const occurrenceKey = `${Math.round(basePoint.x)}-${Math.round(
                basePoint.y,
            )}-${resolved.type}`;
            const occurrence = occurrenceByLocation.get(occurrenceKey) ?? 0;
            occurrenceByLocation.set(occurrenceKey, occurrence + 1);
            const point = offsetPoint(basePoint.x, basePoint.y, occurrence);

            return {
                application,
                x: point.x,
                y: point.y,
                locationLabel: resolved.label,
                locationType: resolved.type,
            };
        })
        .sort(
            (first, second) =>
                getApplicationTimestamp(second.application) -
                getApplicationTimestamp(first.application),
        );
}

function getStatusLabel(status: string) {
    return isApplicationStatus(status) ? STATUS_LABELS[status] : status;
}

function getStatusClass(status: string) {
    return isApplicationStatus(status) ? status.toLowerCase() : "saved";
}

function formatAppliedDate(value: string | null) {
    if (!value) return "Not set";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

export function ApplicationMap({
    applications,
    onViewApplication,
}: ApplicationMapProps) {
    const points = useMemo(
        () => buildApplicationMapPoints(applications),
        [applications],
    );
    const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(
        null,
    );
    const selectedPoint =
        points.find((point) => point.application.id === selectedApplicationId) ??
        points[0] ??
        null;

    return (
        <div className="panel application-map-panel">
            <h2>
                <span className="heading-icon">
                    <AppIcon name="location" size={16} />
                </span>
                Application Map
                <InfoTooltip
                    label="Application map information"
                    tooltip="Shows tracked applications as selectable location points based on saved location text."
                />
            </h2>

            {points.length > 0 ? (
                <div className="application-map-layout">
                    <div className="application-map-shell">
                        <svg
                            className="application-map-canvas"
                            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                            role="img"
                            aria-label={`${points.length} application locations`}
                        >
                            <rect
                                className="application-map-water"
                                width={MAP_WIDTH}
                                height={MAP_HEIGHT}
                                rx="12"
                            />
                            <path
                                className="application-map-land"
                                d="M64 92 C118 42 194 28 275 42 C335 52 372 86 433 82 C503 78 579 96 626 148 C677 204 658 290 599 322 C538 356 442 346 376 326 C304 304 250 316 180 303 C101 288 39 238 42 169 C44 133 48 112 64 92Z"
                            />
                            <path
                                className="application-map-coast"
                                d="M86 112 C132 80 183 72 238 82 M286 84 C349 116 420 126 510 118 M528 134 C586 172 612 232 590 291 M166 286 C214 266 257 264 304 281 M360 306 C436 328 516 324 572 286"
                            />
                            <g className="application-map-grid-lines">
                                <path d="M92 56V324" />
                                <path d="M220 40V340" />
                                <path d="M348 42V342" />
                                <path d="M476 58V326" />
                                <path d="M604 90V302" />
                                <path d="M62 116H642" />
                                <path d="M50 190H660" />
                                <path d="M70 264H620" />
                            </g>
                            <g>
                                {points.map((point) => {
                                    const isSelected =
                                        selectedPoint?.application.id ===
                                        point.application.id;

                                    return (
                                        <g
                                            key={point.application.id}
                                            role="button"
                                            tabIndex={0}
                                            aria-pressed={isSelected}
                                            aria-label={`${point.application.title} at ${point.locationLabel}`}
                                            className={`application-map-point ${getStatusClass(
                                                point.application.status,
                                            )}${isSelected ? " selected" : ""} ${
                                                point.locationType === "fallback"
                                                    ? "is-fallback"
                                                    : ""
                                            }`}
                                            transform={`translate(${point.x} ${point.y})`}
                                            onClick={() =>
                                                setSelectedApplicationId(
                                                    point.application.id,
                                                )
                                            }
                                            onKeyDown={(event) => {
                                                if (
                                                    event.key === "Enter" ||
                                                    event.key === " "
                                                ) {
                                                    event.preventDefault();
                                                    setSelectedApplicationId(
                                                        point.application.id,
                                                    );
                                                }
                                            }}
                                        >
                                            <title>
                                                {point.application.title} -{" "}
                                                {point.application.companyName ??
                                                    "Unknown company"}
                                            </title>
                                            <circle
                                                className="application-map-point-ring"
                                                r="9"
                                            />
                                            <circle
                                                className="application-map-point-dot"
                                                r="5"
                                            />
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>
                        <div className="application-map-legend" aria-hidden="true">
                            <span>
                                <b className="applied" />
                                Applied
                            </span>
                            <span>
                                <b className="interviewing" />
                                Interviewing
                            </span>
                            <span>
                                <b className="offer" />
                                Offer
                            </span>
                            <span>
                                <b className="fallback" />
                                Unresolved
                            </span>
                        </div>
                    </div>

                    <aside className="application-map-detail">
                        {selectedPoint && (
                            <>
                                <div className="application-map-detail-header">
                                    <span>
                                        <AppIcon name="applications" size={18} />
                                    </span>
                                    <div>
                                        <strong>{selectedPoint.application.title}</strong>
                                        <small>
                                            {selectedPoint.application.companyName ??
                                                "Unknown company"}
                                        </small>
                                    </div>
                                </div>
                                <dl>
                                    <div>
                                        <dt>Location</dt>
                                        <dd>{selectedPoint.locationLabel}</dd>
                                    </div>
                                    <div>
                                        <dt>Status</dt>
                                        <dd>
                                            <span
                                                className={`status-pill ${getStatusClass(
                                                    selectedPoint.application.status,
                                                )}`}
                                            >
                                                {getStatusLabel(
                                                    selectedPoint.application.status,
                                                )}
                                            </span>
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Source</dt>
                                        <dd>
                                            {selectedPoint.application.source ||
                                                "No source"}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Applied</dt>
                                        <dd>
                                            {formatAppliedDate(
                                                selectedPoint.application.dateApplied,
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                                <button
                                    type="button"
                                    className="secondary application-map-open"
                                    onClick={() =>
                                        onViewApplication(
                                            selectedPoint.application.id,
                                        )
                                    }
                                >
                                    <AppIcon name="arrow-right" size={15} />
                                    View application
                                </button>
                            </>
                        )}
                    </aside>
                </div>
            ) : (
                <div className="analytics-empty-panel">
                    <span className="empty-illustration">
                        <AppIcon name="location" size={31} />
                    </span>
                    <h3>No applications to map</h3>
                    <p>Add applications with locations to populate the map.</p>
                </div>
            )}
        </div>
    );
}
