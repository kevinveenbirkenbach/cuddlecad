const canvas = document.getElementById('viewport');
const ctx = canvas.getContext('2d');
const toolButtons = [...document.querySelectorAll('.tool')];
const inspector = document.getElementById('toolInspector');
const objectList = document.getElementById('objectList');

const palette = ['#FFC857', '#F9A66C', '#8DD6C3', '#8AB5FF', '#C6A3FF', '#FF92AE', '#F5DD78'];

const state = {
  activeTool: 'addCube',
  selectedId: null,
  selectedOperationId: null,
  selectedCornerIdx: null,
  hoveredCornerIdx: null,
  dragCorner: null,
  objects: [],
  nextId: 1,
  nextOpId: 1,
  camera: {
    yaw: Math.PI / 4,
    pitch: 0.45,
    distance: 12,
    target: { x: 0, y: 0.8, z: 0 },
  },
  pointer: {
    rotating: false,
    lastX: 0,
    lastY: 0,
  },
};

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  render();
}
window.addEventListener('resize', resizeCanvas);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rad(deg) {
  return (deg * Math.PI) / 180;
}

function deg(radValue) {
  return (radValue * 180) / Math.PI;
}

function vec(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function add(a, b) {
  return vec(a.x + b.x, a.y + b.y, a.z + b.z);
}

function sub(a, b) {
  return vec(a.x - b.x, a.y - b.y, a.z - b.z);
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
  return vec(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  );
}

function scale(v, s) {
  return vec(v.x * s, v.y * s, v.z * s);
}

function length(v) {
  return Math.sqrt(dot(v, v));
}

function normalize(v) {
  const len = length(v) || 1;
  return scale(v, 1 / len);
}

function rotateEuler(point, rotation) {
  let { x, y, z } = point;
  const cx = Math.cos(rotation.x), sx = Math.sin(rotation.x);
  const cy = Math.cos(rotation.y), sy = Math.sin(rotation.y);
  const cz = Math.cos(rotation.z), sz = Math.sin(rotation.z);

  let y1 = y * cx - z * sx;
  let z1 = y * sx + z * cx;
  y = y1; z = z1;

  let x2 = x * cy + z * sy;
  let z2 = -x * sy + z * cy;
  x = x2; z = z2;

  let x3 = x * cz - y * sz;
  let y3 = x * sz + y * cz;
  x = x3; y = y3;

  return vec(x, y, z);
}

function transformVertex(vertex, obj) {
  const scaled = vec(
    vertex.x * obj.scale.x,
    vertex.y * obj.scale.y,
    vertex.z * obj.scale.z,
  );
  const rotated = rotateEuler(scaled, obj.rotation);
  return add(rotated, obj.position);
}

function getCameraBasis() {
  const cam = state.camera;
  const position = vec(
    cam.target.x + cam.distance * Math.cos(cam.pitch) * Math.sin(cam.yaw),
    cam.target.y + cam.distance * Math.sin(cam.pitch),
    cam.target.z + cam.distance * Math.cos(cam.pitch) * Math.cos(cam.yaw),
  );
  const forward = normalize(sub(cam.target, position));
  let right = normalize(cross(forward, vec(0, 1, 0)));
  if (length(right) < 0.0001) right = vec(1, 0, 0);
  const up = normalize(cross(right, forward));
  return { position, forward, right, up };
}

function projectPoint(worldPoint) {
  const { position, forward, right, up } = getCameraBasis();
  const rel = sub(worldPoint, position);
  const cx = dot(rel, right);
  const cy = dot(rel, up);
  const cz = dot(rel, forward);
  const width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;
  const focal = Math.min(width, height) * 0.75;
  if (cz <= 0.05) return null;
  return {
    x: width / 2 + (cx / cz) * focal,
    y: height / 2 - (cy / cz) * focal,
    depth: cz,
  };
}

// Cast a ray from screen pixel through the scene and intersect with horizontal plane at worldY
function rayAtY(screenX, screenY, worldY) {
  const basis = getCameraBasis();
  const rect = canvas.getBoundingClientRect();
  const focal = Math.min(rect.width, rect.height) * 0.75;
  const relX = (screenX - rect.width / 2) / focal;
  const relY = -(screenY - rect.height / 2) / focal;
  const dir = normalize(add(add(scale(basis.right, relX), scale(basis.up, relY)), basis.forward));
  if (Math.abs(dir.y) < 0.0001) return null;
  const t = (worldY - basis.position.y) / dir.y;
  if (t <= 0) return null;
  return add(basis.position, scale(dir, t));
}

function shadedColor(hex, amount) {
  const raw = hex.replace('#', '');
  const num = parseInt(raw, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  const factor = amount;
  r = clamp(Math.round(r * factor), 0, 255);
  g = clamp(Math.round(g * factor), 0, 255);
  b = clamp(Math.round(b * factor), 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function cubeMesh() {
  const vertices = [
    vec(-0.5, -0.5, -0.5), vec(0.5, -0.5, -0.5), vec(0.5, 0.5, -0.5), vec(-0.5, 0.5, -0.5),
    vec(-0.5, -0.5, 0.5), vec(0.5, -0.5, 0.5), vec(0.5, 0.5, 0.5), vec(-0.5, 0.5, 0.5),
  ];
  const faces = [
    [0, 1, 2], [0, 2, 3],
    [1, 5, 6], [1, 6, 2],
    [5, 4, 7], [5, 7, 6],
    [4, 0, 3], [4, 3, 7],
    [3, 2, 6], [3, 6, 7],
    [4, 5, 1], [4, 1, 0],
  ];
  return { vertices, faces };
}

function sphereMesh(latBands = 10, lonBands = 14) {
  const vertices = [];
  const faces = [];
  for (let lat = 0; lat <= latBands; lat += 1) {
    const theta = (lat * Math.PI) / latBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    for (let lon = 0; lon <= lonBands; lon += 1) {
      const phi = (lon * Math.PI * 2) / lonBands;
      vertices.push(vec(
        0.5 * Math.cos(phi) * sinTheta,
        0.5 * cosTheta,
        0.5 * Math.sin(phi) * sinTheta,
      ));
    }
  }
  for (let lat = 0; lat < latBands; lat += 1) {
    for (let lon = 0; lon < lonBands; lon += 1) {
      const first = lat * (lonBands + 1) + lon;
      const second = first + lonBands + 1;
      faces.push([first, second, first + 1]);
      faces.push([second, second + 1, first + 1]);
    }
  }
  return { vertices, faces };
}

function cylinderMesh(segments = 18) {
  const vertices = [vec(0, 0.5, 0), vec(0, -0.5, 0)];
  const faces = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * 0.5;
    const z = Math.sin(angle) * 0.5;
    vertices.push(vec(x, 0.5, z));
    vertices.push(vec(x, -0.5, z));
  }
  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments;
    const topA = 2 + i * 2;
    const bottomA = topA + 1;
    const topB = 2 + next * 2;
    const bottomB = topB + 1;
    faces.push([0, topB, topA]);
    faces.push([1, bottomA, bottomB]);
    faces.push([topA, topB, bottomB]);
    faces.push([topA, bottomB, bottomA]);
  }
  return { vertices, faces };
}

// Brett uses the same cube mesh, scaled flat (Pytha/PaletteCAT style)
function brettMesh() {
  return cubeMesh();
}

function primitiveMesh(type) {
  if (type === 'sphere') return sphereMesh();
  if (type === 'cylinder') return cylinderMesh();
  if (type === 'brett') return brettMesh();
  return cubeMesh();
}

function friendlyName(type) {
  return {
    cube: 'Wuerfel',
    sphere: 'Kugel',
    cylinder: 'Zylinder',
    brett: 'Brett',
  }[type] || type;
}

function createObject(type) {
  const id = state.nextId++;
  let baseScale = vec(1, 1, 1);
  if (type === 'cylinder') baseScale = vec(1, 1.3, 1);
  if (type === 'brett') baseScale = vec(2.5, 0.12, 1.5);
  const obj = {
    id,
    name: `${friendlyName(type)} ${id}`,
    type,
    color: palette[(id - 1) % palette.length],
    position: vec((id % 2) * 0.8 - 0.4, 0.8 + (id % 3) * 0.12, ((id + 1) % 2) * 0.7 - 0.35),
    rotation: vec(0, 0, 0),
    scale: baseScale,
  };
  if (type === 'brett') obj.operations = [];
  return obj;
}

// ---- Brett corner handles ----
// 8 corners: local signs for each corner of the unit cube
const CORNER_SIGNS = [
  { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 },
  { x: 1, y:  1, z: -1 }, { x: -1, y:  1, z: -1 },
  { x: -1, y: -1, z:  1 }, { x: 1, y: -1, z:  1 },
  { x: 1, y:  1, z:  1 }, { x: -1, y:  1, z:  1 },
];

function getBrettCorners(obj) {
  return CORNER_SIGNS.map((s) => ({
    world: transformVertex(vec(s.x * 0.5, s.y * 0.5, s.z * 0.5), obj),
    sign: s,
  }));
}

function hitTestBrettCorner(obj, sx, sy) {
  if (obj.type !== 'brett') return -1;
  const corners = getBrettCorners(obj);
  let best = -1, bestD = Infinity;
  for (let i = 0; i < corners.length; i++) {
    const sp = projectPoint(corners[i].world);
    if (!sp) continue;
    const d = Math.hypot(sp.x - sx, sp.y - sy);
    if (d < 16 && d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function drawBrettCorners(obj) {
  if (obj.type !== 'brett' || obj.id !== state.selectedId) return;
  const corners = getBrettCorners(obj);
  corners.forEach((c, i) => {
    const sp = projectPoint(c.world);
    if (!sp) return;
    const isSel = i === state.selectedCornerIdx;
    const isHov = i === state.hoveredCornerIdx;
    const r = isSel ? 11 : 8;

    ctx.save();
    ctx.shadowColor = 'rgba(113,88,164,0.35)';
    ctx.shadowBlur = isSel ? 14 : 7;

    ctx.beginPath();
    ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isSel ? '#7158A4' : isHov ? '#FFC857' : '#8AB5FF';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sp.x, sp.y, r * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();

    if (isSel) {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(113,88,164,0.38)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

// ---- Brett edges for kanteRunden ----
const BRETT_EDGES = [
  [vec(-0.5, 0.5, 0.5), vec(0.5, 0.5, 0.5)],
  [vec(0.5, 0.5, 0.5), vec(0.5, 0.5, -0.5)],
  [vec(0.5, 0.5, -0.5), vec(-0.5, 0.5, -0.5)],
  [vec(-0.5, 0.5, -0.5), vec(-0.5, 0.5, 0.5)],
  [vec(-0.5, 0.5, 0.5), vec(-0.5, -0.5, 0.5)],
  [vec(0.5, 0.5, 0.5), vec(0.5, -0.5, 0.5)],
  [vec(0.5, 0.5, -0.5), vec(0.5, -0.5, -0.5)],
  [vec(-0.5, 0.5, -0.5), vec(-0.5, -0.5, -0.5)],
];

// ---- Operation management ----
const OP_TOOL_NAMES = {
  bohrung: 'Bohrung',
  schnitt: 'Schnitt',
  fraesung: 'Fraesung',
  kanteRunden: 'Kante runden',
};

function addOperation(obj, type) {
  if (!obj.operations) obj.operations = [];
  const id = state.nextOpId++;
  let op;
  if (type === 'bohrung') {
    op = { id, type, u: 0, v: 0, r: 0.08 };
  } else if (type === 'schnitt') {
    op = { id, type, u1: -0.4, v1: 0, u2: 0.4, v2: 0 };
  } else if (type === 'fraesung') {
    op = { id, type, u: 0, v: 0, w: 0.25, h: 0.2 };
  } else if (type === 'kanteRunden') {
    const usedEdges = new Set(obj.operations.filter((o) => o.type === 'kanteRunden').map((o) => o.edgeIdx));
    let edgeIdx = 0;
    while (usedEdges.has(edgeIdx) && edgeIdx < BRETT_EDGES.length) edgeIdx++;
    op = { id, type, edgeIdx, radius: 0.03 };
  }
  if (op) {
    obj.operations.push(op);
    state.selectedOperationId = id;
  }
}

function getSelectedObject() {
  return state.objects.find((obj) => obj.id === state.selectedId) || null;
}

function selectObject(id) {
  state.selectedId = id;
  state.selectedOperationId = null;
  state.selectedCornerIdx = null;
  state.hoveredCornerIdx = null;
  refreshObjectList();
  renderInspector();
  render();
}

function addShape(type) {
  const obj = createObject(type);
  state.objects.push(obj);
  selectObject(obj.id);
}

function deleteSelected() {
  if (!state.selectedId) return;
  state.objects = state.objects.filter((obj) => obj.id !== state.selectedId);
  state.selectedId = state.objects.at(-1)?.id ?? null;
  state.selectedOperationId = null;
  state.selectedCornerIdx = null;
  refreshObjectList();
  renderInspector();
  render();
}

function resetScene() {
  state.objects = [];
  state.selectedId = null;
  state.selectedOperationId = null;
  state.selectedCornerIdx = null;
  state.hoveredCornerIdx = null;
  state.nextId = 1;
  state.nextOpId = 1;
  refreshObjectList();
  renderInspector();
  render();
}

function setActiveTool(tool) {
  state.activeTool = tool;
  toolButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tool === tool));
  renderInspector();
}

function updateObject(transformPath, value) {
  const obj = getSelectedObject();
  if (!obj) return;
  const [section, axis] = transformPath.split('.');
  obj[section][axis] = value;
  refreshObjectList();
  render();
}

function controlField(label, path, min, max, step, value, displayValue, unit = '') {
  const wrap = document.createElement('div');
  wrap.className = 'field';

  const lbl = document.createElement('label');
  lbl.textContent = label;
  wrap.appendChild(lbl);

  const row = document.createElement('div');
  row.className = 'range-row';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const pill = document.createElement('div');
  pill.className = 'value-pill';
  pill.textContent = `${displayValue}${unit}`;

  input.addEventListener('input', (event) => {
    const next = Number(event.target.value);
    updateObject(path, next);
    pill.textContent = `${path.startsWith('rotation') ? Math.round(deg(next)) : next.toFixed(2)}${unit}`;
  });

  row.append(input, pill);
  wrap.appendChild(row);
  return wrap;
}

function controlFieldDirect(label, min, max, step, value, unit, onInput) {
  const wrap = document.createElement('div');
  wrap.className = 'field';

  const lbl = document.createElement('label');
  lbl.textContent = label;
  wrap.appendChild(lbl);

  const row = document.createElement('div');
  row.className = 'range-row';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const pill = document.createElement('div');
  pill.className = 'value-pill';
  pill.textContent = `${value.toFixed(2)}${unit}`;

  input.addEventListener('input', (event) => {
    const next = Number(event.target.value);
    pill.textContent = `${next.toFixed(2)}${unit}`;
    onInput(next);
    render();
  });

  row.append(input, pill);
  wrap.appendChild(row);
  return wrap;
}

function emptyInspector(message) {
  inspector.innerHTML = `<div class="empty-state">${message}</div>`;
}

function renderInspector() {
  inspector.innerHTML = '';
  const obj = getSelectedObject();
  const tool = state.activeTool;
  const opTools = ['bohrung', 'schnitt', 'fraesung', 'kanteRunden'];

  if (opTools.includes(tool)) {
    if (!obj || obj.type !== 'brett') {
      emptyInspector('Brett auswaehlen, dann Bearbeitung hinzufuegen.');
      return;
    }
    renderOperationPanel(obj, tool);
    return;
  }

  if (tool === 'addCube' || tool === 'addSphere' || tool === 'addCylinder' || tool === 'addBrett') {
    const typeMap = { addCube: 'cube', addSphere: 'sphere', addCylinder: 'cylinder', addBrett: 'brett' };
    const type = typeMap[tool];
    const button = document.createElement('button');
    button.textContent = `${friendlyName(type)} einsetzen`;
    button.addEventListener('click', () => addShape(type));
    inspector.appendChild(button);

    const note = document.createElement('div');
    note.className = 'empty-state';
    note.textContent = 'Neue Formen erscheinen mittig in der Szene und koennen danach direkt bearbeitet werden.';
    inspector.appendChild(note);
    return;
  }

  if (!obj) {
    emptyInspector('Bitte zuerst ein Objekt auswaehlen oder ueber die Werkzeuge eine Form anlegen.');
    return;
  }

  const header = document.createElement('div');
  header.className = 'empty-state';
  const opInfo = obj.type === 'brett' && obj.operations?.length ? ` · ${obj.operations.length} Bearb.` : '';
  header.innerHTML = `<strong>${obj.name}</strong><br>${friendlyName(obj.type)}${opInfo}`;
  inspector.appendChild(header);

  // Show selected corner info for brett
  if (obj.type === 'brett' && state.selectedCornerIdx !== null) {
    const corners = getBrettCorners(obj);
    const c = corners[state.selectedCornerIdx];
    const s = c.sign;
    const cornerNote = document.createElement('div');
    cornerNote.className = 'empty-state';
    cornerNote.innerHTML = `<strong>Eckpunkt ${state.selectedCornerIdx + 1}</strong><br>X${s.x > 0 ? '+' : '−'} Y${s.y > 0 ? '+' : '−'} Z${s.z > 0 ? '+' : '−'}<br><small>Ziehen zum Verschieben</small>`;
    inspector.appendChild(cornerNote);
  }

  if (tool === 'move') {
    inspector.appendChild(controlField('X Position', 'position.x', -4, 4, 0.05, obj.position.x, obj.position.x.toFixed(2)));
    inspector.appendChild(controlField('Y Position', 'position.y', 0, 4, 0.05, obj.position.y, obj.position.y.toFixed(2)));
    inspector.appendChild(controlField('Z Position', 'position.z', -4, 4, 0.05, obj.position.z, obj.position.z.toFixed(2)));
    return;
  }

  if (tool === 'rotate') {
    inspector.appendChild(controlField('Drehung X', 'rotation.x', -Math.PI, Math.PI, 0.01, obj.rotation.x, Math.round(deg(obj.rotation.x)), '°'));
    inspector.appendChild(controlField('Drehung Y', 'rotation.y', -Math.PI, Math.PI, 0.01, obj.rotation.y, Math.round(deg(obj.rotation.y)), '°'));
    inspector.appendChild(controlField('Drehung Z', 'rotation.z', -Math.PI, Math.PI, 0.01, obj.rotation.z, Math.round(deg(obj.rotation.z)), '°'));
    return;
  }

  if (tool === 'scale') {
    inspector.appendChild(controlField('Breite', 'scale.x', 0.3, 3.5, 0.05, obj.scale.x, obj.scale.x.toFixed(2)));
    inspector.appendChild(controlField('Hoehe', 'scale.y', 0.3, 3.5, 0.05, obj.scale.y, obj.scale.y.toFixed(2)));
    inspector.appendChild(controlField('Tiefe', 'scale.z', 0.3, 3.5, 0.05, obj.scale.z, obj.scale.z.toFixed(2)));
    return;
  }

  if (tool === 'delete') {
    const btn = document.createElement('button');
    btn.className = 'danger';
    btn.textContent = `${obj.name} loeschen`;
    btn.addEventListener('click', deleteSelected);
    inspector.appendChild(btn);
    return;
  }
}

function renderOperationPanel(obj, tool) {
  const toolName = OP_TOOL_NAMES[tool];

  const addBtn = document.createElement('button');
  addBtn.textContent = `${toolName} hinzufuegen`;
  addBtn.addEventListener('click', () => {
    addOperation(obj, tool);
    renderInspector();
    render();
  });
  inspector.appendChild(addBtn);

  const ops = (obj.operations || []).filter((o) => o.type === tool);
  if (ops.length) {
    const listHdr = document.createElement('div');
    listHdr.className = 'empty-state';
    listHdr.innerHTML = `<strong>${ops.length}× ${toolName}</strong>`;
    inspector.appendChild(listHdr);

    ops.forEach((op) => {
      const row = document.createElement('div');
      row.className = 'op-list-row';

      const selBtn = document.createElement('button');
      selBtn.textContent = `#${op.id}`;
      if (op.id === state.selectedOperationId) selBtn.style.background = 'var(--butter)';
      selBtn.addEventListener('click', () => {
        state.selectedOperationId = op.id;
        renderInspector();
        render();
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'danger';
      delBtn.style.padding = '12px 14px';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        obj.operations = obj.operations.filter((o) => o.id !== op.id);
        if (state.selectedOperationId === op.id) state.selectedOperationId = null;
        renderInspector();
        render();
      });

      row.append(selBtn, delBtn);
      inspector.appendChild(row);
    });
  }

  const selOp = (obj.operations || []).find((o) => o.id === state.selectedOperationId && o.type === tool);
  if (selOp) {
    const hdr = document.createElement('div');
    hdr.className = 'empty-state';
    hdr.innerHTML = `<strong>${toolName} #${selOp.id}</strong>`;
    inspector.appendChild(hdr);

    if (selOp.type === 'bohrung') {
      inspector.appendChild(controlFieldDirect('U (Breite)', -0.45, 0.45, 0.01, selOp.u, '', (v) => { selOp.u = v; }));
      inspector.appendChild(controlFieldDirect('V (Tiefe)', -0.45, 0.45, 0.01, selOp.v, '', (v) => { selOp.v = v; }));
      inspector.appendChild(controlFieldDirect('Radius', 0.01, 0.25, 0.005, selOp.r, '', (v) => { selOp.r = v; }));
    } else if (selOp.type === 'schnitt') {
      inspector.appendChild(controlFieldDirect('Start U', -0.48, 0.48, 0.01, selOp.u1, '', (v) => { selOp.u1 = v; }));
      inspector.appendChild(controlFieldDirect('Start V', -0.48, 0.48, 0.01, selOp.v1, '', (v) => { selOp.v1 = v; }));
      inspector.appendChild(controlFieldDirect('Ende U', -0.48, 0.48, 0.01, selOp.u2, '', (v) => { selOp.u2 = v; }));
      inspector.appendChild(controlFieldDirect('Ende V', -0.48, 0.48, 0.01, selOp.v2, '', (v) => { selOp.v2 = v; }));
    } else if (selOp.type === 'fraesung') {
      inspector.appendChild(controlFieldDirect('U (Mitte)', -0.4, 0.4, 0.01, selOp.u, '', (v) => { selOp.u = v; }));
      inspector.appendChild(controlFieldDirect('V (Mitte)', -0.4, 0.4, 0.01, selOp.v, '', (v) => { selOp.v = v; }));
      inspector.appendChild(controlFieldDirect('Breite', 0.05, 0.9, 0.01, selOp.w, '', (v) => { selOp.w = v; }));
      inspector.appendChild(controlFieldDirect('Tiefe', 0.05, 0.9, 0.01, selOp.h, '', (v) => { selOp.h = v; }));
    } else if (selOp.type === 'kanteRunden') {
      inspector.appendChild(controlFieldDirect('Radius', 0.005, 0.12, 0.005, selOp.radius, '', (v) => { selOp.radius = v; }));
      const edgeLbl = document.createElement('div');
      edgeLbl.className = 'field';
      const edgeLabel = document.createElement('label');
      edgeLabel.textContent = 'Kante';
      const edgeNames = ['Vorne oben', 'Rechts oben', 'Hinten oben', 'Links oben', 'Vorne links', 'Vorne rechts', 'Hinten rechts', 'Hinten links'];
      const sel = document.createElement('select');
      sel.style.cssText = 'width:100%;padding:10px;border-radius:12px;border:2px solid var(--sky);background:#fff8ef;';
      edgeNames.forEach((name, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = `${i}: ${name}`;
        opt.selected = i === selOp.edgeIdx;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', (e) => { selOp.edgeIdx = Number(e.target.value); render(); });
      edgeLbl.append(edgeLabel, sel);
      inspector.appendChild(edgeLbl);
    }
  }
}

function refreshObjectList() {
  objectList.innerHTML = '';
  if (!state.objects.length) {
    objectList.innerHTML = '<div class="empty-state">Noch nichts gebaut. Waehle links ein Form-Werkzeug und setze ein Objekt ein.</div>';
    return;
  }
  state.objects.forEach((obj) => {
    const btn = document.createElement('button');
    btn.className = `object-item ${obj.id === state.selectedId ? 'active' : ''}`;
    const opInfo = obj.type === 'brett' && obj.operations?.length ? ` · ${obj.operations.length} Bearb.` : '';
    btn.innerHTML = `<strong>${obj.name}</strong><span>${friendlyName(obj.type)}${opInfo}</span>`;
    btn.addEventListener('click', () => selectObject(obj.id));
    objectList.appendChild(btn);
  });
}

// ---- Background ----
function drawCloud(x, y, scaleValue) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleValue, scaleValue);
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.beginPath();
  ctx.arc(0, 0, 20, Math.PI * 0.8, Math.PI * 0.2, true);
  ctx.arc(26, -10, 24, Math.PI, 0, false);
  ctx.arc(58, 0, 20, Math.PI * 0.8, Math.PI * 0.2, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBackground(width, height) {
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#E9F7FF');
  bg.addColorStop(1, '#FFF4D7');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 218, 107, 0.72)';
  ctx.beginPath();
  ctx.arc(width - 110, 110, 48, 0, Math.PI * 2);
  ctx.fill();

  drawCloud(120, 100, 1.1);
  drawCloud(width * 0.55, 84, 0.9);
  drawCloud(width - 260, 170, 1.05);
}

function drawGroundGrid() {
  const lines = [];
  for (let i = -6; i <= 6; i += 1) {
    lines.push([vec(i, 0, -6), vec(i, 0, 6)]);
    lines.push([vec(-6, 0, i), vec(6, 0, i)]);
  }
  ctx.save();
  lines.forEach(([a, b], idx) => {
    const pa = projectPoint(a);
    const pb = projectPoint(b);
    if (!pa || !pb) return;
    ctx.strokeStyle = idx % 2 === 0 ? 'rgba(113, 88, 164, 0.12)' : 'rgba(113, 88, 164, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  });
  ctx.restore();
}

function getRenderableTriangles() {
  const tris = [];
  state.objects.forEach((obj) => {
    const mesh = primitiveMesh(obj.type);
    const transformed = mesh.vertices.map((vertex) => transformVertex(vertex, obj));
    mesh.faces.forEach((face) => {
      const world = face.map((index) => transformed[index]);
      const projected = world.map(projectPoint);
      if (projected.some((p) => !p)) return;
      const normal = normalize(cross(sub(world[1], world[0]), sub(world[2], world[0])));
      const lightDir = normalize(vec(0.5, 1, 0.8));
      const brightness = 0.65 + Math.max(0, dot(normal, lightDir)) * 0.45;
      const avgDepth = projected.reduce((sum, p) => sum + p.depth, 0) / 3;
      tris.push({
        objectId: obj.id,
        projected,
        avgDepth,
        fill: shadedColor(obj.color, brightness),
      });
    });
  });
  return tris.sort((a, b) => b.avgDepth - a.avgDepth);
}

// ---- Brett operations in 3D ----
function drawBrettOperations(obj) {
  if (obj.type !== 'brett' || !obj.operations?.length) return;

  obj.operations.forEach((op) => {
    const isSel = op.id === state.selectedOperationId;

    if (op.type === 'bohrung') {
      const wCenter = transformVertex(vec(op.u, 0.5, op.v), obj);
      const wEdge = transformVertex(vec(op.u + op.r, 0.5, op.v), obj);
      const sc = projectPoint(wCenter);
      const se = projectPoint(wEdge);
      if (!sc || !se) return;
      const r = Math.max(4, Math.hypot(se.x - sc.x, se.y - sc.y));

      ctx.save();
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isSel ? 'rgba(255,146,174,0.3)' : 'rgba(255,146,174,0.15)';
      ctx.fill();
      ctx.strokeStyle = isSel ? '#FF92AE' : 'rgba(255,146,174,0.75)';
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.stroke();
      ctx.strokeStyle = isSel ? '#FF92AE' : 'rgba(255,146,174,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sc.x - r, sc.y); ctx.lineTo(sc.x + r, sc.y);
      ctx.moveTo(sc.x, sc.y - r); ctx.lineTo(sc.x, sc.y + r);
      ctx.stroke();
      ctx.restore();

    } else if (op.type === 'schnitt') {
      const w1 = transformVertex(vec(op.u1, 0.5, op.v1), obj);
      const w2 = transformVertex(vec(op.u2, 0.5, op.v2), obj);
      const s1 = projectPoint(w1);
      const s2 = projectPoint(w2);
      if (!s1 || !s2) return;

      ctx.save();
      ctx.setLineDash([8, 5]);
      ctx.strokeStyle = isSel ? '#F36C6C' : 'rgba(243,108,108,0.7)';
      ctx.lineWidth = isSel ? 3 : 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();
      ctx.setLineDash([]);
      [s1, s2].forEach((sp) => {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? '#F36C6C' : 'rgba(243,108,108,0.7)';
        ctx.fill();
      });
      ctx.restore();

    } else if (op.type === 'fraesung') {
      const corners = [
        transformVertex(vec(op.u - op.w / 2, 0.5, op.v - op.h / 2), obj),
        transformVertex(vec(op.u + op.w / 2, 0.5, op.v - op.h / 2), obj),
        transformVertex(vec(op.u + op.w / 2, 0.5, op.v + op.h / 2), obj),
        transformVertex(vec(op.u - op.w / 2, 0.5, op.v + op.h / 2), obj),
      ];
      const sc = corners.map(projectPoint);
      if (sc.some((p) => !p)) return;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(sc[0].x, sc[0].y);
      sc.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = isSel ? 'rgba(141,214,195,0.35)' : 'rgba(141,214,195,0.18)';
      ctx.fill();
      ctx.strokeStyle = isSel ? '#8DD6C3' : 'rgba(141,214,195,0.75)';
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

    } else if (op.type === 'kanteRunden') {
      const pair = BRETT_EDGES[op.edgeIdx % BRETT_EDGES.length];
      const w1 = transformVertex(pair[0], obj);
      const w2 = transformVertex(pair[1], obj);
      const s1 = projectPoint(w1);
      const s2 = projectPoint(w2);
      if (!s1 || !s2) return;

      ctx.save();
      ctx.strokeStyle = isSel ? '#C6A3FF' : 'rgba(198,163,255,0.65)';
      ctx.lineWidth = isSel ? 6 : 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();
      ctx.restore();

      const mx = (s1.x + s2.x) / 2;
      const my = (s1.y + s2.y) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(mx, my, 13, 0, Math.PI * 2);
      ctx.fillStyle = isSel ? '#C6A3FF' : 'rgba(198,163,255,0.85)';
      ctx.fill();
      ctx.font = '700 9px Inter, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`R${(op.radius * 100).toFixed(0)}`, mx, my);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
  });
}

function drawObjects() {
  const triangles = getRenderableTriangles();
  triangles.forEach((tri) => {
    ctx.beginPath();
    ctx.moveTo(tri.projected[0].x, tri.projected[0].y);
    tri.projected.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = tri.fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(57, 48, 76, 0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Draw operations and corner handles for bretter (on top of geometry)
  state.objects.forEach((obj) => {
    if (obj.type === 'brett') {
      drawBrettOperations(obj);
      drawBrettCorners(obj);
    }
  });

  // Selection indicators
  state.objects.forEach((obj) => {
    const center = projectPoint(obj.position);
    if (!center) return;
    const selected = obj.id === state.selectedId;
    ctx.fillStyle = selected ? '#7158A4' : '#FFFFFF';
    ctx.strokeStyle = selected ? '#FFFFFF' : 'rgba(113, 88, 164, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center.x, center.y, selected ? 10 : 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = selected ? '#FFFFFF' : '#4B3F63';
    ctx.font = '600 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(obj.id), center.x, center.y + 4);
  });
}

function render() {
  const width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;
  drawBackground(width, height);
  drawGroundGrid();
  drawObjects();
}

function findObjectByClick(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  let found = null;
  let bestDistance = Infinity;
  state.objects.forEach((obj) => {
    const center = projectPoint(obj.position);
    if (!center) return;
    const d = Math.hypot(center.x - x, center.y - y);
    if (d < 18 && d < bestDistance) {
      bestDistance = d;
      found = obj;
    }
  });
  return found;
}

canvas.addEventListener('contextmenu', (event) => event.preventDefault());

canvas.addEventListener('mousedown', (event) => {
  if (event.button === 2) {
    state.pointer.rotating = true;
    state.pointer.lastX = event.clientX;
    state.pointer.lastY = event.clientY;
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const sx = event.clientX - rect.left;
  const sy = event.clientY - rect.top;

  // Check brett corner handles first (always active when a brett is selected)
  const selObj = state.objects.find((o) => o.id === state.selectedId);
  if (selObj && selObj.type === 'brett') {
    const ci = hitTestBrettCorner(selObj, sx, sy);
    if (ci >= 0) {
      state.selectedCornerIdx = ci;
      const corners = getBrettCorners(selObj);
      state.dragCorner = {
        objId: selObj.id,
        cornerIdx: ci,
        sign: corners[ci].sign,
        origPos: { ...selObj.position },
        origScale: { ...selObj.scale },
      };
      canvas.style.cursor = 'grabbing';
      renderInspector();
      render();
      return;
    }
  }

  // Regular object selection
  const hit = findObjectByClick(event.clientX, event.clientY);
  if (hit) {
    selectObject(hit.id);
  } else {
    state.selectedCornerIdx = null;
    renderInspector();
    render();
  }
});

window.addEventListener('mouseup', () => {
  if (state.dragCorner) {
    state.dragCorner = null;
    canvas.style.cursor = 'default';
  }
  state.pointer.rotating = false;
});

window.addEventListener('mousemove', (event) => {
  // Corner drag: resize brett via ray-plane intersection
  if (state.dragCorner) {
    const obj = state.objects.find((o) => o.id === state.dragCorner.objId);
    if (obj) {
      const rect = canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const { sign, origPos, origScale } = state.dragCorner;

      // Intersect ray with the Y-plane at the dragged corner's height
      const cornerY = origPos.y + origScale.y / 2 * sign.y;
      const hit = rayAtY(sx, sy, cornerY);
      if (hit) {
        // Opposite corner in XZ stays fixed
        const oppX = origPos.x - origScale.x / 2 * sign.x;
        const oppZ = origPos.z - origScale.z / 2 * sign.z;

        const newScaleX = Math.abs(hit.x - oppX);
        const newScaleZ = Math.abs(hit.z - oppZ);
        if (newScaleX > 0.15) {
          obj.scale.x = newScaleX;
          obj.position.x = (hit.x + oppX) / 2;
        }
        if (newScaleZ > 0.15) {
          obj.scale.z = newScaleZ;
          obj.position.z = (hit.z + oppZ) / 2;
        }
        refreshObjectList();
        renderInspector();
        render();
      }
    }
    return;
  }

  // Camera rotation
  if (state.pointer.rotating) {
    const dx = event.clientX - state.pointer.lastX;
    const dy = event.clientY - state.pointer.lastY;
    state.pointer.lastX = event.clientX;
    state.pointer.lastY = event.clientY;
    state.camera.yaw += dx * 0.01;
    state.camera.pitch = clamp(state.camera.pitch + dy * 0.01, -1.2, 1.2);
    render();
    return;
  }

  // Hover detection for corner handles
  const selObj = state.objects.find((o) => o.id === state.selectedId);
  if (selObj && selObj.type === 'brett') {
    const rect = canvas.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const ci = hitTestBrettCorner(selObj, sx, sy);
    const prev = state.hoveredCornerIdx;
    state.hoveredCornerIdx = ci >= 0 ? ci : null;
    if (state.hoveredCornerIdx !== prev) {
      canvas.style.cursor = ci >= 0 ? 'grab' : 'default';
      render();
    }
  }
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  state.camera.distance = clamp(state.camera.distance + event.deltaY * 0.01, 5, 24);
  render();
}, { passive: false });

function getExportTriangles() {
  const output = [];
  state.objects.forEach((obj) => {
    const mesh = primitiveMesh(obj.type);
    const transformed = mesh.vertices.map((vertex) => transformVertex(vertex, obj));
    mesh.faces.forEach((face) => {
      output.push(face.map((index) => transformed[index]));
    });
  });
  return output;
}

function exportOBJ() {
  const lines = ['# Exported from CuddleCAD'];
  let offset = 1;
  state.objects.forEach((obj) => {
    const mesh = primitiveMesh(obj.type);
    const transformed = mesh.vertices.map((vertex) => transformVertex(vertex, obj));
    lines.push(`o ${obj.name.replace(/\s+/g, '_')}`);
    transformed.forEach((v) => lines.push(`v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}`));
    mesh.faces.forEach((face) => lines.push(`f ${face[0] + offset} ${face[1] + offset} ${face[2] + offset}`));
    offset += transformed.length;
  });
  downloadTextFile('cuddlecad-model.obj', lines.join('\n'));
}

function exportSTL() {
  const triangles = getExportTriangles();
  const lines = ['solid cuddlecad'];
  triangles.forEach((tri) => {
    const normal = normalize(cross(sub(tri[1], tri[0]), sub(tri[2], tri[0])));
    lines.push(`  facet normal ${normal.x.toFixed(6)} ${normal.y.toFixed(6)} ${normal.z.toFixed(6)}`);
    lines.push('    outer loop');
    tri.forEach((v) => lines.push(`      vertex ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}`));
    lines.push('    endloop');
    lines.push('  endfacet');
  });
  lines.push('endsolid cuddlecad');
  downloadTextFile('cuddlecad-model.stl', lines.join('\n'));
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById('exportObj').addEventListener('click', exportOBJ);
document.getElementById('exportStl').addEventListener('click', exportSTL);
document.getElementById('resetScene').addEventListener('click', resetScene);

toolButtons.forEach((btn) => btn.addEventListener('click', () => setActiveTool(btn.dataset.tool)));

refreshObjectList();
renderInspector();
resizeCanvas();
addShape('cube');
addShape('sphere');
addShape('brett');
setActiveTool('move');
