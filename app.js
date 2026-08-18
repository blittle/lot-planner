(function () {
  const STORAGE_KEY = 'lotPlanner.placements.v1';
  const IMAGE_WIDTH_FT = LOT_DATA.imageWidthFt;
  const IMAGE_PX_WIDTH = LOT_DATA.imagePxWidth;
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
  let placements = loadPlacements(); // [{instanceId, plantId, xPct, yPct}]
  let selectedInstanceId = null;
  let filterText = '';

  function loadPlacements() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
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

  viewport.addEventListener('pointerdown', (e) => {
    // Let clicks/taps on the zoom controls behave normally — without this,
    // any tiny mouse movement during the click would let setPointerCapture()
    // below hijack the pointerup/click sequence away from the button.
    if (e.target.closest('.zoom-controls')) return;
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
    if (e.target.closest('.marker')) return;
    panning = true;
    panMoved = false;
    panStart = { x: e.clientX, y: e.clientY, panX, panY };
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add('panning');
  });

  viewport.addEventListener('pointermove', (e) => {
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
      <div class="plant-meta">${plant.category} · ${plant.width} wide · ${plant.color}</div>
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
        renderMarkers();
        renderPlacedList();
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
        renderMarkers();
        renderPlacedList();
      });

      markersEl.appendChild(marker);
    }
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

  // ---- Drop onto stage ----
  viewport.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  viewport.addEventListener('drop', (e) => {
    e.preventDefault();
    const plantId = parseInt(e.dataTransfer.getData('text/plain'), 10);
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
    if (selectedInstanceId) {
      selectedInstanceId = null;
      renderMarkers();
      renderPlacedList();
    }
  });

  // Keyboard delete for selected marker.
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedInstanceId) {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      removePlacement(selectedInstanceId);
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
    renderStats();
  }

  window.addEventListener('resize', renderMarkers);
  if (lotImage.complete) {
    renderAll();
  } else {
    lotImage.addEventListener('load', renderAll);
  }
})();
