"use client";

// Import "leaflet/dist/leaflet.css" once from your global app entry
// (app/layout.tsx for the App Router or pages/_app.tsx for the Pages Router).

import { useEffect, useMemo, useRef, useState } from "react";

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

type GeocodedLocation = {
    lat: number;
    lng: number;
    displayName: string;
};

type ApplicationMapPoint = GeocodedLocation & {
    application: Application;
    locationLabel: string;
};

type NominatimSearchResult = {
    lat: string;
    lon: string;
    display_name: string;
};

type GeocodeCacheEntry = {
    cachedAt: number;
    value: GeocodedLocation | null;
};

type GeocodeCache = Record<string, GeocodeCacheEntry>;

type GeocodingState = {
    phase: "idle" | "loading" | "ready" | "error";
    completed: number;
    total: number;
    error: string | null;
};

type LeafletModule = typeof import("leaflet");
type LeafletMapInstance = ReturnType<LeafletModule["map"]>;
type LeafletLayerGroupInstance = ReturnType<LeafletModule["layerGroup"]>;

const DEFAULT_MAP_CENTER: [number, number] = [20, 0];
const DEFAULT_MAP_ZOOM = 2;
const SINGLE_LOCATION_ZOOM = 9;
const GEOCODE_CACHE_KEY = "application-map:nominatim-geocoding:v1";
const GEOCODE_CACHE_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const GEOCODE_REQUEST_INTERVAL_MS = 1_100;

const GEOCODING_ENDPOINT =
    process.env.NEXT_PUBLIC_GEOCODING_ENDPOINT ??
    "https://nominatim.openstreetmap.org/search";
const NOMINATIM_CONTACT_EMAIL =
    process.env.NEXT_PUBLIC_NOMINATIM_CONTACT_EMAIL?.trim() || null;
const MAP_TILE_URL =
    process.env.NEXT_PUBLIC_MAP_TILE_URL ??
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const MAP_TILE_ATTRIBUTION =
    process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ??
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const REMOTE_LOCATION_PATTERN =
    /\b(remote|virtual|anywhere|distributed|work\s+from\s+home|wfh)\b/i;
const WORK_MODE_PATTERN = /\b(hybrid|on[- ]?site|office|offices)\b/gi;

function sleep(duration: number, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }

        const timeoutId = window.setTimeout(resolve, duration);
        signal.addEventListener(
            "abort",
            () => {
                window.clearTimeout(timeoutId);
                reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
        );
    });
}

function getLocationQuery(location: string | null) {
    const rawLocation = location?.trim();
    if (!rawLocation || REMOTE_LOCATION_PATTERN.test(rawLocation)) return null;

    const query = rawLocation
        .replace(WORK_MODE_PATTERN, " ")
        .replace(/[()[\]{}]/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^[,;|\-\s]+|[,;|\-\s]+$/g, "")
        .trim();

    if (!query) return null;

    return {
        key: query.toLocaleLowerCase("en-US"),
        query,
        label: rawLocation,
    };
}

function isGeocodedLocation(value: unknown): value is GeocodedLocation {
    if (!value || typeof value !== "object") return false;

    const candidate = value as Partial<GeocodedLocation>;
    return (
        typeof candidate.lat === "number" &&
        Number.isFinite(candidate.lat) &&
        typeof candidate.lng === "number" &&
        Number.isFinite(candidate.lng) &&
        typeof candidate.displayName === "string"
    );
}

function readGeocodeCache() {
    if (typeof window === "undefined") return {} satisfies GeocodeCache;

    try {
        const rawCache = window.localStorage.getItem(GEOCODE_CACHE_KEY);
        if (!rawCache) return {} satisfies GeocodeCache;

        const parsedCache = JSON.parse(rawCache) as unknown;
        if (!parsedCache || typeof parsedCache !== "object") {
            return {} satisfies GeocodeCache;
        }

        const now = Date.now();
        const validEntries: GeocodeCache = {};

        for (const [key, rawEntry] of Object.entries(parsedCache)) {
            if (!rawEntry || typeof rawEntry !== "object") continue;

            const entry = rawEntry as Partial<GeocodeCacheEntry>;
            if (
                typeof entry.cachedAt !== "number" ||
                now - entry.cachedAt > GEOCODE_CACHE_TTL_MS
            ) {
                continue;
            }

            if (entry.value === null || isGeocodedLocation(entry.value)) {
                validEntries[key] = {
                    cachedAt: entry.cachedAt,
                    value: entry.value,
                };
            }
        }

        return validEntries;
    } catch {
        return {} satisfies GeocodeCache;
    }
}

function writeGeocodeCache(cache: GeocodeCache) {
    try {
        window.localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
    } catch {
        // Mapping still works when storage is unavailable; it simply cannot reuse results.
    }
}

async function geocodeLocation(query: string, signal: AbortSignal) {
    const url = new URL(GEOCODING_ENDPOINT);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set(
        "accept-language",
        navigator.language?.toLowerCase() || "en",
    );

    if (NOMINATIM_CONTACT_EMAIL) {
        url.searchParams.set("email", NOMINATIM_CONTACT_EMAIL);
    }

    const response = await fetch(url, {
        signal,
        headers: { Accept: "application/json" },
    });

    if (!response.ok) {
        throw new Error(`Geocoding failed with HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as NominatimSearchResult[];
    const result = payload[0];
    if (!result) return null;

    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
        lat,
        lng,
        displayName: result.display_name,
    } satisfies GeocodedLocation;
}

function spreadCoordinate(
    coordinate: GeocodedLocation,
    occurrenceIndex: number,
): GeocodedLocation {
    if (occurrenceIndex === 0) return coordinate;

    const ring = Math.ceil(occurrenceIndex / 8);
    const angle = ((occurrenceIndex - 1) % 8) * (Math.PI / 4);
    const latitudeOffset = Math.sin(angle) * 0.018 * ring;
    const longitudeScale = Math.max(
        0.35,
        Math.cos((coordinate.lat * Math.PI) / 180),
    );
    const longitudeOffset =
        (Math.cos(angle) * 0.018 * ring) / longitudeScale;

    return {
        ...coordinate,
        lat: coordinate.lat + latitudeOffset,
        lng: coordinate.lng + longitudeOffset,
    };
}

function buildApplicationMapPoints(
    applications: Application[],
    locationsByKey: Record<string, GeocodedLocation | null>,
): ApplicationMapPoint[] {
    const occurrencesByLocation = new Map<string, number>();

    return [...applications]
        .sort(
            (first, second) =>
                getApplicationTimestamp(second) -
                getApplicationTimestamp(first),
        )
        .flatMap((application) => {
            const location = getLocationQuery(application.location);
            if (!location) return [];

            const coordinate = locationsByKey[location.key];
            if (!coordinate) return [];

            const occurrence = occurrencesByLocation.get(location.key) ?? 0;
            occurrencesByLocation.set(location.key, occurrence + 1);
            const spread = spreadCoordinate(coordinate, occurrence);

            return [
                {
                    application,
                    lat: spread.lat,
                    lng: spread.lng,
                    displayName: coordinate.displayName,
                    locationLabel: location.label,
                },
            ];
        });
}

function getStatusLabel(status: string) {
    return isApplicationStatus(status) ? STATUS_LABELS[status] : status;
}

function getStatusClass(status: string) {
    return isApplicationStatus(status) ? status.toLowerCase() : "saved";
}

function getMarkerColor(status: string) {
    switch (getStatusClass(status)) {
        case "applied":
            return "#2563eb";
        case "interviewing":
            return "#d97706";
        case "offer":
            return "#16a34a";
        case "rejected":
            return "#dc2626";
        case "withdrawn":
            return "#7c3aed";
        default:
            return "#64748b";
    }
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
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const leafletRef = useRef<LeafletModule | null>(null);
    const mapRef = useRef<LeafletMapInstance | null>(null);
    const markerLayerRef = useRef<LeafletLayerGroupInstance | null>(null);

    const [mapReady, setMapReady] = useState(false);
    const [retryVersion, setRetryVersion] = useState(0);
    const [locationsByKey, setLocationsByKey] = useState<
        Record<string, GeocodedLocation | null>
    >({});
    const [geocodingState, setGeocodingState] = useState<GeocodingState>({
        phase: "idle",
        completed: 0,
        total: 0,
        error: null,
    });
    const [selectedApplicationId, setSelectedApplicationId] = useState<
        string | null
    >(null);

    useEffect(() => {
        const container = mapContainerRef.current;
        if (!container) return;

        let disposed = false;
        let resizeObserver: ResizeObserver | null = null;
        let map: LeafletMapInstance | null = null;

        void import("leaflet").then((leaflet) => {
            const currentContainer = mapContainerRef.current;
            if (disposed || !currentContainer) return;

            leafletRef.current = leaflet;
            map = leaflet.map(currentContainer, {
                minZoom: 2,
                worldCopyJump: true,
                zoomControl: true,
                attributionControl: true,
            });
            map.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

            leaflet
                .tileLayer(MAP_TILE_URL, {
                    attribution: MAP_TILE_ATTRIBUTION,
                    maxZoom: 19,
                })
                .addTo(map);

            markerLayerRef.current = leaflet.layerGroup().addTo(map);
            mapRef.current = map;
            setMapReady(true);

            if (typeof ResizeObserver !== "undefined") {
                resizeObserver = new ResizeObserver(() => {
                    map?.invalidateSize({ pan: false });
                });
                resizeObserver.observe(currentContainer);
            }
        });

        return () => {
            disposed = true;
            resizeObserver?.disconnect();
            map?.remove();
            mapRef.current = null;
            markerLayerRef.current = null;
            leafletRef.current = null;
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        let cancelled = false;

        type LocationQuery = NonNullable<ReturnType<typeof getLocationQuery>>;
        const uniqueLocations = new Map<string, LocationQuery>();

        for (const application of applications) {
            const location = getLocationQuery(application.location);
            if (location) uniqueLocations.set(location.key, location);
        }

        const locationEntries = [...uniqueLocations.values()];
        const cache = readGeocodeCache();
        const initialLocations: Record<string, GeocodedLocation | null> = {};
        const missingLocations: typeof locationEntries = [];

        for (const location of locationEntries) {
            if (Object.prototype.hasOwnProperty.call(cache, location.key)) {
                initialLocations[location.key] = cache[location.key].value;
            } else {
                missingLocations.push(location);
            }
        }

        setLocationsByKey(initialLocations);
        setGeocodingState({
            phase: missingLocations.length > 0 ? "loading" : "ready",
            completed: locationEntries.length - missingLocations.length,
            total: locationEntries.length,
            error: null,
        });

        async function resolveMissingLocations() {
            if (missingLocations.length === 0) return;

            let completed = locationEntries.length - missingLocations.length;
            let failedRequests = 0;
            let lastError: string | null = null;

            for (let index = 0; index < missingLocations.length; index += 1) {
                const location = missingLocations[index];

                try {
                    const result = await geocodeLocation(
                        location.query,
                        controller.signal,
                    );
                    if (cancelled) return;

                    setLocationsByKey((current) => ({
                        ...current,
                        [location.key]: result,
                    }));
                    cache[location.key] = {
                        cachedAt: Date.now(),
                        value: result,
                    };
                    writeGeocodeCache(cache);
                } catch (error: unknown) {
                    if (
                        cancelled ||
                        (error instanceof DOMException &&
                            error.name === "AbortError")
                    ) {
                        return;
                    }

                    failedRequests += 1;
                    lastError =
                        error instanceof Error
                            ? error.message
                            : "The geocoding service could not be reached.";
                }

                completed += 1;
                setGeocodingState({
                    phase: "loading",
                    completed,
                    total: locationEntries.length,
                    error: lastError,
                });

                if (index < missingLocations.length - 1) {
                    await sleep(GEOCODE_REQUEST_INTERVAL_MS, controller.signal);
                }
            }

            if (cancelled) return;

            setGeocodingState({
                phase: failedRequests > 0 ? "error" : "ready",
                completed,
                total: locationEntries.length,
                error:
                    failedRequests > 0
                        ? lastError ??
                        `${failedRequests} location requests could not be completed.`
                        : null,
            });
        }

        void resolveMissingLocations().catch((error: unknown) => {
            if (cancelled || (error instanceof DOMException && error.name === "AbortError")) {
                return;
            }

            setGeocodingState((current) => ({
                ...current,
                phase: "error",
                error:
                    error instanceof Error
                        ? error.message
                        : "The geocoding service could not be reached.",
            }));
        });

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [applications, retryVersion]);

    const points = useMemo(
        () => buildApplicationMapPoints(applications, locationsByKey),
        [applications, locationsByKey],
    );

    const selectedPoint =
        points.find(
            (point) => point.application.id === selectedApplicationId,
        ) ??
        points[0] ??
        null;

    useEffect(() => {
        if (!selectedPoint) {
            setSelectedApplicationId(null);
            return;
        }

        if (selectedPoint.application.id !== selectedApplicationId) {
            setSelectedApplicationId(selectedPoint.application.id);
        }
    }, [selectedApplicationId, selectedPoint]);

    useEffect(() => {
        const leaflet = leafletRef.current;
        const markerLayer = markerLayerRef.current;
        if (!mapReady || !leaflet || !markerLayer) return;

        markerLayer.clearLayers();

        for (const point of points) {
            const isSelected =
                point.application.id === selectedPoint?.application.id;
            const color = getMarkerColor(point.application.status);
            const marker = leaflet.circleMarker([point.lat, point.lng], {
                radius: isSelected ? 10 : 7,
                color,
                fillColor: color,
                fillOpacity: isSelected ? 1 : 0.82,
                opacity: 1,
                weight: isSelected ? 4 : 2,
                bubblingMouseEvents: false,
            });

            const tooltip = document.createElement("span");
            tooltip.textContent = `${point.application.title} — ${point.application.companyName ?? "Unknown company"
                }`;
            marker.bindTooltip(tooltip, { direction: "top", offset: [0, -8] });
            marker.on("click", () => {
                setSelectedApplicationId(point.application.id);
            });
            marker.addTo(markerLayer);

            const markerElement = marker.getElement();
            if (markerElement) {
                markerElement.setAttribute("role", "button");
                markerElement.setAttribute("tabindex", "0");
                markerElement.setAttribute(
                    "aria-label",
                    `${point.application.title} at ${point.locationLabel}`,
                );
                markerElement.setAttribute(
                    "aria-pressed",
                    String(isSelected),
                );
                markerElement.addEventListener("keydown", (event) => {
                    if (!(event instanceof KeyboardEvent)) return;

                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedApplicationId(point.application.id);
                    }
                });
            }
        }
    }, [mapReady, points, selectedPoint?.application.id]);

    const pointSignature = useMemo(
        () =>
            points
                .map((point) => `${point.application.id}:${point.lat}:${point.lng}`)
                .join("|"),
        [points],
    );

    useEffect(() => {
        const leaflet = leafletRef.current;
        const map = mapRef.current;
        if (!mapReady || !leaflet || !map) return;

        const frameId = window.requestAnimationFrame(() => {
            map.invalidateSize({ pan: false });

            if (points.length === 0) {
                map.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
            } else if (points.length === 1) {
                map.setView([points[0].lat, points[0].lng], SINGLE_LOCATION_ZOOM);
            } else {
                map.fitBounds(
                    leaflet.latLngBounds(
                        points.map(
                            (point) =>
                                [point.lat, point.lng] as [number, number],
                        ),
                    ),
                    { padding: [32, 32], maxZoom: 9 },
                );
            }
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [mapReady, pointSignature, points]);

    const unmappedCount = applications.length - points.length;
    const isGeocoding = geocodingState.phase === "loading";

    return (
        <div className="application-map-panel">
            <h2>
                <span className="heading-icon">
                    <AppIcon name="location" size={16} />
                </span>
                Application Map
                <InfoTooltip
                    label="Application map information"
                    tooltip="Uses OpenStreetMap tiles and Nominatim geocoding. Remote, missing, and unresolved locations are not assigned fake coordinates."
                />
            </h2>

            {applications.length > 0 ? (
                <div className="application-map-layout">
                    <div className="application-map-shell">
                        <div
                            ref={mapContainerRef}
                            className="application-map-canvas"
                            role="region"
                            aria-label={`${points.length} mapped application locations`}
                        />

                        {isGeocoding && (
                            <div
                                className="application-map-loading"
                                role="status"
                                aria-live="polite"
                            >
                                Mapping locations {geocodingState.completed}/
                                {geocodingState.total}
                            </div>
                        )}

                        {geocodingState.phase === "error" && (
                            <div className="application-map-error" role="alert">
                                <span>
                                    {geocodingState.error ??
                                        "Some locations could not be mapped."}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setRetryVersion((version) => version + 1)
                                    }
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        <div className="application-map-legend">
                            <span>
                                <b style={{ backgroundColor: "#2563eb" }} />
                                Applied
                            </span>
                            <span>
                                <b style={{ backgroundColor: "#d97706" }} />
                                Interviewing
                            </span>
                            <span>
                                <b style={{ backgroundColor: "#16a34a" }} />
                                Offer
                            </span>
                            <span className="application-map-count">
                                {points.length} mapped
                                {unmappedCount > 0
                                    ? ` · ${unmappedCount} unmapped`
                                    : ""}
                            </span>
                        </div>
                    </div>

                    <aside className="application-map-detail">
                        {selectedPoint ? (
                            <>
                                <div className="application-map-detail-header">
                                    <span>
                                        <AppIcon name="applications" size={18} />
                                    </span>
                                    <div>
                                        <strong>
                                            {selectedPoint.application.title}
                                        </strong>
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
                                        <dt>Mapped as</dt>
                                        <dd>{selectedPoint.displayName}</dd>
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
                        ) : (
                            <div className="application-map-detail-empty">
                                <AppIcon name="location" size={28} />
                                <h3>No physical locations mapped</h3>
                                <p>
                                    Remote, missing, and unrecognized locations are
                                    intentionally left off the map.
                                </p>
                            </div>
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
