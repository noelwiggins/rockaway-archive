(function () {
  const ROCKAWAY_CENTER = [40.582, -73.815];

  const map = L.map("map-canvas", { zoomControl: true }).setView(ROCKAWAY_CENTER, 13);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map);

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
  }
  function closeSidebar() {
    sidebar.classList.add("collapsed");
    toggleTab.style.display = "block";
    currentGroup = null;
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
