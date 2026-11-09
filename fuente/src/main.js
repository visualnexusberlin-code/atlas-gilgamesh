/* ============================================================
   GILGAMESH — LA MEMORIA DE URUK
   Motor del recorrido. El texto vive en el DOM (#lectura);
   aquí sólo vive el espacio.
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { prepararMateriales } from './mat.js';
import { SALAS, construirMundo, sueloEn, OJO, VIVO, MIRADOR_Z, RAYO } from './mundo.js';
import { mezclar, dirSol, crearCielo, GRADE } from './atmosfera.js';
import { Sonido } from './sonido.js';

const raiz = document.documentElement;
raiz.classList.add('js');
const $ = (q) => document.querySelector(q);
const TXT = window.__TXT || {}, CUN = window.__CUN || { estaciones: [] };
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const params = new URLSearchParams(location.search);
const menosMov = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tactil = matchMedia('(pointer: coarse)').matches;
const calidad = params.get('calidad') || (tactil || (navigator.deviceMemory && navigator.deviceMemory < 4) ? 'media' : 'alta');

/* ---------- Contenido desde la capa de lectura ---------- */
const secciones = [...document.querySelectorAll('#lectura .estacion')];
const DATOS = secciones.map((sec, i) => {
  const im = sec.querySelector('.tablilla img');
  return {
    i, id: sec.id, titulo: sec.querySelector('h2 .t').textContent,
    lugar: sec.dataset.lugar, cuerpo: sec.querySelector('.cuerpo').innerHTML,
    cita: sec.querySelector('.cita p').textContent, img: im,
    aspecto: im ? (+im.getAttribute('width') / +im.getAttribute('height')) : 1.6
  };
});
const PIEZAS = [...document.querySelectorAll('#testimonios figure')].map(f => ({
  img: f.querySelector('img'), estacion: +f.dataset.estacion, aspecto: +f.dataset.aspecto,
  titulo: f.querySelector('h3').textContent, nota: f.querySelector('p').textContent
}));

function soporta3D() {
  try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; }
}

/* ============================================================
   ESTADO
   ============================================================ */
let render, escena, camara, composer, bloom, gtao, grade, cielo, sol, hemi, pmrem, entornoRT = null;
let listo = false, activo = false, s = -1, objetivo = -1, ultimoInput = 0, estacionActual = null;
const atm = {};
const luces = { pares: [], impares: [], focos: [] };
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
let mirada = new THREE.Vector3(0, 0, -1);
const raton = { x: 0, y: 0, sx: 0, sy: 0 };
const sonido = new Sonido();
let relampago = { t: 0, proximo: 4 };

/* Estaciones con parada: -1 umbral, 0..11 estaciones, 12 mirador */
const PARADAS_Z = [14, ...SALAS.map(x => x.zParada), MIRADOR_Z];
const S_MIN = -1, S_MAX = 12;
function zDe(sv) {
  const k = Math.max(0, Math.min(PARADAS_Z.length - 1.0001, sv + 1));
  const i = Math.floor(k), f = k - i;
  return PARADAS_Z[i] + (PARADAS_Z[i + 1] - PARADAS_Z[i]) * f;
}
function alturaOjo(z) {
  const sd = SALAS[9];
  if (z < sd.zIni && z > sd.zFin) return OJO;     // calzada del Diluvio
  return sueloEn(z) + OJO;
}

/* ============================================================
   TEXTURAS DE LOS RELIEVES
   El color sale de la imagen del DOM; la normal se deriva de su
   propia luminancia, de modo que la luz de la escena roza las
   figuras talladas.
   ============================================================ */
function texturaDesdeImg(img, maxW = 1440) {
  const t = new THREE.Texture(img);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (img.complete) t.needsUpdate = true; else img.addEventListener('load', () => (t.needsUpdate = true), { once: true });
  return t;
}
function normalDesdeImg(img, w = 900) {
  const h = Math.round(w * img.naturalHeight / img.naturalWidth);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.filter = 'grayscale(1) blur(0.8px)'; x.drawImage(img, 0, 0, w, h);
  const src = x.getImageData(0, 0, w, h).data, out = x.createImageData(w, h), d = out.data;
  const L = (a, b) => src[(Math.min(h - 1, Math.max(0, b)) * w + Math.min(w - 1, Math.max(0, a))) * 4] / 255;
  for (let y = 0; y < h; y++) for (let a = 0; a < w; a++) {
    const dx = (L(a + 1, y) - L(a - 1, y)) * 3.2, dy = (L(a, y + 1) - L(a, y - 1)) * 3.2;
    const l = Math.hypot(dx, dy, 1), i = (y * w + a) * 4;
    d[i] = (-dx / l * .5 + .5) * 255; d[i + 1] = (dy / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
  }
  x.filter = 'none'; x.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
const esperarImg = (img) => img.complete && img.naturalWidth ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; });

/* ============================================================
   EFECTOS: polvo, lluvia, llamas
   ============================================================ */
let polvo, lluvia, llamas = [];
function crearPolvo() {
  const n = 1800, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - .5) * 40; p[i * 3 + 1] = Math.random() * 14; p[i * 3 + 2] = (Math.random() - .5) * 40; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uCam: { value: new THREE.Vector3() }, uT: { value: 0 }, uCol: { value: new THREE.Color(0xFFE2B8) }, uOp: { value: 0.5 }, uEsc: { value: 1 } },
    vertexShader: `uniform vec3 uCam; uniform float uT, uEsc; varying float vA;
      void main(){ vec3 p = position; p.x += sin(uT*.13 + position.z)*0.6; p.y += sin(uT*.21 + position.x)*0.4;
        p.xz = mod(p.xz - uCam.xz + 20.0, 40.0) - 20.0 + uCam.xz; p.y = mod(p.y - uCam.y + 4.0, 14.0) + uCam.y - 4.0;
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv;
        gl_PointSize = uEsc * 26.0 / -mv.z; vA = smoothstep(32.0, 4.0, -mv.z) * smoothstep(0.3, 1.5, -mv.z); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uOp; varying float vA;
      void main(){ float d = length(gl_PointCoord-.5); gl_FragColor = vec4(uCol * uOp * vA * smoothstep(.5,.0,d), 1.); }`
  });
  polvo = new THREE.Points(g, m); polvo.frustumCulled = false; escena.add(polvo);
}
function crearLluvia() {
  const n = 12000, p = new Float32Array(n * 6), fin = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - .5) * 60, y = Math.random() * 30, z = (Math.random() - .5) * 60;
    p.set([x, y, z, x, y, z], i * 6); fin[i * 2 + 1] = 1;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('fin', new THREE.BufferAttribute(fin, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uCam: { value: new THREE.Vector3() }, uT: { value: 0 }, uOp: { value: 0 }, uViento: { value: 0 }, uCol: { value: new THREE.Color(0xE6EEF4) } },
    vertexShader: `uniform vec3 uCam; uniform float uT, uViento; attribute float fin; varying float vA;
      void main(){ vec3 p = position; float caida = uT * (20.0 - uViento*6.0);
        p.y = mod(p.y - caida, 30.0) - 6.0 + uCam.y;
        p.xz = mod(p.xz - uCam.xz + 30.0, 60.0) - 30.0 + uCam.xz;
        p += fin * vec3(-uViento*1.3, 1.25, uViento*0.25);
        vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv; vA = smoothstep(40.0, 2.0, -mv.z) * (0.4 + 0.6*fin); }`,
    fragmentShader: `uniform float uOp; uniform vec3 uCol; varying float vA; void main(){ gl_FragColor = vec4(uCol, uOp*vA*0.62); }`
  });
  lluvia = new THREE.LineSegments(g, m); lluvia.frustumCulled = false; escena.add(lluvia);
}
const matLlama = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uT: { value: 0 } },
  vertexShader: `varying vec2 vUv; attribute float fase; varying float vF; void main(){ vUv = uv; vF = fase;
    vec4 c = modelViewMatrix * instanceMatrix * vec4(0.,0.,0.,1.); c.xy += position.xy * vec2(0.55, 1.0);
    gl_Position = projectionMatrix * c; }`,
  fragmentShader: `uniform float uT; varying vec2 vUv; varying float vF;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    void main(){ vec2 u = vUv; float t = uT*2.2 + vF;
      float w = n(vec2(u.x*4.0, u.y*3.0 - t*2.0))*0.5 + n(vec2(u.x*8.0, u.y*6.0 - t*3.5))*0.25;
      float forma = smoothstep(0.5, 0.0, abs(u.x-.5)*(1.6 + u.y*2.2) + (u.y*0.9) - w*0.55);
      vec3 c = mix(vec3(4.0,1.1,0.25), vec3(5.0,3.4,1.4), smoothstep(0.2,0.0,u.y)*forma);
      gl_FragColor = vec4(c * forma * smoothstep(1.0, 0.55, u.y), 1.0); }`
});
function crearLlamas() {
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.42, 0);
  const conLlama = VIVO.braseros.filter(b => !b.fija), n = conLlama.length;
  const im = new THREE.InstancedMesh(geo, matLlama, n);
  const fase = new Float32Array(n), o = new THREE.Object3D();
  conLlama.forEach((b, i) => { o.position.copy(b.pos).add(new THREE.Vector3(0, -0.5, 0)); o.updateMatrix(); im.setMatrixAt(i, o.matrix); fase[i] = b.fase; });
  geo.setAttribute('fase', new THREE.InstancedBufferAttribute(fase, 1));
  im.frustumCulled = false; im.renderOrder = 6; escena.add(im);
}

/* ============================================================
   LUCES
   Dos reservas de luces de fuego, pares e impares, que nunca
   cambian de brasero mientras están a la vista: se reasignan
   sólo cuando su estación queda a más de una sala de distancia.
   ============================================================ */
function crearLuces() {
  hemi = new THREE.HemisphereLight(0xffffff, 0x302418, 0.5); escena.add(hemi);
  sol = new THREE.DirectionalLight(0xffffff, 3); sol.castShadow = true;
  const sm = calidad === 'alta' ? 2048 : 1024;
  sol.shadow.mapSize.set(sm, sm);
  Object.assign(sol.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 260 });
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.04;
  escena.add(sol, sol.target);
  for (const pool of [luces.pares, luces.impares]) for (let k = 0; k < 4; k++) {
    const l = new THREE.PointLight(0xFF9A48, 0, 16, 2); escena.add(l); pool.push({ luz: l, sala: -99 });
  }
  for (let k = 0; k < 2; k++) {
    const f = new THREE.SpotLight(0xFFEBD0, 0, 0, 0.5, 0.65, 2); escena.add(f, f.target); luces.focos.push({ luz: f, sala: -99 });
  }
}
function asignarLuces(sv) {
  [luces.pares, luces.impares].forEach((pool, par) => {
    let k = Math.round(sv); if (((k % 2) + 2) % 2 !== par) k += (sv > k ? 1 : -1);
    if (pool[0].sala === k) return;
    const lista = VIVO.braseros.filter(b => b.sala === k);
    pool.forEach((p, i) => { p.sala = k; p.b = lista[i] || null; if (p.b) p.luz.position.copy(p.b.pos); });
  });
  luces.focos.forEach((f, par) => {
    let k = Math.round(sv); if (((k % 2) + 2) % 2 !== par) k += (sv > k ? 1 : -1);
    if (f.sala === k) return; f.sala = k;
    const r = VIVO.relieves[k]; f.r = r || null;
    if (!r) return;
    const n = r.normal;
    f.luz.position.copy(r.centro).addScaledVector(n, 5.5).add(new THREE.Vector3(0, 4.2, 0));
    f.luz.target.position.copy(r.centro);
    const d = f.luz.position.distanceTo(r.centro);
    f.luz.angle = Math.atan((Math.max(r.ancho, r.alto) * 0.62 + 0.6) / d);
  });
}

/* ============================================================
   INICIO
   ============================================================ */
async function iniciar() {
  const canvas = $('#lienzo');
  render = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  render.setPixelRatio(Math.min(devicePixelRatio, calidad === 'alta' ? 1.75 : 1.25));
  render.setSize(innerWidth, innerHeight);
  render.toneMapping = THREE.ACESFilmicToneMapping;
  render.shadowMap.enabled = true; render.shadowMap.type = THREE.PCFSoftShadowMap;

  escena = new THREE.Scene();
  escena.fog = new THREE.FogExp2(0xC89C6E, 0.01);
  camara = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 6000);
  pmrem = new THREE.PMREMGenerator(render);

  const t0 = performance.now();
  prepararMateriales();
  console.info('[gil] materiales', Math.round(performance.now() - t0), 'ms');
  cielo = crearCielo(); escena.add(cielo);
  crearLuces();

  await Promise.all(DATOS.map(d => d.img ? esperarImg(d.img) : null).concat(PIEZAS.map(p => esperarImg(p.img))));
  const relieves = DATOS.map(d => d.img ? { map: texturaDesdeImg(d.img), normal: null, aspecto: d.aspecto } : null);
  const piezas = PIEZAS.map(p => texturaDesdeImg(p.img));
  construirMundo(escena, relieves, piezas, PIEZAS);
  // normales de relieve: se derivan en segundo plano, de cerca a lejos
  relieves.forEach((r, i) => r && setTimeout(() => {
    r.normal = normalDesdeImg(DATOS[i].img);
    const m = VIVO.relieves[i].malla.material; m.normalMap = r.normal; m.needsUpdate = true;
  }, 300 + i * 120));

  console.info('[gil] mundo', Math.round(performance.now() - t0), 'ms');
  crearPolvo(); crearLluvia(); crearLlamas();

  // posproceso
  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: calidad === 'alta' ? 4 : 2 });
  composer = new EffectComposer(render, rt);
  composer.addPass(new RenderPass(escena, camara));
  if (calidad === 'alta') {
    gtao = new GTAOPass(escena, camara, innerWidth, innerHeight);
    gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 });
    gtao.blendIntensity = 0.85;
    composer.addPass(gtao);
  }
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.3, 0.55, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  grade = new ShaderPass(GRADE); composer.addPass(grade);

  addEventListener('resize', redimensionar); redimensionar();
  mezclar(-1, atm); aplicarAtmosfera(0); regenerarEntorno();
  asignarLuces(0);
  colocarCamara(0, true);
  listo = true;
  raiz.classList.add('preparado');
  $('#btn-recorrido').disabled = false;
  $('#btn-recorrido').textContent = TXT.entrar;
  window.__gil.listo = true;
  aplicarTablilla();
  bucle();
}

function redimensionar() {
  camara.aspect = innerWidth / innerHeight; camara.fov = camara.aspect < 1 ? 74 : 52; camara.updateProjectionMatrix();
  render.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  grade.uniforms.uAspecto.value = innerWidth / innerHeight;
}

/* El entorno (reflejos del ladrillo vidriado, del oro, del agua)
   se regenera desde el cielo al llegar a cada estación. */
let escenaCielo = null;
function regenerarEntorno() {
  if (!escenaCielo) { escenaCielo = new THREE.Scene(); escenaCielo.add(new THREE.Mesh(cielo.geometry, cielo.material)); }
  const nuevo = pmrem.fromScene(escenaCielo, 0, 1, 4000);
  if (entornoRT) entornoRT.dispose();
  entornoRT = nuevo; escena.environment = nuevo.texture;
}

/* ============================================================
   ATMÓSFERA EN CADA CUADRO
   ============================================================ */
const dsol = new THREE.Vector3();
function aplicarAtmosfera(t) {
  const u = cielo.material.uniforms;
  u.uCenit.value.copy(atm.cenit); u.uHoriz.value.copy(atm.horiz); u.uSolCol.value.copy(atm.sol);
  dirSol(atm.el, atm.az, dsol); u.uSolDir.value.copy(dsol);
  u.uNubes.value = atm.nubes; u.uEstrellas.value = atm.estrellas; u.uT.value = t;
  escena.fog.color.copy(atm.niebla); escena.fog.density = atm.dens;
  sol.color.copy(atm.sol); sol.intensity = atm.solI;
  hemi.color.copy(atm.horiz).lerp(atm.sol, 0.45); hemi.groundColor.copy(atm.niebla).multiplyScalar(0.45); hemi.intensity = atm.hemi;
  escena.environmentIntensity = atm.env;
  render.toneMappingExposure = atm.expo;
  bloom.strength = atm.bloom;
  grade.uniforms.uSombras.value.copy(atm.sombras); grade.uniforms.uLuces.value.copy(atm.luces); grade.uniforms.uSat.value = atm.sat;
  RAYO.uniforms.uColor.value.copy(atm.sol); RAYO.uniforms.uFuerza.value = atm.haces;
  polvo && (polvo.material.uniforms.uOp.value = 0.35 * atm.polvo, polvo.material.uniforms.uCol.value.copy(atm.sol).lerp(new THREE.Color(1, 1, 1), 0.4));
  lluvia && (lluvia.material.uniforms.uOp.value = Math.max(atm.lluvia, atm.viento * 0.55), lluvia.material.uniforms.uViento.value = atm.viento);
  if (VIVO.agua) { VIVO.agua.material.uniforms.sunDirection.value.copy(dsol); VIVO.agua.material.uniforms.sunColor.value.copy(atm.sol); }
}

/* ============================================================
   CÁMARA
   ============================================================ */
function colocarCamara(dt, instantaneo) {
  const z = zDe(s);
  const y = alturaOjo(z);
  const vel = Math.abs(objetivo - s);
  const balanceo = menosMov ? 0 : Math.sin(z * 1.35) * 0.035 * Math.min(1, vel * 3);
  camara.position.set(0, y + balanceo, z);

  // dirección: al frente durante el tránsito, hacia el relieve en la parada
  const k = Math.round(s), cerca = 1 - THREE.MathUtils.smoothstep(Math.abs(s - k), 0.06, 0.42);
  const frente = tmp.set(0, -0.02, -1);
  if (s < -0.5) frente.set(0, 0.16, -1);
  let destino = frente.normalize();
  if (k >= 0 && k <= 11 && VIVO.relieves[k] && cerca > 0) {
    const r = VIVO.relieves[k];
    // el relieve se encuadra en su mitad de pantalla; la otra mitad es del texto
    const dx = r.centro.x - camara.position.x, dz = r.centro.z - camara.position.z;
    const mitadH = Math.atan(Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)) * camara.aspect);
    const desvio = camara.aspect > 1.1 ? mitadH * 0.46 : 0;
    const yaw = Math.atan2(dx, -dz) - Math.sign(dx) * desvio;
    const dist = Math.hypot(dx, dz), cab = Math.atan2(r.centro.y - camara.position.y, dist) - (camara.aspect < 1 ? 0.3 : 0);
    tmp2.set(Math.sin(yaw) * Math.cos(cab), Math.sin(cab), -Math.cos(yaw) * Math.cos(cab));
    destino = frente.lerp(tmp2, cerca).normalize();
  } else if (k === 12 && cerca > 0) {
    // el mirador: la mirada cae sobre la ciudad
    const dx = -170, dz = -40;
    const mitadH = Math.atan(Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)) * camara.aspect);
    const yaw = Math.atan2(dx, -dz) + (camara.aspect > 1.1 ? mitadH * 0.3 : 0);
    tmp2.set(Math.sin(yaw), -0.16, -Math.cos(yaw)).normalize();
    destino = frente.lerp(tmp2, cerca).normalize();
  }
  const a = instantaneo ? 1 : 1 - Math.exp(-dt * 3.2);
  mirada.lerp(destino, a).normalize();
  // paralaje suave con el ratón
  raton.sx += (raton.x - raton.sx) * 0.05; raton.sy += (raton.y - raton.sy) * 0.05;
  const yaw = menosMov ? 0 : raton.sx * 0.12, pitch = menosMov ? 0 : raton.sy * 0.07;
  const m = mirada.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
  m.y += pitch;
  camara.lookAt(camara.position.clone().add(m));
  // FOV un poco más abierto en los espacios abiertos, sin variar en tránsito brusco
  return z;
}

/* ============================================================
   BUCLE
   ============================================================ */
const reloj = new THREE.Clock();
let tAcum = 0;
function bucle() {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.05, reloj.getDelta()); tAcum += dt;
  if (document.hidden || raiz.classList.contains('leyendo')) return;   // en modo lectura, el 3D descansa

  // avance amortiguado con velocidad máxima: un paso de procesión
  const dif = objetivo - s;
  const vmax = 0.42 * dt;
  let paso = dif * (1 - Math.exp(-dt * 2.2));
  paso = Math.max(-vmax, Math.min(vmax, paso));
  if (Math.abs(dif) < 0.0005) s = objetivo; else s += paso;
  // al reposar, se asienta en la parada más próxima
  if (activo && performance.now() - ultimoInput > 520 && Math.abs(objetivo - Math.round(objetivo)) > 0.001) objetivo = Math.round(objetivo);

  mezclar(s, atm);
  let z;
  if (window.__gil.libre) { const L = window.__gil.libre; camara.position.set(...L.p); camara.lookAt(...L.m); z = camara.position.z; }
  else z = colocarCamara(dt);

  // tormenta: relámpagos y trueno
  let flash = 0;
  if (atm.tormenta > 0.5) {
    relampago.proximo -= dt;
    if (relampago.proximo < 0) { relampago.t = 0.001; relampago.proximo = 5 + Math.random() * 7; sonido.trueno(0.3 + Math.random() * 1.4); }
  }
  if (relampago.t > 0) {
    relampago.t += dt; const tt = relampago.t;
    flash = (tt < 0.08 ? 1 : tt < 0.16 ? 0.25 : tt < 0.24 ? 0.85 : Math.max(0, 1 - (tt - 0.24) * 3)) * atm.tormenta;
    if (tt > 0.6) relampago.t = 0;
  }
  aplicarAtmosfera(tAcum);
  cielo.material.uniforms.uRelampago.value = flash * 0.9;
  hemi.intensity += flash * 2.2;
  grade.uniforms.uFlash.value = flash * 0.06;
  grade.uniforms.uT.value = tAcum;

  // el sol sigue al visitante: su caja de sombras viaja con él
  sol.target.position.set(0, camara.position.y, z - 18);
  sol.position.copy(sol.target.position).addScaledVector(dsol, 120);
  cielo.position.copy(camara.position);

  // luces de fuego
  if (Math.abs(s - (luces._ultima ?? -9)) > 0.25) { asignarLuces(s); luces._ultima = s; }
  [...luces.pares, ...luces.impares].forEach(p => {
    if (!p.b) { p.luz.intensity = 0; return; }
    const parpadeo = 0.82 + 0.12 * Math.sin(tAcum * 9.1 + p.b.fase) + 0.07 * Math.sin(tAcum * 23.7 + p.b.fase * 3);
    const lejos = THREE.MathUtils.smoothstep(Math.abs(p.b.pos.z - z), 70, 30);
    p.luz.intensity = 22 * parpadeo * lejos * (atm.solI < 1.2 ? 1.6 : 1);
  });
  luces.focos.forEach(f => {
    if (!f.r) { f.luz.intensity = 0; return; }
    const d = Math.abs(f.r.centro.z - z);
    f.luz.intensity = 95 * THREE.MathUtils.smoothstep(d, 60, 12);
  });
  matLlama.uniforms.uT.value = tAcum;
  RAYO.uniforms.uT.value = tAcum;
  polvo.material.uniforms.uCam.value.copy(camara.position); polvo.material.uniforms.uT.value = tAcum;
  lluvia.material.uniforms.uCam.value.copy(camara.position); lluvia.material.uniforms.uT.value = tAcum;

  // el agua del Diluvio sube mientras el visitante está en la calzada
  if (VIVO.agua) {
    const sd = SALAS[9], dentro = z < sd.zIni + 20 && z > sd.zFin - 10;
    VIVO.agua.visible = z < sd.zIni + 50 && z > sd.zFin - 90;
    const meta = dentro ? 0.07 : -0.55;   // ya llega crecida; al final cubre la calzada
    VIVO.agua.position.y += (meta - VIVO.agua.position.y) * (dentro ? dt * 0.16 : dt * 0.5);
    VIVO.agua.material.uniforms.time.value += dt * 0.6;
  }
  if (VIVO.serpiente) VIVO.serpiente.malla.position.x = Math.sin(tAcum * 0.25) * 0.8 + 0.8;

  // visibilidad por tramos: sólo se dibuja lo cercano
  SALAS.forEach(x => {
    const lejania = Math.max(x.zFin - z, z - x.zIni);
    x.grupo.visible = x.clave === 'murallas' ? z < SALAS[10].zIni + 4 : x.clave === 'diluvio' ? (lejania < 170 && z > SALAS[10].zIni - 36) : lejania < 170;
  });

  sonido.actualizar(atm, s, VIVO.braseros, z);
  actualizarInterfaz();
  composer.render(dt);
}

/* ============================================================
   INTERFAZ
   ============================================================ */
const panel = $('#panel'), espina = $('#espina');
DATOS.forEach((d, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 2 L15 8 L1 14 L4.5 8 Z"/></svg><span class="num-cun" aria-hidden="true">${CUN.estaciones[i]?.num || ''}</span><span class="nombre">${ROMANOS[i]} · ${d.lugar}</span>`;
  b.setAttribute('aria-label', `${TXT.estacion} ${ROMANOS[i]}: ${d.titulo}`);
  b.addEventListener('click', () => irA(i));
  espina.appendChild(b);
});
const marcas = [...espina.querySelectorAll('button')];

function actualizarInterfaz() {
  const k = Math.round(s), cerca = Math.abs(s - k) < 0.16 && Math.abs(objetivo - k) < 0.5;
  const nueva = activo && cerca && k >= 0 && k <= 12 ? k : null;
  if (nueva === estacionActual) return;
  estacionActual = nueva;
  if (nueva === null) { panel.classList.remove('visible'); return; }
  if (nueva !== 12) regenerarEntorno();
  marcas.forEach((m, i) => m.setAttribute('aria-current', i === nueva ? 'true' : 'false'));
  const e = DATOS[nueva];
  if (nueva === 12) {
    panel.dataset.lado = 'derecha';
    $('#panel-titulo').textContent = TXT.mirTitulo;
    $('#panel-cuerpo').innerHTML = `<p>${TXT.mirCuerpo}</p>`;
    $('#panel-cun').innerHTML = `<span class="cun">${CUN.incipit}</span><span class="lectura-cun">${CUN.incipitLectura}</span>`;
    $('#panel-cita').textContent = '';
    $('#panel-pie').innerHTML = `<button type="button" class="enlace" data-ir="0">${TXT.volverUmbral}</button> <a class="enlace" href="#lectura" data-leer>${TXT.leer}</a>`;
  } else {
    panel.dataset.lado = SALAS[nueva].lado > 0 ? 'izquierda' : 'derecha';
    $('#panel-titulo').textContent = e.titulo;
    $('#panel-cuerpo').innerHTML = e.cuerpo;
    $('#panel-cita').textContent = e.cita;
    $('#panel-pie').innerHTML = `<span>${ROMANOS[nueva]} · ${e.lugar}</span>` + (e.img ? `<span class="ia">${TXT.ia}</span>` : '');
    const c = CUN.estaciones[nueva];
    $('#panel-cun').innerHTML = c ? `<span class="cun">${c.num}&#8195;${c.signos}</span><span class="lectura-cun">${c.lectura}</span>` : '';
  }
  panel.classList.remove('visible'); void panel.offsetWidth; panel.classList.add('visible');
  $('#guia').classList.toggle('oculta', nueva > 0);
}

function irA(i) {
  ultimoInput = performance.now();
  if (menosMov || Math.abs(i - s) > 2.2) {
    // corte con fundido: los saltos largos no se recorren a la carrera
    const velo = grade.uniforms.uVelo; let t = 0;
    const f = () => { t += 0.06; velo.value = Math.min(1, t); if (t < 1) requestAnimationFrame(f); else { s = objetivo = i; mirada.set(0, 0, -1); colocarCamara(0, true); const g = () => { velo.value -= 0.05; if (velo.value > 0) requestAnimationFrame(g); else velo.value = 0; }; g(); } };
    f();
  } else objetivo = i;
}
function avanzar(d) {
  ultimoInput = performance.now() - 600;
  const base = Math.abs(objetivo - Math.round(objetivo)) < 0.01 ? Math.round(objetivo) : (d > 0 ? Math.floor(objetivo) : Math.ceil(objetivo));
  const dest = Math.max(S_MIN + 1, Math.min(S_MAX, base + d));
  menosMov ? irA(dest) : (objetivo = dest);
}

addEventListener('wheel', (e) => {
  if (!activo) return; e.preventDefault();
  const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  if (menosMov) { if (performance.now() - ultimoInput > 700) { avanzar(Math.sign(d)); ultimoInput = performance.now(); } return; }
  objetivo = Math.max(0, Math.min(S_MAX, objetivo + d * 0.0011)); ultimoInput = performance.now();
}, { passive: false });
let toque = null;
addEventListener('touchstart', e => { if (activo) toque = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => {
  if (!activo || toque === null) return;
  const y = e.touches[0].clientY, d = toque - y; toque = y;
  objetivo = Math.max(0, Math.min(S_MAX, objetivo + d * 0.004)); ultimoInput = performance.now();
}, { passive: true });
addEventListener('touchend', () => { toque = null; });
addEventListener('pointermove', e => { raton.x = e.clientX / innerWidth * 2 - 1; raton.y = -(e.clientY / innerHeight * 2 - 1); });
addEventListener('keydown', e => {
  if (!activo) return;
  if ($('#visor').open) return;
  if (e.key === 'Escape') { salir(); return; }
  if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); avanzar(1); }
  if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); avanzar(-1); }
  if (e.key === 'Home') irA(0);
  if (e.key === 'End') irA(12);
});
$('#btn-avanzar').addEventListener('click', () => avanzar(1));
$('#btn-retroceder').addEventListener('click', () => avanzar(-1));

/* Piezas: un clic las abre en el visor */
const ray = new THREE.Raycaster(), pt = new THREE.Vector2();
$('#lienzo').addEventListener('click', e => {
  if (!activo) return;
  pt.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1));
  ray.setFromCamera(pt, camara);
  const hit = ray.intersectObjects(VIVO.piezas, false)[0];
  if (hit && hit.distance < 14) abrirPieza(hit.object.userData.pieza);
});
$('#lienzo').addEventListener('pointermove', e => {
  if (!activo || !listo) return;
  pt.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1));
  ray.setFromCamera(pt, camara);
  const hit = ray.intersectObjects(VIVO.piezas, false)[0];
  $('#lienzo').style.cursor = hit && hit.distance < 14 ? 'zoom-in' : '';
});
function abrirPieza(p) {
  const v = $('#visor');
  let im = v.querySelector('img'); if (!im) { im = document.createElement('img'); v.querySelector('figure').prepend(im); }
  im.src = p.img.src; im.alt = p.img.alt;
  v.querySelector('h2').textContent = p.titulo; v.querySelector('p').textContent = p.nota;
  v.showModal();
}
$('#visor-cerrar').addEventListener('click', () => $('#visor').close());

/* ============================================================
   ENTRADA, SALIDA, SONIDO
   ============================================================ */
function entrar() {
  if (!listo) return;
  raiz.classList.add('dentro');
  activo = true; ultimoInput = performance.now();
  sonido.iniciar();
  objetivo = 0;
  $('#escena').setAttribute('aria-hidden', 'false');
}
function salir() {
  activo = false; objetivo = -1;
  raiz.classList.remove('dentro');
  panel.classList.remove('visible'); estacionActual = null;
  sonido.pausar();
}
function irALectura() {
  salir(); raiz.classList.add('leyendo');
  $('#lectura').scrollIntoView({ behavior: menosMov ? 'auto' : 'smooth' });
}
$('#btn-recorrido').addEventListener('click', entrar);
$('#btn-lectura').addEventListener('click', e => { e.preventDefault(); irALectura(); });
$('#btn-salir').addEventListener('click', salir);
$('#btn-texto').addEventListener('click', irALectura);
$('#btn-sonido').addEventListener('click', () => { const on = sonido.alternar(); $('#btn-sonido').setAttribute('aria-pressed', on ? 'true' : 'false'); });
panel.addEventListener('click', e => {
  const b = e.target.closest('[data-ir]'); if (b) irA(+b.dataset.ir);
  if (e.target.closest('[data-leer]')) { e.preventDefault(); irALectura(); }
});
document.querySelectorAll('.volver-recorrido').forEach(b => b.addEventListener('click', e => {
  e.preventDefault(); raiz.classList.remove('leyendo'); scrollTo(0, 0); if (listo) entrar();
}));

/* ============================================================
   MODO TABLILLA
   Signos cuneiformes reales (nombres, numerales, íncipit) sobre la
   interfaz y grabados en el zócalo de cada estela.
   ============================================================ */
let inscritas = false;
async function inscribir() {
  if (inscritas || !listo) return; inscritas = true;
  try { await document.fonts.load('100px CUN', '𒀭𒁹'); } catch (e) { }
  VIVO.relieves.forEach((r, i) => {
    const c = CUN.estaciones[i]; if (!r || !c) return;
    const w = r.ancho + 1.1, h = 0.8, W = 2048, H = Math.round(W * h / w);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.font = `${Math.round(H * 0.6)}px CUN`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.filter = 'blur(1.4px)'; x.fillStyle = '#fff';
    x.fillText(`${c.num}\u2003${c.signos}`, W / 2, H * 0.54, W * 0.94);
    const src = x.getImageData(0, 0, W, H).data;
    const col = x.createImageData(W, H), nor = x.createImageData(W, H);
    const L = (a, b) => src[(Math.min(H - 1, Math.max(0, b)) * W + Math.min(W - 1, Math.max(0, a))) * 4] / 255;
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const k = (yy * W + xx) * 4, v = L(xx, yy);
      col.data[k] = 74; col.data[k + 1] = 60; col.data[k + 2] = 44; col.data[k + 3] = Math.min(235, v * 300);
      const dx = (L(xx + 1, yy) - L(xx - 1, yy)) * -4, dy = (L(xx, yy + 1) - L(xx, yy - 1)) * -4, l = Math.hypot(dx, dy, 1);
      nor.data[k] = (-dx / l * .5 + .5) * 255; nor.data[k + 1] = (dy / l * .5 + .5) * 255; nor.data[k + 2] = (1 / l * .5 + .5) * 255; nor.data[k + 3] = 255;
    }
    const cvN = document.createElement('canvas'); cvN.width = W; cvN.height = H; cvN.getContext('2d').putImageData(nor, 0, 0);
    x.filter = 'none'; x.putImageData(col, 0, 0);
    const tc = new THREE.CanvasTexture(cv); tc.colorSpace = THREE.SRGBColorSpace; tc.anisotropy = 8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({
      map: tc, normalMap: new THREE.CanvasTexture(cvN), transparent: true, depthWrite: false, roughness: 0.95,
      polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(0, -r.alto / 2 - 0.62, -0.3 + 0.7 + 0.008);
    m.name = 'inscripcion'; r.grupo.add(m); r.inscripcion = m;
  });
  aplicarTablilla();
}
let tablilla = false;
try { tablilla = localStorage.getItem('gil-tablilla') === '1'; } catch (e) { }
function aplicarTablilla() {
  raiz.classList.toggle('tablilla', tablilla);
  ['#btn-tablilla', '#btn-tablilla-umbral'].forEach(q => $(q)?.setAttribute('aria-pressed', tablilla ? 'true' : 'false'));
  VIVO.relieves.forEach(r => r?.inscripcion && (r.inscripcion.visible = tablilla));
  if (tablilla) inscribir();
}
function alternarTablilla() { tablilla = !tablilla; try { localStorage.setItem('gil-tablilla', tablilla ? '1' : '0'); } catch (e) { } aplicarTablilla(); }
$('#btn-tablilla').addEventListener('click', alternarTablilla);
$('#btn-tablilla-umbral').addEventListener('click', alternarTablilla);
aplicarTablilla();

/* depuración y capturas */
window.__gil = {
  listo: false, libre: null,
  ir: (i) => { s = objetivo = i; ultimoInput = performance.now() + 1e9; mezclar(s, atm); colocarCamara(0, true); },
  entrar: () => entrar(), get s() { return s; }, tablilla: (v) => { tablilla = v; aplicarTablilla(); },
  camara: (p, m, sv) => { window.__gil.libre = { p, m }; if (sv !== undefined) s = objetivo = sv; ultimoInput = performance.now() + 1e9; },
  agua: (y) => { if (VIVO.agua) VIVO.agua.position.y = y; },
  // verificación del paso libre: ningún volumen puede contener el recorrido del visitante
  chequeo: () => {
    const fallos = [], caja = new THREE.Box3(), m4 = new THREE.Matrix4(), pts = [];
    for (let k = 0; k <= 1300; k++) { const zz = zDe(-1 + k / 100); for (const dy of [0.2, 1.0, OJO]) for (const dx of [-0.5, 0, 0.5]) pts.push(new THREE.Vector3(dx, alturaOjo(zz) - OJO + dy, zz)); }
    escena.updateMatrixWorld(true);
    escena.traverse(o => {
      if (!o.isMesh || o === cielo || o.material === RAYO || o.material?.blending === THREE.AdditiveBlending) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const n = o.isInstancedMesh ? o.count : 1;
      for (let i = 0; i < n; i++) {
        caja.copy(o.geometry.boundingBox);
        if (o.isInstancedMesh) { o.getMatrixAt(i, m4); caja.applyMatrix4(m4); }
        caja.applyMatrix4(o.matrixWorld);
        const sz = caja.getSize(new THREE.Vector3());
        if (sz.y < 0.05 || sz.x > 300) continue;   // suelos y terrenos
        caja.expandByScalar(-0.02);
        const p = pts.find(q => caja.containsPoint(q));
        if (p) { fallos.push({ nombre: o.parent?.name || o.name, z: +p.z.toFixed(1), y: +p.y.toFixed(2), caja: [caja.min.toArray().map(v => +v.toFixed(1)), caja.max.toArray().map(v => +v.toFixed(1))] }); break; }
      }
    });
    return fallos;
  }
};

if (soporta3D()) {
  requestAnimationFrame(() => setTimeout(() => iniciar().catch(err => {
    console.error(err); raiz.classList.add('sin3d');
  }), 30));
} else raiz.classList.add('sin3d');
