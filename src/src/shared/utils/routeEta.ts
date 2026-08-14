// src/shared/utils/routeEta.ts
//
// Road-route ETA calculation shared outside the map's WebView (e.g. the queue screen).
// This mirrors the logic in src/shared/components/map/mapHTML.ts exactly - same terminals,
// same OSRM route, same direction-aware remaining-distance math, same scaled buffer - so the
// ETA shown on the queue screen always agrees with the ETA shown on the map screen.

export const TERMINALS = {
  donsOl: { id: 1, name: "Donsol Terminal", lat: 12.9032, lng: 123.59425 },
  daraga: { id: 2, name: "Daraga Terminal", lat: 13.14769, lng: 123.71216 },
} as const;

const ADDITIONAL_ETA_MINUTES = 20;
const FALLBACK_SPEED_KMH = 25;
const OSRM_MAX_ATTEMPTS = 3;
const OSRM_RETRY_DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function projectPointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - ax) * dx + (py - ay) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const projLat = ax + t * dx;
  const projLng = ay + t * dy;
  return {
    lat: projLat,
    lng: projLng,
    t,
    distance: haversineDistance(px, py, projLat, projLng),
  };
}

type RouteCoord = [number, number]; // [lat, lng]

interface RouteState {
  coordinates: RouteCoord[];
  cumulativeDistances: number[];
  totalDistanceMeters: number;
  approximate: boolean;
}

let routeStatePromise: Promise<RouteState> | null = null;

function buildCumulativeDistances(coords: RouteCoord[]) {
  let total = 0;
  const cumulative = [0];
  for (let i = 1; i < coords.length; i++) {
    total += haversineDistance(
      coords[i - 1][0],
      coords[i - 1][1],
      coords[i][0],
      coords[i][1],
    );
    cumulative.push(total);
  }
  return { total, cumulative };
}

function straightLineFallback(): RouteState {
  console.warn(
    "⚠️ routeEta: using straight-line fallback route - OSRM road route unavailable.",
  );
  const coordinates: RouteCoord[] = [
    [TERMINALS.donsOl.lat, TERMINALS.donsOl.lng],
    [TERMINALS.daraga.lat, TERMINALS.daraga.lng],
  ];
  const { total, cumulative } = buildCumulativeDistances(coordinates);
  return {
    coordinates,
    cumulativeDistances: cumulative,
    totalDistanceMeters: total,
    approximate: true,
  };
}

async function fetchRoute(): Promise<RouteState> {
  const url =
    "https://router.project-osrm.org/route/v1/driving/" +
    TERMINALS.donsOl.lng +
    "," +
    TERMINALS.donsOl.lat +
    ";" +
    TERMINALS.daraga.lng +
    "," +
    TERMINALS.daraga.lat +
    "?overview=simplified&geometries=geojson&alternatives=false";

  for (let attempt = 1; attempt <= OSRM_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("OSRM HTTP " + response.status);
      const data = await response.json();
      if (!data.routes || !data.routes.length)
        throw new Error("No route returned");
      const coords: RouteCoord[] = data.routes[0].geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as RouteCoord,
      );
      const { total, cumulative } = buildCumulativeDistances(coords);
      return {
        coordinates: coords,
        cumulativeDistances: cumulative,
        totalDistanceMeters: total,
        approximate: false,
      };
    } catch (error) {
      console.error(`❌ routeEta: OSRM attempt ${attempt} failed:`, error);
      if (attempt < OSRM_MAX_ATTEMPTS) {
        await sleep(OSRM_RETRY_DELAY_MS * attempt);
      }
    }
  }

  return straightLineFallback();
}

/**
 * Fetches (and caches) the Donsol<->Daraga road route. Safe to call repeatedly -
 * the underlying fetch only happens once per app session; subsequent calls reuse it.
 */
function getRouteState(): Promise<RouteState> {
  if (!routeStatePromise) {
    routeStatePromise = fetchRoute();
  }
  return routeStatePromise;
}

/** Clears the cached route so the next getRouteState() call re-fetches it. */
export function resetRouteCache() {
  routeStatePromise = null;
}

function getRouteProgress(route: RouteState, lat: number, lng: number) {
  const { coordinates, cumulativeDistances } = route;
  if (coordinates.length < 2) return null;

  let closestDistance = Infinity;
  let distanceFromOrigin = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const [ax, ay] = coordinates[i - 1];
    const [bx, by] = coordinates[i];
    const projected = projectPointToSegment(lat, lng, ax, ay, bx, by);
    if (projected.distance < closestDistance) {
      closestDistance = projected.distance;
      const segmentDistance =
        cumulativeDistances[i] - cumulativeDistances[i - 1];
      distanceFromOrigin =
        cumulativeDistances[i - 1] + segmentDistance * projected.t;
    }
  }

  return { distanceFromOrigin, gpsOffsetMeters: closestDistance };
}

export interface EtaResult {
  destinationName: string;
  remainingDistanceKm: number;
  progressPercent: number;
  travelMinutes: number;
  additionalMinutes: number;
  remainingMinutes: number;
  estimatedArrivalTime: string;
  approximateRoute: boolean;
}

function getArrivalClock(minutesFromNow: number): string {
  const arrival = new Date(Date.now() + minutesFromNow * 60000);
  return arrival.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Computes ETA for a jeepney currently at (lat, lng), heading away from its current
 * terminal (terminalId: 1 = Donsol, 2 = Daraga) toward the other one - same
 * direction-aware distance logic as mapHTML.ts's updateJeepneyMarker.
 */
export async function calculateJeepneyEta(
  lat: number,
  lng: number,
  currentTerminalId: number,
  speedKmh: number,
): Promise<EtaResult | null> {
  const route = await getRouteState();
  const progress = getRouteProgress(route, lat, lng);
  if (!progress) return null;

  const destination =
    currentTerminalId === TERMINALS.donsOl.id
      ? TERMINALS.daraga
      : TERMINALS.donsOl;

  // routeCoordinates run Donsol -> Daraga, so distanceFromOrigin is measured from Donsol:
  // it's the remaining distance for a Donsol-bound jeepney, while
  // (total - distanceFromOrigin) is the remaining distance for a Daraga-bound jeepney.
  let remainingDistance: number;
  let progressPercent: number;
  if (destination.id === TERMINALS.donsOl.id) {
    remainingDistance = progress.distanceFromOrigin;
    progressPercent =
      100 - (progress.distanceFromOrigin / route.totalDistanceMeters) * 100;
  } else {
    remainingDistance = route.totalDistanceMeters - progress.distanceFromOrigin;
    progressPercent =
      (progress.distanceFromOrigin / route.totalDistanceMeters) * 100;
  }
  remainingDistance = Math.max(0, remainingDistance);

  const effectiveSpeed = speedKmh > 2 ? speedKmh : FALLBACK_SPEED_KMH;
  const remainingKm = remainingDistance / 1000;
  const travelMinutes = (remainingKm / effectiveSpeed) * 60;

  const totalRouteKm = route.totalDistanceMeters / 1000;
  const remainingFraction =
    totalRouteKm > 0 ? Math.min(1, remainingKm / totalRouteKm) : 0;
  const additionalMinutes = ADDITIONAL_ETA_MINUTES * remainingFraction;

  let remainingMinutes = travelMinutes + additionalMinutes;
  if (remainingKm < 0.15) remainingMinutes = 0;
  remainingMinutes = Math.max(0, remainingMinutes);

  return {
    destinationName: destination.name,
    remainingDistanceKm: remainingKm,
    progressPercent: Math.max(0, Math.min(100, progressPercent)),
    travelMinutes,
    additionalMinutes,
    remainingMinutes,
    estimatedArrivalTime: getArrivalClock(remainingMinutes),
    approximateRoute: route.approximate,
  };
}
