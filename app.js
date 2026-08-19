(function () {
  // Plant ids used to be assigned by CSV row position (1, 2, 3, ...), which
  // shifted every time the CSV was re-sorted or edited. Ids are now derived
  // from each plant's category/genus/cultivar instead, which stays stable
  // across CSV edits. This maps the old row-position ids (as they existed
  // right before that switch) to the new stable ids, purely so placements
  // saved under the old scheme keep working after this one-time migration.
  const LEGACY_PLANT_ID_MIGRATION = {
    "1": "trees-serviceberry-standing-ovation",
    "2": "trees-serviceberry-rainbow-pillar",
    "3": "trees-serviceberry-autumn-brilliance",
    "4": "trees-eastern-redbud-appalachian-red",
    "5": "trees-eastern-redbud-black-pearl",
    "6": "trees-japanese-tree-lilac-ivory-silk",
    "9": "trees-red-maple-red-sunset",
    "10": "trees-red-maple-october-glory",
    "11": "trees-red-maple-redpointe",
    "12": "trees-tulip-tree-liriodendron-tulipifera",
    "13": "trees-river-birch-heritage",
    "14": "trees-eastern-white-pine-golden-candles",
    "15": "trees-eastern-white-pine-stowe-s-pillar",
    "16": "trees-eastern-white-pine-mini-twists",
    "18": "trees-spruce-serbian-spruce-nana",
    "19": "trees-mugo-pine-green-candle",
    "20": "trees-mugo-pine-blue-shag",
    "21": "trees-mugo-pine-jakobsen",
    "22": "trees-bosnian-pine-emerald-arrow",
    "23": "trees-juniper-gin-fizz",
    "24": "trees-juniper-wichita-blue",
    "25": "trees-juniper-torulosa",
    "26": "trees-juniper-mint-julep",
    "27": "trees-korean-fir-silberlocke",
    "28": "shrubs-ninebark-summer-wine",
    "29": "shrubs-ninebark-autumn-jubilee",
    "30": "shrubs-ninebark-little-devil",
    "31": "shrubs-diervilla-diervilla-lonicera-straight-species",
    "32": "shrubs-diervilla-kodiak-black",
    "33": "shrubs-chokeberry-brilliantissima",
    "34": "shrubs-chokeberry-autumn-magic",
    "35": "shrubs-chokeberry-low-scape-mound",
    "36": "shrubs-american-hazelnut-corylus-americana-straight-species",
    "37": "shrubs-virginia-sweetspire-henry-s-garnet",
    "38": "shrubs-virginia-sweetspire-scentlandia",
    "39": "shrubs-panicle-hydrangea-limelight",
    "40": "shrubs-panicle-hydrangea-torch",
    "41": "shrubs-panicle-hydrangea-quick-fire",
    "42": "shrubs-fothergilla-mount-airy",
    "43": "shrubs-fothergilla-legend-of-the-fall",
    "44": "shrubs-fothergilla-blue-shadow",
    "45": "perennials-daffodils-thalia",
    "46": "perennials-daffodils-white-lion",
    "47": "perennials-daffodils-poeticus-recurvus",
    "48": "perennials-daffodils-tahiti",
    "49": "perennials-alliums-jackpot",
    "50": "perennials-camassia-caerulea",
    "51": "perennials-leucojum-gravetye-giant",
    "52": "perennials-bearded-iris-repeat-the-blues",
    "53": "perennials-bearded-iris-rhizome-cowboy",
    "54": "perennials-bearded-iris-summer-olympics",
    "55": "perennials-bearded-iris-mother-earth",
    "57": "perennials-baptisia-american-goldfinch",
    "58": "perennials-baptisia-lemon-meringue",
    "59": "perennials-columbine-eastern-red-columbine",
    "60": "perennials-garden-phlox-jeana",
    "61": "perennials-garden-phlox-david",
    "62": "perennials-veronica-veronicastrum-virginicum",
    "63": "perennials-catmint-walker-s-low",
    "64": "perennials-penstemon-digitalis",
    "66": "perennials-monarda-jacob-cline",
    "67": "perennials-liatris-spicata",
    "68": "perennials-rudbeckia-herbstsonne",
    "69": "perennials-rudbeckia-goldsturm",
    "70": "perennials-heliopsis-sunstruck",
    "71": "perennials-asters-wood-s-light-blue",
    "72": "perennials-asters-purple-dome",
    "73": "perennials-asters-raydon-s-favorite",
    "74": "perennials-solidago-fireworks",
    "76": "perennials-japanese-anemone-honorine-jobert",
    "77": "perennials-japanese-anemone-wild-swan",
    "78": "perennials-hollyhocks-alcea-rugosa",
    "79": "perennials-joe-pye-weed-purpureum",
    "80": "perennials-joe-pye-weed-baby-joe",
    "81": "perennials-helianthus-flore-pleno",
    "82": "grasses-little-bluestem-the-blues",
    "85": "grasses-switchgrass-northwind",
    "86": "grasses-switchgrass-shenandoah",
    "87": "grasses-big-bluestem-blackhawks",
    "88": "low-filler-plants-creeping-phlox-emerald-blue",
    "89": "low-filler-plants-creeping-thyme-elfin",
    "90": "low-filler-plants-creeping-thyme-purple-carpet",
    "91": "low-filler-plants-hardy-geranium-rozanne",
    "92": "low-filler-plants-low-sedums-voodoo",
    "93": "low-filler-plants-low-sedums-angelina",
    "94": "low-filler-plants-low-sedums-blue-spruce",
    "95": "low-filler-plants-lamb-s-ear-silver-carpet",
    "96": "low-filler-plants-iberis-sempervirens-snowsation",
    "97": "vines-grapes-somerset-seedless",
    "98": "vines-grapes-candice",
    "99": "vines-clematis-virginiana"
  };

  const STORAGE_KEY = 'lotPlanner.placements.v1';
  const STORAGE_KEY_SHAPES = 'lotPlanner.shapes.v1';
  const IMAGE_WIDTH_FT = LOT_DATA.imageWidthFt;
  const IMAGE_PX_WIDTH = LOT_DATA.imagePxWidth;
  const IMAGE_HEIGHT_FT = IMAGE_WIDTH_FT * (LOT_DATA.imagePxHeight / LOT_DATA.imagePxWidth);
  const PLANTS = LOT_DATA.plants;
  const PLANTS_BY_ID = Object.fromEntries(PLANTS.map(p => [p.id, p]));

  const CATEGORY_ORDER = ['Trees', 'Shrubs', 'Perennials', 'Grasses', 'Low/filler plants', 'Vines'];
  const CATEGORY_FALLBACK_COLOR = {
    'Trees': '#4a7c3f',
    'Shrubs': '#6b8e3e',
    'Perennials': '#8a5fa8',
    'Grasses': '#c2a25c',
    'Low/filler plants': '#7fae7a',
    'Vines': '#7a4fa0',
  };

  // Ordered so more specific / less ambiguous terms are checked appropriately.
  const COLOR_KEYWORDS = [
    ['lavender-blue', '#8f8fd6'], ['lavender', '#c3a6e0'],
    ['violet-purple', '#7a4fa0'], ['violet-blue', '#6f6fc9'], ['violet', '#8a5fa8'],
    ['blue-purple', '#7070c0'], ['purple-magenta', '#a34fa0'], ['dark purple', '#4b2e57'],
    ['purple', '#7a4fa0'],
    ['magenta', '#c23f9b'],
    ['fuchsia', '#d0399e'],
    ['crimson', '#b3213f'], ['scarlet', '#c22a1f'], ['garnet', '#7c2331'],
    ['burgundy', '#5e2331'], ['maroon', '#5e2331'],
    ['deep rose', '#c14d72'], ['rose-pink', '#d9738f'], ['dusty pink', '#cf9aa8'], ['rosy-pink', '#d9738f'],
    ['pink-red', '#cc4b5c'], ['red-purple', '#8a3355'],
    ['pink', '#e08bb0'],
    ['coral', '#e8795a'],
    ['bright red', '#c22a1f'], ['deep red', '#8f1f1f'], ['red', '#c22a1f'],
    ['orange-red', '#d4552b'], ['copper', '#b06a3a'], ['rust', '#a3541f'],
    ['orange', '#dd8b2e'], ['apricot', '#e8a35c'],
    ['golden yellow', '#e0b020'], ['golden-orange', '#e0a020'], ['gold', '#dbb023'],
    ['lemon yellow', '#e6d94a'], ['bright yellow', '#e8d13a'], ['yellow', '#e0c93e'],
    ['creamy white', '#f5efd8'], ['cream', '#f5efd8'],
    ['silver', '#c7c9c4'],
    ['blue-green', '#5f9e8f'], ['powdery blue', '#a9c6d8'], ['sky-blue', '#6fb3e0'],
    ['bright blue', '#3f7fc9'], ['blue', '#4a7fc9'],
    ['charcoal', '#3c3c3c'], ['black', '#2b2b2b'],
    ['dark green', '#2f4f2f'], ['olive green', '#6b7a3a'], ['green', '#4a7c3f'],
    ['salmon', '#e08a72'],
    ['tan', '#c9a876'],
    ['white', '#f2f2ea'],
  ];

  function colorForPlant(plant) {
    const text = (plant.color || '').toLowerCase();
    for (const [kw, hex] of COLOR_KEYWORDS) {
      if (text.includes(kw)) return hex;
    }
    return CATEGORY_FALLBACK_COLOR[plant.category] || '#6b8e3e';
  }

  // ---- State ----
  // Set by loadPlacements() when saved placements reference plant ids that
  // no longer exist (e.g. the plant catalog CSV was edited/reordered since
  // they were saved) — surfaced to the user via a dismissible banner rather
  // than silently discarding their data.
  let droppedPlacementCount = 0;
  let placements = loadPlacements(); // [{instanceId, plantId, xPct, yPct}]
  let selectedInstanceId = null;
  let filterText = '';
  let seasonFilter = 'all';
  let heightMin = 0;
  let heightMax = Infinity;

  // [{shapeId, type: 'circle'|'rectangle', color, diameterFt, widthFt, heightFt, xPct, yPct}]
  let shapes = loadShapes();
  let selectedShapeId = null;

  function loadPlacements() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      let migrated = false;
      for (const p of parsed) {
        const legacyId = LEGACY_PLANT_ID_MIGRATION[p.plantId];
        if (legacyId) {
          p.plantId = legacyId;
          migrated = true;
        }
      }
      const kept = parsed.filter(p => PLANTS_BY_ID[p.plantId]);
      droppedPlacementCount = parsed.length - kept.length;
      if (migrated || droppedPlacementCount > 0) {
        // Persist right away so this migration/cleanup only has to run once.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
      }
      return kept;
    } catch (e) {
      console.warn('Failed to load placements', e);
      return [];
    }
  }

  function savePlacements() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
  }

  function nextInstanceId() {
    return 'inst-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
  }

  function loadShapes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SHAPES);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to load shapes', e);
      return [];
    }
  }

  function saveShapes() {
    localStorage.setItem(STORAGE_KEY_SHAPES, JSON.stringify(shapes));
  }

  function nextShapeId() {
    return 'shape-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
  }

  // ---- DOM refs ----
  const viewport = document.getElementById('viewport');
  const stage = document.getElementById('stage');
  const lotImage = document.getElementById('lotImage');
  const markersEl = document.getElementById('markers');
  const allListEl = document.getElementById('allList');
  const unplacedListEl = document.getElementById('unplacedList');
  const placedListEl = document.getElementById('placedList');
  const filterInput = document.getElementById('filterInput');
  const statsEl = document.getElementById('stats');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const rulerBtn = document.getElementById('rulerBtn');
  const rulerLayer = document.getElementById('rulerLayer');
  const rulerLine = document.getElementById('rulerLine');
  const rulerDotStart = document.getElementById('rulerDotStart');
  const rulerDotEnd = document.getElementById('rulerDotEnd');
  const rulerLabel = document.getElementById('rulerLabel');
  const shapesEl = document.getElementById('shapes');
  const shapeListEl = document.getElementById('shapeListEl');
  const shapeTypeInput = document.getElementById('shapeTypeInput');
  const shapeColorInput = document.getElementById('shapeColorInput');
  const shapeOpacityInput = document.getElementById('shapeOpacityInput');
  const shapeDiameterInput = document.getElementById('shapeDiameterInput');
  const shapeWidthInput = document.getElementById('shapeWidthInput');
  const shapeHeightInput = document.getElementById('shapeHeightInput');
  const circleFields = document.getElementById('circleFields');
  const rectFields = document.getElementById('rectFields');
  const addShapeBtn = document.getElementById('addShapeBtn');
  const seasonFilterEl = document.getElementById('seasonFilter');
  const heightMinInput = document.getElementById('heightMinInput');
  const heightMaxInput = document.getElementById('heightMaxInput');
  const heightSliderRange = document.getElementById('heightSliderRange');
  const heightRangeLabel = document.getElementById('heightRangeLabel');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFileInput = document.getElementById('importFileInput');

  // ---- Tabs ----
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  filterInput.addEventListener('input', () => {
    filterText = filterInput.value.trim().toLowerCase();
    renderAllList();
    renderUnplacedList();
    renderPlacedList();
  });

  let clearArmed = false;
  let clearArmTimer = null;
  clearAllBtn.addEventListener('click', () => {
    if (placements.length === 0) return;
    if (!clearArmed) {
      clearArmed = true;
      clearAllBtn.textContent = 'Click again to confirm';
      clearArmTimer = setTimeout(() => {
        clearArmed = false;
        clearAllBtn.textContent = 'Clear placed';
      }, 3000);
      return;
    }
    clearTimeout(clearArmTimer);
    clearArmed = false;
    clearAllBtn.textContent = 'Clear placed';
    placements = [];
    selectedInstanceId = null;
    savePlacements();
    renderAll();
  });

  // ---- Shape creation form ----
  shapeTypeInput.addEventListener('change', () => {
    const isCircle = shapeTypeInput.value === 'circle';
    circleFields.style.display = isCircle ? '' : 'none';
    rectFields.style.display = isCircle ? 'none' : '';
  });

  addShapeBtn.addEventListener('click', () => {
    const type = shapeTypeInput.value;
    const color = shapeColorInput.value;
    const opacity = clamp((parseFloat(shapeOpacityInput.value) || 0) / 100, 0, 1);
    let shape;
    if (type === 'circle') {
      const diameterFt = Math.max(0.5, parseFloat(shapeDiameterInput.value) || 0.5);
      shape = { shapeId: nextShapeId(), type, color, opacity, diameterFt, xPct: 0.5, yPct: 0.5 };
    } else {
      const widthFt = Math.max(0.5, parseFloat(shapeWidthInput.value) || 0.5);
      const heightFt = Math.max(0.5, parseFloat(shapeHeightInput.value) || 0.5);
      shape = { shapeId: nextShapeId(), type, color, opacity, widthFt, heightFt, xPct: 0.5, yPct: 0.5 };
    }
    shapes.push(shape);
    selectedShapeId = shape.shapeId;
    selectedInstanceId = null;
    saveShapes();
    renderAll();
  });

  // ---- Season / height filters ----
  // Bounds come from the actual plant data so the slider always spans the
  // full range regardless of what's in the CSV.
  const ALL_HEIGHTS = PLANTS.flatMap(p => [p.heightMinFt, p.heightMaxFt]).filter(v => v != null);
  const HEIGHT_BOUND_MIN = Math.floor(Math.min(...ALL_HEIGHTS));
  const HEIGHT_BOUND_MAX = Math.ceil(Math.max(...ALL_HEIGHTS));
  const HEIGHT_STEP = 0.5;

  heightMinInput.min = heightMaxInput.min = HEIGHT_BOUND_MIN;
  heightMinInput.max = heightMaxInput.max = HEIGHT_BOUND_MAX;
  heightMinInput.step = heightMaxInput.step = HEIGHT_STEP;
  heightMinInput.value = HEIGHT_BOUND_MIN;
  heightMaxInput.value = HEIGHT_BOUND_MAX;
  heightMin = HEIGHT_BOUND_MIN;
  heightMax = HEIGHT_BOUND_MAX;

  function formatHeightFt(ft) {
    return (Math.round(ft * 10) / 10) + ' ft';
  }

  function updateHeightSliderUI() {
    const lo = parseFloat(heightMinInput.value);
    const hi = parseFloat(heightMaxInput.value);
    const span = HEIGHT_BOUND_MAX - HEIGHT_BOUND_MIN || 1;
    const loPct = ((lo - HEIGHT_BOUND_MIN) / span) * 100;
    const hiPct = ((hi - HEIGHT_BOUND_MIN) / span) * 100;
    heightSliderRange.style.left = loPct + '%';
    heightSliderRange.style.right = (100 - hiPct) + '%';
    heightRangeLabel.textContent = `${formatHeightFt(lo)} – ${formatHeightFt(hi)}`;
  }

  function onHeightInputChange() {
    let lo = parseFloat(heightMinInput.value);
    let hi = parseFloat(heightMaxInput.value);
    if (lo > hi) {
      // Keep the two thumbs from crossing by clamping the one that just moved.
      if (document.activeElement === heightMinInput) { lo = hi; heightMinInput.value = lo; }
      else { hi = lo; heightMaxInput.value = hi; }
    }
    heightMin = lo;
    heightMax = hi;
    updateHeightSliderUI();
    applyMapFilters();
  }

  heightMinInput.addEventListener('input', onHeightInputChange);
  heightMaxInput.addEventListener('input', onHeightInputChange);
  updateHeightSliderUI();

  seasonFilterEl.addEventListener('change', () => {
    seasonFilter = seasonFilterEl.value;
    applyMapFilters();
  });

  resetFiltersBtn.addEventListener('click', () => {
    seasonFilter = 'all';
    seasonFilterEl.value = 'all';
    heightMin = HEIGHT_BOUND_MIN;
    heightMax = HEIGHT_BOUND_MAX;
    heightMinInput.value = HEIGHT_BOUND_MIN;
    heightMaxInput.value = HEIGHT_BOUND_MAX;
    updateHeightSliderUI();
    applyMapFilters();
  });

  function plantMatchesMapFilters(plant) {
    if (!plant) return true;
    if (seasonFilter !== 'all' && !plant.seasons.includes(seasonFilter)) return false;
    const plantMin = plant.heightMinFt != null ? plant.heightMinFt : plant.heightFt;
    const plantMax = plant.heightMaxFt != null ? plant.heightMaxFt : plant.heightFt;
    if (plantMin != null && plantMax != null && (plantMax < heightMin || plantMin > heightMax)) return false;
    return true;
  }

  // Fades placed markers on the map that don't match the current season/
  // height filters, without removing them from placements or the lists.
  function applyMapFilters() {
    for (const el of markersEl.children) {
      const inst = placements.find(p => p.instanceId === el.dataset.instanceId);
      const plant = inst ? PLANTS_BY_ID[inst.plantId] : null;
      el.classList.toggle('filtered-out', !plantMatchesMapFilters(plant));
    }
  }

  // ---- Scale ----
  // Uses the viewport's laid-out (untransformed) width so marker sizes stay
  // correct in feet; the zoom/pan CSS transform then scales markers visually
  // along with the map, since they live inside the transformed #stage.
  function getScalePxPerFt() {
    const renderedWidth = viewport.offsetWidth || IMAGE_PX_WIDTH;
    return renderedWidth / IMAGE_WIDTH_FT;
  }

  // ---- Zoom & pan ----
  const MIN_ZOOM = 0.15;
  const MAX_ZOOM = 6;
  // Plants can be placed outside the photographed lot (percentages are
  // relative to the image bounds, so -1 to 2 gives a full image-width of
  // extra room on every side to plan plantings beyond the property photo).
  const PLACEMENT_MIN = -1;
  const PLACEMENT_MAX = 2;
  let zoom = 1;
  let panX = 0;
  let panY = 0;

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function applyTransform() {
    stage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    zoomLevelEl.textContent = Math.round(zoom * 100) + '%';
  }

  function zoomAt(viewportX, viewportY, newZoom) {
    newZoom = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
    const stageX = (viewportX - panX) / zoom;
    const stageY = (viewportY - panY) / zoom;
    panX = viewportX - stageX * newZoom;
    panY = viewportY - stageY * newZoom;
    zoom = newZoom;
    applyTransform();
  }

  function zoomByFactor(factor) {
    const rect = viewport.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, zoom * factor);
  }

  function resetView() {
    zoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  const zoomLevelEl = document.getElementById('zoomLevel');
  document.getElementById('zoomInBtn').addEventListener('click', () => zoomByFactor(1.3));
  document.getElementById('zoomOutBtn').addEventListener('click', () => zoomByFactor(1 / 1.3));
  document.getElementById('zoomResetBtn').addEventListener('click', resetView);

  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const viewportX = e.clientX - rect.left;
    const viewportY = e.clientY - rect.top;
    // Normalize deltaY across input types: trackpads report pixel deltas
    // (deltaMode 0, often 1-100+ per event), while many physical mouse
    // wheels report "line" deltas (deltaMode 1, e.g. 3 per notch) that
    // would otherwise produce a barely-visible ~0.4% zoom change per click.
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 20;
    else if (e.deltaMode === 2) delta *= 400;
    delta = clamp(delta, -200, 200);
    const factor = Math.exp(-delta * 0.0035);
    zoomAt(viewportX, viewportY, zoom * factor);
  }, { passive: false });

  let panning = false;
  let panMoved = false;
  let panStart = { x: 0, y: 0, panX: 0, panY: 0 };

  // Touch pointers currently down on the viewport, keyed by pointerId — used
  // to detect a two-finger pinch (touch-action:none suppresses the browser's
  // own native pinch-zoom, so we implement it ourselves).
  const activeTouches = new Map();
  let pinchStartDist = null;
  let pinchStartZoom = 1;

  function touchMidpoint() {
    const pts = [...activeTouches.values()];
    return {
      x: (pts[0].x + pts[1].x) / 2,
      y: (pts[0].y + pts[1].y) / 2,
    };
  }
  function touchDistance() {
    const pts = [...activeTouches.values()];
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  // ---- Ruler ----
  let rulerMode = false;
  let rulerDragging = false;
  let rulerStart = null; // {xPct, yPct}, fraction of image bounds (0-1)

  function clearRuler() {
    rulerDragging = false;
    rulerStart = null;
    rulerLayer.style.display = 'none';
    rulerLabel.style.display = 'none';
    rulerDotStart.style.display = 'none';
    rulerDotEnd.style.display = 'none';
  }

  rulerBtn.addEventListener('click', () => {
    rulerMode = !rulerMode;
    rulerBtn.classList.toggle('active', rulerMode);
    viewport.classList.toggle('ruler-mode', rulerMode);
    clearRuler();
  });

  function stagePctFromEvent(e) {
    const rect = stage.getBoundingClientRect();
    return {
      xPct: clamp((e.clientX - rect.left) / rect.width, 0, 1),
      yPct: clamp((e.clientY - rect.top) / rect.height, 0, 1),
    };
  }

  function distanceFt(a, b) {
    const dxFt = (b.xPct - a.xPct) * IMAGE_WIDTH_FT;
    const dyFt = (b.yPct - a.yPct) * IMAGE_HEIGHT_FT;
    return Math.hypot(dxFt, dyFt);
  }

  function formatFt(ft) {
    const feet = Math.floor(ft);
    let inches = Math.round((ft - feet) * 12);
    let wholeFeet = feet;
    if (inches === 12) { inches = 0; wholeFeet += 1; }
    return `${wholeFeet}' ${inches}" (${ft.toFixed(1)} ft)`;
  }

  function updateRulerVisual(a, b) {
    rulerLayer.style.display = 'block';
    rulerLine.setAttribute('x1', a.xPct * 100);
    rulerLine.setAttribute('y1', a.yPct * 100);
    rulerLine.setAttribute('x2', b.xPct * 100);
    rulerLine.setAttribute('y2', b.yPct * 100);
    rulerDotStart.style.left = (a.xPct * 100) + '%';
    rulerDotStart.style.top = (a.yPct * 100) + '%';
    rulerDotStart.style.display = 'block';
    rulerDotEnd.style.left = (b.xPct * 100) + '%';
    rulerDotEnd.style.top = (b.yPct * 100) + '%';
    rulerDotEnd.style.display = 'block';
    rulerLabel.style.left = ((a.xPct + b.xPct) / 2 * 100) + '%';
    rulerLabel.style.top = ((a.yPct + b.yPct) / 2 * 100) + '%';
    rulerLabel.style.display = 'block';
    rulerLabel.textContent = formatFt(distanceFt(a, b));
  }

  viewport.addEventListener('pointerdown', (e) => {
    // Let clicks/taps on the zoom controls behave normally — without this,
    // any tiny mouse movement during the click would let setPointerCapture()
    // below hijack the pointerup/click sequence away from the button.
    if (e.target.closest('.zoom-controls')) return;
    if (rulerMode && e.pointerType !== 'touch' && e.button === 0) {
      rulerDragging = true;
      rulerStart = stagePctFromEvent(e);
      viewport.setPointerCapture(e.pointerId);
      updateRulerVisual(rulerStart, rulerStart);
      return;
    }
    if (e.pointerType === 'touch') {
      activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activeTouches.size === 2) {
        panning = false;
        pinchStartDist = touchDistance();
        pinchStartZoom = zoom;
      }
      return;
    }
    if (e.button !== 0) return;
    if (e.target.closest('.marker') || e.target.closest('.shape')) return;
    panning = true;
    panMoved = false;
    panStart = { x: e.clientX, y: e.clientY, panX, panY };
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add('panning');
  });

  viewport.addEventListener('pointermove', (e) => {
    if (rulerDragging) {
      updateRulerVisual(rulerStart, stagePctFromEvent(e));
      return;
    }
    if (e.pointerType === 'touch' && activeTouches.has(e.pointerId)) {
      activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activeTouches.size === 2 && pinchStartDist) {
        const rect = viewport.getBoundingClientRect();
        const mid = touchMidpoint();
        const newZoom = pinchStartZoom * (touchDistance() / pinchStartDist);
        zoomAt(mid.x - rect.left, mid.y - rect.top, newZoom);
      }
      return;
    }
    if (!panning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panMoved = true;
    panX = panStart.panX + dx;
    panY = panStart.panY + dy;
    applyTransform();
  });

  function endPan(e) {
    if (rulerDragging) {
      rulerDragging = false;
      return;
    }
    if (e && e.pointerType === 'touch') {
      activeTouches.delete(e.pointerId);
      if (activeTouches.size < 2) pinchStartDist = null;
      return;
    }
    panning = false;
    viewport.classList.remove('panning');
  }
  viewport.addEventListener('pointerup', endPan);
  viewport.addEventListener('pointercancel', endPan);

  // ---- Rendering: catalog / unplaced list ----
  function plantMatchesFilter(plant) {
    if (!filterText) return true;
    const hay = [plant.displayName, plant.category, plant.color, plant.genus, plant.cultivar]
      .join(' ').toLowerCase();
    return hay.includes(filterText);
  }

  function placedCountForPlant(plantId) {
    return placements.filter(p => p.plantId === plantId).length;
  }

  function renderCatalogList(container, plants, emptyMsg) {
    container.innerHTML = '';
    const byCategory = {};
    for (const plant of plants) {
      if (!plantMatchesFilter(plant)) continue;
      byCategory[plant.category] = byCategory[plant.category] || [];
      byCategory[plant.category].push(plant);
    }
    const categories = CATEGORY_ORDER.filter(c => byCategory[c]);
    if (categories.length === 0) {
      container.innerHTML = `<div class="empty-msg">${emptyMsg}</div>`;
      return;
    }
    for (const cat of categories) {
      const heading = document.createElement('div');
      heading.className = 'category-heading';
      heading.textContent = cat;
      container.appendChild(heading);
      for (const plant of byCategory[cat]) {
        container.appendChild(buildCatalogCard(plant));
      }
    }
  }

  function renderAllList() {
    renderCatalogList(allListEl, PLANTS, 'No plants match your filter.');
  }

  function renderUnplacedList() {
    const remaining = PLANTS.filter(p => placedCountForPlant(p.id) === 0);
    renderCatalogList(unplacedListEl, remaining, remaining.length === 0 ? 'Every plant has been placed at least once.' : 'No plants match your filter.');
  }

  function buildCatalogCard(plant) {
    const card = document.createElement('div');
    card.className = 'plant-card';
    card.draggable = true;
    card.dataset.plantId = plant.id;

    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.background = colorForPlant(plant);

    const info = document.createElement('div');
    info.className = 'plant-info';
    const count = placedCountForPlant(plant.id);
    info.innerHTML = `
      <div class="plant-name">${plant.displayName}${count > 0 ? `<span class="count-badge">×${count} placed</span>` : ''}</div>
      <div class="plant-meta">${plant.height} tall · ${plant.width} wide · ${plant.color}</div>
    `;

    card.appendChild(swatch);
    card.appendChild(info);

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', String(plant.id));
      e.dataTransfer.effectAllowed = 'copy';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));

    // Double-click also places it in the center, for non-drag-friendly devices.
    card.addEventListener('dblclick', () => {
      addPlacement(plant.id, 0.5, 0.5);
    });

    return card;
  }

  // ---- Rendering: placed list ----
  function renderPlacedList() {
    placedListEl.innerHTML = '';
    if (placements.length === 0) {
      placedListEl.innerHTML = '<div class="empty-msg">No plants placed yet. Drag from "Not Placed" onto the map.</div>';
      return;
    }
    const visible = placements.filter(p => plantMatchesFilter(PLANTS_BY_ID[p.plantId]));
    if (visible.length === 0) {
      placedListEl.innerHTML = '<div class="empty-msg">No placed plants match your filter.</div>';
      return;
    }
    const sorted = [...visible].sort((a, b) => {
      const pa = PLANTS_BY_ID[a.plantId], pb = PLANTS_BY_ID[b.plantId];
      return pa.displayName.localeCompare(pb.displayName);
    });
    for (const inst of sorted) {
      const plant = PLANTS_BY_ID[inst.plantId];
      const card = document.createElement('div');
      card.className = 'plant-card';
      card.dataset.instanceId = inst.instanceId;
      if (inst.instanceId === selectedInstanceId) card.style.background = 'var(--accent-light)';

      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.background = colorForPlant(plant);

      const info = document.createElement('div');
      info.className = 'plant-info';
      info.innerHTML = `
        <div class="plant-name">${plant.displayName}</div>
        <div class="plant-meta">${plant.category} · ${plant.width} wide</div>
      `;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'plant-remove';
      removeBtn.textContent = '✕';
      removeBtn.title = 'Remove from map';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removePlacement(inst.instanceId);
      });

      card.appendChild(swatch);
      card.appendChild(info);
      card.appendChild(removeBtn);

      card.addEventListener('click', () => {
        selectedInstanceId = inst.instanceId;
        selectedShapeId = null;
        renderMarkers();
        renderShapes();
        renderPlacedList();
        renderShapeList();
        const markerEl = markersEl.querySelector(`[data-instance-id="${inst.instanceId}"]`);
        if (markerEl) markerEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      });

      placedListEl.appendChild(card);
    }
  }

  // ---- Rendering: markers on map ----
  function renderMarkers() {
    markersEl.innerHTML = '';
    const scale = getScalePxPerFt();
    for (const inst of placements) {
      const plant = PLANTS_BY_ID[inst.plantId];
      const diameterFt = plant.widthFt || 2;
      const diameterPx = Math.max(6, diameterFt * scale);

      const marker = document.createElement('div');
      marker.className = 'marker' + (inst.instanceId === selectedInstanceId ? ' selected' : '');
      marker.dataset.instanceId = inst.instanceId;
      marker.style.width = diameterPx + 'px';
      marker.style.height = diameterPx + 'px';
      marker.style.left = (inst.xPct * 100) + '%';
      marker.style.top = (inst.yPct * 100) + '%';
      marker.style.background = colorForPlant(plant) + 'cc';

      const label = document.createElement('div');
      label.className = 'marker-label';
      label.textContent = plant.displayName;
      marker.appendChild(label);

      marker.addEventListener('pointerdown', onMarkerPointerDown);
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedInstanceId = inst.instanceId;
        selectedShapeId = null;
        renderMarkers();
        renderShapes();
        renderPlacedList();
        renderShapeList();
      });

      markersEl.appendChild(marker);
    }
    applyMapFilters();
  }

  function onMarkerPointerDown(e) {
    const marker = e.currentTarget;
    const instanceId = marker.dataset.instanceId;
    marker.setPointerCapture(e.pointerId);
    let dragging = false;

    function onMove(ev) {
      dragging = true;
      const rect = stage.getBoundingClientRect();
      let xPct = (ev.clientX - rect.left) / rect.width;
      let yPct = (ev.clientY - rect.top) / rect.height;
      xPct = clamp(xPct, PLACEMENT_MIN, PLACEMENT_MAX);
      yPct = clamp(yPct, PLACEMENT_MIN, PLACEMENT_MAX);
      marker.style.left = (xPct * 100) + '%';
      marker.style.top = (yPct * 100) + '%';
      marker.dataset.pendingX = xPct;
      marker.dataset.pendingY = yPct;
    }

    function onUp() {
      marker.removeEventListener('pointermove', onMove);
      marker.removeEventListener('pointerup', onUp);
      if (dragging) {
        const inst = placements.find(p => p.instanceId === instanceId);
        if (inst && marker.dataset.pendingX !== undefined) {
          inst.xPct = parseFloat(marker.dataset.pendingX);
          inst.yPct = parseFloat(marker.dataset.pendingY);
          savePlacements();
        }
      }
    }

    marker.addEventListener('pointermove', onMove);
    marker.addEventListener('pointerup', onUp);
  }

  // ---- Rendering: shapes on map ----
  function alphaHex(opacity) {
    return Math.round(clamp(opacity, 0, 1) * 255).toString(16).padStart(2, '0');
  }

  function formatShapeSize(shape) {
    if (shape.type === 'circle') return `${shape.diameterFt}' diameter`;
    return `${shape.widthFt}' × ${shape.heightFt}'`;
  }

  function renderShapes() {
    shapesEl.innerHTML = '';
    const scale = getScalePxPerFt();
    for (const shape of shapes) {
      const el = document.createElement('div');
      el.className = 'shape' + (shape.type === 'circle' ? ' shape-circle' : '') +
        (shape.shapeId === selectedShapeId ? ' selected' : '');
      el.dataset.shapeId = shape.shapeId;
      if (shape.type === 'circle') {
        const diameterPx = Math.max(6, shape.diameterFt * scale);
        el.style.width = diameterPx + 'px';
        el.style.height = diameterPx + 'px';
      } else {
        el.style.width = Math.max(6, shape.widthFt * scale) + 'px';
        el.style.height = Math.max(6, shape.heightFt * scale) + 'px';
      }
      el.style.left = (shape.xPct * 100) + '%';
      el.style.top = (shape.yPct * 100) + '%';
      const opacity = shape.opacity === undefined ? 1 : shape.opacity;
      el.style.background = shape.color + alphaHex(opacity);
      el.style.borderColor = shape.color;

      const label = document.createElement('div');
      label.className = 'shape-label';
      label.textContent = formatShapeSize(shape);
      el.appendChild(label);

      el.addEventListener('pointerdown', onShapePointerDown);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedShapeId = shape.shapeId;
        selectedInstanceId = null;
        renderMarkers();
        renderShapes();
        renderPlacedList();
        renderShapeList();
      });

      shapesEl.appendChild(el);
    }
  }

  function onShapePointerDown(e) {
    const el = e.currentTarget;
    const shapeId = el.dataset.shapeId;
    el.setPointerCapture(e.pointerId);
    let dragging = false;

    function onMove(ev) {
      dragging = true;
      const rect = stage.getBoundingClientRect();
      let xPct = (ev.clientX - rect.left) / rect.width;
      let yPct = (ev.clientY - rect.top) / rect.height;
      xPct = clamp(xPct, PLACEMENT_MIN, PLACEMENT_MAX);
      yPct = clamp(yPct, PLACEMENT_MIN, PLACEMENT_MAX);
      el.style.left = (xPct * 100) + '%';
      el.style.top = (yPct * 100) + '%';
      el.dataset.pendingX = xPct;
      el.dataset.pendingY = yPct;
    }

    function onUp() {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      if (dragging) {
        const shape = shapes.find(s => s.shapeId === shapeId);
        if (shape && el.dataset.pendingX !== undefined) {
          shape.xPct = parseFloat(el.dataset.pendingX);
          shape.yPct = parseFloat(el.dataset.pendingY);
          saveShapes();
        }
      }
    }

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  }

  // ---- Rendering: shape list ----
  function renderShapeList() {
    shapeListEl.innerHTML = '';
    if (shapes.length === 0) {
      shapeListEl.innerHTML = '<div class="empty-msg">No shapes placed yet. Configure one above and click "Add to map".</div>';
      return;
    }
    for (const shape of shapes) {
      const card = document.createElement('div');
      card.className = 'plant-card';
      card.dataset.shapeId = shape.shapeId;
      if (shape.shapeId === selectedShapeId) card.style.background = 'var(--accent-light)';

      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.background = shape.color;
      if (shape.type === 'rectangle') swatch.style.borderRadius = '3px';

      const info = document.createElement('div');
      info.className = 'plant-info';
      const typeName = shape.type === 'circle' ? 'Circle' : 'Rectangle';
      info.innerHTML = `
        <div class="plant-name">${typeName}</div>
        <div class="plant-meta">${formatShapeSize(shape)}</div>
      `;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'plant-remove';
      removeBtn.textContent = '✕';
      removeBtn.title = 'Remove from map';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeShape(shape.shapeId);
      });

      card.appendChild(swatch);
      card.appendChild(info);
      card.appendChild(removeBtn);

      card.addEventListener('click', () => {
        selectedShapeId = shape.shapeId;
        selectedInstanceId = null;
        renderMarkers();
        renderShapes();
        renderPlacedList();
        renderShapeList();
        const shapeEl = shapesEl.querySelector(`[data-shape-id="${shape.shapeId}"]`);
        if (shapeEl) shapeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      });

      shapeListEl.appendChild(card);
    }
  }

  function removeShape(shapeId) {
    shapes = shapes.filter(s => s.shapeId !== shapeId);
    if (selectedShapeId === shapeId) selectedShapeId = null;
    saveShapes();
    renderShapes();
    renderShapeList();
  }

  // ---- Drop onto stage ----
  viewport.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  viewport.addEventListener('drop', (e) => {
    e.preventDefault();
    const plantId = e.dataTransfer.getData('text/plain');
    if (!plantId || !PLANTS_BY_ID[plantId]) return;
    const rect = stage.getBoundingClientRect();
    let xPct = (e.clientX - rect.left) / rect.width;
    let yPct = (e.clientY - rect.top) / rect.height;
    xPct = clamp(xPct, PLACEMENT_MIN, PLACEMENT_MAX);
    yPct = clamp(yPct, PLACEMENT_MIN, PLACEMENT_MAX);
    addPlacement(plantId, xPct, yPct);
  });

  viewport.addEventListener('click', () => {
    if (panMoved) return;
    if (selectedInstanceId || selectedShapeId) {
      selectedInstanceId = null;
      selectedShapeId = null;
      renderMarkers();
      renderShapes();
      renderPlacedList();
      renderShapeList();
    }
  });

  // Keyboard delete for selected marker or shape.
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedInstanceId || selectedShapeId)) {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      if (selectedInstanceId) removePlacement(selectedInstanceId);
      else if (selectedShapeId) removeShape(selectedShapeId);
    }
  });

  // ---- Mutations ----
  function addPlacement(plantId, xPct, yPct) {
    const inst = { instanceId: nextInstanceId(), plantId, xPct, yPct };
    placements.push(inst);
    selectedInstanceId = inst.instanceId;
    savePlacements();
    renderAll();
  }

  function removePlacement(instanceId) {
    placements = placements.filter(p => p.instanceId !== instanceId);
    if (selectedInstanceId === instanceId) selectedInstanceId = null;
    savePlacements();
    renderAll();
  }

  // ---- Export / import ----
  exportBtn.addEventListener('click', () => {
    const payload = {
      type: 'lot-planner-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      placements,
      shapes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `lot-planner-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  let pendingImport = null;
  let importArmTimer = null;

  function resetImportBtn() {
    pendingImport = null;
    clearTimeout(importArmTimer);
    importBtn.textContent = 'Import';
    importBtn.classList.remove('btn-danger');
  }

  function applyImport(data) {
    placements = data.placements.filter(p => PLANTS_BY_ID[p.plantId]);
    shapes = data.shapes;
    selectedInstanceId = null;
    selectedShapeId = null;
    savePlacements();
    saveShapes();
    renderAll();
  }

  importBtn.addEventListener('click', () => {
    if (pendingImport) {
      const data = pendingImport;
      resetImportBtn();
      applyImport(data);
      return;
    }
    importFileInput.click();
  });

  importFileInput.addEventListener('change', () => {
    const file = importFileInput.files[0];
    importFileInput.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (e) {
        window.alert('That file is not valid JSON.');
        return;
      }
      if (!Array.isArray(data.placements) || !Array.isArray(data.shapes)) {
        window.alert('That file does not look like a Lot Planner export.');
        return;
      }
      if (placements.length === 0 && shapes.length === 0) {
        applyImport(data);
        return;
      }
      // Existing map data present — arm the button instead of using a
      // blocking native confirm() dialog.
      pendingImport = data;
      importBtn.textContent = 'Click to confirm (replaces map)';
      importBtn.classList.add('btn-danger');
      clearTimeout(importArmTimer);
      importArmTimer = setTimeout(resetImportBtn, 5000);
    };
    reader.readAsText(file);
  });

  // ---- Stats ----
  function renderStats() {
    const placedCount = placements.length;
    const uniquePlaced = new Set(placements.map(p => p.plantId)).size;
    statsEl.textContent = `${placedCount} plant${placedCount === 1 ? '' : 's'} placed (${uniquePlaced} of ${PLANTS.length} varieties)`;
  }

  // ---- Full render ----
  function renderAll() {
    renderAllList();
    renderUnplacedList();
    renderPlacedList();
    renderMarkers();
    renderShapes();
    renderShapeList();
    renderStats();
  }

  if (droppedPlacementCount > 0) {
    const banner = document.createElement('div');
    banner.className = 'notice-banner';
    banner.innerHTML = `<span>${droppedPlacementCount} previously placed plant${droppedPlacementCount === 1 ? '' : 's'} could not be matched to the current plant list (it may have been edited) and ${droppedPlacementCount === 1 ? 'was' : 'were'} not restored.</span>`;
    const dismiss = document.createElement('button');
    dismiss.className = 'notice-banner-dismiss';
    dismiss.textContent = '✕';
    dismiss.addEventListener('click', () => banner.remove());
    banner.appendChild(dismiss);
    document.querySelector('.app').insertBefore(banner, document.querySelector('.filterbar'));
  }

  window.addEventListener('resize', () => {
    renderMarkers();
    renderShapes();
  });
  if (lotImage.complete) {
    renderAll();
  } else {
    lotImage.addEventListener('load', renderAll);
  }
})();
