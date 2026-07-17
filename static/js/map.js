(function () {
  const ROCKAWAY_CENTER = [40.582, -73.815];

  const map = L.map("map-canvas", { zoomControl: true }).setView(ROCKAWAY_CENTER, 13);

  const aqiClassFor = function (category) {
    return "aqi-" + category.toLowerCase().replace(/ for /g, "-").replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  };

  fetch("/api/conditions")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      const body = document.getElementById("conditions-body");
      if (!body) return;
      let html = "";

      if (data.weather) {
        html += '<div class="conditions-row"><span class="conditions-label">Weather</span>' +
          '<span class="conditions-value">' + data.weather.temperature + '&deg;' + data.weather.unit +
          ' — ' + data.weather.short_forecast + '</span></div>';
      }
      if (data.wave_height && data.wave_height.feet !== null) {
        html += '<div class="conditions-row"><span class="conditions-label">Wave height</span>' +
          '<span class="conditions-value">' + data.wave_height.feet + ' ft</span></div>';
      }
      if (data.air_quality && data.air_quality.length) {
        data.air_quality.forEach(function (aq) {
          html += '<div class="conditions-row"><span class="conditions-label">' + aq.parameter + ' AQI</span>' +
            '<span class="conditions-value ' + aqiClassFor(aq.category) + '">' + aq.aqi + ' — ' + aq.category + '</span></div>';
        });
      }
      if (!html) html = '<div class="conditions-row">Unavailable right now</div>';
      body.innerHTML = html;
    })
    .catch(function () {
      const body = document.getElementById("conditions-body");
      if (body) body.innerHTML = '<div class="conditions-row">Unavailable right now</div>';
    });

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
    { name: "Sanborn 1901 — Sheet 1", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0095/full/pct:25/0/default.jpg", bounds: [[40.590813, -73.738923], [40.592416, -73.737497]] },
    { name: "Sanborn 1901 — Sheet 2", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0096/full/pct:25/0/default.jpg", bounds: [[40.591935, -73.74035], [40.593538, -73.738923]] },
    { name: "Sanborn 1901 — Sheet 3", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0097/full/pct:25/0/default.jpg", bounds: [[40.593057, -73.741777], [40.59466, -73.74035]] },
    { name: "Sanborn 1901 — Sheet 4", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0098/full/pct:25/0/default.jpg", bounds: [[40.594179, -73.743204], [40.595783, -73.741777]] },
    { name: "Sanborn 1901 — Sheet 5", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0099/full/pct:25/0/default.jpg", bounds: [[40.595301, -73.74463], [40.596905, -73.743204]] },
    { name: "Sanborn 1901 — Sheet 6", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0100/full/pct:25/0/default.jpg", bounds: [[40.596424, -73.746057], [40.598027, -73.74463]] },
    { name: "Sanborn 1901 — Sheet 7", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0101/full/pct:25/0/default.jpg", bounds: [[40.597546, -73.747484], [40.599149, -73.746057]] },
    { name: "Sanborn 1901 — Sheet 8", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0102/full/pct:25/0/default.jpg", bounds: [[40.598668, -73.748911], [40.600271, -73.747484]] },
    { name: "Sanborn 1901 — Sheet 9", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0103/full/pct:25/0/default.jpg", bounds: [[40.59979, -73.750337], [40.601393, -73.748911]] },
    { name: "Sanborn 1901 — Sheet 10", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0104/full/pct:25/0/default.jpg", bounds: [[40.600912, -73.751764], [40.602515, -73.750337]] },
    { name: "Sanborn 1901 — Sheet 11", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0105/full/pct:25/0/default.jpg", bounds: [[40.601962, -73.753206], [40.603582, -73.751764]] },
    { name: "Sanborn 1901 — Sheet 12", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0106/full/pct:25/0/default.jpg", bounds: [[40.601964, -73.754861], [40.603823, -73.753206]] },
    { name: "Sanborn 1901 — Sheet 13", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0107/full/pct:25/0/default.jpg", bounds: [[40.601214, -73.756515], [40.603073, -73.754861]] },
    { name: "Sanborn 1901 — Sheet 14", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0108/full/pct:25/0/default.jpg", bounds: [[40.600464, -73.758169], [40.602323, -73.756515]] },
    { name: "Sanborn 1901 — Sheet 15", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0109/full/pct:25/0/default.jpg", bounds: [[40.599714, -73.759824], [40.601573, -73.758169]] },
    { name: "Sanborn 1901 — Sheet 16", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0110/full/pct:25/0/default.jpg", bounds: [[40.598964, -73.761478], [40.600823, -73.759824]] },
    { name: "Sanborn 1901 — Sheet 17", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0111/full/pct:25/0/default.jpg", bounds: [[40.598213, -73.763133], [40.600072, -73.761478]] },
    { name: "Sanborn 1901 — Sheet 18", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0112/full/pct:25/0/default.jpg", bounds: [[40.597463, -73.764787], [40.599322, -73.763133]] },
    { name: "Sanborn 1901 — Sheet 19", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0113/full/pct:25/0/default.jpg", bounds: [[40.596713, -73.766441], [40.598572, -73.764787]] },
    { name: "Sanborn 1901 — Sheet 20", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0114/full/pct:25/0/default.jpg", bounds: [[40.595963, -73.768096], [40.597822, -73.766441]] },
    { name: "Sanborn 1901 — Sheet 21", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0115/full/pct:25/0/default.jpg", bounds: [[40.595213, -73.76975], [40.597072, -73.768096]] },
    { name: "Sanborn 1901 — Sheet 22", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0116/full/pct:25/0/default.jpg", bounds: [[40.594462, -73.771404], [40.596321, -73.76975]] },
    { name: "Sanborn 1901 — Sheet 23", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0117/full/pct:25/0/default.jpg", bounds: [[40.593712, -73.773059], [40.595571, -73.771404]] },
    { name: "Sanborn 1901 — Sheet 24", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0118/full/pct:25/0/default.jpg", bounds: [[40.592962, -73.774713], [40.594821, -73.773059]] },
    { name: "Sanborn 1901 — Sheet 25", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0119/full/pct:25/0/default.jpg", bounds: [[40.592349, -73.776322], [40.594157, -73.774713]] },
    { name: "Sanborn 1901 — Sheet 26", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0120/full/pct:25/0/default.jpg", bounds: [[40.592211, -73.777801], [40.593873, -73.776322]] },
    { name: "Sanborn 1901 — Sheet 27", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0121/full/pct:25/0/default.jpg", bounds: [[40.592316, -73.779281], [40.593979, -73.777801]] },
    { name: "Sanborn 1901 — Sheet 28", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0122/full/pct:25/0/default.jpg", bounds: [[40.592422, -73.78076], [40.594084, -73.779281]] },
    { name: "Sanborn 1901 — Sheet 29", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0123/full/pct:25/0/default.jpg", bounds: [[40.592527, -73.782239], [40.59419, -73.78076]] },
    { name: "Sanborn 1901 — Sheet 30", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0124/full/pct:25/0/default.jpg", bounds: [[40.592633, -73.783719], [40.594295, -73.782239]] },
    { name: "Sanborn 1901 — Sheet 31", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0125/full/pct:25/0/default.jpg", bounds: [[40.592738, -73.785198], [40.594401, -73.783719]] },
    { name: "Sanborn 1901 — Sheet 32", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0126/full/pct:25/0/default.jpg", bounds: [[40.592795, -73.786551], [40.594315, -73.785198]] },
    { name: "Sanborn 1901 — Sheet 33", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0127/full/pct:25/0/default.jpg", bounds: [[40.59257, -73.787675], [40.593833, -73.786551]] },
    { name: "Sanborn 1901 — Sheet 34", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0128/full/pct:25/0/default.jpg", bounds: [[40.591982, -73.788842], [40.593292, -73.787675]] },
    { name: "Sanborn 1901 — Sheet 35", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0129/full/pct:25/0/default.jpg", bounds: [[40.591128, -73.790726], [40.593246, -73.788842]] },
    { name: "Sanborn 1901 — Sheet 36", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0130/full/pct:25/0/default.jpg", bounds: [[40.590787, -73.79261], [40.592905, -73.790726]] },
    { name: "Sanborn 1901 — Sheet 37", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0131/full/pct:25/0/default.jpg", bounds: [[40.590446, -73.794495], [40.592563, -73.79261]] },
    { name: "Sanborn 1901 — Sheet 38", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0132/full/pct:25/0/default.jpg", bounds: [[40.590117, -73.796369], [40.592223, -73.794495]] },
    { name: "Sanborn 1901 — Sheet 39", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0133/full/pct:25/0/default.jpg", bounds: [[40.590245, -73.797862], [40.591923, -73.796369]] },
    { name: "Sanborn 1901 — Sheet 40", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0134/full/pct:25/0/default.jpg", bounds: [[40.5904, -73.799356], [40.592079, -73.797862]] },
    { name: "Sanborn 1901 — Sheet 41", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0135/full/pct:25/0/default.jpg", bounds: [[40.590556, -73.80085], [40.592235, -73.799356]] },
    { name: "Sanborn 1901 — Sheet 42", url: "https://tile.loc.gov/image-services/iiif/service:gmd:gmd380m:g3804m:g3804qm:g3804qm_g06198190104:06198_04_1901-0136/full/pct:25/0/default.jpg", bounds: [[40.590712, -73.802343], [40.59239, -73.80085]] },
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
      // Real 3-corner placement (topLeft, topRight, bottomLeft), not an
      // axis-aligned box — the flight strip is rotated ~2° off true north,
      // so a simple rectangular bounds would distort and misplace it.
      // Rotated 90° left (counterclockwise) from the original NW/NE/SW
      // assignment per feedback that the frame appeared rotated wrong —
      // cycling: old topRight becomes new topLeft, old bottomRight (SE)
      // becomes new topRight, old topLeft becomes new bottomLeft.
      topLeft: [40.602229, -73.801746],
      topRight: [40.562238, -73.803682],
      bottomLeft: [40.603694, -73.854215],
    },
  ];
  USGS_1954_FRAMES.forEach(function (frame) {
    const overlay = L.imageOverlay.rotated(
      frame.url,
      L.latLng(frame.topLeft),
      L.latLng(frame.topRight),
      L.latLng(frame.bottomLeft),
      { opacity: 0.9 }
    );
    overlay.addTo(usgs1954LayerGroup);
  });
  baseLayers["Aerial — 1954 USGS (high-res)"] = usgs1954LayerGroup;

  const sanborn1912LayerGroup = L.layerGroup();
  const SANBORN_1912_SHEETS = [
    { name: "Sanborn 1912 — Plate 3", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%203%20%28Map%20bounded%20by%20Dunbar%2C%20Mott%20Ave.%2C%20Beach%2028th%20St.%20North%2C%20Bayswater%20St.%2C%20Norton%20Drive%29%20NYPL1956580.tiff?width=1200", bounds: [[40.598904, -73.761659], [40.600831, -73.759756]] },
    { name: "Sanborn 1912 — Plate 4", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%204%20%28Map%20bounded%20by%20Dunbar%2C%20Jamaica%20Bay%2C%20Beach%2028th%20St.%20North%2C%20Mott%20Ave.%29%20NYPL1956581.tiff?width=1200", bounds: [[40.599504, -73.761059], [40.601431, -73.759156]] },
    { name: "Sanborn 1912 — Plate 5", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%205%20%28Map%20bounded%20by%20Dickens%20St.%2C%20Beach%2024th%20St.%20North%2C%20Mott%20Ave.%2C%20Beach%2028th%20St.%20North%29%20NYPL1956582.tiff?width=1200", bounds: [[40.598803, -73.760708], [40.602658, -73.7569]] },
    { name: "Sanborn 1912 — Plate 6", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%206%20%28Map%20bounded%20by%20Jamaica%20Bay%2C%20Gipson%2C%20Mott%20Ave.%2C%20Beach%2024th%20St.%20North%29%20NYPL1956583.tiff?width=1200", bounds: [[40.60063, -73.757852], [40.602557, -73.755949]] },
    { name: "Sanborn 1912 — Plate 8", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%208%20%28Map%20bounded%20by%20Westbourne%20Ave.%2C%20Beach%2025th%20St.%2C%20Healy%20Ave.%2C%20Bay%20Park%20Pl.%29%20NYPL1956585.tiff?width=1200", bounds: [[40.600199, -73.758804], [40.602126, -73.7569]] },
    { name: "Sanborn 1912 — Plate 9", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%209%20%28Map%20bounded%20by%20Beach%2028th%20St.%20North%2C%20Mott%20Ave.%2C%20Dickens%20Ave.%2C%20Healy%20Ave.%2C%20Beach%2025th%20St.%29%20NYPL1956586.tiff?width=1200", bounds: [[40.599069, -73.760708], [40.60196, -73.757852]] },
    { name: "Sanborn 1912 — Plate 10", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2010%20%28Map%20bounded%20by%20Healy%20Ave.%2C%20Dickens%20Ave.%2C%20Gipson%20St.%2C%20Ocean%20Crest%20Blvd.%2C%20Dickens%20Ave.%2C%20Beach%2025th%20St.%29%20NYPL1956587.tiff?width=1200", bounds: [[40.600799, -73.758204], [40.602726, -73.7563]] },
    { name: "Sanborn 1912 — Plate 11", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2011%20%28Map%20bounded%20by%20Beach%2025th%20St.%2C%20Easthampton%20Pl.%2C%20Beach%2031st%20St.%20North%2C%20Healy%29%20NYPL1956588.tiff?width=1200", bounds: [[40.596977, -73.763563], [40.602758, -73.757852]] },
    { name: "Sanborn 1912 — Plate 12", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2012%20%28Map%20bounded%20by%20Beach%2025th%20St.%2C%20Far%20Rockaway%20Blvd.%2C%20Beach%2032nd%20St.%2C%20Easthampton%20Pl.%29%20NYPL1956589.tiff?width=1200", bounds: [[40.596279, -73.764515], [40.603024, -73.757852]] },
    { name: "Sanborn 1912 — Plate 16", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2016%20%28Map%20bounded%20by%20Mott%20Ave.%2C%20Beach%2022nd%20St.%20North%2C%20Cornaga%20Ave.%2C%20Mc.%20Bride%29%20NYPL1956593.tiff?width=1200", bounds: [[40.601494, -73.755949], [40.603421, -73.754045]] },
    { name: "Sanborn 1912 — Plate 18", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2018%20%28Map%20bounded%20by%20Far%20Rockaway%20Blvd.%2C%20Nameoke%20St.%2C%20Cornaga%20Ave.%2C%20Beach%2019th%20St.%20North%29%20NYPL1956595.tiff?width=1200", bounds: [[40.601844, -73.753093], [40.603506, -73.751451]] },
    { name: "Sanborn 1912 — Plate 19", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2019%20%28Map%20bounded%20by%20Beach%2012th%20St.%2C%20Nameoke%20Ave.%2C%20Hassock%20St.%2C%20Reginia%20Blvd.%29%20NYPL1956596.tiff?width=1200", bounds: [[40.597324, -73.747347], [40.598986, -73.745705]] },
    { name: "Sanborn 1912 — Plate 20", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2020%20%28Map%20bounded%20by%20Beach%2012th%20St.%2C%20Beach%209th%20St.%2C%20Neilson%20St.%2C%20Nameoke%20Ave.%29%20NYPL1956597.tiff?width=1200", bounds: [[40.59594, -73.746526], [40.598433, -73.744063]] },
    { name: "Sanborn 1912 — Plate 21", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2021%20%28Map%20bounded%20by%20Far%20Rockaway%20Blvd.%2C%20Beach%2012th%20St.%29%20NYPL1956598.tiff?width=1200", bounds: [[40.597924, -73.746747], [40.599586, -73.745105]] },
    { name: "Sanborn 1912 — Plate 22", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2022%20%28Map%20bounded%20by%20Far%20Rockaway%20Blvd.%2C%20Mc.%20Neil%20Blvd.%2C%20Empire%20Ave.%2C%20Beach%209th%20St.%29%20NYPL1956599.tiff?width=1200", bounds: [[40.595387, -73.744884], [40.597049, -73.743243]] },
    { name: "Sanborn 1912 — Plate 26", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2026%20%28Map%20bounded%20by%20Frisco%20Ave.%2C%20Atlantic%20Ocean%2C%20Beach%209th%20St.%29%20NYPL1956603.tiff?width=1200", bounds: [[40.595987, -73.744284], [40.597649, -73.742643]] },
    { name: "Sanborn 1912 — Plate 27", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2027%20%28Map%20bounded%20by%20Cornaga%20Ave.%2C%20Brookheaven%20Ave.%2C%20Beach%2019th%20St.%29%20NYPL1956604.tiff?width=1200", bounds: [[40.602444, -73.752493], [40.604106, -73.750851]] },
    { name: "Sanborn 1912 — Plate 28", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2028%20%28Map%20bounded%20by%20Cornaga%20Ave.%2C%20Beach%209th%20St.%29%20NYPL1956605.tiff?width=1200", bounds: [[40.596587, -73.743684], [40.598249, -73.742043]] },
    { name: "Sanborn 1912 — Plate 29", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2029%20%28Map%20bounded%20by%20Beach%209th%20St.%2C%20Heyson%20Rd.%2C%20Beach%2014th%20St.%2C%20Heyson%20Rd.%29%20NYPL1956606.tiff?width=1200", bounds: [[40.595755, -73.748168], [40.59991, -73.744063]] },
    { name: "Sanborn 1912 — Plate 30", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2030%20%28Map%20bounded%20by%20Cornaga%20Ave.%2C%20Reads%20Lane%2C%20Frisco%2C%20Hicksville%20Rd.%2C%20Beach%209th%20St.%29%20NYPL1956607.tiff?width=1200", bounds: [[40.597187, -73.743084], [40.598849, -73.741443]] },
    { name: "Sanborn 1912 — Plate 31", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2031%20%28Map%20bounded%20by%20New%20Haven%20Ave.%2C%20Beach%2017th%20St.%2C%20Beach%2020th%20St.%29%20NYPL1956608.tiff?width=1200", bounds: [[40.601105, -73.753093], [40.603598, -73.75063]] },
    { name: "Sanborn 1912 — Plate 32", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2032%20%28Map%20bounded%20by%20Caffrey%20Ave.%2C%20Beach%2014th%20St.%2C%20Heyson%20Rd.%2C%20Beach%2017th%20St.%29%20NYPL1956609.tiff?width=1200", bounds: [[40.599168, -73.75063], [40.601661, -73.748168]] },
    { name: "Sanborn 1912 — Plate 33", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2033%20%28Map%20bounded%20by%20Beach%2020th%20St.%2C%20Heyson%20Rd.%29%20NYPL1956610.tiff?width=1200", bounds: [[40.601884, -73.754045], [40.603679, -73.752272]] },
    { name: "Sanborn 1912 — Plate 35", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2035%20%28Map%20bounded%20by%20Gipson%2C%20Cornaga%20Ave.%2C%20Beach%2022nd%20St.%2C%20Brookhaven%20Ave.%29%20NYPL1956612.tiff?width=1200", bounds: [[40.602094, -73.755349], [40.604021, -73.753445]] },
    { name: "Sanborn 1912 — Plate 36", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2036%20%28Map%20bounded%20by%20Mott%20Ave.%2C%20Beach%2019th%20St.%20North%2C%20Beach%2019th%20St.%2C%20New%20Haven%20Ave.%2C%20Beach%2022nd%20St.%20North%29%20NYPL1956613.tiff?width=1200", bounds: [[40.601187, -73.754997], [40.603945, -73.752272]] },
    { name: "Sanborn 1912 — Plate 37", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2037%20%28Map%20bounded%20by%20Dickens%20Ave.%2C%20Beach%2022nd%20St.%20North%2C%20Beach%2025th%20St.%29%20NYPL1956614.tiff?width=1200", bounds: [[40.600364, -73.757852], [40.603255, -73.754997]] },
    { name: "Sanborn 1912 — Plate 38", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2038%20%28Map%20bounded%20by%20New%20Haven%20Ave.%2C%20Beach%2020th%20St.%2C%20Brookhaven%20Ave.%29%20NYPL1956615.tiff?width=1200", bounds: [[40.602484, -73.753445], [40.604279, -73.751672]] },
    { name: "Sanborn 1912 — Plate 39", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2039%20%28Map%20bounded%20by%20Beach%2025th%20St.%2C%20Edgemere%20Ave.%2C%20Beach%2032nd%20St.%2C%20Far%20Rockaway%20Blvd.%29%20NYPL1956616.tiff?width=1200", bounds: [[40.596879, -73.763915], [40.603624, -73.757252]] },
    { name: "Sanborn 1912 — Plate 40", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2040%20%28Map%20bounded%20by%20Beach%2026th%20St.%2C%20Sea%20Girt%20Ave.%2C%20Beach%2032nd%20St.%2C%20Deerfield%20Rd.%29%20NYPL1956617.tiff?width=1200", bounds: [[40.596545, -73.764515], [40.602327, -73.758804]] },
    { name: "Sanborn 1912 — Plate 41", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2041%20%28Map%20bounded%20by%20Sea%20Girt%20Ave.%2C%20Atlantic%20Ocean%2C%20Beach%2032nd%20St.%29%20NYPL1956618.tiff?width=1200", bounds: [[40.597177, -73.765467], [40.599105, -73.763563]] },
    { name: "Sanborn 1912 — Plate 42", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2042%20%28Map%20bounded%20by%20Deerfield%20Rd.%2C%20Beach%2020th%20St.%2C%20Atlantic%20Ocean%29%20NYPL1956619.tiff?width=1200", bounds: [[40.603084, -73.752845], [40.604879, -73.751072]] },
    { name: "Sanborn 1912 — Plate 43", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2043%20%28Map%20bounded%20by%20Nortons%20Creek%2C%20Beach%2035th%20St.%2C%20Rockawaybeach%20Blvd.%29%20NYPL1956620.tiff?width=1200", bounds: [[40.595882, -73.768322], [40.59781, -73.766419]] },
    { name: "Sanborn 1912 — Plate 44", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2044%20%28Map%20bounded%20by%20Beach%2032nd%20St.%2C%20Edgemere%20Ave.%2C%20Beach%2035th%20St.%29%20NYPL1956621.tiff?width=1200", bounds: [[40.596048, -73.76737], [40.598939, -73.764515]] },
    { name: "Sanborn 1912 — Plate 45", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2045%20%28Map%20bounded%20by%20Boulevard%2C%20Beach%2035th%20St.%2C%20Atlantic%20Ocean%2C%20Beach%2039th%20St.%29%20NYPL1956622.tiff?width=1200", bounds: [[40.594056, -73.771178], [40.59791, -73.76737]] },
    { name: "Sanborn 1912 — Plate 46", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2046%20%28Map%20bounded%20by%20Edgemere%20Ave.%2C%20Beach%2032nd%20St.%2C%20Atlantic%20Ocean%2C%20Beach%2035th%20St.%29%20NYPL1956623.tiff?width=1200", bounds: [[40.596648, -73.76677], [40.599539, -73.763915]] },
    { name: "Sanborn 1912 — Plate 47", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2047%20%28Map%20bounded%20by%20Far%20Rockaway%20Blvd.%2C%20Beach%2043rd%20St.%29%20NYPL1956624.tiff?width=1200", bounds: [[40.592429, -73.775937], [40.594357, -73.774033]] },
    { name: "Sanborn 1912 — Plate 48", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2048%20%28Map%20bounded%20by%20Far%20Rockaway%20Blvd.%2C%20Beach%2039th%20St.%2C%20Atlantic%20Ocean%2C%20Beach%2043rd%20St.%29%20NYPL1956625.tiff?width=1200", bounds: [[40.592329, -73.774985], [40.596184, -73.771178]] },
    { name: "Sanborn 1912 — Plate 49", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2049%20%28Map%20bounded%20by%20Rockaway%20Beach%20Blvd.%2C%20Beach%2055th%20St.%2C%20Atlantic%20Ocean%2C%20Beach%2058th%20St.%29%20NYPL1956626.tiff?width=1200", bounds: [[40.592246, -73.787444], [40.594417, -73.785299]] },
    { name: "Sanborn 1912 — Plate 50", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2050%20%28Map%20bounded%20by%20Far%20Rockaway%20Blvd.%2C%20Beach%2052nd%20St.%2C%20Beach%2051st%20St.%2C%20Atlantic%20Ocean%2C%20Beach%2055th%20St.%29%20NYPL1956627.tiff?width=1200", bounds: [[40.591785, -73.785299], [40.595232, -73.781895]] },
    { name: "Sanborn 1912 — Plate 51", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2051%20%28Map%20bounded%20by%20Far%20Rockaway%20Blvd.%2C%20Atlantic%20Ocean%2C%20Beach%2051st%20St.%29%20NYPL1956628.tiff?width=1200", bounds: [[40.592525, -73.782746], [40.594248, -73.781044]] },
    { name: "Sanborn 1912 — Plate 52", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2052%20%28Map%20bounded%20by%20Beach%2043rd%20St.%2C%20Atlantic%20Ocean%2C%20Far%20Rockaway%20Blvd.%29%20NYPL1956629.tiff?width=1200", bounds: [[40.593029, -73.775337], [40.594957, -73.773433]] },
    { name: "Sanborn 1912 — Plate 53", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2053%20%28Map%20bounded%20by%20Jamaica%20Bay%2C%20Rockaway%20Beach%20Blvd.%2C%20Beach%2063rd%20St.%29%20NYPL1956630.tiff?width=1200", bounds: [[40.59069, -73.793075], [40.592885, -73.790907]] },
    { name: "Sanborn 1912 — Plate 54", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2054%20%28Map%20bounded%20by%20Rockaway%20Beach%20Blvd.%2C%20Beach%2058th%20St.%2C%20Atlantic%20Ocean%2C%20Beach%2062nd%20St.%29%20NYPL1956631.tiff?width=1200", bounds: [[40.590756, -73.790907], [40.594261, -73.787444]] },
    { name: "Sanborn 1912 — Plate 55", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2055%20%28Map%20bounded%20by%20De%20Costa%20Pl.%2C%20Jamaica%20Bay%2C%20Thursby%2C%20Beach%2064th%20St.%20North%29%20NYPL1956632.tiff?width=1200", bounds: [[40.590493, -73.794159], [40.592689, -73.791991]] },
    { name: "Sanborn 1912 — Plate 56", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2056%20%28Map%20bounded%20by%20Beach%2063rd%20St.%20North%2C%20Amstel%20Blvd.%2C%20Beach%2068th%20St.%2C%20Thursby%29%20NYPL1956633.tiff?width=1200", bounds: [[40.588809, -73.797187], [40.59407, -73.791991]] },
    { name: "Sanborn 1912 — Plate 57", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2057%20%28Map%20bounded%20by%20Beach%2064th%20St.%20North%2C%20Almeda%20St.%2C%20Beach%2069th%20St.%2C%20Jamaica%20Bay%29%20NYPL1956634.tiff?width=1200", bounds: [[40.588869, -73.798046], [40.593903, -73.793075]] },
    { name: "Sanborn 1912 — Plate 58", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2058%20%28Map%20bounded%20by%20Beach%2064th%20St.%20North%2C%20Thursby%2C%20Beach%2069th%20St.%2C%20Almeda%29%20NYPL1956635.tiff?width=1200", bounds: [[40.589469, -73.797446], [40.594503, -73.792475]] },
    { name: "Sanborn 1912 — Plate 59", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2059%20%28Map%20bounded%20by%20Beach%2062nd%20St.%2C%20Larkin%2C%20Beach%2067th%20St.%2C%20Amstel%20Blvd.%29%20NYPL1956636.tiff?width=1200", bounds: [[40.588749, -73.796328], [40.594237, -73.790907]] },
    { name: "Sanborn 1912 — Plate 60", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2060%20%28Map%20bounded%20by%20Beach%2062nd%20St.%2C%20Atlantic%20Ocean%2C%20Beach%2067th%20St.%2C%20Larkin%29%20NYPL1956637.tiff?width=1200", bounds: [[40.589349, -73.795728], [40.594837, -73.790307]] },
    { name: "Sanborn 1912 — Plate 61", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2061%20%28Map%20bounded%20by%20Beach%2071st%20St.%2C%20Beach%2077th%20St.%2C%20Rockaway%20Beach%20Blvd.%29%20NYPL1956638.tiff?width=1200", bounds: [[40.588493, -73.804385], [40.59317, -73.799765]] },
    { name: "Sanborn 1912 — Plate 62", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2062%20%28Map%20bounded%20by%20Beach%2067th%20St.%2C%20Atlantic%20Ocean%2C%20Beach%2071st%20St.%29%20NYPL1956639.tiff?width=1200", bounds: [[40.589441, -73.799765], [40.592921, -73.796328]] },
    { name: "Sanborn 1912 — Plate 63", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2063%20%28Map%20bounded%20by%20Beach%2068th%20St.%2C%20Amstel%20Blvd.%2C%20Jamaica%20Bay%2C%20Elizabeth%20St.%29%20NYPL1956640.tiff?width=1200", bounds: [[40.590222, -73.798046], [40.591962, -73.796328]] },
    { name: "Sanborn 1912 — Plate 64", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2064%20%28Map%20bounded%20by%20Beach%2066th%20St.%2C%20Beach%2071st%20St.%2C%20Amstel%20Blvd.%29%20NYPL1956641.tiff?width=1200", bounds: [[40.58899, -73.799765], [40.593568, -73.795244]] },
    { name: "Sanborn 1912 — Plate 65", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2065%20%28Map%20bounded%20by%20Beach%2069th%20St.%2C%20De%20Costa%2C%20Barbadoes%20Drive%2C%20Jamaica%20Bay%29%20NYPL1956642.tiff?width=1200", bounds: [[40.590311, -73.798906], [40.592051, -73.797187]] },
    { name: "Sanborn 1912 — Plate 66", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2066%20%28Map%20bounded%20by%20Beach%2069th%20St.%2C%20Elizabeth%20St.%2C%20Barbadoes%20Drive%2C%20De%20Costa%29%20NYPL1956643.tiff?width=1200", bounds: [[40.590911, -73.798306], [40.592651, -73.796587]] },
    { name: "Sanborn 1912 — Plate 67", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2067%20%28Map%20bounded%20by%20Barbadoes%20Creek%2C%20Beach%2075th%20St.%2C%20Rockaway%20Beach%20Blvd.%2C%20Beach%2080th%20St.%29%20NYPL1956644.tiff?width=1200", bounds: [[40.58836, -73.806426], [40.591805, -73.803024]] },
    { name: "Sanborn 1912 — Plate 68", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2068%20%28Map%20bounded%20by%20Amstel%20Blvd.%2C%20Beach%2071st%20St.%2C%20Rockaway%20Beach%20Blvd.%2C%20Beach%2075th%20St.%29%20NYPL1956645.tiff?width=1200", bounds: [[40.589624, -73.803024], [40.592923, -73.799765]] },
    { name: "Sanborn 1912 — Plate 69", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2069%20%28Map%20bounded%20by%20Jamaica%20Bay%2C%20Beach%2084th%20St.%2C%20Rockaway%20Beach%20Blvd.%2C%20Beach%2088th%20St.%29%20NYPL1956646.tiff?width=1200", bounds: [[40.587435, -73.813509], [40.591021, -73.809967]] },
    { name: "Sanborn 1912 — Plate 70", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2070%20%28Map%20bounded%20by%20Beach%2084th%20St.%2C%20Beach%2080th%20St.%2C%20Rockaway%20Beach%20Blvd.%2C%20Beach%2084th%20St.%29%20NYPL1956647.tiff?width=1200", bounds: [[40.587269, -73.809967], [40.590854, -73.806426]] },
    { name: "Sanborn 1912 — Plate 71", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2071%20%28Map%20bounded%20by%20Rockaway%20Beach%20Blvd.%2C%20Beach%2083rd%20St.%2C%20Atlantic%20Ocean%2C%20Beach%2087th%20St.%29%20NYPL1956648.tiff?width=1200", bounds: [[40.587394, -73.812623], [40.590979, -73.809082]] },
    { name: "Sanborn 1912 — Plate 72", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2072%20%28Map%20bounded%20by%20Beach%2077th%20St.%2C%20Atlantic%20Ocean%2C%20Beach%2083rd%20St.%2C%20Rockaway%20Beach%20Blvd.%29%20NYPL1956649.tiff?width=1200", bounds: [[40.587325, -73.809082], [40.592081, -73.804385]] },
    { name: "Sanborn 1912 — Plate 73", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2073%20%28Map%20bounded%20by%20Beach%2088th%20St.%2C%20Jamaica%20Bay%29%20NYPL1956650.tiff?width=1200", bounds: [[40.58832, -73.814228], [40.589944, -73.812623]] },
    { name: "Sanborn 1912 — Plate 74", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2074%20%28Map%20bounded%20by%20Beach%20100th%20St.%2C%20Jamaica%20Bay%29%20NYPL1956651.tiff?width=1200", bounds: [[40.584596, -73.823114], [40.586313, -73.821418]] },
    { name: "Sanborn 1912 — Plate 75", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2075%20%28Map%20bounded%20by%20Beach%2092nd%20St.%2C%20Atlantic%20Ocean%2C%20Beach%2096th%20St.%29%20NYPL1956652.tiff?width=1200", bounds: [[40.585947, -73.819261], [40.588859, -73.816385]] },
    { name: "Sanborn 1912 — Plate 76", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2076%20%28Map%20bounded%20by%20Beach%2088th%20St.%20North%2C%20Atlantic%20Ocean%2C%20Beach%2092nd%20St.%29%20NYPL1956653.tiff?width=1200", bounds: [[40.587219, -73.816385], [40.590131, -73.813509]] },
    { name: "Sanborn 1912 — Plate 77", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2077%20%28Map%20bounded%20by%20Beach%20100th%20St.%2C%20Rockaway%20Beach%20Blvd.%2C%20Beach%20105th%20St.%2C%20Jamaica%20Bay%29%20NYPL1956654.tiff?width=1200", bounds: [[40.58203, -73.827021], [40.586975, -73.822137]] },
    { name: "Sanborn 1912 — Plate 78", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2078%20%28Map%20bounded%20by%20Beach%2096th%20St.%2C%20Atlantic%20Ocean%2C%20Beach%20100th%20St.%29%20NYPL1956655.tiff?width=1200", bounds: [[40.584674, -73.822137], [40.587586, -73.819261]] },
    { name: "Sanborn 1912 — Plate 79", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2079%20%28Map%20bounded%20by%20Jamaica%20Bay%2C%20Beach%20105th%20St.%2C%20Atlantic%20Ocean%2C%20Beach%20107th%20St.%29%20NYPL1956656.tiff?width=1200", bounds: [[40.582126, -73.828974], [40.584104, -73.827021]] },
    { name: "Sanborn 1912 — Plate 80", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2080%20%28Map%20bounded%20by%20Atlantic%20Ocean%2C%20Beach%20105th%20St.%2C%20Rockaway%20Beach%20Blvd.%29%20NYPL1956657.tiff?width=1200", bounds: [[40.582523, -73.827997], [40.584501, -73.826044]] },
    { name: "Sanborn 1912 — Plate 81", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2081%20%28Map%20bounded%20by%20Jamaica%20Bay%2C%20Beach%20110th%20St.%2C%20Ocean%20Parkway%2C%20Beach%20114th%20St.%29%20NYPL1956658.tiff?width=1200", bounds: [[40.579848, -73.836221], [40.584081, -73.832041]] },
    { name: "Sanborn 1912 — Plate 82", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2082%20%28Map%20bounded%20by%20Jamaica%20Bay%2C%20Beach%20107th%20St.%2C%20Atlantic%20Ocean%2C%20Beach%20110th%20St.%29%20NYPL1956659.tiff?width=1200", bounds: [[40.580878, -73.832041], [40.583984, -73.828974]] },
    { name: "Sanborn 1912 — Plate 83", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2083%20%28Map%20bounded%20by%20Rockaway%20Beach%20Blvd.%2C%20Beach%20119th%20St.%2C%20Jamaica%20Bay%29%20NYPL1956660.tiff?width=1200", bounds: [[40.580074, -73.84175], [40.581816, -73.840031]] },
    { name: "Sanborn 1912 — Plate 84", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2084%20%28Map%20bounded%20by%20Beach%20114th%20St.%2C%20Ocean%20Parkway%2C%20Beach%20119th%20St.%2C%20Rockaway%20Beach%20Blvd.%29%20NYPL1956661.tiff?width=1200", bounds: [[40.579001, -73.84089], [40.583729, -73.836221]] },
    { name: "Sanborn 1912 — Plate 85", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2085%20%28Map%20bounded%20by%20Jamaica%20Bay%2C%20Beach%20123rd%20St.%2C%20Newport%20Ave.%2C%20Beach%20127th%20St.%29%20NYPL1956662.tiff?width=1200", bounds: [[40.577822, -73.847632], [40.581166, -73.844329]] },
    { name: "Sanborn 1912 — Plate 86", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2086%20%28Map%20bounded%20by%20Jamaica%20Bay%2C%20Beach%20119th%20St.%2C%20Rockaway%20Beach%20Blvd.%2C%20Beach%20123rd%20St.%29%20NYPL1956663.tiff?width=1200", bounds: [[40.578763, -73.844329], [40.582246, -73.84089]] },
    { name: "Sanborn 1912 — Plate 87", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2087%20%28Map%20bounded%20by%20Beach%20125th%20St.%2C%20Atlantic%20Ocean%2C%20Beach%20130th%20St.%2C%20Rockaway%20Beach%20Blvd.%29%20NYPL1956664.tiff?width=1200", bounds: [[40.576657, -73.849801], [40.580457, -73.846049]] },
    { name: "Sanborn 1912 — Plate 88", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2088%20%28Map%20bounded%20by%20Beach%20119th%20St.%2C%20Ocean%20Parkway%2C%20Beach%20125th%20St.%2C%20Rockaway%20Beach%20Blvd.%29%20NYPL1956665.tiff?width=1200", bounds: [[40.577672, -73.846049], [40.582896, -73.84089]] },
    { name: "Sanborn 1912 — Plate 89", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2089%20%28Map%20bounded%20by%20Jamaica%20Bay%2C%20Beach%20131st%20St.%2C%20Newport%20Ave.%2C%20Beach%20135th%20St.%29%20NYPL1956666.tiff?width=1200", bounds: [[40.574592, -73.853417], [40.577521, -73.850524]] },
    { name: "Sanborn 1912 — Plate 90", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2090%20%28Map%20bounded%20by%20Jamaica%20Bay%2C%20Beach%20127th%20St.%2C%20Newport%20Ave.%2C%20Beach%20131st%20St.%29%20NYPL1956667.tiff?width=1200", bounds: [[40.576504, -73.850524], [40.579433, -73.847632]] },
    { name: "Sanborn 1912 — Plate 91", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2091%20%28Map%20bounded%20by%20Beach%20129th%20St.%2C%20Rockaway%20Beach%20Blvd.%2C%20Beach%20135th%20St.%2C%20Newport%20Ave.%29%20NYPL1956668.tiff?width=1200", bounds: [[40.574337, -73.853417], [40.578731, -73.849078]] },
    { name: "Sanborn 1912 — Plate 92", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2092%20%28Map%20bounded%20by%20Beach%20123rd%20St.%2C%20Rockaway%20Beach%20Blvd.%2C%20Beach%20129th%20St.%2C%20Newport%20Ave.%29%20NYPL1956669.tiff?width=1200", bounds: [[40.576612, -73.849078], [40.58142, -73.844329]] },
    { name: "Sanborn 1912 — Plate 93", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2093%20%28Map%20bounded%20by%20Beach%20135th%20St.%2C%20Newport%20Ave.%2C%20Beach%20141st%20St.%29%20NYPL1956670.tiff?width=1200", bounds: [[40.571469, -73.857756], [40.575863, -73.853417]] },
    { name: "Sanborn 1912 — Plate 94", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2094%20%28Map%20bounded%20by%20Beach%20135th%20St.%2C%20Rockaway%20Beach%20Blvd.%2C%20Beach%20141st%20St.%2C%20Newport%20Ave.%29%20NYPL1956671.tiff?width=1200", bounds: [[40.572069, -73.857156], [40.576463, -73.852817]] },
    { name: "Sanborn 1912 — Plate 95", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2095%20%28Map%20bounded%20by%20Beach%20136th%20St.%2C%20Atlantic%20Ocean%2C%20Adirondack%20Blvd.%2C%20Rockaway%20Beach%20Blvd.%29%20NYPL1956672.tiff?width=1200", bounds: [[40.57389, -73.854863], [40.575355, -73.853417]] },
    { name: "Sanborn 1912 — Plate 96", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2096%20%28Map%20bounded%20by%20Beach%20130th%20St.%2C%20Atlantic%20Ocean%2C%20Beach%20136th%20St.%2C%20Rockaway%20Beach%20Blvd.%29%20NYPL1956673.tiff?width=1200", bounds: [[40.573859, -73.85414], [40.578253, -73.849801]] },
    { name: "Sanborn 1912 — Plate 97", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2097%20%28Map%20bounded%20by%20Beach%20145th%20St.%2C%20Neponsit%20Ave.%2C%20Jamaica%20Bay%29%20NYPL1956674.tiff?width=1200", bounds: [[40.569588, -73.861371], [40.571052, -73.859925]] },
    { name: "Sanborn 1912 — Plate 98", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2098%20%28Map%20bounded%20by%20Jamaica%20Bay%2C%20Beach%20141st%20St.%2C%20Neponsit%20Ave.%2C%20Beach%20145th%20St.%29%20NYPL1956675.tiff?width=1200", bounds: [[40.569811, -73.860648], [40.572741, -73.857756]] },
    { name: "Sanborn 1912 — Plate 99", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%2099%20%28Map%20bounded%20by%20Neponsit%20Ave.%2C%20Beach%20146th%20St.%2C%20Atlantic%20Ocean%29%20NYPL1956676.tiff?width=1200", bounds: [[40.56911, -73.862094], [40.570574, -73.860648]] },
    { name: "Sanborn 1912 — Plate 100", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%20100%20%28Map%20bounded%20by%20Neponsit%20Ave.%2C%20Adirondack%20Blvd.%2C%20Ocean%20Parkway%2C%20Beach%20146th%20St.%29%20NYPL1956677.tiff?width=1200", bounds: [[40.56971, -73.861494], [40.571174, -73.860048]] },
    { name: "Sanborn 1912 — Plate 101", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%20101%20%28Map%20bounded%20by%20Beach%2043rd%20St.%2C%20Far%20Rockaway%20Blvd.%2C%20Beach%2047th%20St.%29%20NYPL1956678.tiff?width=1200", bounds: [[40.591494, -73.77849], [40.595043, -73.774985]] },
    { name: "Sanborn 1912 — Plate 105", url: "https://commons.wikimedia.org/wiki/Special:FilePath/Queens%20V.%208%2C%20Plate%20No.%20105%20%28Map%20bounded%20by%20Jamaica%20Bay%2C%20Beach%2042nd%20St.%2C%20Beach%2046th%20St.%29%20NYPL1956682.tiff?width=1200", bounds: [[40.591628, -73.777639], [40.595279, -73.774033]] },
  ];
  SANBORN_1912_SHEETS.forEach(function (sheet) {
    const overlay = L.imageOverlay(sheet.url, sheet.bounds, { opacity: 0.75 });
    overlay.addTo(sanborn1912LayerGroup);
  });

  const noiseLayerGroup = L.layerGroup();
  fetch("/api/noise")
    .then(function (r) { return r.json(); })
    .then(function (complaints) {
      complaints.forEach(function (c) {
        const marker = L.circleMarker([c.latitude, c.longitude], {
          radius: 4,
          color: "#c1440e",
          fillColor: "#e07a5f",
          fillOpacity: 0.6,
          weight: 1,
        });
        marker.bindPopup(
          "<strong>" + c.type + "</strong><br>" +
          new Date(c.date + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        );
        marker.addTo(noiseLayerGroup);
      });
    })
    .catch(function (err) { console.error("Failed to load noise data:", err); });

  const salesLayerGroup = L.layerGroup();
  fetch("/api/sales")
    .then(function (r) { return r.json(); })
    .then(function (sales) {
      sales.forEach(function (sale) {
        const marker = L.circleMarker([sale.latitude, sale.longitude], {
          radius: 6,
          color: "#2d6a4f",
          fillColor: "#52b788",
          fillOpacity: 0.85,
          weight: 1.5,
        });
        const priceFormatted = "$" + sale.sale_price.toLocaleString();
        const dateFormatted = new Date(sale.sale_date + "T00:00:00").toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric"
        });
        marker.bindPopup(
          "<strong>" + sale.address + "</strong><br>" +
          priceFormatted + " &mdash; sold " + dateFormatted + "<br>" +
          "<span style='color:#8a8070'>" + sale.neighborhood + "</span>"
        );
        marker.addTo(salesLayerGroup);
      });
    })
    .catch(function (err) { console.error("Failed to load sales data:", err); });

  const zoningLayer = L.esri.featureLayer({
    url: "https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nyzd/FeatureServer/0",
    style: function () {
      return { color: "#7b6fd1", weight: 1, fillOpacity: 0.12, opacity: 0.6 };
    },
    onEachFeature: function (feature, layer) {
      const zone = feature.properties && feature.properties.ZONEDIST;
      if (zone) {
        layer.bindPopup("<strong>Zoning district:</strong> " + zone);
      }
    },
  });

  const floodZoneLayer = L.esri.dynamicMapLayer({
    url: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer",
    layers: [28], // Flood Hazard Zones
    opacity: 0.5,
  });

  const photoLayerGroup = L.layerGroup();

  const streetLabelsLayer = L.layerGroup([
    L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, minZoom: 10, attribution: "Esri" }
    ),
    L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, minZoom: 10, attribution: "Esri" }
    ),
  ]);

  const overlayLayers = {
    "Street map (labels & roads)": streetLabelsLayer,
    "Historic photos": photoLayerGroup,
    "311 noise complaints": noiseLayerGroup,
    "NYC zoning districts": zoningLayer,
    "FEMA flood zones": floodZoneLayer,
    "Recent property sales": salesLayerGroup,
    "Sanborn maps — 1894": sanbornLayerGroup,
    "Sanborn maps — 1901 (Far Rockaway)": sanborn1901LayerGroup,
    "Sanborn maps — 1912 (full peninsula)": sanborn1912LayerGroup,
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
        marker.addTo(photoLayerGroup);
        bounds.push([group.lat, group.lng]);
      });
      photoLayerGroup.addTo(map);
      if (bounds.length > 0) {
        try { map.fitBounds(bounds, { padding: [40, 40] }); } catch (e) {}
      }
    })
    .catch(function (err) { console.error("Failed to load photo locations", err); });
})();
