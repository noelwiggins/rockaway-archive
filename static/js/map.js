(function () {
  const ROCKAWAY_CENTER = [40.5845, -73.8168];

  const map = L.map("map-canvas", { zoomControl: true }).setView(ROCKAWAY_CENTER, 14);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

  const clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 45,
    iconCreateFunction: function (cluster) {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div style="
          background: rgba(184,73,47,0.92);
          color: #FAF6EC;
          border: 2px solid #1C2B33;
          border-radius: 50%;
          width: 38px; height: 38px;
          display:flex; align-items:center; justify-content:center;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px; font-weight: 600;
        ">${count}</div>`,
        className: "",
        iconSize: [38, 38],
      });
    },
  });

  const pinIcon = L.divIcon({
    html: `<div style="
      width: 16px; height: 16px;
      background: #B8492F;
      border: 2px solid #FAF6EC;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 1px 3px rgba(0,0,0,0.5);
    "></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 16],
  });

  PHOTOS.forEach(function (photo) {
    if (photo.latitude == null || photo.longitude == null) return;

    const marker = L.marker([photo.latitude, photo.longitude], { icon: pinIcon });

    const img = photo.thumbnail_url || photo.image_url || "";
    const popupHtml = `
      <div class="popup-card">
        ${img ? `<img src="${img}" alt="${escapeHtml(photo.title)}" loading="lazy">` : ""}
        <div class="popup-body">
          <p class="popup-title">${escapeHtml(photo.title)}</p>
          <p class="popup-meta">${escapeHtml(photo.neighborhood || "")} &middot; ${escapeHtml(photo.display_date || "")}</p>
          <a class="popup-link" href="${PHOTO_DETAIL_BASE}${photo.id}">View details &rarr;</a>
        </div>
      </div>
    `;
    marker.bindPopup(popupHtml, { maxWidth: 260 });
    clusterGroup.addLayer(marker);
  });

  map.addLayer(clusterGroup);

  if (PHOTOS.length > 0) {
    try {
      const bounds = clusterGroup.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.15));
    } catch (e) { /* keep default center */ }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
})();
