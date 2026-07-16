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

  const aerialYears = [1996, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018];
  const aerialLayersByYear = {};
  aerialYears.forEach(function (year) {
    aerialLayersByYear[year] = L.tileLayer(
      "https://maps.nyc.gov/xyz/1.0.0/photo/" + year + "/{z}/{x}/{y}.png8",
      { attribution: "NYC DoITT — " + year + " aerial survey", maxZoom: 19, minZoom: 10 }
    );
  });

  darkLayer.addTo(map);

  const baseLayers = {
    "Dark": darkLayer,
    "Satellite (current)": satelliteLayer,
    "Aerial — 1924": aerial1924Layer,
    "Aerial — 1951": aerial1951Layer,
  };
  aerialYears.forEach(function (year) {
    baseLayers["Aerial — " + year] = aerialLayersByYear[year];
  });

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

  const sanborn1901LayerGroup = L.layerGroup();
  const SANBORN_1901_SHEETS = [
    { name: "Sanborn 1901 — Sheet 1", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0089/full/pct:25/0/default.jpg", bounds: [[40.594533, -73.745563], [40.597904, -73.742564]] },
    { name: "Sanborn 1901 — Sheet 2", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0090/full/pct:25/0/default.jpg", bounds: [[40.594533, -73.745563], [40.597904, -73.742564]] },
    { name: "Sanborn 1901 — Sheet 3", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0091/full/pct:25/0/default.jpg", bounds: [[40.594533, -73.745563], [40.597904, -73.742564]] },
    { name: "Sanborn 1901 — Sheet 4", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0092/full/pct:25/0/default.jpg", bounds: [[40.594533, -73.745563], [40.597904, -73.742564]] },
    { name: "Sanborn 1901 — Sheet 5", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0093/full/pct:25/0/default.jpg", bounds: [[40.596123, -73.74463], [40.59676, -73.744063]] },
    { name: "Sanborn 1901 — Sheet 6", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0094/full/pct:25/0/default.jpg", bounds: [[40.596424, -73.746057], [40.598027, -73.74463]] },
    { name: "Sanborn 1901 — Sheet 7", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0095/full/pct:25/0/default.jpg", bounds: [[40.597546, -73.747484], [40.599149, -73.746057]] },
    { name: "Sanborn 1901 — Sheet 8", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0096/full/pct:25/0/default.jpg", bounds: [[40.598668, -73.748911], [40.600271, -73.747484]] },
    { name: "Sanborn 1901 — Sheet 9", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0097/full/pct:25/0/default.jpg", bounds: [[40.59979, -73.750337], [40.601393, -73.748911]] },
    { name: "Sanborn 1901 — Sheet 10", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0098/full/pct:25/0/default.jpg", bounds: [[40.600912, -73.751764], [40.602515, -73.750337]] },
    { name: "Sanborn 1901 — Sheet 11", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0099/full/pct:25/0/default.jpg", bounds: [[40.601962, -73.753206], [40.603582, -73.751764]] },
    { name: "Sanborn 1901 — Sheet 12", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0100/full/pct:25/0/default.jpg", bounds: [[40.601964, -73.754861], [40.603823, -73.753206]] },
    { name: "Sanborn 1901 — Sheet 13", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0101/full/pct:25/0/default.jpg", bounds: [[40.601214, -73.756515], [40.603073, -73.754861]] },
    { name: "Sanborn 1901 — Sheet 14", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0102/full/pct:25/0/default.jpg", bounds: [[40.600464, -73.758169], [40.602323, -73.756515]] },
    { name: "Sanborn 1901 — Sheet 15", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0103/full/pct:25/0/default.jpg", bounds: [[40.599714, -73.759824], [40.601573, -73.758169]] },
    { name: "Sanborn 1901 — Sheet 16", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0104/full/pct:25/0/default.jpg", bounds: [[40.598964, -73.761478], [40.600823, -73.759824]] },
    { name: "Sanborn 1901 — Sheet 17", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0105/full/pct:25/0/default.jpg", bounds: [[40.598213, -73.763133], [40.600072, -73.761478]] },
    { name: "Sanborn 1901 — Sheet 18", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0106/full/pct:25/0/default.jpg", bounds: [[40.597463, -73.764787], [40.599322, -73.763133]] },
    { name: "Sanborn 1901 — Sheet 19", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0107/full/pct:25/0/default.jpg", bounds: [[40.596713, -73.766441], [40.598572, -73.764787]] },
    { name: "Sanborn 1901 — Sheet 20", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0108/full/pct:25/0/default.jpg", bounds: [[40.595963, -73.768096], [40.597822, -73.766441]] },
    { name: "Sanborn 1901 — Sheet 21", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0109/full/pct:25/0/default.jpg", bounds: [[40.595213, -73.76975], [40.597072, -73.768096]] },
    { name: "Sanborn 1901 — Sheet 22", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0110/full/pct:25/0/default.jpg", bounds: [[40.594462, -73.771404], [40.596321, -73.76975]] },
    { name: "Sanborn 1901 — Sheet 23", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0111/full/pct:25/0/default.jpg", bounds: [[40.593712, -73.773059], [40.595571, -73.771404]] },
    { name: "Sanborn 1901 — Sheet 24", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0112/full/pct:25/0/default.jpg", bounds: [[40.592962, -73.774713], [40.594821, -73.773059]] },
    { name: "Sanborn 1901 — Sheet 25", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0113/full/pct:25/0/default.jpg", bounds: [[40.592349, -73.776322], [40.594157, -73.774713]] },
    { name: "Sanborn 1901 — Sheet 26", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0114/full/pct:25/0/default.jpg", bounds: [[40.592211, -73.777801], [40.593873, -73.776322]] },
    { name: "Sanborn 1901 — Sheet 27", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0115/full/pct:25/0/default.jpg", bounds: [[40.592316, -73.779281], [40.593979, -73.777801]] },
    { name: "Sanborn 1901 — Sheet 28", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0116/full/pct:25/0/default.jpg", bounds: [[40.592422, -73.78076], [40.594084, -73.779281]] },
    { name: "Sanborn 1901 — Sheet 29", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0117/full/pct:25/0/default.jpg", bounds: [[40.592527, -73.782239], [40.59419, -73.78076]] },
    { name: "Sanborn 1901 — Sheet 30", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0118/full/pct:25/0/default.jpg", bounds: [[40.592633, -73.783719], [40.594295, -73.782239]] },
    { name: "Sanborn 1901 — Sheet 31", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0119/full/pct:25/0/default.jpg", bounds: [[40.592738, -73.785198], [40.594401, -73.783719]] },
    { name: "Sanborn 1901 — Sheet 32", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0120/full/pct:25/0/default.jpg", bounds: [[40.592795, -73.786551], [40.594315, -73.785198]] },
    { name: "Sanborn 1901 — Sheet 33", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0121/full/pct:25/0/default.jpg", bounds: [[40.59257, -73.787675], [40.593833, -73.786551]] },
    { name: "Sanborn 1901 — Sheet 34", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0122/full/pct:25/0/default.jpg", bounds: [[40.591982, -73.788842], [40.593292, -73.787675]] },
    { name: "Sanborn 1901 — Sheet 35", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0123/full/pct:25/0/default.jpg", bounds: [[40.591128, -73.790726], [40.593246, -73.788842]] },
    { name: "Sanborn 1901 — Sheet 36", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0124/full/pct:25/0/default.jpg", bounds: [[40.590787, -73.79261], [40.592905, -73.790726]] },
    { name: "Sanborn 1901 — Sheet 37", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0125/full/pct:25/0/default.jpg", bounds: [[40.590446, -73.794495], [40.592563, -73.79261]] },
    { name: "Sanborn 1901 — Sheet 38", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0126/full/pct:25/0/default.jpg", bounds: [[40.590117, -73.796369], [40.592223, -73.794495]] },
    { name: "Sanborn 1901 — Sheet 39", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0127/full/pct:25/0/default.jpg", bounds: [[40.590245, -73.797862], [40.591923, -73.796369]] },
    { name: "Sanborn 1901 — Sheet 40", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0128/full/pct:25/0/default.jpg", bounds: [[40.5904, -73.799356], [40.592079, -73.797862]] },
    { name: "Sanborn 1901 — Sheet 41", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0129/full/pct:25/0/default.jpg", bounds: [[40.590556, -73.80085], [40.592235, -73.799356]] },
    { name: "Sanborn 1901 — Sheet 42", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0130/full/pct:25/0/default.jpg", bounds: [[40.590712, -73.802343], [40.59239, -73.80085]] },
  ];
  SANBORN_1901_SHEETS.forEach(function (sheet) {
    const overlay = L.imageOverlay(sheet.url, sheet.bounds, { opacity: 0.75 });
    overlay.addTo(sanborn1901LayerGroup);
  });

  const usgs1954LayerGroup = L.layerGroup();
  const USGS_1954_FRAMES = [
    {
      name: "USGS 1954-01-08 — Frame 79 (Rockaway Beach/Hammels)",
      url: "/static/usgs_aerials/1954-01-08_frame79.webp",
      bounds: [[40.562238, -73.85612], [40.603694, -73.801746]],
    },
  ];
  USGS_1954_FRAMES.forEach(function (frame) {
    const overlay = L.imageOverlay(frame.url, frame.bounds, { opacity: 0.9 });
    overlay.addTo(usgs1954LayerGroup);
  });

  const overlayLayers = {
    "Sanborn maps — 1894": sanbornLayerGroup,
    "Sanborn maps — 1901 (Far Rockaway)": sanborn1901LayerGroup,
    "USGS aerial frames — 1954 (high-res)": usgs1954LayerGroup,
  };

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
