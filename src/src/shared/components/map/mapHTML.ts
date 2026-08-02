export const getMapHTML = () => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #f8fafc; }
    #map { height: 100vh; width: 100vw; }
    .leaflet-tile-pane { filter: brightness(0.95) saturate(0.9); }
    .leaflet-popup-content { color: #0f172a; font-size: 12px; font-weight: 600; }
    .leaflet-popup-content strong { color: #0ea5e9; }
    .custom-div-icon { background: transparent; border: none; }
  </style>
</head>
<body>
  <div id="map"></div>
 <script>
    const map = L.map('map', {
      center: [13.0, 123.65],
      zoom: 10,
      zoomControl: false,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    const JEEPNEY_ICON_BASE64 = "data:image/webp;base64,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"
    const terminals = [
      { lat: 12.9032, lng: 123.59425, name: 'Donsol Terminal', type: 'origin' },
      { lat: 13.14769, lng: 123.71216, name: 'Daraga Terminal', type: 'destination' }
    ];

    const originIcon = L.divIcon({
      className: 'custom-div-icon',
      html: '<div style="background:#22c55e;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);">🚌</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
    const destIcon = L.divIcon({
      className: 'custom-div-icon',
      html: '<div style="background:#f59e0b;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);">📍</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    terminals.forEach(t => {
      const icon = t.type === 'origin' ? originIcon : destIcon;
      L.marker([t.lat, t.lng], { icon }).addTo(map)
        .bindPopup('<strong>' + t.name + '</strong><br><span style="color:' + (t.type === 'origin' ? '#22c55e' : '#f59e0b') + ';font-size:10px;">' + (t.type === 'origin' ? '📍 ORIGIN' : '🏁 DESTINATION') + '</span>');
    });

    let routeLayer = null;
    async function fetchRoute() {
      try {
        const url = 'https://router.project-osrm.org/route/v1/driving/' +
          terminals[0].lng + ',' + terminals[0].lat + ';' +
          terminals[1].lng + ',' + terminals[1].lat +
          '?overview=full&geometries=geojson';
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates;
          const latLngs = coords.map(c => [c[1], c[0]]);
          if (routeLayer) map.removeLayer(routeLayer);
          routeLayer = L.polyline(latLngs, {
            color: '#0ea5e9', weight: 4, opacity: 0.6, dashArray: '8, 8'
          }).addTo(map);
          map.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
        }
      } catch (e) {
        const points = [[terminals[0].lat, terminals[0].lng], [terminals[1].lat, terminals[1].lng]];
        if (routeLayer) map.removeLayer(routeLayer);
        routeLayer = L.polyline(points, { color: '#0ea5e9', weight: 4, opacity: 0.6, dashArray: '8, 8' }).addTo(map);
      }
    }
    setTimeout(fetchRoute, 1000);

    // ─── HELPER FUNCTIONS ──────────────────────────────
    function getStatusColor(s) {
      const colors = { en_route: '#22c55e', waiting: '#f59e0b', loading: '#0ea5e9', arrived: '#8b5cf6' };
      return colors[s] || '#94a3b8';
    }

    function createJeepneySVG(color) {
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32" width="44" height="22">' +
        '<circle cx="12" cy="28" r="4" fill="#333" stroke="#555" stroke-width="1"/>' +
        '<circle cx="52" cy="28" r="4" fill="#333" stroke="#555" stroke-width="1"/>' +
        '<rect x="4" y="8" width="56" height="16" rx="4" fill="' + color + '" stroke="#fff" stroke-width="1.5"/>' +
        '<path d="M48 8 L58 4 L58 24 L48 24 Z" fill="' + color + '" stroke="#fff" stroke-width="1.5"/>' +
        '<polygon points="44,10 48,10 48,22 42,22" fill="#a8d8ea" stroke="#fff" stroke-width="1"/>' +
        '<line x1="10" y1="8" x2="44" y2="8" stroke="#fff" stroke-width="2"/>' +
        '<line x1="14" y1="4" x2="14" y2="8" stroke="#fff" stroke-width="2"/>' +
        '<line x1="40" y1="4" x2="40" y2="8" stroke="#fff" stroke-width="2"/>' +
        '<line x1="10" y1="16" x2="42" y2="16" stroke="#fff" stroke-width="1" opacity="0.5"/>' +
        '</svg>';
    }

    let markers = {};

        function addJeepneyMarker(id, lat, lng, plate, status, occ, cap, driver, isDriver) {
      if (markers[id]) map.removeLayer(markers[id]);
      const color = getStatusColor(status);

      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: '<div style="' +
          'width:40px;' +
          'height:40px;' +
          'border-radius:50%;' +
          'overflow:hidden;' +
          'border:3px solid ' + color + ';' +
          'box-shadow:0 2px 8px rgba(0,0,0,0.4);' +
          '">' +
          '<img src="' + JEEPNEY_ICON_BASE64 + '" style="width:100%;height:100%;object-fit:cover;" />' +
          '</div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map)
        .bindPopup(/* same popup content */);

      marker.on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'markerClicked',
          jeepneyId: id
        }));
      });

      markers[id] = marker;
    }

    function updateJeepneyMarker(id, lat, lng) {
      if (markers[id]) markers[id].setLatLng([lat, lng]);
    }

    document.addEventListener('message', function(e) {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'updateMarkers') {
          Object.keys(markers).forEach(k => map.removeLayer(markers[k]));
          markers = {};
          data.markers.forEach(j => {
            addJeepneyMarker(j.id, j.lat, j.lng, j.plateNumber, j.status, j.occupancy, j.capacity, j.driverName, j.isDriver);
          });
        }
        if (data.type === 'updateJeepney') {
          updateJeepneyMarker(data.id, data.lat, data.lng);
        }
        if (data.type === 'centerMap') {
          map.flyTo([data.lat, data.lng], 14);
        }
        if (data.type === 'refreshRoute') fetchRoute();
        if (data.type === 'zoomIn') map.zoomIn();
        if (data.type === 'zoomOut') map.zoomOut();
        if (data.type === 'recenter') map.setView(map.getCenter(), map.getZoom());
      } catch (e) {}
    });

    setTimeout(function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
    }, 1000);
  </script>
</body>
</html>`;
};
