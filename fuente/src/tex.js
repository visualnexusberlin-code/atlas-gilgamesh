/* ============================================================
   TALLER DE TEXTURAS
   Todo material nace de un mapa de altura teselable. De él se
   derivan color, normal y rugosidad: las tres capas describen
   siempre la misma superficie. Nada se descarga.
   ============================================================ */
import * as THREE from 'three';

let semilla = 7;
export function azar() { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; }
export function sembrar(s) { semilla = s; }

/* Ruido de valor teselable, varias octavas */
function rejilla(p) { const g = new Float32Array(p * p); for (let i = 0; i < g.length; i++) g[i] = azar(); return g; }
export function ruido(N, periodo, octavas = 5, ganancia = 0.5) {
  const out = new Float32Array(N * N);
  let amp = 1, total = 0, p = periodo;
  for (let o = 0; o < octavas; o++) {
    const g = rejilla(p), esc = p / N;
    for (let y = 0; y < N; y++) {
      const fy = y * esc, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
      const r0 = (y0 % p) * p, r1 = ((y0 + 1) % p) * p;
      for (let x = 0; x < N; x++) {
        const fx = x * esc, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
        const a = g[r0 + x0 % p], b = g[r0 + (x0 + 1) % p], c = g[r1 + x0 % p], d = g[r1 + (x0 + 1) % p];
        out[y * N + x] += amp * ((a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy);
      }
    }
    total += amp; amp *= ganancia; p *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ---------- Derivadas: normal, rugosidad, color ---------- */
function canvasDe(N, fn) {
  const c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), img = x.createImageData(N, N);
  fn(img.data); x.putImageData(img, 0, 0); return c;
}
function normalDe(H, N, fuerza) {
  return canvasDe(N, d => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const h = (a, b) => H[((b + N) % N) * N + ((a + N) % N)];
      const dx = (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1) - h(x - 1, y - 1) - 2 * h(x - 1, y) - h(x - 1, y + 1)) * fuerza;
      const dy = (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1) - h(x - 1, y - 1) - 2 * h(x, y - 1) - h(x + 1, y - 1)) * fuerza;
      const l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
      d[i] = (-dx / l * .5 + .5) * 255; d[i + 1] = (dy / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
    }
  });
}
/* Oclusión barata: altura frente a su entorno difuminado */
function oclusion(H, N, radio, fuerza) {
  const B = new Float32Array(N * N), T = new Float32Array(N * N);
  for (let y = 0; y < N; y++) { let s = 0; for (let k = -radio; k <= radio; k++) s += H[y * N + (k + N) % N];
    for (let x = 0; x < N; x++) { T[y * N + x] = s / (2 * radio + 1); s += H[y * N + (x + radio + 1) % N] - H[y * N + (x - radio + N) % N]; } }
  for (let x = 0; x < N; x++) { let s = 0; for (let k = -radio; k <= radio; k++) s += T[((k + N) % N) * N + x];
    for (let y = 0; y < N; y++) { B[y * N + x] = s / (2 * radio + 1); s += T[((y + radio + 1) % N) * N + x] - T[((y - radio + N) % N) * N + x]; } }
  const A = new Float32Array(N * N);
  for (let i = 0; i < A.length; i++) A[i] = 1 - Math.max(0, (B[i] - H[i])) * fuerza;
  return A;
}

function tex(c, srgb) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/* Empaqueta: color(rgb por píxel), altura → normal, rugosidad */
function empaquetar(N, H, colorFn, rugFn, fuerzaNormal, ao = [6, 2.2]) {
  const A = oclusion(H, N, ao[0], ao[1]);
  const color = canvasDe(N, d => {
    const c = [0, 0, 0];
    for (let i = 0; i < N * N; i++) { colorFn(i, c); const a = Math.max(0.35, A[i]);
      d[i * 4] = Math.min(255, c[0] * a * 255); d[i * 4 + 1] = Math.min(255, c[1] * a * 255); d[i * 4 + 2] = Math.min(255, c[2] * a * 255); d[i * 4 + 3] = 255; }
  });
  const rug = canvasDe(N, d => { for (let i = 0; i < N * N; i++) { const r = rugFn(i) * 255; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = r; d[i * 4 + 3] = 255; } });
  return { map: tex(color, true), normalMap: tex(normalDe(H, N, fuerzaNormal), false), roughnessMap: tex(rug, false), _c: color };
}

const hex = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

/* ---------- Aparejo de ladrillo genérico ---------- */
function aparejo(N, filas, cols, junta, desgaste, semillaLocal) {
  sembrar(semillaLocal);
  const n1 = ruido(N, 8, 5), n2 = ruido(N, 32, 3);
  const H = new Float32Array(N * N), id = new Float32Array(N * N), bord = new Float32Array(N * N);
  const tono = []; for (let k = 0; k < filas * (cols + 1); k++) tono.push(azar());
  const h = N / filas, w = N / cols;
  for (let y = 0; y < N; y++) {
    const f = Math.floor(y / h), off = (f % 2) * w / 2, fy = (y - f * h) / h;
    for (let x = 0; x < N; x++) {
      const xx = (x + off) % N, c = Math.floor(xx / w), fx = (xx - c * w) / w;
      const dE = Math.min(fx * w, (1 - fx) * w, fy * h, (1 - fy) * h);   // distancia al borde en px
      const ruidoBorde = (n2[y * N + x] - .5) * desgaste;
      const e = suave(junta * .5, junta * .5 + desgaste * .6 + 1, dE + ruidoBorde);
      const i = y * N + x;
      H[i] = 0.18 + e * (0.62 + (n1[i] - .5) * .2) + (n2[i] - .5) * .05;
      id[i] = tono[f * (cols + 1) + c]; bord[i] = e;
    }
  }
  return { H, id, bord, n1, n2 };
}

/* ADOBE: ladrillo de barro secado al sol, con juntas de barro y paja */
export function texAdobe(N = 512) {
  const { H, id, bord, n1, n2 } = aparejo(N, 10, 4, 5, 9, 11);
  const base = hex(0xA88A62), junta = hex(0x9C8466);
  return empaquetar(N, H, (i, c) => {
    const v = 0.9 + id[i] * 0.16 + (n1[i] - .5) * .12;
    for (let k = 0; k < 3; k++) c[k] = (base[k] * v) * bord[i] + junta[k] * 0.78 * (1 - bord[i]);
    c[2] *= 0.95 + n2[i] * 0.04;
  }, i => 0.86 + (1 - bord[i]) * .1 + (n1[i] - .5) * .08, 2.6, [4, 1.2]);
}

/* LADRILLO COCIDO con junta de betún: suelos procesionales, murallas */
export function texCocido(N = 512, cuadrado = false) {
  const { H, id, bord, n1, n2 } = aparejo(N, cuadrado ? 6 : 9, cuadrado ? 6 : 4, 4, 5, cuadrado ? 23 : 17);
  const base = hex(cuadrado ? 0x9A7350 : 0x93633F), betun = hex(0x2B2119);
  return empaquetar(N, H, (i, c) => {
    const v = 0.78 + id[i] * 0.32 + (n1[i] - .5) * .3;
    const quemado = Math.pow(n2[i], 3) * .5;
    for (let k = 0; k < 3; k++) c[k] = (base[k] * v * (1 - quemado)) * bord[i] + betun[k] * (1 - bord[i]);
  }, i => 0.62 + bord[i] * .26 + (n1[i] - .5) * .1, 3.6);
}

/* TIERRA batida, guijarros y surcos */
export function texTierra(N = 512, tinte = 0x7E6545) {
  sembrar(31);
  const n = ruido(N, 6, 6, .55), m = ruido(N, 48, 2);
  const H = new Float32Array(N * N);
  for (let i = 0; i < H.length; i++) H[i] = n[i] * .7 + Math.pow(m[i], 4) * .6;
  const base = hex(tinte);
  return empaquetar(N, H, (i, c) => {
    const v = 0.72 + n[i] * .5; const g = Math.pow(m[i], 4) > .25 ? 1.12 : 1;
    for (let k = 0; k < 3; k++) c[k] = base[k] * v * g;
  }, i => 0.93 - Math.pow(m[i], 4) * .2, 2.4, [5, 1.4]);
}

/* CALIZA: estelas, marcos, columnas */
export function texCaliza(N = 512, tinte = 0xB9AC93) {
  sembrar(41);
  const n = ruido(N, 4, 6, .55), f = ruido(N, 64, 2, .4);
  const H = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; const cincel = Math.sin((x * 0.9 + y * 0.35) * 0.55 + n[i] * 8) * .5 + .5;
    H[i] = n[i] * .75 + cincel * .05 + f[i] * .12;
  }
  const base = hex(tinte);
  return empaquetar(N, H, (i, c) => { const v = .8 + n[i] * .32 - Math.pow(f[i], 6) * .3;
    for (let k = 0; k < 3; k++) c[k] = base[k] * v; }, i => .72 + n[i] * .2, 1.6, [8, 1.2]);
}

/* ROCA de montaña: Mashu, Humbaba */
export function texRoca(N = 512, tinte = 0x6E655A) {
  sembrar(53);
  const n = ruido(N, 4, 7, .58), s = ruido(N, 16, 3);
  const H = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x;
    H[i] = n[i] * .8 + Math.abs(Math.sin(y * .05 + n[i] * 10)) * .12 + s[i] * .1; }
  const base = hex(tinte);
  return empaquetar(N, H, (i, c) => { const v = .65 + n[i] * .6; for (let k = 0; k < 3; k++) c[k] = base[k] * v; },
    i => .85 + s[i] * .1, 3.4, [10, 2]);
}

/* CORTEZA de cedro: surcos verticales fibrosos */
export function texCorteza(N = 512) {
  sembrar(61);
  const n = ruido(N, 4, 5), v = ruido(N, 16, 4);
  const H = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x;
    const surco = Math.pow(Math.abs(Math.sin((x / N) * Math.PI * 22 + v[i] * 6 + n[(Math.floor(y / 6) * 6 % N) * N + x] * 3)), .6);
    H[i] = surco * .7 + n[i] * .3; }
  const base = hex(0x5B3E2B);
  return empaquetar(N, H, (i, c) => { const k2 = .55 + H[i] * .6; c[0] = base[0] * k2; c[1] = base[1] * k2; c[2] = base[2] * k2 * .95; },
    i => .9, 4.5, [4, 2.5]);
}

/* MADERA de viga */
export function texMadera(N = 256) {
  sembrar(67);
  const n = ruido(N, 4, 4);
  const H = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x;
    H[i] = .5 + .5 * Math.sin(y * .5 + n[i] * 14) * .5 + n[i] * .3; }
  const base = hex(0x4A3020);
  return empaquetar(N, H, (i, c) => { const k = .6 + H[i] * .5; for (let j = 0; j < 3; j++) c[j] = base[j] * k; }, i => .7, 1.6);
}

/* LADRILLO VIDRIADO: azul de lapislázuli, hiladas, y opcionalmente friso */
export function texVidriado(N = 1024, friso = null) {
  const { H, id, bord, n1, n2 } = aparejo(N, 16, 6, 3, 3, 71);
  const c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), img = x.createImageData(N, N), d = img.data;
  const azul = hex(0x163F86), azul2 = hex(0x0E2C63), cal = hex(0xC9C0AA);
  for (let i = 0; i < N * N; i++) {
    const v = .82 + id[i] * .3 + (n1[i] - .5) * .25, mezcla = Math.pow(n2[i], 2);
    for (let k = 0; k < 3; k++) { const cb = azul[k] * (1 - mezcla) + azul2[k] * mezcla;
      d[i * 4 + k] = 255 * (cb * v * bord[i] + cal[k] * .55 * (1 - bord[i])); }
    d[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  if (friso) {
    friso(x, N);
    // las juntas atraviesan también las figuras: están hechas de ladrillos moldeados
    const im2 = x.getImageData(0, 0, N, N), q = im2.data;
    for (let i = 0; i < N * N; i++) {
      const j = 1 - bord[i], v = .9 + id[i] * .16 + (n1[i] - .5) * .14;
      for (let k = 0; k < 3; k++) q[i * 4 + k] = q[i * 4 + k] * v * (1 - j) + cal[k] * 140 * j;
    }
    x.putImageData(im2, 0, 0);
  }
  // la altura del friso: lo pintado sobresale un poco (ladrillo moldeado)
  const pint = x.getImageData(0, 0, N, N).data;
  const H2 = new Float32Array(N * N), R = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const r = pint[i * 4] / 255, g = pint[i * 4 + 1] / 255, b = pint[i * 4 + 2] / 255;
    const relieve = (r + g) / 2 > b + .05 ? .25 : 0;
    H2[i] = H[i] + relieve;
    R[i] = .16 + (1 - bord[i]) * .6 + n1[i] * .12;
  }
  const rug = canvasDe(N, dd => { for (let i = 0; i < N * N; i++) { dd[i * 4] = dd[i * 4 + 1] = dd[i * 4 + 2] = R[i] * 255; dd[i * 4 + 3] = 255; } });
  return { map: tex(c, true), normalMap: tex(normalDe(H2, N, 3), false), roughnessMap: tex(rug, false) };
}

/* Friso: toro en procesión (la gramática de la Puerta, no una réplica) */
export function frisoToro(x, N) {
  const amarillo = '#D9A441', blanco = '#EFE6D2', oscuro = '#5A3A12';
  const banda = (y0) => {
    x.fillStyle = '#0E2C63'; x.fillRect(0, y0, N, N * .07);
    for (let k = 0; k < 8; k++) {
      const cx = (k + .5) * N / 8, cy = y0 + N * .035, r = N * .022;
      x.fillStyle = blanco; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
      x.fillStyle = amarillo;
      for (let p = 0; p < 8; p++) { const a = p * Math.PI / 4; x.beginPath(); x.ellipse(cx + Math.cos(a) * r * .55, cy + Math.sin(a) * r * .55, r * .38, r * .16, a, 0, 7); x.fill(); }
      x.fillStyle = oscuro; x.beginPath(); x.arc(cx, cy, r * .22, 0, 7); x.fill();
    }
  };
  banda(N * .04); banda(N * .89);
  // toro de perfil, caminando hacia la izquierda
  const s = N / 1024, ox = N * .14, oy = N * .27;
  x.save(); x.translate(ox, oy); x.scale(s * 1.05, s * 1.05);
  const toro = () => {
    x.beginPath();
    x.moveTo(140, 120); x.bezierCurveTo(150, 70, 230, 60, 330, 66);          // cruz y lomo
    x.bezierCurveTo(470, 70, 560, 70, 610, 100);                                // grupa
    x.bezierCurveTo(640, 120, 640, 200, 620, 240);                              // anca
    x.lineTo(628, 400); x.lineTo(600, 400); x.lineTo(588, 270);                 // pata trasera
    x.lineTo(560, 270); x.lineTo(552, 400); x.lineTo(524, 400); x.lineTo(520, 260);
    x.bezierCurveTo(440, 280, 300, 280, 250, 262);                              // vientre
    x.lineTo(246, 400); x.lineTo(218, 400); x.lineTo(212, 270);                 // mano
    x.lineTo(196, 268); x.lineTo(186, 400); x.lineTo(158, 400); x.lineTo(160, 250);
    x.bezierCurveTo(130, 230, 110, 200, 96, 190);                               // papada
    x.bezierCurveTo(70, 186, 52, 170, 54, 150); x.bezierCurveTo(56, 128, 80, 110, 110, 108); // cabeza
    x.closePath();
  };
  x.fillStyle = amarillo; toro(); x.fill();
  x.lineWidth = 7; x.strokeStyle = blanco; toro(); x.stroke();
  // cuerno, ojo, cola, pezuñas
  x.strokeStyle = blanco; x.lineWidth = 12; x.lineCap = 'round';
  x.beginPath(); x.moveTo(120, 112); x.bezierCurveTo(120, 60, 160, 40, 190, 50); x.stroke();
  x.fillStyle = oscuro; x.beginPath(); x.arc(92, 140, 7, 0, 7); x.fill();
  x.strokeStyle = amarillo; x.lineWidth = 9;
  x.beginPath(); x.moveTo(628, 110); x.bezierCurveTo(680, 160, 660, 300, 650, 330); x.stroke();
  x.fillStyle = oscuro; [[158, 186], [218, 246], [524, 552], [600, 628]].forEach(([a, b]) => x.fillRect(a, 386, b - a, 16));
  // pliegues del pelaje: líneas paralelas en el cuello
  x.strokeStyle = '#B07E2A'; x.lineWidth = 4;
  for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(170 + k * 14, 96 + k * 4); x.lineTo(150 + k * 14, 236); x.stroke(); }
  x.restore();
}

/* Escritura en columnas: muros con texto incisos (decorativo, no legible) */
export function texEscritura(N = 1024, tinte = 0xB9AC93) {
  sembrar(83);
  const H = new Float32Array(N * N).fill(.6);
  const n = ruido(N, 8, 4);
  const cols = 4, ancho = N / cols;
  const cuña = (cx, cy, s, ang) => {
    // pequeña cuña triangular hundida
    for (let y = -s; y <= s; y++) for (let x = -s; x <= s; x++) {
      const rx = x * Math.cos(ang) + y * Math.sin(ang), ry = -x * Math.sin(ang) + y * Math.cos(ang);
      if (rx < 0 || rx > s * 1.6) continue;
      const lim = (1 - rx / (s * 1.6)) * s * .55;
      if (Math.abs(ry) > lim) continue;
      const px = ((cx + x) % N + N) % N, py = ((cy + y) % N + N) % N;
      H[py * N + px] = Math.min(H[py * N + px], .18 + rx / (s * 1.6) * .35);
    }
  };
  for (let c = 0; c < cols; c++) {
    const x0 = c * ancho;
    for (let y = 0; y < N; y++) { H[y * N + Math.floor(x0)] = .3; H[y * N + Math.floor(x0) + 1] = .3; }
    for (let fila = 0; fila < 28; fila++) {
      const y0 = fila * N / 28 + 8;
      for (let y = 0; y < N; y++) {} // (nada)
      let xx = x0 + 10;
      while (xx < x0 + ancho - 14) {
        const grupo = 1 + Math.floor(azar() * 4);
        for (let g = 0; g < grupo; g++) {
          const ang = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4][Math.floor(azar() * 4)];
          cuña(Math.floor(xx + g * 5), Math.floor(y0 + (azar() - .5) * 8 + 12), 7, ang);
        }
        xx += grupo * 5 + 12 + azar() * 10;
      }
      for (let x = Math.floor(x0 + 4); x < x0 + ancho - 4; x++) H[Math.floor(y0 + 28) % N * N + x] = Math.min(H[Math.floor(y0 + 28) % N * N + x], .45);
    }
  }
  for (let i = 0; i < H.length; i++) H[i] += (n[i] - .5) * .15;
  const base = hex(tinte);
  return empaquetar(N, H, (i, c) => { const v = .78 + n[i] * .3; for (let k = 0; k < 3; k++) c[k] = base[k] * v; }, i => .8, 2.4, [3, 2.5]);
}

/* Follaje de cedro: ramillete de agujas, con alfa */
export function texFollaje(N = 512) {
  sembrar(97);
  const c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d');
  x.clearRect(0, 0, N, N);
  for (let k = 0; k < 5200; k++) {
    const a = azar() * Math.PI * 2, r = Math.pow(azar(), 0.6) * N * .47;
    const cx = N / 2 + Math.cos(a) * r, cy = N / 2 + Math.sin(a) * r * .9;
    const g = 70 + azar() * 60, l = 6 + azar() * 12;
    x.strokeStyle = `rgba(${g * .45 | 0},${g | 0},${g * .4 | 0},${.75 + azar() * .25})`;
    x.lineWidth = 2.2;
    const b = azar() * 7;
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(b) * l, cy + Math.sin(b) * l); x.stroke();
  }
  const t = tex(c, true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

/* Hoja de palmera pinnada, con alfa */
export function texPalma(N = 512) {
  sembrar(101);
  const c = document.createElement('canvas'); c.width = N; c.height = N;
  const x = c.getContext('2d');
  x.strokeStyle = '#6A5A2A'; x.lineWidth = 6; x.beginPath(); x.moveTo(N / 2, N); x.lineTo(N / 2, 0); x.stroke();
  for (let y = 10; y < N; y += 7) {
    const l = Math.sin((1 - y / N) * Math.PI * .95 + .1) * N * .46;
    for (const s of [-1, 1]) {
      const g = 90 + azar() * 50;
      x.strokeStyle = `rgb(${g * .55 | 0},${g * .85 | 0},${g * .35 | 0})`; x.lineWidth = 3.2;
      x.beginPath(); x.moveTo(N / 2, y); x.quadraticCurveTo(N / 2 + s * l * .6, y - 10, N / 2 + s * l, y + 26 + azar() * 10); x.stroke();
    }
  }
  const t = tex(c, true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

/* Normales de agua teselables (para Water) */
export function texAguaNormal(N = 512) {
  sembrar(113);
  const n = ruido(N, 8, 6, .55);
  const t = tex(normalDe(n, N, 6), false); return t;
}

/* Tablilla recreada: la superficie de arcilla de una tablilla cuneiforme */
export function texTablilla(N = 1024) { return texEscritura(N, 0x9A7A55); }
