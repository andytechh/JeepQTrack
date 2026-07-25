// src/shared/constants/terminals.ts
//
// Single source of truth for the two fixed endpoints of the corridor and the
// route between them. There is no `terminals` table in Supabase, so these are
// app constants. Coordinates match the values previously hardcoded inside
// `app/staff/(driver)/gps-tracking.tsx`.

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Terminal extends LatLng {
  id: "donsol" | "daraga";
  name: string;
  shortName: string;
  /** Geofence radius in metres. */
  radius: number;
}

export const DONSOL_TERMINAL: Terminal = {
  id: "donsol",
  name: "Donsol Terminal",
  shortName: "Donsol",
  latitude: 12.9032,
  longitude: 123.59425,
  radius: 50,
};

export const DARAGA_TERMINAL: Terminal = {
  id: "daraga",
  name: "Daraga Terminal",
  shortName: "Daraga",
  latitude: 13.14769,
  longitude: 123.71216,
  radius: 50,
};

export const TERMINALS: Terminal[] = [DONSOL_TERMINAL, DARAGA_TERMINAL];

export type TerminalId = Terminal["id"];

export function getTerminal(id: TerminalId): Terminal {
  return id === "donsol" ? DONSOL_TERMINAL : DARAGA_TERMINAL;
}

/** Direction of travel along the corridor. */
export type Direction = "donsol-daraga" | "daraga-donsol";

export const DIRECTIONS: {
  id: Direction;
  label: string;
  from: Terminal;
  to: Terminal;
}[] = [
  {
    id: "donsol-daraga",
    label: "Donsol → Daraga",
    from: DONSOL_TERMINAL,
    to: DARAGA_TERMINAL,
  },
  {
    id: "daraga-donsol",
    label: "Daraga → Donsol",
    from: DARAGA_TERMINAL,
    to: DONSOL_TERMINAL,
  },
];

/**
 * Ordered waypoints from Donsol → Daraga following the highway corridor.
 * Used for the polyline and for projecting live positions onto the route so a
 * jeepney's progress can be derived without any routing/directions API.
 */
export const ROUTE_CORRIDOR: LatLng[] = [
  { latitude: 12.9032, longitude: 123.59425 },
  { latitude: 12.91245, longitude: 123.60181 },
  { latitude: 12.92788, longitude: 123.6135 },
  { latitude: 12.94663, longitude: 123.62488 },
  { latitude: 12.96741, longitude: 123.63459 },
  { latitude: 12.98905, longitude: 123.64253 },
  { latitude: 13.0104, longitude: 123.65099 },
  { latitude: 13.0312, longitude: 123.66067 },
  { latitude: 13.05202, longitude: 123.67041 },
  { latitude: 13.07216, longitude: 123.68008 },
  { latitude: 13.09169, longitude: 123.68933 },
  { latitude: 13.11035, longitude: 123.69822 },
  { latitude: 13.12764, longitude: 123.70588 },
  { latitude: 13.14769, longitude: 123.71216 },
];

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Cumulative distance to each corridor waypoint. */
const CUMULATIVE_KM: number[] = (() => {
  const out = [0];
  for (let i = 1; i < ROUTE_CORRIDOR.length; i++) {
    out.push(out[i - 1] + haversineKm(ROUTE_CORRIDOR[i - 1], ROUTE_CORRIDOR[i]));
  }
  return out;
})();

export const ROUTE_TOTAL_KM = CUMULATIVE_KM[CUMULATIVE_KM.length - 1];

export interface RouteProjection {
  /** 0 at Donsol, 1 at Daraga. */
  progress: number;
  /** Index of the nearest corridor waypoint. */
  nearestIndex: number;
  /** Distance from the point to the corridor, in km. */
  offRouteKm: number;
  /** Remaining distance to Daraga, in km. */
  remainingKm: number;
}

/**
 * Project an arbitrary coordinate onto the corridor. Finds the closest
 * segment, then interpolates within it, so a jeepney between two waypoints
 * yields a smooth fractional progress rather than snapping to a waypoint.
 */
export function projectOntoRoute(latitude: number, longitude: number): RouteProjection {
  const point = { latitude, longitude };
  let best = {
    distance: Number.POSITIVE_INFINITY,
    index: 0,
    alongKm: 0,
  };

  for (let i = 0; i < ROUTE_CORRIDOR.length - 1; i++) {
    const a = ROUTE_CORRIDOR[i];
    const b = ROUTE_CORRIDOR[i + 1];

    // Local planar approximation is fine over these short segments.
    const ax = a.longitude;
    const ay = a.latitude;
    const bx = b.longitude;
    const by = b.latitude;
    const px = longitude;
    const py = latitude;

    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));

    const projected = { latitude: ay + t * dy, longitude: ax + t * dx };
    const distance = haversineKm(point, projected);

    if (distance < best.distance) {
      const segmentKm = haversineKm(a, b);
      best = {
        distance,
        index: t < 0.5 ? i : i + 1,
        alongKm: CUMULATIVE_KM[i] + t * segmentKm,
      };
    }
  }

  const progress = ROUTE_TOTAL_KM === 0 ? 0 : best.alongKm / ROUTE_TOTAL_KM;

  return {
    progress: Math.max(0, Math.min(1, progress)),
    nearestIndex: best.index,
    offRouteKm: best.distance,
    remainingKm: Math.max(0, ROUTE_TOTAL_KM - best.alongKm),
  };
}

/** Average corridor speed used when a live speed reading is unavailable. */
export const DEFAULT_SPEED_KMH = 35;

/**
 * Estimated minutes for a jeepney at `progress` to reach the end of its
 * current direction of travel.
 */
export function etaMinutes(
  progress: number,
  speedKmh: number = DEFAULT_SPEED_KMH,
  direction: Direction = "donsol-daraga",
): number {
  const speed = speedKmh > 3 ? speedKmh : DEFAULT_SPEED_KMH;
  const fractionRemaining =
    direction === "donsol-daraga" ? 1 - progress : progress;
  const km = fractionRemaining * ROUTE_TOTAL_KM;
  return Math.max(0, Math.round((km / speed) * 60));
}

/** True when a coordinate sits inside a terminal's geofence. */
export function isAtTerminal(
  latitude: number,
  longitude: number,
  terminal: Terminal,
): boolean {
  return haversineKm({ latitude, longitude }, terminal) * 1000 <= terminal.radius;
}

/** Which terminal (if any) a coordinate is currently inside. */
export function terminalAt(latitude: number, longitude: number): Terminal | null {
  return TERMINALS.find((t) => isAtTerminal(latitude, longitude, t)) ?? null;
}

/** Bounding region covering the whole corridor, for initial map framing. */
export const ROUTE_REGION = {
  latitude: (DONSOL_TERMINAL.latitude + DARAGA_TERMINAL.latitude) / 2,
  longitude: (DONSOL_TERMINAL.longitude + DARAGA_TERMINAL.longitude) / 2,
  latitudeDelta: Math.abs(DARAGA_TERMINAL.latitude - DONSOL_TERMINAL.latitude) * 1.6,
  longitudeDelta: Math.abs(DARAGA_TERMINAL.longitude - DONSOL_TERMINAL.longitude) * 1.6,
};
