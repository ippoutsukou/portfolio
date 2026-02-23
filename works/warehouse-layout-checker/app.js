﻿﻿(function(){
// Guard: wait for DOM in case script is moved
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

function start(){
// =========================
// State & Utilities
// =========================
const svg = document.getElementById('svg');
const toastEl = document.getElementById('toast');

let state = {
  wh: { w: 40, h: 30 },        // meters
  grid: { step: 1, snap: true },
  pxPerM: 20,                  // computed
  objects: [],                 // {id,type,x,y,w,h,el}
  selectedId: null,
  drag: null                   // {id, startX, startY, ox, oy}
};

const COLORS = {
  aisle: { cls: 'aisle' },
  obstacle: { cls: 'obstacle' },
  cargo: { cls: 'cargo' },
};

const $ = (id) => document.getElementById(id);
const fmt = (n) => (Math.round(n * 1000) / 1000).toString();

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1600);
}

function metersToPx(v) { return v * state.pxPerM; }
function pxToMeters(v) { return v / state.pxPerM; }

// =========================
// SVG Setup & Grid
// =========================
function computeScale() {
  const wrap = svg.parentElement;
  const pad = 40; // px margin inside
  const maxW = wrap.clientWidth - pad;
  const maxH = wrap.clientHeight - pad;
  const sx = maxW / state.wh.w;
  const sy = maxH / state.wh.h;
  state.pxPerM = Math.max(4, Math.floor(Math.min(sx, sy)));
  $('scaleInfo').textContent = `邵ｮ蟆ｺ: 1m = ${state.pxPerM}px`;
}

function clearSVG() { while (svg.firstChild) svg.removeChild(svg.firstChild); }

// =========================
// Warehouse Size Apply Helpers
// =========================
function clampObjectsIntoWarehouse() {
  for (const o of state.objects) {
    if (o.x + o.w > state.wh.w) o.x = Math.max(0, state.wh.w - o.w);
    if (o.y + o.h > state.wh.h) o.y = Math.max(0, state.wh.h - o.h);
    if (o.x < 0) o.x = 0;
    if (o.y < 0) o.y = 0;
    updateElementRect(o);
  }
}

function applyWarehouseSize(newW, newH) {
  state.wh.w = Math.max(1, newW);
  state.wh.h = Math.max(1, newH);
  computeScale();
  clearSVG();
  drawGridAndFrame();
  clampObjectsIntoWarehouse();
  redrawObjects();
  showToast(`倉庫サイズを更新: ${state.wh.w}m × ${state.wh.h}m`);
}

function drawGridAndFrame() {
  const W = metersToPx(state.wh.w);
  const H = metersToPx(state.wh.h);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'grid');
  for (let x = 0; x <= state.wh.w; x += state.grid.step) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', metersToPx(x));
    line.setAttribute('y1', 0);
    line.setAttribute('x2', metersToPx(x));
    line.setAttribute('y2', H);
    if (x % 5 === 0) line.setAttribute('class', 'major');
    g.appendChild(line);
  }
  for (let y = 0; y <= state.wh.h; y += state.grid.step) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', metersToPx(y));
    line.setAttribute('x2', W);
    line.setAttribute('y2', metersToPx(y));
    if (y % 5 === 0) line.setAttribute('class', 'major');
    g.appendChild(line);
  }
  svg.appendChild(g);

  const frame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  frame.setAttribute('x', 0);
  frame.setAttribute('y', 0);
  frame.setAttribute('width', W);
  frame.setAttribute('height', H);
  frame.setAttribute('fill', 'none');
  frame.setAttribute('stroke', '#3a4258');
  frame.setAttribute('stroke-width', 2);
  svg.appendChild(frame);
}

function redrawObjects() {
  while (svg.childNodes.length > 2) svg.removeChild(svg.lastChild);
  for (const o of state.objects) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    el.setAttribute('class', `obj ${COLORS[o.type].cls}`);
    el.dataset.id = o.id;
    el.setAttribute('x', metersToPx(o.x));
    el.setAttribute('y', metersToPx(o.y));
    el.setAttribute('width', metersToPx(o.w));
    el.setAttribute('height', metersToPx(o.h));
    svg.appendChild(el);
    o.el = el;
    attachDragHandlers(el);
  }
  refreshSelection();
}

function refreshSelection() {
  for (const o of state.objects) {
    if (!o.el) continue;
    if (o.id === state.selectedId) o.el.classList.add('selected');
    else o.el.classList.remove('selected');
  }
  const sel = getSelected();
  if (sel) {
    $('propX').value = fmt(sel.x);
    $('propY').value = fmt(sel.y);
    $('propW').value = fmt(sel.w);
    $('propH').value = fmt(sel.h);
    showHandlesFor(sel);
  } else {
    $('propX').value = '';
    $('propY').value = '';
    $('propW').value = '';
    $('propH').value = '';
    removeHandles();
  }
  updateCounts();
}

// =========================
// Object Management
// =========================
function uid(prefix) { return `${prefix}-${Math.random().toString(36).slice(2, 8)}`; }

function addObject(type, x, y, w, h) {
  const id = uid(type);
  const obj = { id, type, x, y, w, h, el: null };
  state.objects.push(obj);
  redrawObjects();
  state.selectedId = id;
  refreshSelection();
}

function getSelected() { return state.objects.find(o => o.id === state.selectedId) || null; }

function removeSelected() {
  if (!state.selectedId) return;
  state.objects = state.objects.filter(o => o.id !== state.selectedId);
  state.selectedId = null;
  redrawObjects();
  refreshSelection();
}

function bringToFront(obj) { if (obj && obj.el) svg.appendChild(obj.el); }

// =========================
// Drag & Collision
// =========================
function attachDragHandlers(el) {
  el.addEventListener('pointerdown', (e) => {
    const id = el.dataset.id;
    state.selectedId = id;
    refreshSelection();
    const obj = getSelected();
    bringToFront(obj);
    const pt = svgPointFromClient(e.clientX, e.clientY);
    state.drag = { id, startX: obj.x, startY: obj.y, ox: pt.x, oy: pt.y };
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener('pointermove', (e) => {
    if (!state.drag || state.drag.id !== el.dataset.id) return;
    const obj = getSelected();
    const pt = svgPointFromClient(e.clientX, e.clientY);
    let dx = pxToMeters(pt.x - state.drag.ox);
    let dy = pxToMeters(pt.y - state.drag.oy);
    let nx = state.drag.startX + dx;
    let ny = state.drag.startY + dy;
    if (state.grid.snap) { nx = snap(nx); ny = snap(ny); }
    obj.x = nx; obj.y = ny;
    updateElementRect(obj);
  });

  el.addEventListener('pointerup', (e) => {
    if (!state.drag || state.drag.id !== el.dataset.id) return;
    const obj = getSelected();
    const ok = withinWarehouse(obj) && !collides(obj);
    if (!ok) {
      obj.x = state.drag.startX; obj.y = state.drag.startY;
      updateElementRect(obj);
      showToast('配置できません（重なりまたは倉庫外です）');
    }
    updateHandlesPosition(obj);
    state.drag = null;
    updateCounts();
  });
}

function updateElementRect(o) {
  if (!o.el) return;
  o.el.setAttribute('x', metersToPx(o.x));
  o.el.setAttribute('y', metersToPx(o.y));
  o.el.setAttribute('width', metersToPx(o.w));
  o.el.setAttribute('height', metersToPx(o.h));
}

function snap(v) { const s = state.grid.step; return Math.round(v / s) * s; }

function withinWarehouse(o) {
  return o.x >= 0 && o.y >= 0 && (o.x + o.w) <= state.wh.w && (o.y + o.h) <= state.wh.h;
}

function aabbOverlap(a, b) {
  return !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);
}

// Overlap rules: cargo cannot overlap with anything; aisle & obstacle may overlap each other.
function collides(target) {
  for (const o of state.objects) {
    if (o.id === target.id) continue;
    if (!aabbOverlap(target, o)) continue;
    if (target.type === 'cargo' || o.type === 'cargo') return true; // forbid any overlap with cargo
  }
  return false;
}

// =========================
// Resize Handles (for aisle/obstacle)
// =========================
let handleLayer = null; // <g> containing handles
let resizeState = null; // { id, anchor: 'nw'|'ne'|'sw'|'se', start:{x,y,w,h}, origin:{x,y} }

function removeHandles() {
  if (handleLayer && handleLayer.parentNode) handleLayer.parentNode.removeChild(handleLayer);
  handleLayer = null; resizeState = null;
}

function showHandlesFor(obj) {
  removeHandles();
  if (!obj || obj.type === 'cargo') return; // cargo not resizable
  handleLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  handleLayer.setAttribute('class', 'handle-box');
  const corners = [
    { key:'nw', x: obj.x, y: obj.y },
    { key:'ne', x: obj.x+obj.w, y: obj.y },
    { key:'sw', x: obj.x, y: obj.y+obj.h },
    { key:'se', x: obj.x+obj.w, y: obj.y+obj.h },
  ];
  for (const c of corners) {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('class', `handle ${c.key}`);
    const s = Math.max(6, Math.min(12, state.pxPerM*0.3));
    r.setAttribute('x', metersToPx(c.x) - s/2);
    r.setAttribute('y', metersToPx(c.y) - s/2);
    r.setAttribute('width', s);
    r.setAttribute('height', s);
    r.dataset.anchor = c.key;
    r.dataset.target = obj.id;
    r.addEventListener('pointerdown', onHandleDown);
    handleLayer.appendChild(r);
  }
  svg.appendChild(handleLayer);
}

function updateHandlesPosition(obj) {
  if (!handleLayer) return;
  const hs = handleLayer.querySelectorAll('.handle');
  const map = {
    nw: { x: obj.x, y: obj.y },
    ne: { x: obj.x+obj.w, y: obj.y },
    sw: { x: obj.x, y: obj.y+obj.h },
    se: { x: obj.x+obj.w, y: obj.y+obj.h },
  };
  const s = Math.max(6, Math.min(12, state.pxPerM*0.3));
  hs.forEach(h => {
    const k = h.dataset.anchor; const p = map[k];
    h.setAttribute('x', metersToPx(p.x) - s/2);
    h.setAttribute('y', metersToPx(p.y) - s/2);
    h.setAttribute('width', s); h.setAttribute('height', s);
  });
}

function onHandleDown(e) {
  e.stopPropagation();
  const id = e.target.dataset.target; const anchor = e.target.dataset.anchor;
  state.selectedId = id; refreshSelection();
  const obj = getSelected();
  const pt = svgPointFromClient(e.clientX, e.clientY);
  resizeState = { id, anchor, start: { x: obj.x, y: obj.y, w: obj.w, h: obj.h }, origin: { x: pt.x, y: pt.y } };
  e.target.setPointerCapture(e.pointerId);
  svg.addEventListener('pointermove', onHandleMove);
  svg.addEventListener('pointerup', onHandleUp, { once: true });
}

function onHandleMove(e) {
  if (!resizeState) return;
  const obj = getSelected();
  const pt = svgPointFromClient(e.clientX, e.clientY);
  const dx = pxToMeters(pt.x - resizeState.origin.x);
  const dy = pxToMeters(pt.y - resizeState.origin.y);
  let { x, y, w, h } = resizeState.start;
  switch(resizeState.anchor){
    case 'nw': x += dx; y += dy; w -= dx; h -= dy; break;
    case 'ne': y += dy; w += dx; h -= dy; break;
    case 'sw': x += dx; w -= dx; h += dy; break;
    case 'se': w += dx; h += dy; break;
  }
  w = Math.max(0.1, w); h = Math.max(0.1, h);
  if (state.grid.snap) { x = snap(x); y = snap(y); w = snap(w); h = snap(h); }
  const candidate = { x, y, w, h, id: obj.id, type: obj.type };
  if (withinWarehouse(candidate) && !collides(candidate)) {
    Object.assign(obj, candidate);
    updateElementRect(obj);
    updateHandlesPosition(obj);
  }
}

function onHandleUp() {
  svg.removeEventListener('pointermove', onHandleMove);
  const obj = getSelected();
  if (obj) { updateElementRect(obj); updateHandlesPosition(obj); }
  resizeState = null;
}

// =========================
// Counts
// =========================
function updateCounts() {
  const flat = state.objects.filter(o => o.type === 'cargo').length;
  const stack = Math.max(1, parseInt($('stack').value || '1', 10));
  $('flatCount').textContent = flat;
  $('totalCount').textContent = flat * stack;
}

// =========================
// Auto Pack (grid-based tiling avoiding aisles/obstacles)
// =========================
function removeAllCargo() {
  state.objects = state.objects.filter(o => o.type !== 'cargo');
}

function isFreeRect(x, y, w, h, placed) {
  const test = { x, y, w, h };
  if (!withinWarehouse(test)) return false;
  for (const o of state.objects) {
    if (o.type === 'cargo') continue;
    if (aabbOverlap(test, o)) return false;
  }
  for (const p of placed) {
    if (aabbOverlap(test, p)) return false;
  }
  return true;
}

function tryPackForDims(cw, ch) {
  const placed = [];
  const W = state.wh.w, H = state.wh.h;
  const stepX = cw; const stepY = ch;
  const eps = 1e-6;
  for (let y = 0; y + ch <= H + eps; y += stepY) {
    for (let x = 0; x + cw <= W + eps; x += stepX) {
      const px = state.grid.snap ? snap(x) : x;
      const py = state.grid.snap ? snap(y) : y;
      if (isFreeRect(px, py, cw, ch, placed)) placed.push({ x: px, y: py, w: cw, h: ch });
    }
  }
  return placed;
}

function autoPack() {
  const cwIn = Math.max(0.1, parseFloat($('cargoW').value) || 1.1);
  const chIn = Math.max(0.1, parseFloat($('cargoH').value) || 1.1);
  const placementsPortrait = tryPackForDims(cwIn, chIn);
  const placementsLandscape = tryPackForDims(chIn, cwIn);
  const useLandscape = placementsLandscape.length > placementsPortrait.length;
  const placements = useLandscape ? placementsLandscape : placementsPortrait;

  removeAllCargo();
  for (const p of placements) {
    const id = uid('cargo');
    state.objects.push({ id, type: 'cargo', x: p.x, y: p.y, w: p.w, h: p.h, el: null });
  }
  redrawObjects();
  state.selectedId = null;
  refreshSelection();
  showToast(`自動配置: 平面 ${placements.length} 個`);
}


// =========================
// Coordinate Utils
// =========================
function svgPointFromClient(cx, cy) {
  const pt = svg.createSVGPoint();
  pt.x = cx; pt.y = cy;
  const ctm = svg.getScreenCTM();
  const inv = ctm.inverse();
  return pt.matrixTransform(inv);
}

// =========================
// Export PNG/SVG
// =========================
function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

function timestamp() {
  const d = new Date();
  const pad = (n)=> String(n).padStart(2,'0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function saveSVG() {
  const serializer = new XMLSerializer();
  const clone = svg.cloneNode(true);
  clone.removeAttribute('width'); clone.removeAttribute('height');
  const str = serializer.serializeToString(clone);
  const blob = new Blob([str], { type: 'image/svg+xml' });
  download(`WLC_${timestamp()}.svg`, blob);
}

function savePNG() {
  const serializer = new XMLSerializer();
  const clone = svg.cloneNode(true);
  const vb = clone.getAttribute('viewBox').split(' ').map(Number);
  const W = Math.ceil(vb[2]); const H = Math.ceil(vb[3]);
  const str = serializer.serializeToString(clone);
  const svg64 = btoa(unescape(encodeURIComponent(str)));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,W,H);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob)=> download(`WLC_${timestamp()}.png`, blob), 'image/png');
  };
  img.src = 'data:image/svg+xml;base64,' + svg64;
}

// =========================
// Auto Layout (Grid-based heuristic)
// =========================
function clearCargo() {
  state.objects = state.objects.filter(o => o.type !== 'cargo');
}

function getBlockingObjects() {
  return state.objects.filter(o => o.type !== 'cargo');
}

function canPlaceHere(candidate, placed, blocks) {
  if (!withinWarehouse(candidate)) return false;
  for (const b of blocks) { if (aabbOverlap(candidate, b)) return false; }
  for (const p of placed) { if (aabbOverlap(candidate, p)) return false; }
  return true;
}

function tryPack(w, h) {
  const eps = 1e-9;
  const placed = [];
  const blocks = getBlockingObjects();
  const W = state.wh.w, H = state.wh.h;
  for (let y = 0; y <= H - h + eps; y += h) {
    for (let x = 0; x <= W - w + eps; x += w) {
      const rect = { x, y, w, h };
      if (canPlaceHere(rect, placed, blocks)) placed.push(rect);
    }
  }
  return placed;
}

function autoLayout() {
  const cw = Math.max(0.1, parseFloat($('cargoW').value) || 1.1);
  const ch = Math.max(0.1, parseFloat($('cargoH').value) || 1.1);

  const portrait = { w: Math.min(cw, state.wh.w), h: Math.min(ch, state.wh.h) };
  const landscape = { w: Math.min(ch, state.wh.w), h: Math.min(cw, state.wh.h) };

  const placedP = tryPack(portrait.w, portrait.h);
  const placedL = tryPack(landscape.w, landscape.h);

  const best = (placedL.length > placedP.length) ? { list: placedL, w: landscape.w, h: landscape.h, name: '讓ｪ蜷代″' } : { list: placedP, w: portrait.w, h: portrait.h, name: '邵ｦ蜷代″' };

  clearCargo();
  for (const r of best.list) {
    state.objects.push({ id: uid('cargo'), type: 'cargo', x: r.x, y: r.y, w: best.w, h: best.h, el: null });
  }
  redrawObjects();
  state.selectedId = null;
  refreshSelection();
  showToast(`自動配置: ${best.name}で ${best.list.length} 個配置`);
}

// =========================
// UI Bindings
// =========================
$('btnResizeWH').addEventListener('click', () => {
  const wVal = $('whW').value;
  const hVal = $('whH').value;
  const w = Number.isFinite(parseFloat(wVal)) ? parseFloat(wVal) : state.wh.w;
  const h = Number.isFinite(parseFloat(hVal)) ? parseFloat(hVal) : state.wh.h;
  applyWarehouseSize(w, h);
});

$('btnAddAisle').addEventListener('click', () => {
  const w = Math.min(3, state.wh.w/4); const h = state.wh.h * 0.6;
  addObject('aisle', Math.max(0, (state.wh.w - w)/2), Math.max(0, (state.wh.h - h)/2), w, h);
});
$('btnAddObs').addEventListener('click', () => {
  const w = 0.8, h = 0.8;
  addObject('obstacle', Math.max(0, (state.wh.w - w)/2), Math.max(0, (state.wh.h - h)/2), w, h);
});
$('btnAddCargo').addEventListener('click', () => {
  const cw = parseFloat($('cargoW').value) || 1.1;
  const ch = parseFloat($('cargoH').value) || 1.1;
  const orient = $('cargoOrient').value;
  const w = orient === 'portrait' ? Math.min(cw, state.wh.w) : Math.min(ch, state.wh.w);
  const h = orient === 'portrait' ? Math.min(ch, state.wh.h) : Math.min(cw, state.wh.h);
  addObject('cargo', Math.max(0, (state.wh.w - w)/2), Math.max(0, (state.wh.h - h)/2), w, h);
});

$('btnDelete').addEventListener('click', removeSelected);

$('btnApply').addEventListener('click', () => {
  const sel = getSelected(); if (!sel) return;
  const nx = parseFloat($('propX').value); const ny = parseFloat($('propY').value);
  const nw = parseFloat($('propW').value); const nh = parseFloat($('propH').value);
  const old = { ...sel };
  if (!Number.isNaN(nx)) sel.x = nx; if (!Number.isNaN(ny)) sel.y = ny;
  if (!Number.isNaN(nw)) sel.w = Math.max(0.1, nw);
  if (!Number.isNaN(nh)) sel.h = Math.max(0.1, nh);
  if (!(withinWarehouse(sel)) || collides(sel)) {
    Object.assign(sel, old);
    showToast('反映できません。倉庫外または荷物との重なりです。');
  }
  updateElementRect(sel);
  refreshSelection();
});

$('snapChk').addEventListener('change', (e)=> state.grid.snap = e.target.checked);
$('stack').addEventListener('input', updateCounts);

$('btnSaveSVG').addEventListener('click', saveSVG);
$('btnSavePNG').addEventListener('click', savePNG);
$('btnAutoPack').addEventListener('click', autoPack);
$('btnAutoLayout').addEventListener('click', autoLayout);

$('btnClear').addEventListener('click', (e)=>{
  e.preventDefault();
  state.objects = []; state.selectedId = null; redrawObjects(); refreshSelection();
});

// 謨ｰ蛟､縺ｧ霑ｽ蜉
$('btnAddByValue').addEventListener('click', () => {
  const type = $('newType').value; // aisle|obstacle
  let x = parseFloat($('newX').value)||0, y = parseFloat($('newY').value)||0;
  let w = Math.max(0.1, parseFloat($('newW').value)||1), h = Math.max(0.1, parseFloat($('newH').value)||1);
  if (state.grid.snap) { x = snap(x); y = snap(y); w = snap(w); h = snap(h); }
  const candidate = { id: 'tmp', type, x, y, w, h };
  if (!withinWarehouse(candidate)) { showToast('蛟牙ｺｫ螟悶↓驟咲ｽｮ縺ｧ縺阪∪縺帙ｓ'); return; }
  addObject(type, x, y, w, h);
});

// Click to select object (when not dragging)
svg.addEventListener('pointerdown', (e)=>{
  if (e.target === svg) { state.selectedId = null; refreshSelection(); }
  else if (e.target.classList.contains('obj')) {
    state.selectedId = e.target.dataset.id; refreshSelection();
  }
});

// =========================
// Init
// =========================
function init() {
  computeScale();
  clearSVG();
  drawGridAndFrame();
  // Demo objects
  addObject('aisle', 5, 0, 3, state.wh.h);
  addObject('obstacle', 12, 6, 0.6, 0.6);
  addObject('cargo', 20, 4, 1.1, 1.1);
  state.selectedId = null; refreshSelection();
}

window.addEventListener('resize', () => {
  computeScale();
  clearSVG(); drawGridAndFrame(); redrawObjects();
});

init();
} // start()
})();
