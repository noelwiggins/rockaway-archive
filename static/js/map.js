(function () {
  const ROCKAWAY_CENTER = [40.582, -73.815];

  const map = L.map("map-canvas", { zoomControl: true }).setView(ROCKAWAY_CENTER, 13);

  const darkLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: "abcd",
    maxZoom: 19,
  });

  const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "Esri, Maxar, Earthstar Geographics", maxZoom: 19 }
  );

  const aerial1924Layer = L.tileLayer(
    "https://maps.nyc.gov/xyz/1.0.0/photo/1924/{z}/{x}/{y}.png8",
    { attribution: "NYC DoITT — 1924 aerial survey", maxZoom: 19, minZoom: 10 }
  );

  const aerial1951Layer = L.tileLayer(
    "https://maps.nyc.gov/xyz/1.0.0/photo/1951/{z}/{x}/{y}.png8",
    { attribution: "NYC DoITT — 1951 aerial survey", maxZoom: 19, minZoom: 10 }
  );

  darkLayer.addTo(map);

  const baseLayers = {
    "Dark": darkLayer,
    "Satellite (current)": satelliteLayer,
    "Aerial — 1924": aerial1924Layer,
    "Aerial — 1951": aerial1951Layer,
  };

  // Sanborn Fire Insurance Map overlays — raw public-domain sheet scans from the
  // Library of Congress, placed at their approximate historical extent. These
  // are hand-positioned estimates (LOC doesn't provide pre-georeferenced tiles
  // for these sheets), so treat alignment as approximate, not survey-accurate.
  const sanbornOverlays = {};
  const sanbornLayerGroup = L.layerGroup();

  const SANBORN_SHEETS = [
{ name: "Sanborn 1894 — Sheet 2", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0002/full/pct:25/0/default.jpg", bounds: [[40.580875, -73.83288], [40.583515, -73.82995]] },
    { name: "Sanborn 1894 — Sheet 3", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0003/full/pct:25/0/default.jpg", bounds: [[40.58063, -73.8358], [40.58326, -73.83288]] },
    { name: "Sanborn 1894 — Sheet 4", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0004/full/pct:25/0/default.jpg", bounds: [[40.580382, -73.83866], [40.582958, -73.8358]] },
    { name: "Sanborn 1894 — Sheet 5", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0005/full/pct:25/0/default.jpg", bounds: [[40.580129, -73.84106], [40.582291, -73.83866]] },
    { name: "Sanborn 1894 — Sheet 6", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0006/full/pct:25/0/default.jpg", bounds: [[40.579505, -73.84347], [40.581675, -73.84106]] },
    { name: "Sanborn 1894 — Sheet 7", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0007/full/pct:25/0/default.jpg", bounds: [[40.588646, -73.80681], [40.590214, -73.80507]] },
    { name: "Sanborn 1894 — Sheet 8", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0008/full/pct:25/0/default.jpg", bounds: [[40.588082, -73.80896], [40.590018, -73.80681]] },
    { name: "Sanborn 1894 — Sheet 9", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0009/full/pct:25/0/default.jpg", bounds: [[40.588182, -73.81111], [40.590118, -73.80896]] },
    { name: "Sanborn 1894 — Sheet 10", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0010/full/pct:25/0/default.jpg", bounds: [[40.588282, -73.81326], [40.590218, -73.81111]] },
    { name: "Sanborn 1894 — Sheet 11", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0011/full/pct:25/0/default.jpg", bounds: [[40.588159, -73.81505], [40.589771, -73.81326]] },
    { name: "Sanborn 1894 — Sheet 12", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0012/full/pct:25/0/default.jpg", bounds: [[40.587457, -73.8168], [40.589033, -73.81505]] },
    { name: "Sanborn 1894 — Sheet 13", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0013/full/pct:25/0/default.jpg", bounds: [[40.586686, -73.81854], [40.588254, -73.8168]] },
    { name: "Sanborn 1894 — Sheet 14", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0014/full/pct:25/0/default.jpg", bounds: [[40.58793, -73.79719], [40.59554, -73.78874]] },
    { name: "Sanborn 1894 — Sheet 15", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804rm:g3804rm_g062181894:06218_1894-0015/full/pct:25/0/default.jpg", bounds: [[40.587989, -73.8037], [40.593851, -73.79719]] },
  ];

  SANBORN_SHEETS.forEach(function (sheet) {
    const overlay = L.imageOverlay(sheet.url, sheet.bounds, { opacity: 0.75 });
    sanbornOverlays[sheet.name] = overlay;
    overlay.addTo(sanbornLayerGroup);
  });

  const overlayLayers = { "Sanborn maps (1894)": sanbornLayerGroup };

  L.control.layers(baseLayers, overlayLayers, { collapsed: true, position: "topright" }).addTo(map);

  const sidebar = document.getElementById("photo-sidebar");
  const toggleTab = document.getElementById("sidebar-toggle");
  let currentGroup = null;

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function openSidebar() {
    sidebar.classList.remove("collapsed");
    toggleTab.style.display = "none";
    setTimeout(function () { map.invalidateSize(); }, 220);
  }
  function closeSidebar() {
    sidebar.classList.add("collapsed");
    toggleTab.style.display = "block";
    currentGroup = null;
    setTimeout(function () { map.invalidateSize(); }, 220);
  }
  toggleTab.addEventListener("click", openSidebar);

  function renderThumbList(group) {
    currentGroup = group;
    const items = group.photos.map(function (p, i) {
      const img = p.thumbnail_url || p.image_url || "";
      return (
        '<div class="sidebar-thumb" data-index="' + i + '">' +
        (img ? '<img src="' + img + '" alt="' + escapeHtml(p.title) + '" loading="lazy">' : "") +
        '<div class="thumb-cap">' + escapeHtml(p.title) + "</div>" +
        "</div>"
      );
    }).join("");

    sidebar.innerHTML =
      '<div class="sidebar-header">' +
        '<div class="sidebar-header-text">' +
          "<h3>" + escapeHtml(group.neighborhood || "This location") + "</h3>" +
          '<div class="count">' + group.photos.length + (group.photos.length === 1 ? " photo here" : " photos here") + "</div>" +
        "</div>" +
        '<button class="sidebar-close" id="sidebar-close" aria-label="Close">&times;</button>' +
      "</div>" +
      '<div class="sidebar-thumb-list">' + items + "</div>";

    document.getElementById("sidebar-close").addEventListener("click", closeSidebar);
    sidebar.querySelectorAll(".sidebar-thumb").forEach(function (el) {
      el.addEventListener("click", function () {
        renderViewer(group, parseInt(el.getAttribute("data-index"), 10));
      });
    });
    openSidebar();
  }

  function renderViewer(group, index) {
    const p = group.photos[index];
    const img = p.image_url || p.thumbnail_url || "";
    const hasPrev = index > 0;
    const hasNext = index < group.photos.length - 1;

    sidebar.innerHTML =
      '<div class="sidebar-viewer">' +
        '<div class="sidebar-header">' +
          '<div class="sidebar-header-text"><span class="viewer-back" id="viewer-back">&larr; All photos here</span></div>' +
          '<button class="sidebar-close" id="sidebar-close" aria-label="Close">&times;</button>' +
        "</div>" +
        (img ? '<img class="viewer-img" src="' + img + '" alt="' + escapeHtml(p.title) + '">' : "") +
        '<div class="viewer-nav">' +
          '<button id="viewer-prev" ' + (hasPrev ? "" : "disabled") + '>&larr; Prev</button>' +
          '<span>' + (index + 1) + " of " + group.photos.length + "</span>" +
          '<button id="viewer-next" ' + (hasNext ? "" : "disabled") + '>Next &rarr;</button>' +
        "</div>" +
        '<div class="viewer-body">' +
          "<h3>" + escapeHtml(p.title) + "</h3>" +
          '<div class="viewer-meta">' + escapeHtml(p.neighborhood || "") + " &middot; " + escapeHtml(p.display_date || "") + "</div>" +
          (p.description ? '<div class="viewer-desc">' + escapeHtml(p.description) + "</div>" : "") +
          '<a class="viewer-link" href="' + PHOTO_DETAIL_BASE + p.id + '">Full details &rarr;</a>' +
        "</div>" +
      "</div>";

    document.getElementById("sidebar-close").addEventListener("click", closeSidebar);
    document.getElementById("viewer-back").addEventListener("click", function () { renderThumbList(group); });
    if (hasPrev) document.getElementById("viewer-prev").addEventListener("click", function () { renderViewer(group, index - 1); });
    if (hasNext) document.getElementById("viewer-next").addEventListener("click", function () { renderViewer(group, index + 1); });
  }

  function makeDotIcon(count) {
    const size = count > 20 ? 34 : count > 5 ? 26 : count > 1 ? 20 : 14;
    const html = count > 1
      ? '<div class="location-dot multi" style="width:' + size + 'px;height:' + size + 'px;font-size:' + (size > 24 ? 12 : 10) + 'px;">' + count + '</div>'
      : '<div class="location-dot" style="width:' + size + 'px;height:' + size + 'px;"></div>';
    return L.divIcon({ html: html, className: "", iconSize: [size, size] });
  }

  fetch(GROUPED_PHOTOS_URL)
    .then(function (r) { return r.json(); })
    .then(function (groups) {
      const bounds = [];
      groups.forEach(function (group) {
        const marker = L.marker([group.lat, group.lng], { icon: makeDotIcon(group.count) });
        marker.on("click", function () { renderThumbList(group); });
        marker.addTo(map);
        bounds.push([group.lat, group.lng]);
      });
      if (bounds.length > 0) {
        try { map.fitBounds(bounds, { padding: [40, 40] }); } catch (e) {}
      }
    })
    .catch(function (err) { console.error("Failed to load photo locations", err); });
})();
