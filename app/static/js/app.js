const canvas = document.getElementById('viewport');
const ctx = canvas.getContext('2d');
const toolButtons = [...document.querySelectorAll('.tool')];
const inspector = document.getElementById('toolInspector');
const objectList = document.getElementById('objectList');

const palette = ['#FFC857', '#F9A66C', '#8DD6C3', '#8AB5FF', '#C6A3FF', '#FF92AE', '#F5DD78'];

const state = {
  activeTool: 'addCube',
  selectedId: null,
  objects: [],
  nextId: 1,
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

function primitiveMesh(type) {
  if (type === 'sphere') return sphereMesh();
  if (type === 'cylinder') return cylinderMesh();
  return cubeMesh();
}

function friendlyName(type) {
  return {
    cube: 'Wuerfel',
    sphere: 'Kugel',
    cylinder: 'Zylinder',
  }[type] || type;
}

function createObject(type) {
  const id = state.nextId++;
  const baseScale = type === 'cylinder' ? vec(1, 1.3, 1) : vec(1, 1, 1);
  return {
    id,
    name: `${friendlyName(type)} ${id}`,
    type,
    color: palette[(id - 1) % palette.length],
    position: vec((id % 2) * 0.8 - 0.4, 0.8 + (id % 3) * 0.12, ((id + 1) % 2) * 0.7 - 0.35),
    rotation: vec(0, 0, 0),
    scale: baseScale,
  };
}

function getSelectedObject() {
  return state.objects.find((obj) => obj.id === state.selectedId) || null;
}

function selectObject(id) {
  state.selectedId = id;
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
  refreshObjectList();
  renderInspector();
  render();
}

function resetScene() {
  state.objects = [];
  state.selectedId = null;
  state.nextId = 1;
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

function emptyInspector(message) {
  inspector.innerHTML = `<div class="empty-state">${message}</div>`;
}

function renderInspector() {
  inspector.innerHTML = '';
  const obj = getSelectedObject();
  const tool = state.activeTool;

  if (tool === 'addCube' || tool === 'addSphere' || tool === 'addCylinder') {
    const button = document.createElement('button');
    const type = tool === 'addCube' ? 'cube' : tool === 'addSphere' ? 'sphere' : 'cylinder';
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
  header.innerHTML = `<strong>${obj.name}</strong><br>${friendlyName(obj.type)} in ${obj.color}`;
  inspector.appendChild(header);

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

function refreshObjectList() {
  objectList.innerHTML = '';
  if (!state.objects.length) {
    objectList.innerHTML = '<div class="empty-state">Noch nichts gebaut. Waehle links ein Form-Werkzeug und setze ein Objekt ein.</div>';
    return;
  }
  state.objects.forEach((obj) => {
    const btn = document.createElement('button');
    btn.className = `object-item ${obj.id === state.selectedId ? 'active' : ''}`;
    btn.innerHTML = `<strong>${obj.name}</strong><span>${friendlyName(obj.type)} · Farbe ${obj.color}</span>`;
    btn.addEventListener('click', () => selectObject(obj.id));
    objectList.appendChild(btn);
  });
}

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
  const hit = findObjectByClick(event.clientX, event.clientY);
  if (hit) {
    selectObject(hit.id);
  }
});

window.addEventListener('mouseup', () => {
  state.pointer.rotating = false;
});

window.addEventListener('mousemove', (event) => {
  if (!state.pointer.rotating) return;
  const dx = event.clientX - state.pointer.lastX;
  const dy = event.clientY - state.pointer.lastY;
  state.pointer.lastX = event.clientX;
  state.pointer.lastY = event.clientY;
  state.camera.yaw += dx * 0.01;
  state.camera.pitch = clamp(state.camera.pitch + dy * 0.01, -1.2, 1.2);
  render();
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
setActiveTool('move');
