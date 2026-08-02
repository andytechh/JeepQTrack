const OSRM_BASE = "https://router.project-osrm.org";

export interface RouteInfo {
  distanceKm: number;
  durationMin: number;
}

const FALLBACK_DISTANCE_KM = 42.6;
const FALLBACK_DURATION_MIN = 90;

export async function fetchRouteInfo(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<RouteInfo> {
  try {
    const url = `${OSRM_BASE}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === "Ok" && data.routes?.length > 0) {
      const route = data.routes[0];
      return {
        distanceKm: route.distance / 1000,
        durationMin: Math.round(route.duration / 60),
      };
    }
  } catch (error) {
    console.warn("OSRM route fetch failed, using fallback:", error);
  }

  return {
    distanceKm: FALLBACK_DISTANCE_KM,
    durationMin: FALLBACK_DURATION_MIN,
  };
}
