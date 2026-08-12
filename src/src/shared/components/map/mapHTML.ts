export const getMapHTML = () => {
  return `
<!DOCTYPE html>
<html>

<head>

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
/>

<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
/>

<script
  src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js">
</script>

<style>

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#map {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  background: #f8fafc;
}

.leaflet-tile-pane {
  filter: brightness(0.97) saturate(0.9);
}

.leaflet-popup-content {
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
}

.leaflet-popup-content strong {
  color: #0284c7;
}

.custom-div-icon {
  background: transparent !important;
  border: none !important;
}

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

L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19
  }
).addTo(map);


/* ============================================================
   TERMINALS
============================================================ */

const terminals = {
  donsOl: {
    id: 1,
    name: "Donsol Terminal",
    lat: 12.9032,
    lng: 123.59425
  },

  daraga: {
    id: 2,
    name: "Daraga Terminal",
    lat: 13.14769,
    lng: 123.71216
  }
};


/* ============================================================
   ROUTE
============================================================ */

let routeCoordinates = [];

let routeTotalDistanceMeters = 0;

let routeLayer = null;


/* ============================================================
   ETA SETTINGS
============================================================ */

/*
 * Additional 20-minute buffer requested.
 */
const ADDITIONAL_ETA_MINUTES = 20;

/*
 * Used only when GPS speed is unavailable
 * or the jeepney is stopped.
 */
const FALLBACK_SPEED_KMH = 25;


/* ============================================================
   HAVERSINE
============================================================ */

function haversineDistance(
  lat1,
  lng1,
  lat2,
  lng2
) {

  const R = 6371000;

  const dLat =
    (lat2 - lat1) *
    Math.PI /
    180;

  const dLng =
    (lng2 - lng1) *
    Math.PI /
    180;

  const a =
    Math.sin(dLat / 2) *
    Math.sin(dLat / 2) +

    Math.cos(
      lat1 * Math.PI / 180
    ) *

    Math.cos(
      lat2 * Math.PI / 180
    ) *

    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}


/* ============================================================
   ROUTE DISTANCE
============================================================ */

function calculateRouteDistance(
  coords
) {

  let total = 0;

  for (
    let i = 1;
    i < coords.length;
    i++
  ) {

    total += haversineDistance(
      coords[i - 1][0],
      coords[i - 1][1],
      coords[i][0],
      coords[i][1]
    );
  }

  return total;
}


/* ============================================================
   PROJECT GPS POINT ONTO ROUTE SEGMENT
============================================================ */

function projectPointToSegment(
  pointLat,
  pointLng,
  startLat,
  startLng,
  endLat,
  endLng
) {

  const latScale = 111320;

  const lngScale =
    111320 *
    Math.cos(
      pointLat *
      Math.PI /
      180
    );

  const px =
    pointLng *
    lngScale;

  const py =
    pointLat *
    latScale;

  const ax =
    startLng *
    lngScale;

  const ay =
    startLat *
    latScale;

  const bx =
    endLng *
    lngScale;

  const by =
    endLat *
    latScale;

  const abx = bx - ax;
  const aby = by - ay;

  const apx = px - ax;
  const apy = py - ay;

  const abSquared =
    abx * abx +
    aby * aby;

  if (abSquared === 0) {

    return {
      lat: startLat,
      lng: startLng,
      t: 0,
      distance:
        haversineDistance(
          pointLat,
          pointLng,
          startLat,
          startLng
        )
    };
  }

  let t =
    (
      apx * abx +
      apy * aby
    ) /
    abSquared;

  t = Math.max(
    0,
    Math.min(1, t)
  );

  const projectedLng =
    startLng +
    (endLng - startLng) *
    t;

  const projectedLat =
    startLat +
    (endLat - startLat) *
    t;

  return {
    lat: projectedLat,

    lng: projectedLng,

    t,

    distance:
      haversineDistance(
        pointLat,
        pointLng,
        projectedLat,
        projectedLng
      )
  };
}


/* ============================================================
   FIND POSITION ON ACTUAL ROAD
============================================================ */

function getRouteProgress(
  lat,
  lng
) {

  if (
    !routeCoordinates ||
    routeCoordinates.length < 2 ||
    routeTotalDistanceMeters <= 0
  ) {
    return null;
  }

  let closestPoint = null;

  let closestDistance =
    Infinity;

  let distanceFromOrigin = 0;

  for (
    let i = 1;
    i < routeCoordinates.length;
    i++
  ) {

    const start =
      routeCoordinates[i - 1];

    const end =
      routeCoordinates[i];

    const projected =
      projectPointToSegment(
        lat,
        lng,
        start[0],
        start[1],
        end[0],
        end[1]
      );

    const segmentDistance =
      haversineDistance(
        start[0],
        start[1],
        end[0],
        end[1]
      );

    if (
      projected.distance <
      closestDistance
    ) {

      closestDistance =
        projected.distance;

      closestPoint = {
        lat:
          projected.lat,

        lng:
          projected.lng,

        distanceFromOrigin:
          distanceFromOrigin +
          segmentDistance *
            projected.t
      };
    }

    distanceFromOrigin +=
      segmentDistance;
  }

  if (!closestPoint) {
    return null;
  }

  const remainingDistance =
    Math.max(
      0,
      routeTotalDistanceMeters -
      closestPoint.distanceFromOrigin
    );

  const progress =
    Math.min(
      1,
      Math.max(
        0,
        closestPoint.distanceFromOrigin /
          routeTotalDistanceMeters
      )
    );

  return {
    progress,

    distanceFromOrigin:
      closestPoint.distanceFromOrigin,

    remainingDistance,

    snappedLat:
      closestPoint.lat,

    snappedLng:
      closestPoint.lng,

    gpsOffsetMeters:
      closestDistance
  };
}


/* ============================================================
   ARRIVAL TIME
============================================================ */

function getArrivalClock(
  minutes
) {

  const arrival =
    new Date(
      Date.now() +
      minutes *
        60 *
        1000
    );

  return arrival.toLocaleTimeString(
    [],
    {
      hour: "numeric",
      minute: "2-digit"
    }
  );
}


/* ============================================================
   ROUTE FETCH
============================================================ */

async function fetchRoute() {

  try {

    console.log(
      "🛣️ Fetching actual Donsol-Daraga road route..."
    );

    const url =
      "https://router.project-osrm.org/route/v1/driving/" +

      terminals.donsOl.lng +
      "," +
      terminals.donsOl.lat +

      ";" +

      terminals.daraga.lng +
      "," +
      terminals.daraga.lat +

      "?overview=full&geometries=geojson&alternatives=false";

    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        "OSRM HTTP " +
        response.status
      );
    }

    const data =
      await response.json();

    if (
      !data.routes ||
      !data.routes.length
    ) {
      throw new Error(
        "No route returned by OSRM"
      );
    }

    const route =
      data.routes[0];

    const coords =
      route.geometry.coordinates;

    routeCoordinates =
      coords.map(
        c => [
          c[1],
          c[0]
        ]
      );

    routeTotalDistanceMeters =
      calculateRouteDistance(
        routeCoordinates
      );

    console.log(
      "✅ ACTUAL ROAD ROUTE LOADED",
      "distance:",
      (
        routeTotalDistanceMeters /
        1000
      ).toFixed(2),
      "km"
    );

    if (routeLayer) {
      map.removeLayer(
        routeLayer
      );
    }

    routeLayer =
      L.polyline(
        routeCoordinates,
        {
          color: "#0ea5e9",
          weight: 5,
          opacity: 0.75,
          lineCap: "round",
          lineJoin: "round"
        }
      ).addTo(map);

    map.fitBounds(
      L.latLngBounds(
        routeCoordinates
      ),
      {
        padding: [
          35,
          35
        ]
      }
    );

    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "routeReady",

        totalDistance:
          routeTotalDistanceMeters,

        totalDistanceKm:
          routeTotalDistanceMeters /
          1000
      })
    );

  } catch (error) {

    console.error(
      "❌ Route fetch failed:",
      error
    );

    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "routeError",
        message:
          String(error)
      })
    );
  }
}


/* ============================================================
   TERMINAL ICONS
============================================================ */

const originIcon =
  L.divIcon({
    className:
      "custom-div-icon",

    html:
      '<div style="' +

      "background:#22c55e;" +

      "width:40px;" +

      "height:40px;" +

      "border-radius:50%;" +

      "display:flex;" +

      "align-items:center;" +

      "justify-content:center;" +

      "font-size:20px;" +

      "border:3px solid white;" +

      "box-shadow:0 4px 12px rgba(0,0,0,.3);" +

      '">📍</div>',

    iconSize: [
      40,
      40
    ],

    iconAnchor: [
      20,
      20
    ]
  });


const destinationIcon =
  L.divIcon({
    className:
      "custom-div-icon",

    html:
      '<div style="' +

      "background:#f59e0b;" +

      "width:40px;" +

      "height:40px;" +

      "border-radius:50%;" +

      "display:flex;" +

      "align-items:center;" +

      "justify-content:center;" +

      "font-size:20px;" +

      "border:3px solid white;" +

      "box-shadow:0 4px 12px rgba(0,0,0,.3);" +

      '">📍</div>',

    iconSize: [
      40,
      40
    ],

    iconAnchor: [
      20,
      20
    ]
  });


L.marker(
  [
    terminals.donsOl.lat,
    terminals.donsOl.lng
  ],
  {
    icon: originIcon
  }
)
.addTo(map)
.bindPopup(
  "<strong>Donsol Terminal</strong><br>Origin"
);


L.marker(
  [
    terminals.daraga.lat,
    terminals.daraga.lng
  ],
  {
    icon: destinationIcon
  }
)
.addTo(map)
.bindPopup(
  "<strong>Daraga Terminal</strong><br>Destination"
);


/* ============================================================
   JEEPNEY SVG
============================================================ */

function createJeepneySVG(
  color
) {

  return (

    '<svg ' +

    'xmlns="http://www.w3.org/2000/svg" ' +

    'viewBox="0 0 100 60" ' +

    'width="48" ' +

    'height="30">' +

      /* shadow */

      '<ellipse ' +

      'cx="50" ' +

      'cy="53" ' +

      'rx="38" ' +

      'ry="5" ' +

      'fill="rgba(0,0,0,.20)" />' +

      /* body */

      '<rect ' +

      'x="8" ' +

      'y="20" ' +

      'width="78" ' +

      'height="25" ' +

      'rx="6" ' +

      'fill="' +
      color +
      '" ' +

      'stroke="#ffffff" ' +

      'stroke-width="2" />' +

      /* front hood */

      '<path ' +

      'd="M86 25 L96 30 L96 45 L86 45 Z" ' +

      'fill="' +
      color +
      '" ' +

      'stroke="#ffffff" ' +

      'stroke-width="2" />' +

      /* windshield */

      '<path ' +

      'd="M72 22 L84 22 L84 37 L72 37 Z" ' +

      'fill="#bae6fd" ' +

      'stroke="#ffffff" ' +

      'stroke-width="1.5" />' +

      /* windows */

      '<rect ' +

      'x="17" ' +

      'y="24" ' +

      'width="12" ' +

      'height="10" ' +

      'rx="1" ' +

      'fill="#bae6fd" />' +

      '<rect ' +

      'x="32" ' +

      'y="24" ' +

      'width="12" ' +

      'height="10" ' +

      'rx="1" ' +

      'fill="#bae6fd" />' +

      '<rect ' +

      'x="47" ' +

      'y="24" ' +

      'width="12" ' +

      'height="10" ' +

      'rx="1" ' +

      'fill="#bae6fd" />' +

      /* stripe */

      '<rect ' +

      'x="12" ' +

      'y="38" ' +

      'width="74" ' +

      'height="4" ' +

      'fill="rgba(255,255,255,.8)" />' +

      /* wheels */

      '<circle ' +

      'cx="25" ' +

      'cy="46" ' +

      'r="8" ' +

      'fill="#1e293b" ' +

      'stroke="#ffffff" ' +

      'stroke-width="2" />' +

      '<circle ' +

      'cx="25" ' +

      'cy="46" ' +

      'r="3" ' +

      'fill="#94a3b8" />' +

      '<circle ' +

      'cx="76" ' +

      'cy="46" ' +

      'r="8" ' +

      'fill="#1e293b" ' +

      'stroke="#ffffff" ' +

      'stroke-width="2" />' +

      '<circle ' +

      'cx="76" ' +

      'cy="46" ' +

      'r="3" ' +

      'fill="#94a3b8" />' +

    '</svg>'
  );
}


/* ============================================================
   STATUS COLOR
============================================================ */

function getStatusColor(
  status
) {

  const colors = {

    en_route:
      "#22c55e",

    waiting:
      "#f59e0b",

    loading:
      "#0ea5e9",

    arrived:
      "#8b5cf6"

  };

  return (
    colors[status] ||
    "#0ea5e9"
  );
}


/* ============================================================
   MARKERS
============================================================ */

let markers = {};


/* ============================================================
   ADD JEEPNEY
============================================================ */

function addJeepneyMarker(
  id,
  lat,
  lng,
  plate,
  status,
  occupancy,
  capacity,
  driver
) {

  if (
    markers[id]
  ) {
    map.removeLayer(
      markers[id]
    );
  }

  const color =
    getStatusColor(
      status
    );

  const svg =
    createJeepneySVG(
      color
    );

  const icon =
    L.divIcon({

      className:
        "custom-div-icon",

      html:
        '<div style="' +

        "width:58px;" +

        "height:42px;" +

        "display:flex;" +

        "align-items:center;" +

        "justify-content:center;" +

        "background:rgba(255,255,255,.92);" +

        "border:3px solid " +
        color +
        ";" +

        "border-radius:16px;" +

        "box-shadow:0 4px 12px rgba(0,0,0,.3);" +

        '">' +

        svg +

        "</div>",

      iconSize: [
        58,
        42
      ],

      iconAnchor: [
        29,
        21
      ],

      popupAnchor: [
        0,
        -22
      ]
    });

  const marker =
    L.marker(
      [
        lat,
        lng
      ],
      {
        icon
      }
    )
    .addTo(map);

  marker.bindPopup(

    "<strong>" +
    (plate ||
      "Jeepney") +
    "</strong><br>" +

    "Driver: " +
    (driver ||
      "Unknown") +
    "<br>" +

    "Status: " +
    (status ||
      "Unknown") +
    "<br>" +

    "Passengers: " +
    (occupancy ??
      0) +
    "/" +
    (capacity ??
      24)

  );

  marker.on(
    "click",
    function() {

      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type:
            "markerClicked",

          jeepneyId:
            id
        })
      );
    }
  );

  markers[id] =
    marker;
}


/* ============================================================
   UPDATE JEEPNEY
============================================================ */

function updateJeepneyMarker(
  id,
  lat,
  lng,
  speed
) {

  if (
    markers[id]
  ) {

    markers[id].setLatLng([
      lat,
      lng
    ]);
  }

  if (
    !routeCoordinates.length
  ) {
    return;
  }

  const progress =
    getRouteProgress(
      lat,
      lng
    );

  if (!progress) {
    return;
  }


  /* ==========================================================
     DETERMINE DESTINATION
  ========================================================== */

  /*
   * We determine which side of the route the jeep is currently
   * closer to.
   */

  const distanceToDonsol =
    haversineDistance(
      lat,
      lng,
      terminals.donsOl.lat,
      terminals.donsOl.lng
    );

  const distanceToDaraga =
    haversineDistance(
      lat,
      lng,
      terminals.daraga.lat,
      terminals.daraga.lng
    );

  /*
   * If closer to Donsol, destination is Daraga.
   * If closer to Daraga, destination is Donsol.
   */
  let destination;

  if (
    distanceToDonsol <
    distanceToDaraga
  ) {

    destination =
      terminals.daraga;

  } else {

    destination =
      terminals.donsOl;
  }


  /* ==========================================================
     DETERMINE ROUTE DIRECTION
  ========================================================== */

  let remainingDistance =
    progress.remainingDistance;

  let progressPercent =
    progress.progress * 100;

  /*
   * Route geometry was loaded Donsol -> Daraga.
   *
   * If traveling Daraga -> Donsol,
   * reverse the progress.
   */

  if (
    destination.id ===
    terminals.donsOl.id
  ) {

    remainingDistance =
      routeTotalDistanceMeters -
      progress.distanceFromOrigin;

    progressPercent =
      100 -
      progressPercent;
  }


  remainingDistance =
    Math.max(
      0,
      remainingDistance
    );


  /* ==========================================================
     SPEED
  ========================================================== */

  let currentSpeed =
    Number(speed || 0);

  if (
    !Number.isFinite(
      currentSpeed
    )
  ) {
    currentSpeed = 0;
  }

  /*
   * GPS speed may briefly report 0 while the jeep is moving.
   */
  const effectiveSpeed =
    currentSpeed > 2
      ? currentSpeed
      : FALLBACK_SPEED_KMH;


  /* ==========================================================
     DISTANCE -> TIME
  ========================================================== */

  const remainingKm =
    remainingDistance /
    1000;

  const travelMinutes =
    remainingKm /
    effectiveSpeed *
    60;


  /* ==========================================================
     20 MINUTE ADDITIONAL TIME
  ========================================================== */

  const additionalMinutes =
    ADDITIONAL_ETA_MINUTES;


  /* ==========================================================
     FINAL ETA
  ========================================================== */

  let remainingMinutes =
    travelMinutes +
    additionalMinutes;


  /*
   * If essentially at destination,
   * do not show 20 minutes.
   */
  if (
    remainingKm <
    0.15
  ) {

    remainingMinutes = 0;
  }


  remainingMinutes =
    Math.max(
      0,
      remainingMinutes
    );


  const arrivalTime =
    getArrivalClock(
      remainingMinutes
    );


  /* ==========================================================
     SEND ETA TO REACT NATIVE
  ========================================================== */

  window.ReactNativeWebView.postMessage(

    JSON.stringify({

      type:
        "etaUpdate",

      jeepneyId:
        id,

      currentLat:
        lat,

      currentLng:
        lng,

      destinationName:
        destination.name,

      progressPercent:
        progressPercent,

      totalRouteDistanceKm:
        routeTotalDistanceMeters /
        1000,

      remainingDistanceKm:
        remainingKm,

      traveledDistanceKm:
        (
          routeTotalDistanceMeters -
          remainingDistance
        ) /
        1000,

      currentSpeedKmh:
        currentSpeed,

      travelMinutes:
        travelMinutes,

      additionalMinutes:
        additionalMinutes,

      remainingMinutes:
        remainingMinutes,

      estimatedArrivalTime:
        arrivalTime,

      currentTime:
        new Date().toISOString(),

      snappedLat:
        progress.snappedLat,

      snappedLng:
        progress.snappedLng,

      gpsOffsetMeters:
        progress.gpsOffsetMeters

    })
  );
}


/* ============================================================
   UPDATE ALL
============================================================ */

function updateAllRouteProgress(
  data
) {

  if (
    !data ||
    !data.markers
  ) {
    return;
  }

  data.markers.forEach(
    j => {

      if (
        typeof j.lat !==
          "number" ||
        typeof j.lng !==
          "number"
      ) {
        return;
      }

      updateJeepneyMarker(
        j.id,
        j.lat,
        j.lng,
        j.speed
      );
    }
  );
}


/* ============================================================
   REACT NATIVE EVENTS
============================================================ */

function handleNativeMessage(
  raw
) {

  try {

    const data =
      typeof raw === "string"
        ? JSON.parse(raw)
        : raw;


    /* ========================================================
       UPDATE MARKERS
    ======================================================== */

    if (
      data.type ===
      "updateMarkers"
    ) {

      Object.keys(
        markers
      ).forEach(
        key => {

          map.removeLayer(
            markers[key]
          );
        }
      );

      markers = {};

      data.markers.forEach(
        j => {

          addJeepneyMarker(
            j.id,
            Number(j.lat),
            Number(j.lng),
            j.plateNumber,
            j.status,
            j.occupancy,
            j.capacity,
            j.driverName
          );
        }
      );

      updateAllRouteProgress(
        data
      );
    }


    /* ========================================================
       SINGLE JEEPNEY
    ======================================================== */

    if (
      data.type ===
      "updateJeepney"
    ) {

      updateJeepneyMarker(
        data.id,
        Number(data.lat),
        Number(data.lng),
        Number(data.speed || 0)
      );
    }


    /* ========================================================
       CENTER MAP
    ======================================================== */

    if (
      data.type ===
      "centerMap"
    ) {

      map.flyTo(
        [
          Number(data.lat),
          Number(data.lng)
        ],
        14
      );
    }


    /* ========================================================
       REFRESH ROUTE
    ======================================================== */

    if (
      data.type ===
      "refreshRoute"
    ) {

      fetchRoute();
    }


    /* ========================================================
       ZOOM
    ======================================================== */

    if (
      data.type ===
      "zoomIn"
    ) {

      map.zoomIn();
    }


    if (
      data.type ===
      "zoomOut"
    ) {

      map.zoomOut();
    }


    /* ========================================================
       RECENTER
    ======================================================== */

    if (
      data.type ===
      "recenter"
    ) {

      if (
        Number.isFinite(
          Number(data.lat)
        ) &&
        Number.isFinite(
          Number(data.lng)
        )
      ) {

        map.flyTo(
          [
            Number(data.lat),
            Number(data.lng)
          ],
          13
        );

      } else {

        map.fitBounds(
          L.latLngBounds(
            routeCoordinates
          ),
          {
            padding: [
              35,
              35
            ]
          }
        );
      }
    }

  } catch (error) {

    console.error(
      "Map native message error:",
      error
    );
  }
}


/*
 * Android
 */
document.addEventListener(
  "message",
  function(event) {

    handleNativeMessage(
      event.data
    );

  }
);


/*
 * iOS
 */
window.addEventListener(
  "message",
  function(event) {

    handleNativeMessage(
      event.data
    );

  }
);


/* ============================================================
   START
============================================================ */

setTimeout(
  function() {

    fetchRoute();

  },
  500
);


setTimeout(
  function() {

    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type:
          "mapReady"
      })
    );

  },
  1000
);

</script>

</body>

</html>
`;
};
