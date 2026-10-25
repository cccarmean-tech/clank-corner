/* =====================================================================
   Clank Sandbox  –  sandbox.js
   Depends on script.js being loaded first (uses buildSVG / DEFAULT)
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- constants ---------- */
  var W = 1400, H = 900;            // virtual canvas size
  var SNAP = 20;                    // grid snap size
  var SAVE_KEY = 'clankSandbox_v3';
  var SEL_STROKE = '#7a55b3';

  /* ---------- state ---------- */
  var objects  = [];   // [{id,type,x,y,w,h,rot,data,zIndex}]
  var nextId   = 1;
  var nextZ    = 1;
  var selectedId = null;
  var gridOn   = false;
  var zoom     = 1;
  var panX     = 0, panY = 0;
  var drag     = null;  // {mode,id,startMx,startMy,startX,startY,startW,startH,startRot,cx,cy}
  var historyStack = [];

  /* ---------- DOM refs (set in init) ---------- */
  var canvas, overlay, toolbox;

  /* =====================================================================
     SVG BUILDERS FOR SANDBOX OBJECTS
     ===================================================================== */

  var CARDBOARD_TEXTURES = [
    // vertical corrugation lines on tan background
    '<defs><pattern id="cbT{id}" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#d4a55e"/><line x1="3" y1="0" x2="3" y2="6" stroke="#b8883b" stroke-width="1.5"/></pattern></defs>',
    '<defs><pattern id="cbT{id}" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#c8914a"/><line x1="4" y1="0" x2="4" y2="8" stroke="#a0712c" stroke-width="1.5"/><line x1="0" y1="4" x2="8" y2="4" stroke="#a0712c" stroke-width=".6" opacity=".5"/></pattern></defs>',
    '<defs><pattern id="cbT{id}" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#bf8840"/><line x1="5" y1="0" x2="5" y2="10" stroke="#9a6a28" stroke-width="2"/></pattern></defs>'
  ];

  function cbSVG(id, w, h, variant, label) {
    var vi = (variant || 0) % CARDBOARD_TEXTURES.length;
    var def = CARDBOARD_TEXTURES[vi].replace(/{id}/g, id);
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">';
    s += def;
    s += '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="url(#cbT' + id + ')" rx="4"/>';
    s += '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="none" stroke="#9a6a28" stroke-width="3" rx="4"/>';
    // fold lines
    s += '<line x1="' + (w*0.5) + '" y1="0" x2="' + (w*0.5) + '" y2="' + h + '" stroke="#9a6a28" stroke-width="1" stroke-dasharray="4 8" opacity=".5"/>';
    if (h > 60) s += '<line x1="0" y1="' + (h*0.5) + '" x2="' + w + '" y2="' + (h*0.5) + '" stroke="#9a6a28" stroke-width="1" stroke-dasharray="4 8" opacity=".5"/>';
    if (label) s += '<text x="' + (w/2) + '" y="' + (h/2+6) + '" text-anchor="middle" font-size="' + Math.min(20,h*0.22) + '" fill="#7a5020" opacity=".7" font-family="inherit">' + label + '</text>';
    s += '</svg>';
    return s;
  }

  var PRESETS = {
    clank: function () {
      var defaultClankData = window.DEFAULT || { head:'square', color:'sky', eyes:'round', hat:'none', necklace:'crochet', shield:'none', bracelet:'none', socks:'none', extra:'none' };
      return { type:'clank', w:120, h:145, data: JSON.parse(JSON.stringify(defaultClankData)) };
    },
    box: function () {
      var id = nextId;
      return { type:'cardboard', w:120, h:110, data:{variant:0, label:'📦', svgW:120,svgH:110, kind:'box'} };
    },
    flatsheet: function () {
      return { type:'cardboard', w:220, h:60, data:{variant:2, label:'', svgW:220,svgH:60, kind:'flat'} };
    },
    wall: function () {
      return { type:'cardboard', w:60, h:200, data:{variant:1, label:'🧱', svgW:60,svgH:200, kind:'wall'} };
    },
    floor: function () {
      return { type:'cardboard', w:250, h:50, data:{variant:2, label:'', svgW:250,svgH:50, kind:'floor'} };
    },
    roof: function () {
      return { type:'roof', w:220, h:90 };
    },
    furniture: function () {
      return { type:'cardboard', w:100, h:70, data:{variant:0, label:'🛋️', svgW:100,svgH:70, kind:'furniture'} };
    },
    cardboard: function () {
      return { type:'cardboard', w:150, h:100, data:{variant:0, label:'', svgW:150,svgH:100, kind:'generic'} };
    }
  };

  /* =====================================================================
     OBJECT RENDERING
     ===================================================================== */

  function renderObject(obj) {
    try {
      var el = document.getElementById('sb-' + obj.id);
      if (!el) {
        el = document.createElement('div');
        el.id = 'sb-' + obj.id;
        el.className = 'sb-obj';
        el.setAttribute('data-id', obj.id);
        canvas.appendChild(el);
      }
      el.style.left   = obj.x + 'px';
      el.style.top    = obj.y + 'px';
      el.style.width  = obj.w + 'px';
      el.style.height = obj.h + 'px';
      el.style.transform = 'rotate(' + (obj.rot||0) + 'deg)';
      el.style.zIndex = obj.zIndex || 1;
      el.style.outline = (selectedId === obj.id) ? ('3px solid ' + SEL_STROKE) : 'none';
      el.style.outlineOffset = '3px';

      if (obj.type === 'clank') {
        if (typeof window.buildSVG === 'function' && obj.data) {
          el.innerHTML = window.buildSVG(obj.data, [obj.w, obj.h]);
        } else {
          el.innerHTML = '<div style="background:#c5a8ec;width:100%;height:100%;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:48px;">🤖</div>';
        }
      } else if (obj.type === 'cardboard') {
        var d = obj.data;
        el.innerHTML = cbSVG(obj.id, d.svgW, d.svgH, d.variant, d.label);
      } else if (obj.type === 'roof') {
        el.innerHTML = roofSVG(obj.w, obj.h);
      }

      /* resize / rotate handles (only when selected) */
      el.querySelectorAll('.sb-handle').forEach(function(h){ h.remove(); });
      if (selectedId === obj.id) {
        addHandles(el, obj);
      }
      return el;
    } catch (e) {
      console.error('renderObject error:', e);
      return null;
    }
  }

  function roofSVG(w, h) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'">' +
      '<defs><pattern id="rfP'+w+h+'" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#c9a8ee"/><line x1="0" y1="3" x2="6" y2="3" stroke="#a785cc" stroke-width="1"/></pattern></defs>' +
      '<polygon points="'+[w/2+',4', (w-4)+','+((h-4)), '4,'+((h-4))].join(' ')+'" fill="url(#rfP'+w+h+')" stroke="#7a55b3" stroke-width="3"/>' +
      '</svg>';
  }

  function addHandles(el, obj) {
    // resize handle (bottom-right)
    var rz = document.createElement('div');
    rz.className = 'sb-handle sb-resize';
    rz.setAttribute('aria-label', 'Resize');
    rz.innerHTML = '⤡';
    rz.dataset.htype = 'resize';
    rz.dataset.id = obj.id;
    el.appendChild(rz);
    // rotate handle (top-right)
    var ro = document.createElement('div');
    ro.className = 'sb-handle sb-rotate';
    ro.setAttribute('aria-label', 'Rotate');
    ro.innerHTML = '↻';
    ro.dataset.htype = 'rotate';
    ro.dataset.id = obj.id;
    el.appendChild(ro);
  }

  function renderAll() {
    // remove stale elements
    var live = {};
    objects.forEach(function(o){ live[o.id] = true; });
    canvas.querySelectorAll('.sb-obj').forEach(function(el){
      if (!live[el.dataset.id]) el.remove();
    });
    // sort by zIndex then render
    objects.slice().sort(function(a,b){ return (a.zIndex||1)-(b.zIndex||1); })
           .forEach(function(o){ renderObject(o); });
    updateSelectionPanel();
  }

  /* =====================================================================
     OBJECT MANAGEMENT
     ===================================================================== */

  function getObj(id) {
    for (var i = 0; i < objects.length; i++) if (objects[i].id === id) return objects[i];
    return null;
  }

  function spawnAt(preset, cx, cy) {
    pushHistory();
    var def = PRESETS[preset]();
    var x = cx !== undefined ? cx : (W/2 - def.w/2);
    var y = cy !== undefined ? cy : (H/2 - def.h/2);
    if (gridOn) { x = Math.round(x/SNAP)*SNAP; y = Math.round(y/SNAP)*SNAP; }
    var obj = { id: nextId++, type: def.type, x: x, y: y, w: def.w, h: def.h, rot: 0, data: def.data || {}, zIndex: nextZ++ };
    objects.push(obj);
    select(obj.id);
    renderAll();
    autosave();
  }

  function deleteSelected() {
    if (!selectedId) return;
    pushHistory();
    objects = objects.filter(function(o){ return o.id !== selectedId; });
    var el = document.getElementById('sb-' + selectedId);
    if (el) el.remove();
    selectedId = null;
    renderAll();
    autosave();
  }

  function duplicateSelected() {
    if (!selectedId) return;
    var src = getObj(selectedId);
    if (!src) return;
    pushHistory();
    var obj = JSON.parse(JSON.stringify(src));
    obj.id = nextId++;
    obj.x += 30; obj.y += 30;
    obj.zIndex = nextZ++;
    objects.push(obj);
    select(obj.id);
    renderAll();
    autosave();
  }

  function rotateSelected(delta) {
    if (!selectedId) return;
    pushHistory();
    var obj = getObj(selectedId);
    if (!obj) return;
    obj.rot = ((obj.rot || 0) + delta + 360) % 360;
    renderAll();
    autosave();
  }

  function bringForward() {
    if (!selectedId) return;
    var obj = getObj(selectedId);
    if (obj) { obj.zIndex = nextZ++; renderAll(); autosave(); }
  }

  function select(id) {
    selectedId = id;
    renderAll();
  }

  function deselect() {
    selectedId = null;
    renderAll();
  }

  /* =====================================================================
     DRAG  (handles both canvas objects and resize/rotate handles)
     ===================================================================== */

  function pointerXY(e) {
    var t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }

  function canvasXY(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top)  / zoom
    };
  }

  function onDragStart(e) {
    var el = e.target;
    // handle?
    var handle = el.closest ? el.closest('.sb-handle') : null;
    var objEl  = el.closest ? el.closest('.sb-obj')    : null;

    if (!objEl && !handle) return;

    // clicking a handle on an already-selected object
    var id = parseInt((handle || objEl).dataset.id, 10);
    if (isNaN(id)) return;

    e.preventDefault();
    var p = pointerXY(e);
    var obj = getObj(id);
    if (!obj) return;
    select(id);
    obj.zIndex = nextZ++;

    if (handle) {
      var htype = handle.dataset.htype;
      var cx = obj.x + obj.w / 2;
      var cy = obj.y + obj.h / 2;
      drag = { mode: htype, id: id,
               startMx: p.x, startMy: p.y,
               startX: obj.x, startY: obj.y,
               startW: obj.w, startH: obj.h,
               startRot: obj.rot || 0, cx: cx, cy: cy };
    } else {
      var cp = canvasXY(p.x, p.y);
      drag = { mode: 'move', id: id,
               startMx: p.x, startMy: p.y,
               offX: cp.x - obj.x, offY: cp.y - obj.y };
    }
  }

  function onDragMove(e) {
    if (!drag) return;
    e.preventDefault();
    var p  = pointerXY(e);
    var obj = getObj(drag.id);
    if (!obj) return;

    if (drag.mode === 'move') {
      var cp = canvasXY(p.x, p.y);
      var nx = cp.x - drag.offX;
      var ny = cp.y - drag.offY;
      if (gridOn) { nx = Math.round(nx/SNAP)*SNAP; ny = Math.round(ny/SNAP)*SNAP; }
      // clamp inside canvas
      nx = Math.max(0, Math.min(W - obj.w, nx));
      ny = Math.max(0, Math.min(H - obj.h, ny));
      obj.x = nx; obj.y = ny;
    } else if (drag.mode === 'resize') {
      var dx = (p.x - drag.startMx) / zoom;
      var dy = (p.y - drag.startMy) / zoom;
      var nw = Math.max(40, drag.startW + dx);
      var nh = Math.max(30, drag.startH + dy);
      if (gridOn) { nw = Math.round(nw/SNAP)*SNAP; nh = Math.round(nh/SNAP)*SNAP; }
      obj.w = nw; obj.h = nh;
      if (obj.type === 'cardboard') { obj.data.svgW = nw; obj.data.svgH = nh; }
    } else if (drag.mode === 'rotate') {
      var cp2 = canvasXY(p.x, p.y);
      var angle = Math.atan2(cp2.y - drag.cy, cp2.x - drag.cx) * 180 / Math.PI + 90;
      var snapped = gridOn ? Math.round(angle / 15) * 15 : angle;
      obj.rot = ((snapped % 360) + 360) % 360;
    }

    var el = document.getElementById('sb-' + drag.id);
    if (el) {
      el.style.left = obj.x + 'px'; el.style.top = obj.y + 'px';
      el.style.width = obj.w + 'px'; el.style.height = obj.h + 'px';
      el.style.transform = 'rotate(' + (obj.rot||0) + 'deg)';
    }
  }

  function onDragEnd(e) {
    if (drag) { pushHistory(); autosave(); renderAll(); }
    drag = null;
  }

  /* =====================================================================
     PAN / ZOOM
     ===================================================================== */

  function applyView() {
    canvas.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + zoom + ')';
  }

  function setZoom(z) {
    zoom = Math.max(0.3, Math.min(2.5, z));
    applyView();
    document.getElementById('sbZoomLabel').textContent = Math.round(zoom*100) + '%';
  }

  /* =====================================================================
     GRID
     ===================================================================== */

  function toggleGrid() {
    gridOn = !gridOn;
    updateGridCanvas();
    document.getElementById('sbGridBtn').setAttribute('aria-pressed', String(gridOn));
  }

  function updateGridCanvas() {
    var gc = document.getElementById('sbGrid');
    if (!gc) return;
    if (!gridOn) { gc.style.display = 'none'; return; }
    gc.style.display = 'block';
    var ctx = gc.getContext('2d');
    gc.width = W; gc.height = H;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(122,85,179,0.18)';
    ctx.lineWidth = 1;
    for (var x = 0; x <= W; x += SNAP) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (var y = 0; y <= H; y += SNAP) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }

  /* =====================================================================
     SELECTION PANEL  (shows when something is selected)
     ===================================================================== */

  function updateSelectionPanel() {
    var panel = document.getElementById('sbSelPanel');
    if (!panel) return;
    if (!selectedId) { panel.style.display = 'none'; return; }
    var obj = getObj(selectedId);
    if (!obj) { panel.style.display = 'none'; return; }
    panel.style.display = 'flex';
    document.getElementById('sbSelLabel').textContent =
      obj.type === 'clank' ? '🤖 Clank' :
      obj.type === 'roof'  ? '🏠 Roof'  :
      '📦 ' + (obj.data && obj.data.kind ? obj.data.kind : 'piece');
  }

  /* =====================================================================
     SAVE / LOAD / HISTORY
     ===================================================================== */

  function autosave() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ objects: objects, nextId: nextId, nextZ: nextZ }));
    } catch (e) {}
  }

  function saveManual() {
    autosave();
    flashStatus('💾 Saved!');
  }

  function loadSaved() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      var saved = JSON.parse(raw);
      if (!saved || !Array.isArray(saved.objects)) return false;
      objects = saved.objects;
      nextId  = saved.nextId  || (objects.length + 1);
      nextZ   = saved.nextZ   || (objects.length + 1);
      renderAll();
      flashStatus('📂 Loaded your build!');
      return true;
    } catch (e) { return false; }
  }

  function pushHistory() {
    if (historyStack.length > 40) historyStack.shift();
    historyStack.push(JSON.stringify({ objects: objects, nextId: nextId, nextZ: nextZ, sel: selectedId }));
  }

  function undo() {
    if (!historyStack.length) return;
    var snap = JSON.parse(historyStack.pop());
    objects    = snap.objects;
    nextId     = snap.nextId;
    nextZ      = snap.nextZ;
    selectedId = snap.sel;
    renderAll();
    autosave();
    flashStatus('↩ Undone');
  }

  /* =====================================================================
     SCREENSHOT EXPORT
     ===================================================================== */

  function exportPNG() {
    flashStatus('📸 Taking screenshot…');
    var svgNS = 'http://www.w3.org/2000/svg';

    // Build a composite SVG
    var margin = 20;
    var allSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (W + margin*2) + '" height="' + (H + margin*2) + '">';
    allSvg += '<defs>';
    // collect defs from each object
    objects.forEach(function(obj) {
      if (obj.type === 'cardboard') {
        var vi = (obj.data.variant||0) % CARDBOARD_TEXTURES.length;
        var defStr = CARDBOARD_TEXTURES[vi].replace(/{id}/g, 'ex'+obj.id);
        // extract inner defs content
        var m = defStr.match(/<defs>([\s\S]*?)<\/defs>/);
        if (m) allSvg += m[1];
      }
    });
    allSvg += '</defs>';
    // background
    allSvg += '<rect width="' + (W+margin*2) + '" height="' + (H+margin*2) + '" fill="#dff1fb"/>';
    allSvg += '<rect x="' + margin + '" y="' + margin + '" width="' + W + '" height="' + H + '" fill="#f0f8ff" rx="16"/>';

    objects.slice().sort(function(a,b){ return (a.zIndex||1)-(b.zIndex||1); }).forEach(function(obj) {
      var cx = obj.x + margin, cy = obj.y + margin;
      var rot = obj.rot || 0;
      var tx = cx + obj.w/2, ty = cy + obj.h/2;
      allSvg += '<g transform="translate(' + tx + ',' + ty + ') rotate(' + rot + ') translate(' + (-obj.w/2) + ',' + (-obj.h/2) + ')">';
      if (obj.type === 'clank') {
        allSvg += buildSVG(obj.data, [obj.w, obj.h]);
      } else if (obj.type === 'cardboard') {
        var vi2 = (obj.data.variant||0) % CARDBOARD_TEXTURES.length;
        var patId = 'cbTex_ex'+obj.id;
        var bg = ['#d4a55e','#c8914a','#bf8840'][vi2];
        var lc = ['#b8883b','#a0712c','#9a6a28'][vi2];
        var w2 = obj.w, h2 = obj.h;
        allSvg += '<rect x="0" y="0" width="'+w2+'" height="'+h2+'" fill="'+bg+'" rx="4"/>';
        // draw corrugation lines
        for (var lx = 0; lx < w2; lx += 6) {
          allSvg += '<line x1="'+(lx+3)+'" y1="0" x2="'+(lx+3)+'" y2="'+h2+'" stroke="'+lc+'" stroke-width="1.5"/>';
        }
        allSvg += '<rect x="0" y="0" width="'+w2+'" height="'+h2+'" fill="none" stroke="'+lc+'" stroke-width="3" rx="4"/>';
        if (obj.data.label) allSvg += '<text x="'+(w2/2)+'" y="'+(h2/2+6)+'" text-anchor="middle" font-size="'+Math.min(20,h2*0.22)+'" fill="#7a5020" opacity=".7">'+obj.data.label+'</text>';
      } else if (obj.type === 'roof') {
        allSvg += roofSVG(obj.w, obj.h);
      }
      allSvg += '</g>';
    });
    allSvg += '</svg>';

    var img = new Image();
    img.onload = function () {
      try {
        var cv = document.createElement('canvas');
        cv.width = W + margin*2; cv.height = H + margin*2;
        var ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        var finish = function (blob) {
          if (!blob) { flashStatus('Could not export — try a screenshot instead.'); return; }
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = 'clank-sandbox.png';
          document.body.appendChild(a); a.click();
          setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 3000);
          flashStatus('📸 Saved as clank-sandbox.png!');
        };
        if (cv.toBlob) cv.toBlob(finish, 'image/png');
        else { var b = dataURLtoBlob(cv.toDataURL('image/png')); finish(b); }
      } catch (e) { flashStatus('Export failed — try a screenshot.'); }
    };
    img.onerror = function () { flashStatus('Export failed — try a screenshot.'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(allSvg);
  }

  function dataURLtoBlob(u) {
    var p = u.split(','), bin = atob(p[1]), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: 'image/png' });
  }

  /* =====================================================================
     STATUS FLASH
     ===================================================================== */

  function flashStatus(msg) {
    var el = document.getElementById('sbStatus');
    if (!el) return;
    el.textContent = msg;
    clearTimeout(el._t);
    el._t = setTimeout(function(){ el.textContent = ''; }, 3000);
  }

  /* =====================================================================
     UI CONSTRUCTION
     ===================================================================== */

  var TOOLBOX_BTNS = [
    { id:'sbSpawnClank',    icon:'🤖', label:'Spawn Clank',  action: function(){ spawnAt('clank'); } },
    { id:'sbSpawnCard',     icon:'📦', label:'Cardboard',    action: function(){ spawnAt('cardboard'); } },
    { id:'sbSpawnBox',      icon:'📬', label:'Box',          action: function(){ spawnAt('box'); } },
    { id:'sbSpawnFlat',     icon:'📋', label:'Flat Sheet',   action: function(){ spawnAt('flatsheet'); } },
    { id:'sbSpawnWall',     icon:'🧱', label:'Wall',         action: function(){ spawnAt('wall'); } },
    { id:'sbSpawnFloor',    icon:'🟫', label:'Floor',        action: function(){ spawnAt('floor'); } },
    { id:'sbSpawnRoof',     icon:'🏠', label:'Roof',         action: function(){ spawnAt('roof'); } },
    { id:'sbSpawnFurni',    icon:'🛋️', label:'Furniture',   action: function(){ spawnAt('furniture'); } },
    null, // divider
    { id:'sbRotCW',   icon:'↻', label:'Rotate +15°',  action: function(){ rotateSelected(15); } },
    { id:'sbRotCCW',  icon:'↺', label:'Rotate -15°',  action: function(){ rotateSelected(-15); } },
    { id:'sbRotR90',  icon:'⤵', label:'Rotate 90°',   action: function(){ rotateSelected(90); } },
    { id:'sbFwd',     icon:'⬆', label:'Bring forward', action: bringForward },
    { id:'sbDupe',    icon:'⎘', label:'Duplicate',     action: duplicateSelected },
    { id:'sbDel',     icon:'🗑', label:'Delete',        action: deleteSelected },
    null,
    { id:'sbGridBtn', icon:'⊞', label:'Toggle grid',   action: toggleGrid, toggle: true },
    { id:'sbUndo',    icon:'↩', label:'Undo',           action: undo },
    { id:'sbSave',    icon:'💾', label:'Save',           action: saveManual },
    { id:'sbExport',  icon:'📸', label:'Screenshot',     action: exportPNG },
    { id:'sbClear',   icon:'🗑️', label:'Clear all',    action: confirmClear }
  ];

  function confirmClear() {
    if (confirm('Clear the entire sandbox? This cannot be undone.')) {
      pushHistory();
      objects = []; selectedId = null; nextId = 1; nextZ = 1;
      canvas.querySelectorAll('.sb-obj').forEach(function(e){ e.remove(); });
      renderAll(); autosave(); flashStatus('Sandbox cleared.');
    }
  }

  function buildUI(root) {
    root.innerHTML = '';

    /* wrapper */
    var wrap = document.createElement('div');
    wrap.id = 'sbWrap';
    root.appendChild(wrap);

    /* toolbox */
    toolbox = document.createElement('div');
    toolbox.id = 'sbToolbox';
    toolbox.setAttribute('role','toolbar');
    toolbox.setAttribute('aria-label','Sandbox tools');

    TOOLBOX_BTNS.forEach(function(b) {
      if (!b) {
        var sep = document.createElement('div'); sep.className = 'sb-sep'; toolbox.appendChild(sep);
      } else {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id   = b.id;
        btn.className = 'sb-tbtn';
        btn.innerHTML = '<span class="sb-icon">' + b.icon + '</span><span class="sb-lbl">' + b.label + '</span>';
        btn.setAttribute('aria-label', b.label);
        if (b.toggle) btn.setAttribute('aria-pressed','false');
        btn.addEventListener('click', b.action);
        toolbox.appendChild(btn);
      }
    });
    wrap.appendChild(toolbox);

    /* viewport */
    var viewport = document.createElement('div');
    viewport.id = 'sbViewport';
    wrap.appendChild(viewport);

    /* grid canvas */
    var gc = document.createElement('canvas');
    gc.id = 'sbGrid';
    gc.style.display = 'none';
    viewport.appendChild(gc);

    /* canvas (the scene) */
    canvas = document.createElement('div');
    canvas.id = 'sbCanvas';
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    viewport.appendChild(canvas);

    /* selection panel */
    var panel = document.createElement('div');
    panel.id = 'sbSelPanel';
    panel.style.display = 'none';
    panel.innerHTML =
      '<span id="sbSelLabel"></span>' +
      '<button type="button" class="sb-tbtn sm" id="sbDelSel" aria-label="Delete selected">🗑 Delete</button>' +
      '<button type="button" class="sb-tbtn sm" id="sbDupeSel" aria-label="Duplicate selected">⎘ Duplicate</button>' +
      '<button type="button" class="sb-tbtn sm" id="sbFwdSel" aria-label="Bring forward">⬆ Forward</button>' +
      '<button type="button" class="sb-tbtn sm" id="sbDesel" aria-label="Deselect">✕ Deselect</button>';
    viewport.appendChild(panel);
    panel.addEventListener('click', function(e){
      var t = e.target.closest ? e.target.closest('button') : null;
      if (!t) return;
      if (t.id==='sbDelSel')  deleteSelected();
      if (t.id==='sbDupeSel') duplicateSelected();
      if (t.id==='sbFwdSel')  bringForward();
      if (t.id==='sbDesel')   deselect();
    });

    /* status */
    var st = document.createElement('p');
    st.id = 'sbStatus';
    st.setAttribute('role','status');
    st.setAttribute('aria-live','polite');
    viewport.appendChild(st);

    /* zoom row */
    var zr = document.createElement('div');
    zr.id = 'sbZoomRow';
    zr.innerHTML =
      '<button type="button" class="sb-tbtn sm" id="sbZoomOut" aria-label="Zoom out">－</button>' +
      '<span id="sbZoomLabel">100%</span>' +
      '<button type="button" class="sb-tbtn sm" id="sbZoomIn" aria-label="Zoom in">＋</button>' +
      '<button type="button" class="sb-tbtn sm" id="sbZoomReset" aria-label="Reset zoom">⌂ Fit</button>';
    viewport.appendChild(zr);
    document.getElementById('sbZoomOut').addEventListener('click', function(){ setZoom(zoom - 0.15); });
    document.getElementById('sbZoomIn').addEventListener('click', function(){ setZoom(zoom + 0.15); });
    document.getElementById('sbZoomReset').addEventListener('click', function(){ zoom=1; panX=0; panY=0; applyView(); document.getElementById('sbZoomLabel').textContent='100%'; });

    applyView();
    bindDrag(viewport);
    bindWheel(viewport);
    bindClickOutside(viewport);
  }

  /* =====================================================================
     EVENT BINDING
     ===================================================================== */

  function bindDrag(viewport) {
    // object drag: mousedown / touchstart on canvas
    canvas.addEventListener('mousedown', onDragStart);
    canvas.addEventListener('touchstart', onDragStart, { passive: false });

    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('touchmove',  onDragMove, { passive: false });
    window.addEventListener('mouseup',    onDragEnd);
    window.addEventListener('touchend',   onDragEnd);

    // prevent text selection during drag
    canvas.addEventListener('selectstart', function(e){ if (drag) e.preventDefault(); });
  }

  function bindWheel(viewport) {
    viewport.addEventListener('wheel', function(e){
      e.preventDefault();
      setZoom(zoom - e.deltaY * 0.001);
    }, { passive: false });
  }

  function bindClickOutside(viewport) {
    viewport.addEventListener('mousedown', function(e){
      if (!e.target.closest('.sb-obj') && !e.target.closest('#sbSelPanel')) deselect();
    });
    viewport.addEventListener('touchstart', function(e){
      if (!e.target.closest('.sb-obj') && !e.target.closest('#sbSelPanel')) deselect();
    }, { passive: true });
  }

  /* =====================================================================
     CSS  (injected so sandbox.js is self-contained beside style.css)
     ===================================================================== */

  function injectCSS() {
    var s = document.createElement('style');
    s.textContent = [
      '#sandboxRoot { max-width:1200px; margin:0 auto; padding:0 0 20px; }',
      '#sbWrap { display:flex; gap:0; border-radius:28px; overflow:hidden; box-shadow:0 6px 0 rgba(122,85,179,.12),0 14px 24px rgba(90,167,214,.18); border:3px solid #fff; }',

      /* toolbox */
      '#sbToolbox { width:88px; min-width:80px; flex-shrink:0; background:#f1e8fb; display:flex; flex-direction:column; gap:3px; padding:8px 6px; overflow-y:auto; max-height:600px; }',
      '.sb-tbtn { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:52px; padding:4px 2px; border:2px solid #c9a8ee; border-radius:14px; background:#fff; color:#3d3552; font:inherit; font-size:.7rem; line-height:1.2; cursor:pointer; touch-action:manipulation; -webkit-appearance:none; appearance:none; text-align:center; gap:2px; width:100%; }',
      '.sb-tbtn:hover,.sb-tbtn:focus-visible { background:#c9a8ee; color:#fff; }',
      '.sb-tbtn[aria-pressed=true] { background:#7a55b3; color:#fff; border-color:#7a55b3; }',
      '.sb-tbtn:active { transform:scale(.93); }',
      '.sb-tbtn.sm { min-height:38px; font-size:.75rem; flex-direction:row; gap:4px; padding:4px 10px; width:auto; }',
      '.sb-icon { font-size:1.3rem; line-height:1; }',
      '.sb-sep { height:1px; background:#c9a8ee; margin:3px 0; opacity:.4; }',

      /* viewport */
      '#sbViewport { position:relative; flex:1; min-width:0; background:#dff1fb; overflow:hidden; border-left:2px dashed #c9a8ee; min-height:520px; max-height:640px; display:flex; flex-direction:column; }',
      '#sbGrid { position:absolute; top:0; left:0; transform-origin:top left; pointer-events:none; z-index:0; }',
      '#sbCanvas { position:absolute; top:0; left:0; transform-origin:top left; }',
      '.sb-obj { position:absolute; cursor:grab; user-select:none; -webkit-user-select:none; box-sizing:border-box; }',
      '.sb-obj:active { cursor:grabbing; }',
      '.sb-obj svg { display:block; width:100%; height:100%; pointer-events:none; }',
      '.sb-handle { position:absolute; width:28px; height:28px; background:#7a55b3; border-radius:50%; border:2px solid #fff; display:flex; align-items:center; justify-content:center; font-size:14px; cursor:pointer; touch-action:none; z-index:20; color:#fff; line-height:1; }',
      '.sb-resize { bottom:-14px; right:-14px; cursor:nwse-resize; }',
      '.sb-rotate { top:-14px; right:-14px; cursor:crosshair; }',

      /* selection panel */
      '#sbSelPanel { position:absolute; bottom:48px; left:50%; transform:translateX(-50%); background:rgba(255,248,236,.97); border:2px solid #c9a8ee; border-radius:20px; padding:6px 12px; display:flex; align-items:center; gap:8px; z-index:30; font-weight:700; color:#3d3552; font-size:.85rem; flex-wrap:wrap; justify-content:center; max-width:96%; }',
      '#sbStatus { position:absolute; top:8px; left:50%; transform:translateX(-50%); background:rgba(122,85,179,.9); color:#fff; border-radius:16px; padding:4px 16px; font-weight:700; font-size:.88rem; pointer-events:none; z-index:31; min-height:1.6em; text-align:center; white-space:nowrap; }',
      '#sbZoomRow { position:absolute; bottom:8px; right:8px; display:flex; align-items:center; gap:4px; background:rgba(255,248,236,.95); border-radius:16px; padding:4px 8px; border:2px solid #c9a8ee; z-index:30; }',
      '#sbZoomLabel { font-size:.8rem; font-weight:700; color:#7a55b3; min-width:38px; text-align:center; }',

      /* mobile responsive */
      '@media(max-width:680px){',
        '#sbWrap { flex-direction:column; }',
        '#sbToolbox { width:auto; max-height:none; flex-direction:row; flex-wrap:wrap; padding:6px; }',
        '.sb-tbtn { min-height:44px; min-width:52px; flex:0 0 auto; }',
        '#sbViewport { min-height:380px; max-height:480px; }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* =====================================================================
     INIT
     ===================================================================== */

  function init() {
    var root = document.getElementById('sandboxRoot');
    if (!root) return;
    injectCSS();
    buildUI(root);
    if (!loadSaved()) {
      // default scene: house + Clank
      spawnAt('floor',  420, 680);
      spawnAt('wall',   420, 480);
      spawnAt('wall',   660, 480);
      spawnAt('roof',   390, 400);
      spawnAt('clank',  520, 530);
      selectedId = null;
      renderAll();
      autosave();
    }
    flashStatus('Welcome to the Sandbox! Drag pieces around and build anything.');
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
