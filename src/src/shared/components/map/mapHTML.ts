export const getMapHTML = () => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body, #map { width:100%; height:100%; overflow:hidden; }
body { background:#f8fafc; }
.leaflet-tile-pane { filter: brightness(0.97) saturate(0.9); }
.leaflet-popup-content { color:#0f172a; font-size:12px; font-weight:600; }
.leaflet-popup-content strong { color:#0284c7; }
.custom-div-icon { background:transparent !important; border:none !important; }
</style>
</head>
<body>
<div id="map"></div>
<script>

/* ============================================================
   MAP
============================================================ */
const map = L.map("map", {
  center: [13.025, 123.65],
  zoom: 10,
  zoomControl: false,
  attributionControl: true
});
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  maxZoom: 19
}).addTo(map);

/* ============================================================
   TERMINALS
============================================================ */
const terminals = {
  donsOl: { id: 1, name: "Donsol Terminal", lat: 12.9032, lng: 123.59425 },
  daraga: { id: 2, name: "Daraga Terminal", lat: 13.14769, lng: 123.71216 }
};

/* ============================================================
   ROUTE
============================================================ */
let routeCoordinates = [];
let routeTotalDistanceMeters = 0;
let routeLayer = null;
let routeReady = false;
let routeCumulativeDistances = []; // routeCumulativeDistances[i] = distance from origin to routeCoordinates[i]
const ROUTE_SEARCH_WINDOW = 30; // segments to check on either side of a jeepney's last known position
const REPROJECT_MIN_MOVEMENT_METERS = 3; // skip recompute for GPS noise / stationary jeepneys

/* ============================================================
   MARKER DATA STORE
============================================================ */
let markerData = {}; // id -> { lat, lng, speed, plate, status, occupancy, capacity, driver }

/* ============================================================
   ETA SETTINGS
============================================================ */
const ADDITIONAL_ETA_MINUTES = 20;
const FALLBACK_SPEED_KMH = 25;

/* ============================================================
   HELPERS
============================================================ */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLng/2)*Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function calculateRouteDistance(coords) {
  let total = 0;
  routeCumulativeDistances = [0];
  for (let i = 1; i < coords.length; i++) {
    total += haversineDistance(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1]);
    routeCumulativeDistances.push(total);
  }
  return total;
}

function projectPointToSegment(pointLat, pointLng, startLat, startLng, endLat, endLng) {
  const latScale = 111320;
  const lngScale = 111320 * Math.cos(pointLat * Math.PI / 180);
  const px = pointLng * lngScale;
  const py = pointLat * latScale;
  const ax = startLng * lngScale;
  const ay = startLat * latScale;
  const bx = endLng * lngScale;
  const by = endLat * latScale;
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const abSquared = abx*abx + aby*aby;
  if (abSquared === 0) {
    return { lat: startLat, lng: startLng, t: 0, distance: haversineDistance(pointLat, pointLng, startLat, startLng) };
  }
  let t = (apx*abx + apy*aby) / abSquared;
  t = Math.max(0, Math.min(1, t));
  const projectedLng = startLng + (endLng - startLng) * t;
  const projectedLat = startLat + (endLat - startLat) * t;
  return { lat: projectedLat, lng: projectedLng, t, distance: haversineDistance(pointLat, pointLng, projectedLat, projectedLng) };
}

function getRouteProgress(lat, lng, hintIndex) {
  if (!routeCoordinates || routeCoordinates.length < 2 || routeTotalDistanceMeters <= 0) return null;

  const n = routeCoordinates.length;
  let searchStart = 1;
  let searchEnd = n - 1;
  const windowed = typeof hintIndex === "number" && hintIndex >= 1 && hintIndex < n;

  if (windowed) {
    searchStart = Math.max(1, hintIndex - ROUTE_SEARCH_WINDOW);
    searchEnd = Math.min(n - 1, hintIndex + ROUTE_SEARCH_WINDOW);
  }

  let closestPoint = null, closestDistance = Infinity, closestIndex = searchStart;

  for (let i = searchStart; i <= searchEnd; i++) {
    const start = routeCoordinates[i-1], end = routeCoordinates[i];
    const projected = projectPointToSegment(lat, lng, start[0], start[1], end[0], end[1]);
    if (projected.distance < closestDistance) {
      closestDistance = projected.distance;
      const segmentDistance = routeCumulativeDistances[i] - routeCumulativeDistances[i-1];
      closestPoint = {
        lat: projected.lat,
        lng: projected.lng,
        distanceFromOrigin: routeCumulativeDistances[i-1] + segmentDistance * projected.t
      };
      closestIndex = i;
    }
  }

  // The jeepney jumped further than the window covers (app relaunch, GPS gap, teleport in test data).
  // Fall back to a single full-route scan to resync, then future updates go back to being cheap.
  if (windowed && closestDistance > 500) {
    return getRouteProgress(lat, lng);
  }

  if (!closestPoint) return null;
  const remainingDistance = Math.max(0, routeTotalDistanceMeters - closestPoint.distanceFromOrigin);
  const progress = Math.min(1, Math.max(0, closestPoint.distanceFromOrigin / routeTotalDistanceMeters));
  return {
    progress,
    distanceFromOrigin: closestPoint.distanceFromOrigin,
    remainingDistance,
    snappedLat: closestPoint.lat,
    snappedLng: closestPoint.lng,
    gpsOffsetMeters: closestDistance,
    segmentIndex: closestIndex
  };
}

function getArrivalClock(minutes) {
  const arrival = new Date(Date.now() + minutes * 60 * 1000);
  return arrival.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* ============================================================
   ROUTE FETCH
============================================================ */
const OSRM_MAX_ATTEMPTS = 3;
const OSRM_RETRY_DELAY_MS = 2000; // doubles each retry: 2s, 4s

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildStraightLineFallbackRoute() {
  // Last resort so ETA can never hang forever if OSRM is unreachable.
  // Less accurate than the real road route (ignores road curvature), but keeps
  // the app usable and is clearly logged/flagged so it's easy to spot in testing.
  console.warn("⚠️ Using straight-line fallback route - OSRM road route unavailable.");
  routeCoordinates = [
    [terminals.donsOl.lat, terminals.donsOl.lng],
    [terminals.daraga.lat, terminals.daraga.lng]
  ];
  routeTotalDistanceMeters = calculateRouteDistance(routeCoordinates);
  routeReady = true;

  if (routeLayer) map.removeLayer(routeLayer);
  routeLayer = L.polyline(routeCoordinates, {
    color: "#0ea5e9", weight: 5, opacity: 0.6, dashArray: "8,10", lineCap: "round", lineJoin: "round"
  }).addTo(map);
  map.fitBounds(L.latLngBounds(routeCoordinates), { padding: [35,35] });

  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: "routeReady",
    approximate: true,
    totalDistance: routeTotalDistanceMeters,
    totalDistanceKm: routeTotalDistanceMeters / 1000
  }));

  recalculateAllETAs();
}

async function fetchRoute() {
  const url = "https://router.project-osrm.org/route/v1/driving/" +
              terminals.donsOl.lng + "," + terminals.donsOl.lat + ";" +
              terminals.daraga.lng + "," + terminals.daraga.lat +
              "?overview=simplified&geometries=geojson&alternatives=false";

  for (let attempt = 1; attempt <= OSRM_MAX_ATTEMPTS; attempt++) {
    try {
      console.log("🛣️ Fetching Donsol-Daraga road route (attempt " + attempt + "/" + OSRM_MAX_ATTEMPTS + ")...");
      const response = await fetch(url);
      if (!response.ok) throw new Error("OSRM HTTP " + response.status);
      const data = await response.json();
      if (!data.routes || !data.routes.length) throw new Error("No route returned");
      const route = data.routes[0];
      const coords = route.geometry.coordinates;
      routeCoordinates = coords.map(c => [c[1], c[0]]);
      routeTotalDistanceMeters = calculateRouteDistance(routeCoordinates);
      routeReady = true;
      console.log("✅ ROUTE LOADED, distance:", (routeTotalDistanceMeters/1000).toFixed(2), "km");

      if (routeLayer) map.removeLayer(routeLayer);
      routeLayer = L.polyline(routeCoordinates, {
        color: "#0ea5e9", weight: 5, opacity: 0.75, lineCap: "round", lineJoin: "round"
      }).addTo(map);
      map.fitBounds(L.latLngBounds(routeCoordinates), { padding: [35,35] });

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "routeReady",
        approximate: false,
        totalDistance: routeTotalDistanceMeters,
        totalDistanceKm: routeTotalDistanceMeters / 1000
      }));

      recalculateAllETAs();
      return;

    } catch (error) {
      console.error("❌ Route fetch attempt " + attempt + " failed:", error);
      if (attempt < OSRM_MAX_ATTEMPTS) {
        await sleep(OSRM_RETRY_DELAY_MS * attempt);
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "routeError",
          message: String(error)
        }));
        buildStraightLineFallbackRoute();
      }
    }
  }
}

/* ============================================================
   RECALCULATE ALL ETAS
============================================================ */
function recalculateAllETAs() {
  if (!routeReady) return;
  Object.keys(markerData).forEach(id => {
    const d = markerData[id];
    // Use stored speed if available, else fallback
    const speed = (d.speed && d.speed > 2) ? d.speed : FALLBACK_SPEED_KMH;
    updateJeepneyMarker(id, d.lat, d.lng, speed, d.status);
  });
}

/* ============================================================
   JEEPNEY SVG
============================================================ */
function createJeepneySVG(color) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" width="48" height="30">' +
    '<ellipse cx="50" cy="53" rx="38" ry="5" fill="rgba(0,0,0,.20)" />' +
    '<rect x="8" y="20" width="78" height="25" rx="6" fill="' + color + '" stroke="#ffffff" stroke-width="2" />' +
    '<path d="M86 25 L96 30 L96 45 L86 45 Z" fill="' + color + '" stroke="#ffffff" stroke-width="2" />' +
    '<path d="M72 22 L84 22 L84 37 L72 37 Z" fill="#bae6fd" stroke="#ffffff" stroke-width="1.5" />' +
    '<rect x="17" y="24" width="12" height="10" rx="1" fill="#bae6fd" />' +
    '<rect x="32" y="24" width="12" height="10" rx="1" fill="#bae6fd" />' +
    '<rect x="47" y="24" width="12" height="10" rx="1" fill="#bae6fd" />' +
    '<rect x="12" y="38" width="74" height="4" fill="rgba(255,255,255,.8)" />' +
    '<circle cx="25" cy="46" r="8" fill="#1e293b" stroke="#ffffff" stroke-width="2" />' +
    '<circle cx="25" cy="46" r="3" fill="#94a3b8" />' +
    '<circle cx="76" cy="46" r="8" fill="#1e293b" stroke="#ffffff" stroke-width="2" />' +
    '<circle cx="76" cy="46" r="3" fill="#94a3b8" />' +
    '</svg>';
}

function getStatusColor(status) {
  const colors = { en_route: "#22c55e", waiting: "#f59e0b", loading: "#0ea5e9", arrived: "#8b5cf6" };
  return colors[status] || "#0ea5e9";
}

/* ============================================================
   MARKERS
============================================================ */
let markers = {};

function addJeepneyMarker(id, lat, lng, plate, status, occupancy, capacity, driver, terminalId) {
  if (markers[id]) map.removeLayer(markers[id]);
  const color = getStatusColor(status);
  const svg = createJeepneySVG(color);
  const icon = L.divIcon({
    className: "custom-div-icon",
    html: '<div style="width:58px;height:42px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.92);border:3px solid ' + color + ';border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,.3);">' + svg + '</div>',
    iconSize: [58, 42],
    iconAnchor: [29, 21],
    popupAnchor: [0, -22]
  });
  const marker = L.marker([lat, lng], { icon }).addTo(map);
  marker.bindPopup("<strong>" + (plate || "Jeepney") + "</strong><br>Driver: " + (driver || "Unknown") + "<br>Status: " + (status || "Unknown") + "<br>Passengers: " + (occupancy ?? 0) + "/" + (capacity ?? 24));
  marker.on("click", function() {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "markerClicked", jeepneyId: id }));
    // Calculate + send ETA immediately on tap, using last known position -
    // don't make the user wait for the next passive GPS broadcast.
    const d = markerData[id];
    if (d && routeReady) {
      updateJeepneyMarker(id, d.lat, d.lng, d.speed || 0, d.status, true);
    }
  });
  markers[id] = marker;

  // Merge rather than overwrite - preserves segmentIndex/lastEtaLat/terminalId set elsewhere
  markerData[id] = Object.assign({}, markerData[id], {
    lat, lng, status, plate, occupancy, capacity, driver,
    terminalId: terminalId != null ? terminalId : (markerData[id] ? markerData[id].terminalId : undefined),
    speed: (markerData[id] && markerData[id].speed) || 0
  });
}

function updateJeepneyMarker(id, lat, lng, speed, status, force) {
  if (markers[id]) {
    markers[id].setLatLng([lat, lng]);
    // Update stored data
    if (markerData[id]) {
      markerData[id].lat = lat;
      markerData[id].lng = lng;
      markerData[id].speed = speed;
      if (status) markerData[id].status = status;
    }
  }

  if (!routeReady) return;

  // Skip recompute for GPS jitter / stationary jeepneys - saves work when nothing meaningful changed.
  // Bypassed when force=true (e.g. user just tapped this jeepney and wants an answer now).
  const cached = markerData[id];
  if (!force && cached && cached.lastEtaLat != null) {
    const movedMeters = haversineDistance(lat, lng, cached.lastEtaLat, cached.lastEtaLng);
    if (movedMeters < REPROJECT_MIN_MOVEMENT_METERS) return;
  }

  const hintIndex = cached ? cached.segmentIndex : undefined;
  const progress = getRouteProgress(lat, lng, hintIndex);
  if (!progress) return;

  if (markerData[id]) {
    markerData[id].segmentIndex = progress.segmentIndex;
    markerData[id].lastEtaLat = lat;
    markerData[id].lastEtaLng = lng;
  }

  // Determine destination from the jeepney's current/base terminal:
  // terminal 1 (Donsol) -> heading to terminal 2 (Daraga), and vice versa.
  // This is deterministic and avoids the old nearest-terminal guess, which is unreliable
  // near the route midpoint or when GPS drifts closer to the "wrong" terminal.
  const terminalId = cached && cached.terminalId != null ? Number(cached.terminalId) : null;
  let destination;
  if (terminalId === terminals.donsOl.id) {
    destination = terminals.daraga;
  } else if (terminalId === terminals.daraga.id) {
    destination = terminals.donsOl;
  } else {
    // No terminalId available - fall back to nearest-terminal heuristic.
    // This should be rare/never once terminalId is wired through from the RN side -
    // if you're seeing this warning, terminalId isn't reaching the WebView.
    console.warn("⚠️ No terminalId for jeepney " + id + " - falling back to nearest-terminal guess. Check that useGPSMap.ts forwards terminalId in its postMessage payload.");
    const distToDonsol = haversineDistance(lat, lng, terminals.donsOl.lat, terminals.donsOl.lng);
    const distToDaraga = haversineDistance(lat, lng, terminals.daraga.lat, terminals.daraga.lng);
    destination = (distToDonsol < distToDaraga) ? terminals.daraga : terminals.donsOl;
  }

  // Determine direction
  let remainingDistance = progress.remainingDistance;
  let progressPercent = progress.progress * 100;
  if (destination.id === terminals.donsOl.id) {
    remainingDistance = routeTotalDistanceMeters - progress.distanceFromOrigin;
    progressPercent = 100 - progressPercent;
  }
  remainingDistance = Math.max(0, remainingDistance);

  // Speed
  let currentSpeed = Number(speed || 0);
  if (!Number.isFinite(currentSpeed)) currentSpeed = 0;
  const effectiveSpeed = (currentSpeed > 2) ? currentSpeed : FALLBACK_SPEED_KMH;

  const remainingKm = remainingDistance / 1000;
  const travelMinutes = (remainingKm / effectiveSpeed) * 60;
  const additionalMinutes = ADDITIONAL_ETA_MINUTES;
  let remainingMinutes = travelMinutes + additionalMinutes;
  if (remainingKm < 0.15) remainingMinutes = 0;
  remainingMinutes = Math.max(0, remainingMinutes);
  const arrivalTime = getArrivalClock(remainingMinutes);

  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: "etaUpdate",
    jeepneyId: id,
    currentLat: lat,
    currentLng: lng,
    destinationName: destination.name,
    progressPercent: progressPercent,
    totalRouteDistanceKm: routeTotalDistanceMeters / 1000,
    remainingDistanceKm: remainingKm,
    traveledDistanceKm: (routeTotalDistanceMeters - remainingDistance) / 1000,
    currentSpeedKmh: currentSpeed,
    travelMinutes: travelMinutes,
    additionalMinutes: additionalMinutes,
    remainingMinutes: remainingMinutes,
    estimatedArrivalTime: arrivalTime,
    currentTime: new Date().toISOString(),
    snappedLat: progress.snappedLat,
    snappedLng: progress.snappedLng,
    gpsOffsetMeters: progress.gpsOffsetMeters
  }));
}

function updateAllRouteProgress(data) {
  if (!data || !data.markers) return;
  data.markers.forEach(j => {
    if (typeof j.lat !== "number" || typeof j.lng !== "number") return;
    // Store speed for later use
    const speed = Number(j.speed || 0);
    const terminalId = j.terminalId != null ? Number(j.terminalId) : undefined;
    // If route is not ready yet, store data and skip ETA
    if (!routeReady) {
      // Just store/update marker data
      if (markerData[j.id]) {
        markerData[j.id].lat = j.lat;
        markerData[j.id].lng = j.lng;
        markerData[j.id].speed = speed;
        markerData[j.id].status = j.status;
        if (terminalId != null) markerData[j.id].terminalId = terminalId;
      } else {
        markerData[j.id] = { lat: j.lat, lng: j.lng, speed: speed, status: j.status, terminalId: terminalId };
      }
      // Still create marker visually
      addJeepneyMarker(j.id, j.lat, j.lng, j.plateNumber, j.status, j.occupancy, j.capacity, j.driverName, terminalId);
      return;
    }
    updateJeepneyMarker(j.id, j.lat, j.lng, speed, j.status);
  });
}

/* ============================================================
   TERMINAL ICONS
============================================================ */
const originIcon = L.divIcon({
  className: "custom-div-icon",
  html: '<div style="background:#22c55e;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.3);">📍</div>',
  iconSize: [40,40],
  iconAnchor: [20,20]
});
const destinationIcon = L.divIcon({
  className: "custom-div-icon",
  html: '<div style="background:#f59e0b;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.3);">📍</div>',
  iconSize: [40,40],
  iconAnchor: [20,20]
});
L.marker([terminals.donsOl.lat, terminals.donsOl.lng], { icon: originIcon, zIndexOffset: 1000 }).addTo(map).bindPopup("<strong>Donsol Terminal</strong><br>Origin");
L.marker([terminals.daraga.lat, terminals.daraga.lng], { icon: destinationIcon, zIndexOffset: 1000 }).addTo(map).bindPopup("<strong>Daraga Terminal</strong><br>Destination");

/* ============================================================
   REACT NATIVE EVENTS
============================================================ */
function handleNativeMessage(raw) {
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data.type === "updateMarkers") {
      // Clear markers
      Object.keys(markers).forEach(key => { map.removeLayer(markers[key]); });
      markers = {};
      // Store marker data (will be updated later)
      data.markers.forEach(j => {
        const terminalId = j.terminalId != null ? Number(j.terminalId) : undefined;
        if (markerData[j.id]) {
          markerData[j.id].lat = Number(j.lat);
          markerData[j.id].lng = Number(j.lng);
          markerData[j.id].speed = Number(j.speed || 0);
          markerData[j.id].status = j.status;
          if (terminalId != null) markerData[j.id].terminalId = terminalId;
        } else {
          markerData[j.id] = {
            lat: Number(j.lat),
            lng: Number(j.lng),
            speed: Number(j.speed || 0),
            status: j.status,
            plate: j.plateNumber,
            occupancy: j.occupancy,
            capacity: j.capacity,
            driver: j.driverName,
            terminalId: terminalId
          };
        }
      });
      // Add markers visually
      data.markers.forEach(j => {
        const terminalId = j.terminalId != null ? Number(j.terminalId) : undefined;
        addJeepneyMarker(j.id, Number(j.lat), Number(j.lng), j.plateNumber, j.status, j.occupancy, j.capacity, j.driverName, terminalId);
      });
      // If route ready, calculate ETA for all
      if (routeReady) {
        recalculateAllETAs();
      }
    }
    if (data.type === "updateJeepney") {
      const speed = Number(data.speed || 0);
      const terminalId = data.terminalId != null ? Number(data.terminalId) : undefined;
      if (markerData[data.id]) {
        markerData[data.id].lat = Number(data.lat);
        markerData[data.id].lng = Number(data.lng);
        markerData[data.id].speed = speed;
        if (data.status) markerData[data.id].status = data.status;
        if (terminalId != null) markerData[data.id].terminalId = terminalId;
      }
      // Update marker position even if route not ready
      if (markers[data.id]) {
        markers[data.id].setLatLng([Number(data.lat), Number(data.lng)]);
      }
      if (routeReady) {
        updateJeepneyMarker(data.id, Number(data.lat), Number(data.lng), speed, data.status);
      }
    }
    if (data.type === "centerMap") {
      map.flyTo([Number(data.lat), Number(data.lng)], 14);
    }
    if (data.type === "refreshRoute") { fetchRoute(); }
    if (data.type === "zoomIn") { map.zoomIn(); }
    if (data.type === "zoomOut") { map.zoomOut(); }
    if (data.type === "recenter") {
      if (Number.isFinite(Number(data.lat)) && Number.isFinite(Number(data.lng))) {
        map.flyTo([Number(data.lat), Number(data.lng)], 13);
      } else {
        map.fitBounds(L.latLngBounds(routeCoordinates), { padding: [35,35] });
      }
    }
  } catch (error) {
    console.error("Map native message error:", error);
  }
}

document.addEventListener("message", function(event) { handleNativeMessage(event.data); });
window.addEventListener("message", function(event) { handleNativeMessage(event.data); });

/* ============================================================
   START
============================================================ */
setTimeout(fetchRoute, 500);
setTimeout(function() {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: "mapReady" }));
}, 1000);

</script>
</body>
</html>
  `;
};
