import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─────────────────────────────────────────────────────────────
// Config: the instrument's geometry doubles as its tuning.
// ─────────────────────────────────────────────────────────────
const CFG = {
  antennaX: 0.75, antennaZ: 0.0,    // pitch antenna position (vertical rod)
  antennaBase: 1.04, antennaTop: 2.7,
  loopX: -1.18, loopY: 1.05,        // volume loop position (horizontal ring)
  minDist: 0.06, maxDist: 2.2,      // pitch field: nearest → highest, farthest → lowest
  fLow: 110, octaves: 4,            // A2 … A6
  volCeil: 2.5,                     // hand height for full volume
  depthRange: 1.6,
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// ── The math ────────────────────────────────────────────────
// Horizontal distance to the antenna maps exponentially to frequency, so
// every octave occupies the same physical distance (easy to "learn" positions).
//   t = (d - dMin) / (dMax - dMin)
//   f = fLow · 2^(octaves · (1 − t))
function distanceToFreq(d) {
  const t = clamp((d - CFG.minDist) / (CFG.maxDist - CFG.minDist));
  return CFG.fLow * Math.pow(2, CFG.octaves * (1 - t));
}
function freqToDistance(f) {
  const t = 1 - Math.log2(f / CFG.fLow) / CFG.octaves;
  return CFG.minDist + t * (CFG.maxDist - CFG.minDist);
}
// Hand height above the loop → amplitude. Squared for a perceptually smoother fade.
function heightToGain(y) {
  const v = clamp((y - CFG.loopY) / (CFG.volCeil - CFG.loopY));
  return v * v;
}
const freqToMidi = (f) => 69 + 12 * Math.log2(f / 440);
const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ─────────────────────────────────────────────────────────────
// Scene
// ─────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07070b);
scene.fog = new THREE.Fog(0x07070b, 7, 16);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 100);
camera.position.set(0, 2.0, 5.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.5, 0);
controls.mouseButtons = { LEFT: null, MIDDLE: null, RIGHT: THREE.MOUSE.ROTATE };
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.minPolarAngle = 0.6;
controls.maxPolarAngle = 1.75;
controls.update();
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

scene.add(new THREE.HemisphereLight(0x8899ff, 0x221510, 1.2));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(2, 6, 3);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
scene.add(key);

// Floor
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(12, 64),
  new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.95 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(12, 48, 0x2a2a44, 0x16162a);
grid.position.y = 0.001;
scene.add(grid);

// Cabinet + stand
const wood = new THREE.MeshStandardMaterial({ color: 0x5a3220, roughness: 0.5, metalness: 0.05 });
const metal = new THREE.MeshStandardMaterial({ color: 0xcfd3dc, roughness: 0.25, metalness: 1 });
const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.55), wood);
cabinet.position.set(0, 0.96, 0);
cabinet.castShadow = cabinet.receiveShadow = true;
scene.add(cabinet);
for (const x of [-0.7, 0.7]) {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.88, 12), metal);
  leg.position.set(x, 0.44, 0);
  leg.castShadow = true;
  scene.add(leg);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 24), metal);
  foot.position.set(x, 0.015, 0);
  scene.add(foot);
}

// Pitch antenna
const antennaMat = new THREE.MeshStandardMaterial({ color: 0xd8dde8, metalness: 1, roughness: 0.2, emissive: 0x55ccff, emissiveIntensity: 0.1 });
const antennaLen = CFG.antennaTop - CFG.antennaBase;
const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, antennaLen, 16), antennaMat);
antenna.position.set(CFG.antennaX, CFG.antennaBase + antennaLen / 2, CFG.antennaZ);
antenna.castShadow = true;
scene.add(antenna);

// Volume loop
const loopMat = new THREE.MeshStandardMaterial({ color: 0xd8dde8, metalness: 1, roughness: 0.2, emissive: 0xff66cc, emissiveIntensity: 0.1 });
const loop = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.012, 12, 64), loopMat);
loop.rotation.x = Math.PI / 2;
loop.position.set(CFG.loopX, CFG.loopY, 0);
loop.castShadow = true;
scene.add(loop);
const loopArm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.14, 8), metal);
loopArm.rotation.z = Math.PI / 2;
loopArm.position.set(-0.95 - 0.0, CFG.loopY, 0);
scene.add(loopArm);

// Silence plane at loop height (hand below this = no sound)
const silence = new THREE.Mesh(
  new THREE.PlaneGeometry(5, 4),
  new THREE.MeshBasicMaterial({ color: 0xff66cc, transparent: true, opacity: 0.035, side: THREE.DoubleSide, depthWrite: false })
);
silence.rotation.x = -Math.PI / 2;
silence.position.set(0, CFG.loopY, 0);
scene.add(silence);

// Note rings: concentric circles around the antenna, one per semitone,
// drawn at hand height so you can "see" the pitch field.
function makeLabel(text) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 36px ui-monospace, Menlo, monospace';
  g.fillStyle = '#ffffff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 64, 32);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.6, depthWrite: false }));
  s.scale.set(0.16, 0.08, 1);
  return s;
}
const rings = new THREE.Group();
rings.position.set(CFG.antennaX, 0, CFG.antennaZ);
scene.add(rings);
const ringByMidi = new Map();
const midiLo = Math.ceil(freqToMidi(CFG.fLow));
const midiHi = Math.floor(freqToMidi(CFG.fLow * 2 ** CFG.octaves));
for (let m = midiLo; m <= midiHi; m++) {
  const r = freqToDistance(midiToFreq(m));
  if (r < CFG.minDist) continue;
  const pts = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  const isC = m % 12 === 0;
  const natural = !NOTE_NAMES[m % 12].includes('#');
  const base = isC ? 0.45 : natural ? 0.16 : 0.06;
  const mat = new THREE.LineBasicMaterial({ color: isC ? 0x88ddff : 0x6677aa, transparent: true, opacity: base, depthWrite: false });
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
  line.userData.base = base;
  rings.add(line);
  ringByMidi.set(m, line);
  if (isC) {
    const label = makeLabel(`C${m / 12 - 1}`);
    label.position.set(0, 0.05, r);
    rings.add(label);
  }
}

// The hand
const handColor = new THREE.Color();
const hand = new THREE.Mesh(
  new THREE.SphereGeometry(0.055, 32, 16),
  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5 })
);
hand.castShadow = true;
scene.add(hand);
const handLight = new THREE.PointLight(0xffffff, 1.5, 2.5, 2);
hand.add(handLight);

// Depth helpers: drop line + floor marker so z is readable
const dropGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const drop = new THREE.Line(dropGeo, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.05, gapSize: 0.05, transparent: true, opacity: 0.35 }));
scene.add(drop);
const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.07, 0.09, 32),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
);
marker.rotation.x = -Math.PI / 2;
scene.add(marker);

// Field line: hand → nearest point on antenna
const fieldGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const fieldLine = new THREE.Line(fieldGeo, new THREE.LineBasicMaterial({ color: 0x55ccff, transparent: true, opacity: 0.6 }));
scene.add(fieldLine);

// Oscilloscope floating behind the instrument
const SCOPE_N = 512;
const scopeGeo = new THREE.BufferGeometry();
scopeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SCOPE_N * 3), 3));
const scope = new THREE.Line(scopeGeo, new THREE.LineBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.85 }));
scope.position.set(0, 2.3, -1.4);
scene.add(scope);

// ─────────────────────────────────────────────────────────────
// Audio
// ─────────────────────────────────────────────────────────────
const state = {
  depth: 0, active: false, muted: false,
  quantize: false, vibrato: true, echo: true,
  freq: CFG.fLow, gain: 0,
};

let audio = null;
function initAudio() {
  const ctx = new AudioContext();
  // Mostly sine with a few soft harmonics: the classic "voice-like" theremin tone.
  const real = new Float32Array([0, 1, 0.32, 0.14, 0.07, 0.035, 0.015]);
  const imag = new Float32Array(real.length);
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(ctx.createPeriodicWave(real, imag));
  osc.frequency.value = CFG.fLow;

  // Vibrato LFO → modulates oscillator frequency (depth in Hz, scaled per frame).
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.6;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0;
  lfo.connect(lfoDepth).connect(osc.frequency);

  const voice = ctx.createGain();
  voice.gain.value = 0;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 4200;
  tone.Q.value = 0.5;

  const master = ctx.createGain();
  master.gain.value = 0.5;

  // Simple feedback echo
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.32;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 2200;
  const wet = ctx.createGain();
  wet.gain.value = 0.28;

  const comp = ctx.createDynamicsCompressor();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;

  osc.connect(voice).connect(tone);
  tone.connect(master);
  tone.connect(delay);
  delay.connect(damp).connect(feedback).connect(delay);
  damp.connect(wet).connect(master);
  master.connect(comp).connect(analyser).connect(ctx.destination);

  osc.start();
  lfo.start();
  return { ctx, osc, lfoDepth, voice, wet, analyser, buf: new Float32Array(analyser.fftSize) };
}

function updateAudio() {
  if (!audio) return;
  const { ctx, osc, lfoDepth, voice, wet } = audio;
  const now = ctx.currentTime;
  osc.frequency.setTargetAtTime(state.freq, now, state.quantize ? 0.04 : 0.012);
  lfoDepth.gain.setTargetAtTime(state.vibrato ? state.freq * 0.007 : 0, now, 0.1);
  const g = state.active && !state.muted ? state.gain : 0;
  voice.gain.setTargetAtTime(g, now, 0.025);
  wet.gain.setTargetAtTime(state.echo ? 0.28 : 0, now, 0.05);
}

// ─────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────
const pointer = new THREE.Vector2(0, 0);
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane();
const tmpV = new THREE.Vector3();
const camDir = new THREE.Vector3();

addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  state.active = true;
});
document.addEventListener('pointerleave', () => (state.active = false));
addEventListener('blur', () => (state.active = false));
addEventListener('wheel', (e) => {
  state.depth = clamp(state.depth + e.deltaY * 0.0015, -CFG.depthRange, CFG.depthRange);
}, { passive: true });

const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'KeyQ') state.quantize = !state.quantize;
  if (e.code === 'KeyV') state.vibrato = !state.vibrato;
  if (e.code === 'KeyE') state.echo = !state.echo;
  if (e.code === 'Space') { state.muted = !state.muted; e.preventDefault(); }
  renderModes();
});
addEventListener('keyup', (e) => keys.delete(e.code));

const startEl = document.getElementById('start');
startEl.addEventListener('click', async () => {
  audio ??= initAudio();
  await audio.ctx.resume();
  startEl.remove();
});

// ─────────────────────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────────────────────
const $note = document.getElementById('note');
const $freq = document.getElementById('freq');
const $cents = document.querySelector('#cents > div');
const $vol = document.querySelector('#vol > div');
const $depth = document.getElementById('depth');
const $modes = document.getElementById('modes');
function renderModes() {
  const m = (on, label) => `<span class="${on ? 'on' : 'off'}">${label} ${on ? 'on' : 'off'}</span>`;
  $modes.innerHTML = [m(state.quantize, 'snap'), m(state.vibrato, 'vibrato'), m(state.echo, 'echo'), m(!state.muted, 'sound')].join('<br>');
}
renderModes();

// ─────────────────────────────────────────────────────────────
// Loop
// ─────────────────────────────────────────────────────────────
let litRing = null;
const clock = new THREE.Clock();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (keys.has('KeyW')) state.depth = clamp(state.depth + dt * 1.2, -CFG.depthRange, CFG.depthRange);
  if (keys.has('KeyS')) state.depth = clamp(state.depth - dt * 1.2, -CFG.depthRange, CFG.depthRange);
  controls.update();

  // Hand position: intersect the mouse ray with a vertical plane facing the
  // camera, pushed forward/back by the scroll depth.
  camera.getWorldDirection(camDir);
  camDir.y = 0;
  camDir.normalize();
  tmpV.copy(controls.target).addScaledVector(camDir, state.depth);
  plane.setFromNormalAndCoplanarPoint(camDir, tmpV);
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.ray.intersectPlane(plane, tmpV)) {
    tmpV.y = clamp(tmpV.y, 0.06, 3.5);
    hand.position.copy(tmpV);
  }
  const p = hand.position;

  // Pitch: horizontal distance to the antenna
  const dx = p.x - CFG.antennaX;
  const dz = p.z - CFG.antennaZ;
  const d = Math.hypot(dx, dz);
  let freq = distanceToFreq(d);
  const rawMidi = freqToMidi(freq);
  if (state.quantize) freq = midiToFreq(Math.round(rawMidi));
  state.freq = freq;

  // Volume: height above the loop
  state.gain = heightToGain(p.y);
  updateAudio();

  // ── visuals ──
  const proximity = 1 - clamp((d - CFG.minDist) / (CFG.maxDist - CFG.minDist));
  const audible = state.active && !state.muted ? state.gain : 0;
  handColor.setHSL(((rawMidi % 12) + 12) % 12 / 12, 0.85, 0.6);
  hand.material.color.copy(handColor);
  hand.material.emissive.copy(handColor);
  hand.material.emissiveIntensity = 0.4 + audible * 2.5;
  handLight.color.copy(handColor);
  handLight.intensity = 0.3 + audible * 3;

  antennaMat.emissiveIntensity = 0.05 + proximity * proximity * 2.5 * (0.3 + audible);
  loopMat.emissiveIntensity = 0.05 + (1 - state.gain) * 0.8;

  rings.position.y = p.y;
  const nearest = ringByMidi.get(Math.round(rawMidi));
  if (litRing !== nearest) {
    if (litRing) litRing.material.opacity = litRing.userData.base;
    litRing = nearest || null;
  }
  if (litRing) litRing.material.opacity = 0.9;

  const fp = fieldGeo.attributes.position;
  fp.setXYZ(0, p.x, p.y, p.z);
  fp.setXYZ(1, CFG.antennaX, clamp(p.y, CFG.antennaBase, CFG.antennaTop), CFG.antennaZ);
  fp.needsUpdate = true;
  fieldLine.material.color.copy(handColor);
  fieldLine.material.opacity = 0.15 + audible * 0.8;

  const dp = dropGeo.attributes.position;
  dp.setXYZ(0, p.x, p.y, p.z);
  dp.setXYZ(1, p.x, 0.002, p.z);
  dp.needsUpdate = true;
  drop.computeLineDistances();
  marker.position.set(p.x, 0.003, p.z);
  marker.material.color.copy(handColor);

  // Oscilloscope: stabilised on a rising zero crossing
  if (audio) {
    const { analyser, buf } = audio;
    analyser.getFloatTimeDomainData(buf);
    let start = 0;
    for (let i = 1; i < buf.length - SCOPE_N; i++) {
      if (buf[i - 1] < 0 && buf[i] >= 0) { start = i; break; }
    }
    const sp = scopeGeo.attributes.position;
    for (let i = 0; i < SCOPE_N; i++) {
      sp.setXYZ(i, (i / (SCOPE_N - 1) - 0.5) * 3.4, buf[start + i] * 0.9, 0);
    }
    sp.needsUpdate = true;
    scope.material.color.copy(handColor);
  }

  // HUD
  const n = Math.round(rawMidi);
  const cents = (rawMidi - n) * 100;
  $note.innerHTML = `${NOTE_NAMES[((n % 12) + 12) % 12]}<small>${Math.floor(n / 12) - 1}</small>`;
  $freq.textContent = `${freq.toFixed(1)} Hz  ${state.quantize ? '' : (cents >= 0 ? '+' : '') + cents.toFixed(0) + '¢'}`;
  $cents.style.left = `${50 + (state.quantize ? 0 : cents)}%`;
  $vol.style.width = `${audible * 100}%`;
  $depth.textContent = `depth ${state.depth >= 0 ? '+' : ''}${state.depth.toFixed(2)}`;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
