/* ============================================================
   EL MUNDO
   Una sola tabla define el recorrido. Cada sala se construye
   a partir de ella, y el paso del visitante (|x| < PASO_LIBRE)
   queda reservado desde el plano: nada se coloca en él.
   ============================================================ */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Water } from 'three/addons/objects/Water.js';
import { M, caja, plano, cilindro, geoCaja, geoAlmena, instancias, uvMundo } from './mat.js';
import { azar, sembrar, texAguaNormal } from './tex.js';

export const OJO = 1.65;
export const PASO_LIBRE = 2.6;
export const ALTO_MURALLA = 12;

/*            longitud  ancho  alto  lado del relieve */
export const SALAS = [
  { clave: 'patio',    L: 46, W: 20, H: 14, lado: 1 },
  { clave: 'enkidu',   L: 44, W: 20, H: 7,  lado: -1 },
  { clave: 'enkidu-b', L: 40, W: 20, H: 8,  lado: 1 },
  { clave: 'reunion',  L: 50, W: 28, H: 10, lado: -1 },
  { clave: 'cedros',   L: 66, W: 30, H: 0,  lado: 1 },
  { clave: 'humbaba',  L: 54, W: 26, H: 0,  lado: -1 },
  { clave: 'toro',     L: 50, W: 22, H: 13, lado: 1 },
  { clave: 'vacia',    L: 44, W: 20, H: 8,  lado: -1 },
  { clave: 'mashu',    L: 58, W: 20, H: 0,  lado: 1 },
  { clave: 'diluvio',  L: 74, W: 40, H: 0,  lado: -1 },
  { clave: 'ascenso',  L: 72, W: 20, H: 7,  lado: 1 },
  { clave: 'murallas', L: 96, W: 7,  H: 0,  lado: 1 }
];
let z = 0;
SALAS.forEach((s, i) => {
  s.i = i; s.zIni = z; s.zFin = z - s.L;
  s.zParada = s.clave === 'ascenso' ? z - 15 : s.clave === 'murallas' ? z - 34 : z - s.L * 0.52;
  z = s.zFin;
});
const ASC = SALAS[10];
export const ESCALERA = { z0: ASC.zIni - 40, z1: ASC.zFin };
export const PUERTA_Z = ASC.zIni - 31;
export const MIRADOR_Z = SALAS[11].zParada - 30;

export function sueloEn(zz) {
  if (zz > ESCALERA.z0) return 0;
  if (zz < ESCALERA.z1) return ALTO_MURALLA;
  return ALTO_MURALLA * (ESCALERA.z0 - zz) / (ESCALERA.z0 - ESCALERA.z1);
}

/* Lo que el motor anima después */
export const VIVO = {
  braseros: [],      // {pos, sala, int}
  llamas: [],        // sprites
  agua: null, lluvia: null, viento: null,
  serpiente: null, estrellas: null,
  relieves: [],      // por sala: {centro, normal, malla, ancho, alto}
  piezas: [],        // testimonios clicables
  rayos: []          // haces de luz
};

/* ============================================================
   PIEZAS COMUNES
   ============================================================ */
function suelo(g, mat, W, s, y = 0, extra = 0) {
  g.add(plano(W + extra, s.L + 0.02, mat, 0, y + 0.001, (s.zIni + s.zFin) / 2));
}

function hilo(g, s, y = 0) {
  // incrustación de lapislázuli: la única constante del recorrido
  const m = caja(0.16, 0.03, s.L, M.lapis, 0, y + 0.012, (s.zIni + s.zFin) / 2, 0, false);
  m.receiveShadow = true; g.add(m);
}

/* Muro con pilastras rítmicas, cornisa y almenas escalonadas */
function muro(g, s, lado, o = {}) {
  const mat = o.mat || M.adobe, H = o.H || s.H, W = s.W, z0 = o.z0 ?? s.zIni, z1 = o.z1 ?? s.zFin, len = z0 - z1;
  const zc = (z0 + z1) / 2, x = lado * (W / 2 + 0.9), y0 = o.y || 0;
  g.add(caja(1.8, H, len, mat, x, y0 + H / 2, zc));
  // pilastras: el muro mesopotámico se articula en entrantes y salientes
  const pil = [], paso = o.ritmo || 3.6;
  for (let zz = z0 - paso / 2; zz > z1 + 0.5; zz -= paso) pil.push([lado * (W / 2 - 0.22), y0 + H / 2, zz]);
  g.add(instancias(geoCaja(0.44, H, 1.25, mat.userData.unidad), mat, pil));
  // zócalo
  g.add(caja(0.5, 0.9, len, o.zocalo || M.caliza, lado * (W / 2 - 0.1), y0 + 0.45, zc));
  // cornisa
  g.add(caja(0.9, 0.55, len, mat, lado * (W / 2 + 0.2), y0 + H - 0.25, zc));
  // paneles de escritura entre pilastras, a la altura de la mirada
  if (o.escritura) {
    const pan = [];
    for (let zz = z0 - paso; zz > z1 + 1; zz -= paso * 2) pan.push([lado * (W / 2 - 0.02), y0 + 3.0, zz]);
    if (pan.length) g.add(instancias(geoCaja(0.08, 2.6, 2.0, M.escritura.userData.unidad, false), M.escritura, pan, false));
  }
  if (o.almenas !== false) {
    const al = [];
    for (let zz = z0 - 1; zz > z1; zz -= 2.1) al.push([x, y0 + H, zz, Math.PI / 2]);
    g.add(instancias(geoAlmena(1.5, 1.6, 1.5, mat.userData.unidad), mat, al));
  }
}

/* Portal de jambas escalonadas: el umbral entre salas.
   Cada cara recibe tres marcos que avanzan hacia fuera y se abren
   un poco más: el derrame escalonado de la puerta mesopotámica.
   Ningún volumen se solapa con otro en un mismo plano. */
function portal(g, zz, Wa, Wb, alto, mat = M.adobe, o = {}) {
  const W = Math.max(Wa, Wb) + 3.6, a = o.vano || 2.5, hp = o.hpuerta || 7.4, D = o.fondo || 3.2, y0 = o.y || 0;
  const lateral = W / 2 - a;
  [-1, 1].forEach(sg => g.add(caja(lateral, alto, D, mat, sg * (a + lateral / 2), y0 + alto / 2, zz)));
  g.add(caja(2 * a, alto - hp, D, mat, 0, y0 + hp + (alto - hp) / 2, zz));
  const capa = 0.28, paso = 0.34, poste = 1.1;
  [1, -1].forEach(cara => {
    for (let k = 1; k <= 3; k++) {
      const zc = zz + cara * (D / 2 + capa * (k - 0.5));
      const ai = a + paso * k, hk = hp + paso * k;
      [-1, 1].forEach(sg => g.add(caja(poste, hk + poste * 0.6, capa, mat, sg * (ai + poste / 2), y0 + (hk + poste * 0.6) / 2, zc)));
      g.add(caja(2 * ai, poste * 0.6, capa, mat, 0, y0 + hk + poste * 0.3, zc));
    }
  });
  // dintel de cedro, visto en el intradós
  g.add(caja(2 * a, 0.5, D, M.madera, 0, y0 + hp - 0.25, zz, 0, false));
  if (o.almenas !== false) {
    const al = [];
    for (let x = -W / 2 + 0.8; x < W / 2; x += 2.1) al.push([x, y0 + alto, zz]);
    g.add(instancias(geoAlmena(1.5, 1.6, D * 0.8, mat.userData.unidad), mat, al));
  }
}

/* Pílonos: la puerta en campo abierto */
function pilonos(g, zz, sep = 3.2, alto = 15, mat = M.adobe, y0 = 0) {
  [-1, 1].forEach(sg => {
    const x = sg * (sep + 3);
    g.add(caja(6, alto, 6.5, mat, x, y0 + alto / 2, zz));
    const pil = [];
    for (let k = -1; k <= 1; k++) pil.push([x + k * 1.9, y0 + alto / 2, zz + 3.35]);
    for (let k = -1; k <= 1; k++) pil.push([x + k * 1.9, y0 + alto / 2, zz - 3.35]);
    g.add(instancias(geoCaja(0.9, alto, 0.4, mat.userData.unidad), mat, pil));
    const al = [];
    for (let k = -1; k <= 1; k++) al.push([x + k * 1.95, y0 + alto, zz]);
    g.add(instancias(geoAlmena(1.7, 1.8, 6, mat.userData.unidad), mat, al));
  });
  g.add(caja(2 * sep + 2, 1.6, 7, mat, 0, y0 + alto - 3.2, zz));
}

/* Brasero de bronce sobre pie de piedra; la luz la pone el motor */
const geoCuenco = new THREE.LatheGeometry([[0, 0], [0.42, 0.05], [0.62, 0.32], [0.66, 0.42], [0.6, 0.44]].map(p => new THREE.Vector2(p[0], p[1])), 20);
function brasero(g, sala, x, zz, y0 = 0, alto = 1.25) {
  const pie = new THREE.Mesh(cilindro(0.22, 0.34, alto, M.caliza, 12), M.caliza);
  pie.position.set(x, y0 + alto / 2, zz); pie.castShadow = true; g.add(pie);
  const cu = new THREE.Mesh(geoCuenco, M.bronce); cu.position.set(x, y0 + alto, zz); cu.castShadow = true; g.add(cu);
  const pos = new THREE.Vector3(x, y0 + alto + 0.55, zz);
  VIVO.braseros.push({ pos, sala, fase: azar() * 7 });
}

/* Estela: el relieve de cada pasaje, de frente al visitante */
export function estela(g, s, tex, aspecto, y0 = 0, o = {}) {
  const alto = aspecto < 1 ? 4.0 : (o.alto || 3.25), ancho = alto * aspecto;
  const lado = s.lado, dz = o.dz ?? 7.5;
  let dx = o.dx ?? Math.min(s.W / 2 - 2.0, 6.4);
  if (o.dx === undefined) {
    // huella girada de la peana: no puede alcanzar las pilastras del muro
    const hw = (ancho + 1.6) / 2, hd = 0.75;
    for (let it = 0; it < 4; it++) {
      const gi = Math.atan2(dx, dz);
      const ext = hw * Math.abs(Math.cos(gi)) + hd * Math.abs(Math.sin(gi));
      dx = Math.min(dx, s.W / 2 - 0.75 - ext);
    }
  }
  const cy = y0 + 1.15 + alto / 2;
  const centro = new THREE.Vector3(lado * dx, cy, s.zParada - dz);
  const ojo = new THREE.Vector3(0, sueloEn(s.zParada) + OJO, s.zParada);
  const dir = ojo.clone().sub(centro); dir.y = 0; dir.normalize();
  const giro = Math.atan2(dir.x, dir.z);
  const grupo = new THREE.Group(); grupo.position.copy(centro); grupo.rotation.y = giro;
  // losa de caliza con moldura
  const losa = caja(ancho + 0.9, alto + 1.0, 0.55, M.caliza, 0, 0.05, -0.32); grupo.add(losa);
  const mold = caja(ancho + 1.3, 0.35, 0.8, M.caliza, 0, alto / 2 + 0.6, -0.3); grupo.add(mold);
  grupo.add(caja(ancho + 1.6, 1.15, 1.4, M.caliza, 0, -alto / 2 - 0.62, -0.3));
  // el relieve
  const geo = new THREE.PlaneGeometry(ancho, alto, 1, 1);
  const mat = new THREE.MeshStandardMaterial({
    map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(1.2, 1.2),
    roughness: 0.82, metalness: 0, emissive: 0xffffff, emissiveMap: tex.map, emissiveIntensity: 0.11
  });
  const rel = new THREE.Mesh(geo, mat); rel.position.z = -0.03; rel.receiveShadow = true;
  grupo.add(rel);
  g.add(grupo);
  VIVO.relieves[s.i] = { centro, giro, ancho, alto, malla: rel, normal: dir, grupo };
  return grupo;
}

/* Atril de testimonio: una pieza arqueológica, clicable */
export function atril(g, x, zz, y0, tex, aspecto, datos, mirarA) {
  const gr = new THREE.Group(); gr.position.set(x, y0, zz);
  gr.add(caja(1.3, 1.0, 0.9, M.caliza, 0, 0.5, 0));
  const tapa = new THREE.Group(); tapa.position.set(0, 1.05, 0); tapa.rotation.x = -0.75; gr.add(tapa);
  const h = aspecto > 1.6 ? 0.55 : 0.85, w = Math.min(1.3, h * aspecto), hh = w / aspecto;
  tapa.add(caja(w + 0.14, 0.06, hh + 0.14, M.betun, 0, 0, 0, 0, false));
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshStandardMaterial({ map: tex, roughness: .7, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .18 }));
  p.rotation.x = -Math.PI / 2; p.position.y = 0.035; tapa.add(p);
  gr.lookAt(mirarA.x, y0, mirarA.z);
  g.add(gr);
  p.userData.pieza = datos;
  VIVO.piezas.push(p);
}

/* Haces de luz: planos aditivos que materializan el polvo iluminado */
const matRayo = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uColor: { value: new THREE.Color(0xFFD9A0) }, uFuerza: { value: 0.12 }, uT: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform vec3 uColor; uniform float uFuerza; uniform float uT; varying vec2 vUv;
    void main(){ float b = smoothstep(0.,.35,vUv.x)*smoothstep(1.,.65,vUv.x);
      float l = smoothstep(0.,.25,vUv.y)*smoothstep(1.,.7,vUv.y);
      float n = .75+.25*sin(vUv.y*9.+uT*.4+vUv.x*3.);
      gl_FragColor = vec4(uColor*uFuerza*b*l*n, 1.); }`
});
export const RAYO = matRayo;
function haces(g, lista, largo, dir) {
  // dir: vector de la luz (hacia abajo); cada haz es una cinta orientada a lo largo de dir
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, -0.5, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
  const im = new THREE.InstancedMesh(geo, matRayo, lista.length * 2);
  const o = new THREE.Object3D(); let k = 0;
  lista.forEach(([x, y, zz, ancho]) => {
    for (let c = 0; c < 2; c++) {
      o.position.set(x, y, zz); o.quaternion.copy(q);
      o.rotateY(c * Math.PI / 2 + 0.3);
      o.scale.set(ancho, largo, 1); o.updateMatrix(); im.setMatrixAt(k++, o.matrix);
    }
  });
  im.frustumCulled = false; im.renderOrder = 5;
  g.add(im); VIVO.rayos.push(im);
}

/* Roca: icosaedro deformado por ruido */
function geoRoca(r, det = 2, rugosidad = 0.35) {
  const g = new THREE.IcosahedronGeometry(r, det);
  const p = g.attributes.position, v = new THREE.Vector3();
  const s1 = azar() * 10, s2 = azar() * 10;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 1.7 / r + s1) * Math.cos(v.y * 2.1 / r + s2) + Math.sin(v.z * 2.9 / r + s1 * 2) * 0.5;
    v.multiplyScalar(1 + n * rugosidad); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  // UV esféricas en metros
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * 6.28 / 9, uv.getY(i) * r * 3.14 / 9);
  return g;
}

/* Palmera datilera */
let geoFronda = null;
function palmera(g, x, zz, y0 = 0, alto = 9) {
  if (!geoFronda) {
    geoFronda = new THREE.PlaneGeometry(1.1, 4.2, 1, 8); geoFronda.translate(0, 2.1, 0);
    const p = geoFronda.attributes.position;
    for (let i = 0; i < p.count; i++) { const yy = p.getY(i); p.setZ(i, -Math.pow(yy / 4.2, 2) * 1.8); }
    geoFronda.rotateX(-Math.PI / 2 + 0.55); geoFronda.computeVertexNormals();
  }
  const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3((azar() - .5) * 1.2, alto * .5, (azar() - .5) * 1.2), new THREE.Vector3((azar() - .5) * 2, alto, (azar() - .5) * 2)]);
  const tronco = new THREE.Mesh(new THREE.TubeGeometry(curva, 12, 0.26, 8), M.corteza);
  tronco.position.set(x, y0, zz); tronco.castShadow = true; g.add(tronco);
  const copa = curva.getPoint(1).add(new THREE.Vector3(x, y0, zz));
  const fr = [];
  for (let k = 0; k < 14; k++) fr.push([copa.x, copa.y, copa.z, k / 14 * Math.PI * 2 + azar() * .3, 0, 0, 1 + azar() * .3]);
  g.add(instancias(geoFronda, M.palma, fr));
}

/* Palmerales instanciados: tronco anillado y corona de frondas */
function palmeral(g, lista) {
  if (!lista.length) return;
  if (!geoFronda) palmera(new THREE.Group(), 0, 0);
  const troncos = [], frondas = [];
  lista.forEach(([x, z, alto]) => {
    const inc = (azar() - .5) * 0.16, inc2 = (azar() - .5) * 0.16;
    troncos.push([x, 0, z, 0, inc, inc2, 1, 1, alto, 1]);
    const cx = x - Math.sin(inc2) * alto, cz = z + Math.sin(inc) * alto;
    for (let k = 0; k < 16; k++) frondas.push([cx, alto, cz, k / 16 * Math.PI * 2 + azar() * .3, (azar() - .5) * .25, 0, 1.7 + azar() * .6]);
  });
  const geoT = new THREE.CylinderGeometry(0.2, 0.3, 1, 8); geoT.translate(0, 0.5, 0);
  g.add(instancias(geoT, M.corteza, troncos));
  g.add(instancias(geoFronda, M.palma, frondas));
}

/* ============================================================
   LAS SALAS
   ============================================================ */
const C = {};

C.patio = (g, s) => {
  suelo(g, M.suelo, s.W, s, 0, 4); hilo(g, s);
  [-1, 1].forEach(l => muro(g, s, l, { escritura: true }));
  for (const zz of [s.zIni - 10, s.zParada - 14]) for (const l of [-1, 1]) brasero(g, s.i, l * 3.7, zz);
  // el zigurat se alza más allá del muro: Uruk entera vigila
  zigurat(g, -70, s.zParada - 46, 0.62, 0.35);
};

function camaraEnkidu(g, s, variante) {
  const noche = variante === 'vacia';
  suelo(g, variante === 'llena' ? M.tierraRoja : M.suelo, s.W, s, 0, 4); hilo(g, s);
  [-1, 1].forEach(l => {
    if (variante === 'llena') {
      // muro arruinado: tramos de altura irregular, la arquitectura aún no domina
      for (let zz = s.zIni; zz > s.zFin; zz -= 4) {
        const h = 2.5 + azar() * (s.H - 1);
        g.add(caja(1.8, h, 4.02, M.adobe, l * (s.W / 2 + 0.9), h / 2, zz - 2));
      }
    } else muro(g, s, l, { almenas: !noche, escritura: true });
  });
  if (variante === 'llena') {
    // terrones de arcilla: la materia de la que Aruru formó a Enkidu
    for (let k = 0; k < 14; k++) {
      const l = k % 2 ? 1 : -1, r = 0.8 + azar() * 1.6;
      const m = new THREE.Mesh(geoRoca(r, 1, 0.25), M.tierraRoja);
      m.scale.y = 0.45; m.position.set(l * (PASO_LIBRE + 1.5 + azar() * (s.W / 2 - 5)), r * 0.2, s.zIni - 3 - azar() * (s.L - 6));
      m.castShadow = m.receiveShadow = true; g.add(m);
    }
    const ar = [];
    for (let k = 0; k < 40; k++) { const l = k % 2 ? 1 : -1; ar.push([l * (PASO_LIBRE + 1 + azar() * (s.W / 2 - 3.5)), 0.2, s.zIni - azar() * s.L, azar() * 6, 0, 0, 0.4 + azar() * .6]); }
    g.add(instancias(new THREE.IcosahedronGeometry(0.7, 1).scale(1, 0.55, 1), M.arbusto, ar));
    // charca de barro húmedo
    const ch = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshStandardMaterial({ color: 0x3A2618, roughness: 0.08, metalness: 0 }));
    ch.rotation.x = -Math.PI / 2; ch.scale.set(1.4, 1, 1); ch.position.set(6.5, 0.03, s.zParada + 8); ch.receiveShadow = true; g.add(ch);
  }
  if (variante === 'humanizada') {
    // columnas de tronco de palmera: la geometría regular entra en la sala
    for (let k = 0; k < 6; k++) {
      const l = k % 2 ? 1 : -1, zz = s.zIni - 6 - Math.floor(k / 2) * 12;
      const col = new THREE.Mesh(cilindro(0.55, 0.65, s.H, M.corteza, 14), M.corteza);
      col.position.set(l * (s.W / 2 - 3.2), s.H / 2, zz); col.castShadow = col.receiveShadow = true; g.add(col);
      g.add(caja(1.8, 0.5, 1.8, M.caliza, l * (s.W / 2 - 3.2), 0.25, zz));
      g.add(caja(1.6, 0.4, 1.6, M.caliza, l * (s.W / 2 - 3.2), s.H - 0.2, zz));
    }
    palmera(g, -7, s.zParada + 6, 0, 8); palmera(g, 7.5, s.zFin + 8, 0, 9);
    brasero(g, s.i, -3.6, s.zParada - 8); brasero(g, s.i, 3.6, s.zParada - 8);
  }
  if (noche) {
    // la misma cámara, vaciada: techo de vigas, un lecho y una lámpara
    const vig = [];
    for (let zz = s.zIni - 1.5; zz > s.zFin; zz -= 2.4) vig.push([0, s.H + 0.3, zz]);
    g.add(instancias(geoCaja(s.W + 3, 0.6, 0.7, M.madera.userData.unidad), M.madera, vig));
    const lecho = caja(2.2, 0.75, 4.2, M.caliza, 6.2, 0.375, s.zParada + 7); g.add(lecho);
    const sudario = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 2.6, 6, 12), M.lino);
    sudario.rotation.x = Math.PI / 2; sudario.scale.set(1.1, 1, 0.55); sudario.position.set(6.2, 0.98, s.zParada + 7); sudario.castShadow = true; g.add(sudario);
    brasero(g, s.i, 4.6, s.zParada + 4, 0, 0.9);
    brasero(g, s.i, -3.4, s.zIni - 6, 0, 1.1); brasero(g, s.i, 3.4, s.zIni - 6, 0, 1.1);
  }
}
C.enkidu = (g, s) => camaraEnkidu(g, s, 'llena');
C['enkidu-b'] = (g, s) => camaraEnkidu(g, s, 'humanizada');
C.vacia = (g, s) => camaraEnkidu(g, s, 'vacia');

C.reunion = (g, s) => {
  suelo(g, M.suelo, s.W, s, 0, 4); hilo(g, s);
  [-1, 1].forEach(l => muro(g, s, l, { H: 9, escritura: true }));
  // simetría especular: dos machones gemelos con capitel de lapislázuli
  [-1, 1].forEach(l => {
    const x = l * 7.5, zz = s.zParada - 14;
    g.add(caja(3.4, 11, 3.4, M.cocido, x, 5.5, zz));
    g.add(caja(4.2, 0.9, 4.2, M.lapis, x, 11.45, zz));
    g.add(caja(4.6, 0.5, 4.6, M.caliza, x, 12.1, zz));
    brasero(g, s.i, l * 4.2, s.zParada + 6);
  });
};

C.cedros = (g, s) => {
  g.add(plano(140, s.L + 10, M.tierra, 0, 0.002, (s.zIni + s.zFin) / 2));
  hilo(g, s);
  const disco = new THREE.CircleGeometry(1, 18); disco.rotateX(-Math.PI / 2);
  const fol = [];
  for (let k = 0; k < 64; k++) {
    const l = k % 2 ? 1 : -1;
    const x = l * (PASO_LIBRE + 3.2 + Math.pow(azar(), 1.3) * 40), zz = s.zIni + 6 - azar() * (s.L + 12);
    if (Math.abs(x) < 13 && Math.abs(zz - s.zParada + 7.5) < 7) continue; // deja ver la estela
    if (Math.abs(x) < 9 && Math.abs(zz - s.zIni) < 5) continue;            // y la puerta
    const r = 0.8 + azar() * 1.0, h = 26 + azar() * 18;
    const t = new THREE.Mesh(cilindro(r * 0.45, r * 1.15, h, M.corteza, 14), M.corteza);
    t.position.set(x, h / 2, zz); t.castShadow = t.receiveShadow = true; g.add(t);
    // pisos horizontales de ramaje: la silueta del cedro del Líbano
    const pisos = 6 + Math.floor(azar() * 4);
    for (let p = 0; p < pisos; p++) {
      const yy = h * (0.22 + p / pisos * 0.74), rr = (7.5 - p * 0.75) * (0.75 + azar() * 0.5);
      const ox = -Math.sign(x) * azar() * 1.5; // las ramas se abren hacia el claro
      fol.push([x + ox, yy, zz + (azar() - .5) * 2, azar() * 6, (azar() - .5) * .1, (azar() - .5) * .1, 1, rr, 1, rr * (0.8 + azar() * 0.3)]);
      if (azar() < 0.6) fol.push([x + ox + (azar() - .5) * 3, yy - 0.6, zz + (azar() - .5) * 3, azar() * 6, 0, 0, 1, rr * 0.6, 1, rr * 0.6]);
    }
  }
  const im = instancias(disco, M.follaje, fol); g.add(im);
  const ar = [];
  for (let k = 0; k < 60; k++) { const l = k % 2 ? 1 : -1; ar.push([l * (PASO_LIBRE + 1 + azar() * 30), 0.2, s.zIni - azar() * s.L, azar() * 6, 0, 0, 0.5 + azar() * .9]); }
  g.add(instancias(new THREE.IcosahedronGeometry(0.8, 1).scale(1, 0.5, 1), M.arbusto, ar));
  const lista = [];
  for (let k = 0; k < 11; k++) lista.push([(azar() - .5) * 16, 30, s.zIni - 4 - k * 5.8, 1.2 + azar() * 2.2]);
  haces(g, lista, 46, new THREE.Vector3(0.35, -1, -0.2));
};

C.humbaba = (g, s) => {
  g.add(plano(160, s.L + 10, M.roca, 0, 0.002, (s.zIni + s.zFin) / 2));
  hilo(g, s);
  for (let k = 0; k < 26; k++) {
    const l = k % 2 ? 1 : -1, r = 2 + azar() * 5;
    const m = new THREE.Mesh(geoRoca(r, 2, 0.3), M.roca);
    const x = l * (PASO_LIBRE + r + 1.2 + azar() * 22), zz = s.zIni - azar() * s.L;
    if (Math.abs(x) < 12 && (Math.abs(zz - s.zParada + 7.5) < 6 || Math.abs(zz - s.zFin - 4.6) < 5)) continue;
    m.position.set(x, r * 0.35, zz); m.rotation.set(azar(), azar() * 6, azar());
    m.scale.y = 0.7 + azar(); m.castShadow = m.receiveShadow = true; g.add(m);
  }
  // losas quebradas, inclinadas por el viento de Shamash
  for (let k = 0; k < 10; k++) {
    const l = k % 2 ? 1 : -1, h = 6 + azar() * 10;
    const b = caja(2 + azar() * 3, h, 1.4, M.rocaOscura, l * (PASO_LIBRE + 6 + azar() * 12), h * 0.4, s.zIni - 4 - azar() * (s.L - 8), azar() * 2);
    b.rotation.z = l * (0.15 + azar() * 0.4); g.add(b);
  }
  // tocones de cedro talados
  for (let k = 0; k < 6; k++) {
    const l = k % 2 ? 1 : -1, t = new THREE.Mesh(cilindro(1.0, 1.3, 1.6, M.corteza, 12), M.corteza);
    t.position.set(l * (PASO_LIBRE + 4 + azar() * 10), 0.8, s.zIni - azar() * s.L); t.castShadow = true; g.add(t);
  }
};

C.toro = (g, s) => {
  suelo(g, M.suelo, s.W, s, 0, 4); hilo(g, s);
  [-1, 1].forEach(l => {
    // muro de ladrillo vidriado con friso de toros
    const x = l * (s.W / 2 + 0.9), len = s.L, zc = (s.zIni + s.zFin) / 2;
    g.add(caja(1.8, 3.4, len, M.vidriado, x, 1.7, zc));
    const fr = caja(1.8, 6.8, len, M.vidriadoToro, x, 3.4 + 3.4, zc); g.add(fr);
    g.add(caja(1.8, s.H - 10.2, len, M.vidriado, x, 10.2 + (s.H - 10.2) / 2, zc));
    const tor = [];
    for (let zz = s.zIni - 6; zz > s.zFin; zz -= 12) tor.push([l * (s.W / 2 - 0.1), s.H / 2 + 0.6, zz]);
    g.add(instancias(geoCaja(1.2, s.H + 1.2, 2.6, M.vidriado.userData.unidad), M.vidriado, tor));
    const al = [];
    for (let zz = s.zIni - 1; zz > s.zFin; zz -= 2.1) al.push([x, s.H, zz, Math.PI / 2]);
    g.add(instancias(geoAlmena(1.5, 1.6, 1.5, 2), M.cocido, al));
    g.add(caja(0.5, 0.9, len, M.caliza, l * (s.W / 2 - 0.1), 0.45, zc));
  });
  // altar de los cuernos de oro, ofrendados tras la muerte del Toro Celeste
  const zz = s.zParada - 3, x = -6.2;
  g.add(caja(3.2, 1.3, 2.2, M.caliza, x, 0.65, zz));
  g.add(caja(3.6, 0.25, 2.6, M.caliza, x, 1.42, zz));
  [-1, 1].forEach(l => {
    const cv = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(l * 0.6, 0.7, 0.1), new THREE.Vector3(l * 0.7, 1.7, 0.3), new THREE.Vector3(l * 0.3, 2.5, 0.2)]);
    const geo = new THREE.TubeGeometry(cv, 24, 0.2, 10);
    const p = geo.attributes.position, tmp = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { tmp.fromBufferAttribute(p, i); } // afinado en el radio: se hace con escala
    const c = new THREE.Mesh(geo, M.oro); c.position.set(x + l * 0.5, 1.55, zz); c.castShadow = true; g.add(c);
    const punta = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 10), M.oro);
    punta.position.copy(cv.getPoint(1)).add(c.position); punta.position.y += 0.2; g.add(punta);
  });
  brasero(g, s.i, -3.6, s.zIni - 8); brasero(g, s.i, 3.6, s.zIni - 8);
  brasero(g, s.i, -3.6, s.zParada - 12); brasero(g, s.i, 3.6, s.zParada - 12);
};

C.mashu = (g, s) => {
  g.add(plano(60, s.L + 10, M.rocaOscura, 0, 0.002, (s.zIni + s.zFin) / 2));
  hilo(g, s);
  // garganta: paredes de roca que se cierran en lo alto
  [-1, 1].forEach(l => {
    for (let zz = s.zIni - 5; zz > s.zFin - 4; zz -= 7) {
      for (let piso = 0; piso < 4; piso++) {
        const r = 6 + azar() * 4;
        const m = new THREE.Mesh(geoRoca(r, 2, 0.28), M.roca);
        const junto = l === s.lado && Math.abs(zz - (s.zParada - 7.5)) < 11 && piso < 2 ? 5 : 0;
        m.position.set(l * (s.W / 2 + r * 0.95 - piso * 0.9 + junto), piso * 9 + 3, zz + (azar() - .5) * 3);
        m.scale.set(0.8, 1.3, 1); m.rotation.y = azar() * 6;
        m.castShadow = m.receiveShadow = true; g.add(m);
      }
    }
  });
  // hombres-escorpión: dos guardianes colosales ante la puerta del Sol
  const zPuerta = s.zFin + 6;
  [-1, 1].forEach(l => {
    const x = l * 4.2, gr = new THREE.Group(); gr.position.set(x, 0, zPuerta + 2);
    gr.add(caja(2.2, 2.4, 3.0, M.rocaOscura, 0, 1.2, 0));
    const cuerpo = new THREE.Mesh(cilindro(0.75, 1.1, 6.5, M.rocaOscura, 12), M.rocaOscura); cuerpo.position.y = 5.6; gr.add(cuerpo);
    const torso = caja(2.6, 2.6, 1.4, M.rocaOscura, 0, 9.4, 0); gr.add(torso);
    const cabeza = new THREE.Mesh(geoRoca(0.85, 1, 0.08), M.rocaOscura); cabeza.position.y = 11.3; gr.add(cabeza);
    const tiara = new THREE.Mesh(cilindro(0.7, 0.85, 1.3, M.rocaOscura, 10), M.rocaOscura); tiara.position.y = 12.4; gr.add(tiara);
    const cola = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 2.4, 1.2), new THREE.Vector3(0, 2, 4), new THREE.Vector3(0, 6, 6.2), new THREE.Vector3(0, 11, 5.4), new THREE.Vector3(0, 13.5, 2.6), new THREE.Vector3(0, 12.6, 0.8)]);
    const tubo = new THREE.Mesh(new THREE.TubeGeometry(cola, 60, 0.55, 10), M.rocaOscura); gr.add(tubo);
    const agu = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 10), M.rocaOscura);
    agu.position.set(0, 11.9, 0.3); agu.rotation.x = Math.PI * 0.85; gr.add(agu);
    gr.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    g.add(gr);
  });
  // la puerta del Sol: una hendidura de luz
  const matSol = new THREE.ShaderMaterial({ fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; void main(){ float x = abs(vUv.x-.5)*2.; float b = pow(1.-x, 3.0) * smoothstep(0.,.15,vUv.y) * (1.0 - vUv.y*0.35);
      gl_FragColor = vec4(vec3(3.4,2.1,0.9) * b, 1.); }` });
  const luz = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 9), matSol);
  luz.position.set(0, 4.5, s.zFin + 2.75); g.add(luz);
  VIVO.braseros.push({ pos: new THREE.Vector3(0, 3, s.zFin + 4), sala: s.i, fase: 0, fija: true });
  portal(g, s.zFin + 1, 8, 8, 14, M.rocaOscura, { almenas: false, vano: 1.8, hpuerta: 9 });
  brasero(g, s.i, -2.2, zPuerta + 7, 0, 1.0); brasero(g, s.i, 2.2, zPuerta + 7, 0, 1.0);
};

C.diluvio = (g, s) => {
  // calzada de sillares sobre las Aguas de la Muerte
  const zc = (s.zIni + s.zFin) / 2;
  g.add(caja(5.2, 2.6, s.L + 2, M.caliza, 0, -1.3, zc));
  g.add(caja(5.6, 0.25, s.L + 2, M.caliza, 0, -0.12, zc));
  hilo(g, s, 0);
  // terraza de la estela
  g.add(caja(8.6, 2.6, 2.6, M.caliza, s.lado * 6.2, -1.3, s.zParada - 7.7, Math.atan2(-s.lado * 6.2, 7.7)));
  // islote con árbol y piedras
  const isla = new THREE.Mesh(geoRoca(14, 2, 0.15), M.tierra); isla.scale.y = 0.12; isla.position.set(26, -0.6, s.zParada - 30); isla.receiveShadow = true; g.add(isla);
  palmera(g, 24, s.zParada - 30, 0.4, 8); palmera(g, 29, s.zParada - 25, 0.4, 7);
  // el arca: una caja de betún encallada en el monte Nimush
  const monte = new THREE.Mesh(geoRoca(70, 3, 0.18), M.roca); monte.scale.set(1.4, 0.55, 1); monte.position.set(-140, -6, s.zFin - 160); g.add(monte);
  const arca = caja(34, 12, 34, M.madera, -128, 31, s.zFin - 150, 0.4); g.add(arca);
  g.add(caja(36, 1.2, 36, M.betun, -128, 37.4, s.zFin - 150, 0.4));
  // agua
  const agua = new Water(new THREE.PlaneGeometry(1400, 1400), {
    textureWidth: 512, textureHeight: 512, waterNormals: (() => { const t = texAguaNormal(); t.repeat.set(1, 1); return t; })(),
    sunDirection: new THREE.Vector3(0.3, 0.6, -0.7).normalize(), sunColor: 0xE8ECEE, waterColor: 0x08161B, distortionScale: 5.0, fog: true
  });
  agua.rotation.x = -Math.PI / 2; agua.position.set(0, -0.55, zc);
  agua.material.uniforms.size.value = 1.4;
  g.add(agua); VIVO.agua = agua;
};

C.ascenso = (g, s) => {
  // vía procesional: pavimento, bancos y la fuente de la serpiente
  const zG = PUERTA_Z;
  g.add(plano(s.W + 4, s.zIni - ESCALERA.z0 + 1, M.suelo, 0, 0.001, (s.zIni + ESCALERA.z0) / 2 - 0.5)); hilo(g, { ...s, L: s.zIni - zG + 6, zFin: zG - 6 });
  [-1, 1].forEach(l => muro(g, { ...s, zFin: zG + 4 }, l, { H: 5, mat: M.vidriado, zocalo: M.caliza, ritmo: 4.4 }));
  // fuente: una charca de agua quieta entre rocas
  const fx = -5.2, fz = s.zParada + 6;
  const fuente = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), new THREE.MeshStandardMaterial({ color: 0x0E1C22, roughness: 0.02, metalness: 0.3, envMapIntensity: 1.6 }));
  fuente.rotation.x = -Math.PI / 2; fuente.position.set(fx, 0.06, fz); g.add(fuente);
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, r = 0.5 + azar() * .5; const m = new THREE.Mesh(geoRoca(r, 1, .25), M.roca); m.position.set(fx + Math.cos(a) * 2.9, r * .3, fz + Math.sin(a) * 2.4); m.castShadow = true; g.add(m); }
  // la serpiente, que se lleva la planta
  const sp = new THREE.CatmullRomCurve3([...Array(9)].map((_, k) => new THREE.Vector3(fx + 2.6 + k * 0.55, 0.12, fz - 1.5 + Math.sin(k * 1.3) * 0.5)));
  const serp = new THREE.Mesh(new THREE.TubeGeometry(sp, 80, 0.09, 8), new THREE.MeshStandardMaterial({ color: 0x3A3420, roughness: .35, metalness: .2 }));
  serp.castShadow = true; g.add(serp); VIVO.serpiente = { malla: serp, x0: fx + 2.6, z0: fz - 1.5 };
  palmera(g, -6.5, s.zIni - 6, 0, 10); palmera(g, 6.5, s.zIni - 10, 0, 9);
  brasero(g, s.i, 3.6, s.zParada + 7); brasero(g, s.i, -3.6, s.zParada + 7);
  puertaVidriada(g, zG);
  // escalinata hacia el adarve
  const n = 40, z0 = ESCALERA.z0, z1 = ESCALERA.z1, paso = (z0 - z1) / n, alt = ALTO_MURALLA / n;
  const esc = [];
  for (let k = 0; k < n; k++) esc.push([0, k * alt, z0 - (k + 0.5) * paso, 0, 0, 0, 1]);
  const geoP = geoCaja(8, alt * 1.02, paso * 1.02, M.caliza.userData.unidad, false); geoP.translate(0, 0, 0);
  g.add(instancias(geoP, M.caliza, esc));
  // relleno bajo la escalinata y muros que la encajan
  [-1, 1].forEach(l => {
    for (let k = 0; k < 8; k++) {
      const za = z0 - k * (z0 - z1) / 8, zb = za - (z0 - z1) / 8, h = sueloEn(zb) + 3.2;
      g.add(caja(1.6, h, (z0 - z1) / 8 + .02, M.cocido, l * 4.8, h / 2, (za + zb) / 2));
    }
  });
};

/* La puerta: ladrillo vidriado, friso de toros, arco de rosetas.
   No es una réplica de la Puerta de Ishtar sino su gramática. */
function puertaVidriada(g, zz) {
  const fondo = 7, alto = 17, ancho = 34, vano = 2.8, hv = 7.5;
  // cuerpo con vano en arco
  const forma = new THREE.Shape();
  forma.moveTo(-ancho / 2, 0); forma.lineTo(ancho / 2, 0); forma.lineTo(ancho / 2, alto); forma.lineTo(-ancho / 2, alto); forma.lineTo(-ancho / 2, 0);
  const hueco = new THREE.Path(); hueco.moveTo(-vano, 0); hueco.lineTo(-vano, hv); hueco.absarc(0, hv, vano, Math.PI, 0, true); hueco.lineTo(vano, 0); hueco.lineTo(-vano, 0);
  forma.holes.push(hueco);
  const geo = new THREE.ExtrudeGeometry(forma, { depth: fondo, bevelEnabled: false, curveSegments: 24 });
  geo.computeVertexNormals(); uvMundo(geo, 3.4, new THREE.Vector3(0, 0, zz - fondo / 2));
  const cuerpo = new THREE.Mesh(geo, M.vidriado); cuerpo.position.set(0, 0, zz - fondo / 2); cuerpo.castShadow = cuerpo.receiveShadow = true; g.add(cuerpo);
  // friso de toros en dos registros sobre cada lado del vano
  [-1, 1].forEach(l => {
    for (const y of [3.6, 10.2]) g.add(caja(11, 3.4, 0.25, M.vidriadoToro, l * 10.5, y, zz + fondo / 2 + 0.12, 0, false));
    // torres que flanquean
    const tx = l * (ancho / 2 + 3.5);
    g.add(caja(7, alto + 5, fondo + 3, M.vidriado, tx, (alto + 5) / 2, zz));
    for (const y of [5, 13]) g.add(caja(5.6, 3.4, 0.25, M.vidriadoToro, tx, y, zz + fondo / 2 + 1.62, 0, false));
    const al = [];
    for (let k = -1; k <= 1; k++) al.push([tx + k * 2.2, alto + 5, zz]);
    g.add(instancias(geoAlmena(2, 2, fondo + 3, 3.4), M.vidriado, al));
    // muralla que continúa a ambos lados
    g.add(caja(40, 14, fondo, M.cocido, l * (ancho / 2 + 7 + 20), 7, zz));
    const al2 = [];
    for (let x = ancho / 2 + 7.5; x < ancho / 2 + 47; x += 2.2) al2.push([l * x, 14, zz]);
    g.add(instancias(geoAlmena(1.6, 1.7, fondo, 2), M.cocido, al2));
  });
  // arco de rosetas: banda dorada siguiendo el arco
  const arco = new THREE.Mesh(new THREE.TorusGeometry(vano + 0.35, 0.28, 10, 40, Math.PI), M.oro);
  arco.position.set(0, hv, zz + fondo / 2 + 0.1); g.add(arco);
  [-1, 1].forEach(l => g.add(caja(0.56, hv, 0.3, M.oro, l * (vano + 0.35), hv / 2, zz + fondo / 2 + 0.1, 0, false)));
  g.add(caja(ancho + 0.4, 0.5, 0.4, M.oro, 0, alto - 1.4, zz + fondo / 2 + 0.1, 0, false));
  const al = [];
  for (let x = -ancho / 2 + 1; x < ancho / 2; x += 2.2) al.push([x, alto, zz]);
  g.add(instancias(geoAlmena(1.8, 1.9, fondo, 3.4), M.vidriado, al));
}

C.murallas = (g, s) => {
  const y = ALTO_MURALLA, zc = (s.zIni + s.zFin) / 2;
  const zArco = s.zFin - 20;                  // aquí la muralla empieza a curvarse alrededor de la ciudad
  const L = s.zIni - zArco, zcL = (s.zIni + zArco) / 2;
  // cuerpo de la muralla, con contrafuertes en la cara exterior
  g.add(caja(s.W + 4, y, L, M.cocido, 0, y / 2, zcL));
  g.add(plano(s.W, s.L + 2, M.suelo, 0, y + 0.001, zc)); hilo(g, s, y);
  [-1, 1].forEach(l => {
    const cf = [];
    for (let zz = s.zIni - 2; zz > zArco; zz -= 4.2) cf.push([l * (s.W / 2 + 2.25), y / 2 - 0.5, zz]);
    g.add(instancias(geoCaja(0.6, y - 1, 1.6, 2), M.cocido, cf));
  });
  [-1, 1].forEach(l => {
    const x = l * (s.W / 2 + 0.5);
    const hueco = l === s.lado ? [s.zParada + 7, s.zParada - 13] : [MIRADOR_Z + 14, MIRADOR_Z - 14];   // bastión de la estela / mirador
    const tramo = (a, b) => g.add(caja(1.0, 1.1, a - b, M.cocido, x, y + 0.55, (a + b) / 2));
    tramo(s.zIni, hueco[0]); tramo(hueco[1], zArco);
    if (l !== s.lado) g.add(caja(0.8, 0.85, hueco[0] - hueco[1], M.caliza, x, y + 0.425, (hueco[0] + hueco[1]) / 2));
    const al = [];
    for (let zz = s.zIni - 1; zz > zArco; zz -= 2.0) if (zz > hueco[0] || zz < hueco[1]) al.push([x, y + 1.1, zz, Math.PI / 2]);
    g.add(instancias(geoAlmena(1.2, 1.25, 1.0, 2), M.cocido, al));
    // torreones macizos con vigas de cedro asomando bajo el remate
    const tor = [], altT = y + 7;
    for (let zz = s.zIni - 12; zz > zArco + 6; zz -= 30) if (zz > hueco[0] + 6 || zz < hueco[1] - 6) tor.push([l * (s.W / 2 + 5), altT / 2, zz]);
    g.add(instancias(geoCaja(9, altT, 9, 2), M.cocido, tor));
    const alT = [], vig = [];
    tor.forEach(t => {
      for (let k = -1; k <= 1; k++) { alT.push([t[0] + l * 3.4, altT, t[2] + k * 3, Math.PI / 2]); alT.push([t[0] + k * 3, altT, t[2] + 3.4]); alT.push([t[0] + k * 3, altT, t[2] - 3.4]); }
      for (let k = -3; k <= 3; k++) { vig.push([t[0] + l * 4.7, altT - 1.6, t[2] + k * 1.2, 0, 0, Math.PI / 2]); vig.push([t[0] + k * 1.2, altT - 1.6, t[2] + 4.7, 0, Math.PI / 2, 0]); }
    });
    g.add(instancias(geoAlmena(1.9, 2.0, 1.6, 2), M.cocido, alT));
    g.add(instancias(new THREE.CylinderGeometry(0.16, 0.16, 1.0, 8), M.madera, vig));
  });
  // bastión: plataforma que sobresale de la muralla y sostiene la estela
  const bx = s.lado * 9.5, bz = s.zParada - 3;
  g.add(caja(13, y, 20, M.cocido, bx, y / 2, bz));
  g.add(plano(12, 19, M.suelo, bx, y + 0.002, bz));
  g.add(caja(1.0, 1.1, 20, M.cocido, bx + s.lado * 6.0, y + 0.55, bz));
  const alB = [];
  for (let zz = bz + 9; zz > bz - 10; zz -= 2.0) alB.push([bx + s.lado * 6.0, y + 1.1, zz, Math.PI / 2]);
  g.add(instancias(geoAlmena(1.2, 1.25, 1.0, 2), M.cocido, alB));
  // antemuro y foso en la cara exterior
  g.add(caja(3, 6, L + 300, M.cocido, s.lado * 26, 3, zcL + 120));
  const alA = []; for (let zz = s.zIni + 270; zz > zArco; zz -= 2.2) alA.push([s.lado * 26, 6, zz, Math.PI / 2]);
  g.add(instancias(geoAlmena(1.4, 1.4, 3, 2), M.cocido, alA));
  const foso = new THREE.Mesh(new THREE.PlaneGeometry(12, L + 300), new THREE.MeshStandardMaterial({ color: 0x3E5A5E, roughness: 0.06, metalness: 0.25, envMapIntensity: 1.3 }));
  foso.rotation.x = -Math.PI / 2; foso.position.set(s.lado * 16.5, 0.05, zcL + 120); g.add(foso);
  murallaCurva(g, s, zArco);
  construirUruk(g, s, zArco);
};

/* La muralla de Uruk se curva y abraza la ciudad: tramos girados a lo largo de un arco */
const R_URUK = 300;
function murallaCurva(g, s, zArco) {
  const cx = -R_URUK, cz = zArco, y = ALTO_MURALLA, seg = 12;
  const n = Math.floor(Math.PI * 1.25 * R_URUK / seg);
  const al = [], tor = [], alT = [], cf = [];
  for (let k = 0; k < n; k++) {
    const t0 = (k * seg) / R_URUK, tm = ((k + 0.5) * seg) / R_URUK;
    const x = cx + R_URUK * Math.cos(tm), z = cz - R_URUK * Math.sin(tm);
    const rumbo = tm;                     // la tangente gira con el ángulo
    g.add(caja(s.W + 4, y, seg + 0.6, M.cocido, x, y / 2, z, rumbo, k < 30));
    for (const lado of [-1, 1]) {
      const ox = Math.cos(tm) * lado * (s.W / 2 + 0.5), oz = -Math.sin(tm) * lado * (s.W / 2 + 0.5);
      for (let m = 0; m < seg; m += 2) {
        const tt = t0 + m / R_URUK;
        al.push([cx + (R_URUK + lado * (s.W / 2 + 0.5)) * Math.cos(tt), y, cz - (R_URUK + lado * (s.W / 2 + 0.5)) * Math.sin(tt), tt + Math.PI / 2]);
      }
      if (lado === 1) cf.push([x + Math.cos(tm) * (s.W / 2 + 2.25), y / 2 - 0.5, z - Math.sin(tm) * (s.W / 2 + 2.25), tm]);
    }
    if (k % 3 === 1) {
      const tx = cx + (R_URUK + 4) * Math.cos(tm), tz = cz - (R_URUK + 4) * Math.sin(tm);
      tor.push([tx, (y + 7) / 2, tz, tm]);
      for (let q = -1; q <= 1; q++) alT.push([tx + Math.cos(tm) * 3.6 + Math.sin(tm) * q * 3, y + 7, tz - Math.sin(tm) * 3.6 + Math.cos(tm) * q * 3, tm + Math.PI / 2]);
    }
  }
  g.add(instancias(geoAlmena(1.2, 1.25, 1.0, 2), M.cocido, al, false));
  g.add(instancias(geoCaja(9, y + 7, 9, 2), M.cocido, tor));
  g.add(instancias(geoAlmena(1.9, 2.0, 1.6, 2), M.cocido, alT, false));
  g.add(instancias(geoCaja(0.6, y - 1, 1.6, 2), M.cocido, cf, false));
}

/* Zigurat: terrazas en talud, contrafuertes y triple escalinata */
function zigurat(g, x, z, escala = 1, rot = 0) {
  const gr = new THREE.Group(); gr.position.set(x, 0, z); gr.rotation.y = rot; gr.scale.setScalar(escala);
  const pisos = [[86, 66, 14], [62, 48, 11], [44, 34, 9], [28, 22, 7]];
  let yy = 0;
  pisos.forEach(([a, b, h], k) => {
    // talud: tronco de pirámide de base rectangular
    const geo = new THREE.CylinderGeometry(Math.SQRT1_2 * 0.92, Math.SQRT1_2, 1, 4, 1); geo.rotateY(Math.PI / 4);
    geo.scale(a, h, b); geo.translate(0, yy + h / 2, 0); geo.computeVertexNormals();
    uvMundo(geo, 7, new THREE.Vector3(x, 0, z));
    const m = new THREE.Mesh(geo, M.zigurat); m.castShadow = m.receiveShadow = true; gr.add(m);
    // contrafuertes en las cuatro caras: el ritmo de nichos de los templos de Uruk
    const cf = [];
    for (let px = -a / 2 + 3; px < a / 2 - 2; px += 4.5) { cf.push([px, yy + h / 2, b / 2 * 0.97]); cf.push([px, yy + h / 2, -b / 2 * 0.97]); }
    for (let pz = -b / 2 + 3; pz < b / 2 - 2; pz += 4.5) { cf.push([a / 2 * 0.97, yy + h / 2, pz]); cf.push([-a / 2 * 0.97, yy + h / 2, pz]); }
    gr.add(instancias(geoCaja(1.4, h * 0.94, 1.4, 7), M.zigurat, cf));
    // banda de betún que remata cada terraza
    gr.add(caja(a * 0.93, 0.6, b * 0.93, M.betun, 0, yy + h - 0.3, 0, 0, false));
    yy += h;
  });
  // triple escalinata en la cara frontal (hacia la muralla)
  const esc = (ancho, largo, ang, ox, oy, oz, ry = 0) => {
    const e = caja(ancho, 1.4, largo, M.caliza, 0, 0, 0, 0.0001); e.rotation.order = 'YXZ'; e.rotation.set(ang, ry, 0); e.position.set(ox, oy, oz); gr.add(e);
  };
  esc(10, 44, 0.66, 0, 13.6, 46);
  // el santuario encalado, con banda de lapislázuli
  gr.add(caja(18, 7, 13, M.caliza, 0, yy + 3.5, 0));
  gr.add(caja(18.6, 0.8, 13.6, M.lapis, 0, yy + 6.2, 0, 0, false));
  const al = []; for (let k = -4; k <= 4; k++) { al.push([k * 2, yy + 7, 6.5]); al.push([k * 2, yy + 7, -6.5]); }
  gr.add(instancias(geoAlmena(1.4, 1.3, 0.8, 3), M.caliza, al));
  g.add(gr);
}

/* Templo de fachada de nichos */
function templo(g, x, z, w, d, h, rot, mat = M.casa) {
  const gr = new THREE.Group(); gr.position.set(x, 0, z); gr.rotation.y = rot;
  gr.add(caja(w + 4, 1.6, d + 4, M.caliza, 0, 0.8, 0));
  gr.add(caja(w, h, d, mat, 0, 1.6 + h / 2, 0));
  const cf = [];
  for (let px = -w / 2 + 1; px <= w / 2 - 1; px += 2.2) { cf.push([px, 1.6 + h / 2, d / 2 + 0.25]); cf.push([px, 1.6 + h / 2, -d / 2 - 0.25]); }
  for (let pz = -d / 2 + 1; pz <= d / 2 - 1; pz += 2.2) { cf.push([w / 2 + 0.25, 1.6 + h / 2, pz]); cf.push([-w / 2 - 0.25, 1.6 + h / 2, pz]); }
  gr.add(instancias(geoCaja(0.9, h, 0.5, 5), mat, cf));
  const vig = []; for (let px = -w / 2 + 1; px < w / 2; px += 1.4) vig.push([px, 1.6 + h - 0.8, d / 2 + 0.5, 0, Math.PI / 2, 0]);
  gr.add(instancias(new THREE.CylinderGeometry(0.15, 0.15, 1.2, 6), M.madera, vig, false));
  gr.add(caja(4, h * 0.75, 0.6, M.madera, 0, 1.6 + h * 0.375, d / 2 + 0.3, 0, false));   // portón de cedro
  g.add(gr);
}

/* Uruk a los pies: casas de patio, madera, huertos, árboles, templos y colinas */
function construirUruk(g, s, zArco) {
  const cx = -R_URUK, cz = zArco, zc = s.zParada;
  const dentro = (x, z, m = 16) => Math.hypot(x - cx, z - cz) < R_URUK - m && x < -16;
  const libre = (x, z, r = 0) => !(Math.abs(x) < 70 + r && z > zArco - 60);   // el corredor del visitante queda limpio
  g.add(plano(3600, 3600, M.tierra, 0, -0.06, zc));
  zigurat(g, -170, zc - 70, 1, 0.5);
  // calles: dos ejes que llevan al recinto sagrado
  const calle = (x, z) => Math.abs((x + 170) * 0.42 - (z - zc + 70) * 0.9) < 5 || Math.abs((z - zc + 70) * 0.42 + (x + 170) * 0.9) < 5;
  const recinto = (x, z) => Math.hypot(x + 170, z - zc + 70) < 78;

  // jardines intramuros: Uruk era un tercio ciudad, un tercio huertos, un tercio palmeral
  const jardines = [];
  for (let k = 0; k < 46; k++) {
    let x, z, n = 0;
    do { x = cx + (azar() * 2 - 1) * R_URUK; z = cz + (azar() * 2 - 1) * R_URUK; } while ((!dentro(x, z, 30) || recinto(x, z)) && n++ < 50);
    jardines.push([x, z, 12 + azar() * 22]);
  }
  const enJardin = (x, z) => jardines.some(([jx, jz, r]) => Math.hypot(x - jx, z - jz) < r);
  // casas: volumen principal + cuarto de azotea + vigas asomando + algún toldo de cañizo
  const casas = [], azoteas = [], vigas = [], toldos = [], postes = [];
  const colorCasa = [0xF1E8D6, 0xE4CFA6, 0xC9AA7C, 0xD8B48C, 0xBFA27E, 0xE9DDC4].map(c => new THREE.Color(c));
  const tintes = [];
  let intentos = 0;
  const patios = [];
  while (casas.length < 2100 && intentos++ < 20000) {
    const x = cx + (azar() * 2 - 1) * R_URUK, z = cz + (azar() * 2 - 1) * R_URUK;
    if (!dentro(x, z) || recinto(x, z) || calle(x, z) || enJardin(x, z)) continue;
    if (Math.hypot(x + 60, z - zc - 40) < 34 || Math.hypot(x + 250, z - zc + 160) < 40) continue;   // huertos intramuros
    const w = 6 + azar() * 7, d = 6 + azar() * 7, h = 3.2 + Math.pow(azar(), 2) * 4.5, r = Math.floor(azar() * 4) * Math.PI / 2 + (azar() - .5) * 0.1;
    casas.push([x, h / 2, z, r, 0, 0, 1, w, h, d]); tintes.push(colorCasa[Math.floor(azar() * colorCasa.length)]);
    if (azar() < 0.45) patios.push([x + Math.cos(r) * (w / 2 + 2.4), z - Math.sin(r) * (w / 2 + 2.4)]);   // árbol junto a la casa
    if (azar() < 0.4) azoteas.push([x + Math.cos(r) * w * 0.2, h + 1.2, z + Math.sin(r) * d * 0.2, r, 0, 0, 1, w * 0.35, 2.4, d * 0.35]);
    if (azar() < 0.55) for (let k = -2; k <= 2; k++) {
      // vigas de palmera y cedro que asoman bajo la azotea
      const lx = k * w * 0.18, lz = d / 2 + 0.2;
      vigas.push([x + Math.cos(r) * lx + Math.sin(r) * lz, h - 0.45, z - Math.sin(r) * lx + Math.cos(r) * lz, r, Math.PI / 2, 0]);
    }
    if (azar() < 0.12) { toldos.push([x, h + 2.4, z, r, 0, 0, 1, w * 0.6, 0.12, d * 0.5]); postes.push([x + w * 0.28, h + 1.2, z + d * 0.22, 0, 0, 0, 1], [x - w * 0.28, h + 1.2, z + d * 0.22, 0, 0, 0, 1]); }
  }
  const imC = instancias(geoCaja(1, 1, 1, 0.55, false), M.casa, casas, false);
  tintes.forEach((c, i) => imC.setColorAt(i, c)); imC.instanceColor.needsUpdate = true; g.add(imC);
  const imA = instancias(geoCaja(1, 1, 1, 0.55, false), M.casa, azoteas, false); g.add(imA);
  g.add(instancias(new THREE.CylinderGeometry(0.13, 0.13, 0.9, 6), M.madera, vigas, false));
  g.add(instancias(geoCaja(1, 1, 1, 2, false), M.canizo, toldos, false));
  g.add(instancias(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 6), M.madera, postes, false));

  // templos de nichos en el recinto y en los barrios
  templo(g, -110, zc - 30, 30, 20, 9, 0.5, M.caliza);
  templo(g, -230, zc - 120, 26, 18, 8, 0.5);
  templo(g, -205, zc + 5, 22, 16, 7, -1.07);
  templo(g, -60, zc - 210, 20, 14, 7, 0.2);
  templo(g, -300, zc - 40, 24, 16, 7, 1.3);

  // huertos, canales, árboles de sombra y palmerales
  const huerto = (x, z, w, d, r) => { if (!libre(x, z, Math.max(w, d) / 2)) return; const p = plano(w, d, M.huerto, x, 0.02, z); p.rotation.y = r; g.add(p); };
  huerto(-60, zc + 40, 56, 44, 0.3); huerto(-250, zc - 160, 64, 50, -0.4);
  for (let k = 0; k < 26; k++) { const a = azar() * Math.PI * 2, r = R_URUK + 40 + azar() * 260; huerto(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 40 + azar() * 60, 30 + azar() * 50, azar() * 3); }
  for (let k = 0; k < 14; k++) { const x = 80 + azar() * 220, z = zc + 200 - azar() * 600; if (Math.abs(x - 240) > 60) huerto(x, z, 40 + azar() * 50, 30 + azar() * 40, (azar() - .5) * 0.4); }
  const agua = new THREE.MeshStandardMaterial({ color: 0x4F6E72, roughness: 0.05, metalness: 0.25, envMapIntensity: 1.3 });
  [[-60, zc + 40, 0.3], [-250, zc - 160, -0.4], [120, zc - 100, 0.0]].forEach(([x, z, r]) => { const c = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 140), agua); c.rotation.set(-Math.PI / 2, 0, r); c.position.set(x, 0.04, z); g.add(c); });
  const troncos = [], copas = [];
  const arbol = (x, z) => { if (!libre(x, z)) return; const h = 2.8 + azar() * 2.5, r = 3 + azar() * 3; troncos.push([x, h / 2, z, 0, 0, 0, 1, 1, h, 1]); copas.push([x, h + r * 0.6, z, azar() * 6, 0, 0, 1, r, r * 0.8, r]); };
  for (let k = 0; k < 160; k++) arbol(-60 + (azar() - .5) * 60, zc + 40 + (azar() - .5) * 48);
  for (let k = 0; k < 160; k++) arbol(-250 + (azar() - .5) * 68, zc - 160 + (azar() - .5) * 54);
  for (let k = 0; k < 260; k++) { const a = azar() * Math.PI * 2, r = R_URUK + 30 + azar() * 300; arbol(cx + Math.cos(a) * r, cz + Math.sin(a) * r); }
  for (let k = 0; k < 120; k++) arbol(75 + azar() * 200, zc + 60 - azar() * 500);
  // jardines: huerto, árboles frutales y palmeras altas que dan sombra
  const palmas = [];
  jardines.forEach(([x, z, r]) => {
    huerto(x, z, r * 1.6, r * 1.4, azar() * 3);
    const n = Math.floor(r * 1.6);
    for (let k = 0; k < n; k++) { const a = azar() * 6.28, d = Math.sqrt(azar()) * r * 0.85; arbol(x + Math.cos(a) * d, z + Math.sin(a) * d); }
    for (let k = 0; k < n * 0.7; k++) { const a = azar() * 6.28, d = Math.sqrt(azar()) * r * 0.9; palmas.push([x + Math.cos(a) * d, z + Math.sin(a) * d, 9 + azar() * 7]); }
  });
  patios.forEach(([x, z]) => azar() < 0.5 ? arbol(x, z) : palmas.push([x, z, 7 + azar() * 6]));
  // calles arboladas hacia el recinto sagrado
  for (let t = -260; t < 260; t += 9) for (const off of [-7, 7]) {
    const ax = -170 + t * 0.9 + off * 0.42, az = zc - 70 + t * 0.42 - off * 0.9;
    const bx = -170 - t * 0.42 + off * 0.9, bz = zc - 70 + t * 0.9 + off * 0.42;
    if (dentro(ax, az) && !recinto(ax, az)) palmas.push([ax, az, 10 + azar() * 4]);
    if (dentro(bx, bz) && !recinto(bx, bz)) arbol(bx, bz);
  }
  // palmerales fuera de los muros y en la orilla del río
  for (let k = 0; k < 160; k++) { const x = 75 + azar() * 260, z = zc + 60 - azar() * 420; if (Math.abs(x - 300) > 62) palmas.push([x, z, 8 + azar() * 7]); }
  for (let k = 0; k < 220; k++) { const a = azar() * Math.PI * 2, r = R_URUK + 30 + azar() * 240, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (libre(x, z)) palmas.push([x, z, 8 + azar() * 7]); }
  palmeral(g, palmas);
  const copa = new THREE.IcosahedronGeometry(1, 1);
  { const p = copa.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(0.85 + Math.sin(v.x * 7 + v.y * 5) * 0.12 + Math.cos(v.z * 9) * 0.08); p.setXYZ(i, v.x, v.y, v.z); } copa.computeVertexNormals(); }
  g.add(instancias(new THREE.CylinderGeometry(0.18, 0.28, 1, 6), M.madera, troncos, false));
  const imCopa = instancias(copa, M.copa, copas, false);
  const verdes = [0x4F6B34, 0x5E7A3C, 0x6B7F44, 0x45602F].map(c => new THREE.Color(c));
  copas.forEach((_, i) => imCopa.setColorAt(i, verdes[i % 4])); imCopa.instanceColor.needsUpdate = true; g.add(imCopa);


  // el Éufrates
  const rio = new THREE.Mesh(new THREE.PlaneGeometry(110, 3000), new THREE.MeshStandardMaterial({ color: 0x5A7C86, roughness: 0.06, metalness: 0.2, envMapIntensity: 1.3 }));
  rio.rotation.x = -Math.PI / 2; rio.rotation.z = 0.12; rio.position.set(300, 0.03, zc); g.add(rio);

  // colinas y tells cercanos; cordilleras en todo el horizonte
  for (let k = 0; k < 12; k++) {
    const a = azar() * Math.PI * 2, r = 520 + azar() * 260, rr = 40 + azar() * 50;
    const hx = cx + Math.cos(a) * r, hz = cz + Math.sin(a) * r; if (!libre(hx, hz, rr * 1.3)) continue;
    const m = new THREE.Mesh(geoRoca(rr, 2, .18), M.tierra);
    m.scale.y = 0.18 + azar() * 0.12; m.position.set(hx, -4, hz); g.add(m);
  }
  for (let k = 0; k < 30; k++) {
    const a = k / 30 * Math.PI * 2 + azar() * 0.1, r = 1300 + azar() * 500, rr = 160 + azar() * 140;
    const hx = cx + Math.cos(a) * r, hz = cz + Math.sin(a) * r; if (!libre(hx, hz, rr * 1.3)) continue;
    const m = new THREE.Mesh(geoRoca(rr, 2, .22), M.roca);
    m.scale.y = 0.28 + azar() * 0.25; m.position.set(hx, -20, hz); g.add(m);
  }
}

/* ============================================================
   CONSTRUCCIÓN
   ============================================================ */
export function construirMundo(escena, relieves, piezas, datosPiezas) {
  sembrar(1234);
  const mundo = new THREE.Group();
  // explanada exterior antes del umbral
  mundo.add(plano(600, 220, M.tierra, 0, -0.02, 90));
  mundo.add(plano(16, 30, M.suelo, 0, 0.001, 15));
  SALAS.forEach(s => {
    const g = new THREE.Group(); g.name = 'sala-' + s.clave;
    C[s.clave](g, s);
    const r = relieves[s.i];
    if (r) {
      const y0 = s.clave === 'diluvio' ? 0 : sueloEn(s.zParada);
      estela(g, s, r, r.aspecto, y0, s.clave === 'murallas' ? { dx: 8.6 } : s.clave === 'ascenso' ? { dz: 5.5 } : {});
    }
    s.grupo = g; mundo.add(g);
  });
  // umbrales entre salas
  portal(mundo, 0, SALAS[0].W, SALAS[0].W, 15, M.adobe, { hpuerta: 8 });
  const tipos = {
    1: 'portal', 2: null, 3: 'portal', 4: 'pilonos', 5: 'pilonos', 6: 'portal', 7: 'portal', 8: 'portal', 9: null, 10: 'pilonos'
  };
  for (let i = 1; i <= 10; i++) {
    const zz = SALAS[i].zIni, t = tipos[i];
    if (!t) continue;
    if (t === 'portal') portal(mundo, zz, SALAS[i - 1].W, SALAS[i].W, Math.max(SALAS[i - 1].H, SALAS[i].H, 9) + 3, i === 6 ? M.vidriado : M.adobe);
    else pilonos(mundo, zz, 3.2, 15, M.adobe, i === 10 ? -0.0 : 0);
  }
  // testimonios: piezas reales entre estación y estación
  datosPiezas.forEach((p, k) => {
    const s = SALAS[p.estacion], zz = s.clave === 'mashu' ? s.zIni - 9 : s.zFin + 4.6, l = -s.lado;
    const y0 = s.clave === 'diluvio' ? 0 : sueloEn(zz);
    const x = s.clave === 'diluvio' ? l * 2.2 : l * Math.min(s.W / 2 - 1.8, 4.6);
    atril(mundo, s.clave === 'diluvio' ? x * 1.0 : x, zz, y0, piezas[k], p.aspecto, p, new THREE.Vector3(0, 0, zz + 6));
  });
  escena.add(mundo);
  return mundo;
}
