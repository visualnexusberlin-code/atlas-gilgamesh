/* ============================================================
   ATMÓSFERA
   Una entrada por estación. Entre dos estaciones todo se
   interpola de forma continua según la posición del visitante:
   la luz no cambia de golpe, se transforma al caminar.
   ============================================================ */
import * as THREE from 'three';

const A = (o) => o;
/* az: grados desde el frente (−z) en sentido horario; el: elevación */
export const ATM = [
  A({ sol: 0xFFB06A, solI: 3.4, el: 21, az: 62,  cenit: 0x6E8DB0, horiz: 0xE9B98A, niebla: 0xC89C6E, dens: 0.0105, hemi: 0.55, expo: 0.95, bloom: 0.32, env: 0.45, nubes: 0.35, estrellas: 0, lluvia: 0, viento: 0, polvo: 1.0, sombras: 0x1B1410, luces: 0xFFE4BE, sat: 1.04, haces: 0.10 }),
  A({ sol: 0xFF8248, solI: 2.6, el: 9,  az: -55, cenit: 0x404F70, horiz: 0xE27A4E, niebla: 0xAE6E4C, dens: 0.0125, hemi: 0.45, expo: 1.0,  bloom: 0.38, env: 0.4,  nubes: 0.5,  estrellas: 0, lluvia: 0, viento: 0.1, polvo: 0.8, sombras: 0x24120C, luces: 0xFFD2A8, sat: 1.06, haces: 0.0 }),
  A({ sol: 0xFFCF88, solI: 3.1, el: 30, az: 40,  cenit: 0x5E86B4, horiz: 0xF0C48E, niebla: 0xC9A27A, dens: 0.0095, hemi: 0.55, expo: 0.95, bloom: 0.30, env: 0.45, nubes: 0.3,  estrellas: 0, lluvia: 0, viento: 0, polvo: 1.0, sombras: 0x1A1510, luces: 0xFFE6C2, sat: 1.04, haces: 0.08 }),
  A({ sol: 0xFFF0D6, solI: 3.6, el: 52, az: 24,  cenit: 0x3F74B6, horiz: 0xDCD3C0, niebla: 0xCDBDA0, dens: 0.0060, hemi: 0.70, expo: 0.9,  bloom: 0.22, env: 0.55, nubes: 0.25, estrellas: 0, lluvia: 0, viento: 0, polvo: 0.5, sombras: 0x14141A, luces: 0xFFF2E0, sat: 1.02, haces: 0.0 }),
  A({ sol: 0xFFE2A0, solI: 2.8, el: 48, az: -28, cenit: 0x86A6A4, horiz: 0xBFC79C, niebla: 0x8E9A70, dens: 0.0190, hemi: 0.50, expo: 1.0,  bloom: 0.36, env: 0.40, nubes: 0.4,  estrellas: 0, lluvia: 0, viento: 0, polvo: 1.3, sombras: 0x0E1610, luces: 0xF6F0C4, sat: 1.0,  haces: 0.22 }),
  A({ sol: 0xC2CEDC, solI: 1.7, el: 38, az: -30, cenit: 0x353C46, horiz: 0x7A848F, niebla: 0x646C76, dens: 0.0170, hemi: 1.0, expo: 1.25, bloom: 0.30, env: 0.35, nubes: 0.95, estrellas: 0, lluvia: 0, viento: 1.0, polvo: 0.3, sombras: 0x0C1018, luces: 0xDDE6F2, sat: 0.82, haces: 0.0, tormenta: 1 }),
  A({ sol: 0xFFC56E, solI: 3.9, el: 31, az: -62, cenit: 0x4A70A8, horiz: 0xF2C88C, niebla: 0xD2A774, dens: 0.0080, hemi: 0.55, expo: 0.92, bloom: 0.38, env: 0.70, nubes: 0.2,  estrellas: 0, lluvia: 0, viento: 0, polvo: 0.8, sombras: 0x1E140A, luces: 0xFFE0A6, sat: 1.08, haces: 0.0 }),
  A({ sol: 0xA9BCE6, solI: 1.6, el: 52, az: 20, cenit: 0x0C1224, horiz: 0x26304A, niebla: 0x1C2336, dens: 0.0150, hemi: 2.4, expo: 1.5, bloom: 0.45, env: 0.35, nubes: 0.15, estrellas: 1, lluvia: 0, viento: 0, polvo: 0.7, sombras: 0x06080F, luces: 0xC9D6F2, sat: 0.82, haces: 0.16 }),
  A({ sol: 0x8FA4D6, solI: 1.2, el: 72, az: 0,  cenit: 0x060812, horiz: 0x161C30, niebla: 0x121726, dens: 0.0180, hemi: 2.2, expo: 1.6,  bloom: 0.6,  env: 0.3,  nubes: 0.0,  estrellas: 1, lluvia: 0, viento: 0, polvo: 0.5, sombras: 0x04050A, luces: 0xBFD0F6, sat: 0.85, haces: 0.0 }),
  A({ sol: 0xE4E8EA, solI: 1.5, el: 30, az: 30,  cenit: 0x6E7A84, horiz: 0xB8C0C4, niebla: 0xA9B2B6, dens: 0.0120, hemi: 0.75, expo: 1.0,  bloom: 0.28, env: 0.6,  nubes: 0.9,  estrellas: 0, lluvia: 1, viento: 0.3, polvo: 0.0, sombras: 0x101820, luces: 0xEEF2F4, sat: 0.80, haces: 0.0, tormenta: 1 }),
  A({ sol: 0xFFE4BC, solI: 3.3, el: 24, az: 52,  cenit: 0x5C8CC6, horiz: 0xF1D9B8, niebla: 0xD9CBB2, dens: 0.0060, hemi: 0.60, expo: 0.92, bloom: 0.30, env: 0.6,  nubes: 0.3,  estrellas: 0, lluvia: 0, viento: 0, polvo: 0.6, sombras: 0x14141C, luces: 0xFFEAD0, sat: 1.04, haces: 0.0 }),
  A({ sol: 0xFFF2DC, solI: 3.5, el: 26, az: -48, cenit: 0x4D86CF, horiz: 0xE4ECF0, niebla: 0xD8E2EA, dens: 0.0024, hemi: 0.70, expo: 0.9,  bloom: 0.26, env: 0.6,  nubes: 0.35, estrellas: 0, lluvia: 0, viento: 0.2, polvo: 0.2, sombras: 0x101624, luces: 0xFFF6E8, sat: 1.05, haces: 0.0 })
];
ATM.push(ATM[11]);           // el mirador final comparte el cielo de las murallas

const COLORES = ['sol', 'cenit', 'horiz', 'niebla', 'sombras', 'luces'];
const NUMEROS = ['solI', 'el', 'az', 'dens', 'hemi', 'expo', 'bloom', 'env', 'nubes', 'estrellas', 'lluvia', 'viento', 'polvo', 'sat', 'haces', 'tormenta'];
const cA = new THREE.Color(), cB = new THREE.Color();

/* Estado mezclado en un instante: s continuo en [-1, 12] */
export function mezclar(s, out) {
  const t = Math.max(0, Math.min(ATM.length - 1, s));
  const i = Math.floor(t), j = Math.min(ATM.length - 1, i + 1);
  let f = t - i; f = f * f * (3 - 2 * f);
  const a = ATM[i], b = ATM[j];
  COLORES.forEach(k => { out[k] = out[k] || new THREE.Color(); cA.setHex(a[k]); cB.setHex(b[k]); out[k].copy(cA).lerp(cB, f); });
  NUMEROS.forEach(k => { out[k] = (a[k] || 0) * (1 - f) + (b[k] || 0) * f; });
  // la azimut debe girar por el camino corto
  let d = b.az - a.az; if (d > 180) d -= 360; if (d < -180) d += 360; out.az = a.az + d * f;
  return out;
}

export function dirSol(el, az, v = new THREE.Vector3()) {
  const e = THREE.MathUtils.degToRad(el), z = THREE.MathUtils.degToRad(az);
  return v.set(Math.sin(z) * Math.cos(e), Math.sin(e), -Math.cos(z) * Math.cos(e)).normalize();
}

/* ---------- Cielo físico estilizado ---------- */
export function crearCielo() {
  const u = {
    uCenit: { value: new THREE.Color() }, uHoriz: { value: new THREE.Color() }, uSuelo: { value: new THREE.Color(0x2A2420) },
    uSolDir: { value: new THREE.Vector3(0, 1, 0) }, uSolCol: { value: new THREE.Color() },
    uNubes: { value: 0.3 }, uEstrellas: { value: 0 }, uT: { value: 0 }, uRelampago: { value: 0 }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform vec3 uCenit,uHoriz,uSuelo,uSolDir,uSolCol; uniform float uNubes,uEstrellas,uT,uRelampago; varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 col = mix(uHoriz, uCenit, pow(smoothstep(0.0, 0.62, y), 0.65));
        col = mix(col, uSuelo*0.6 + uHoriz*0.4, smoothstep(0.0, -0.08, y));
        float sd = max(dot(d, uSolDir), 0.0);
        col += uSolCol * (pow(sd, 6.0)*0.22 + pow(sd, 48.0)*0.5);
        col += uSolCol * smoothstep(0.9993, 0.9997, sd) * 6.0;
        // bruma cálida alrededor del sol en el horizonte
        col += uSolCol * 0.18 * pow(sd,2.0) * (1.0 - smoothstep(0.0,0.4,y));
        if (y > 0.0) {
          vec2 uv = d.xz / (y + 0.12) * 1.4 + vec2(uT*0.004, uT*0.002);
          float c = fbm(uv*1.3); c = smoothstep(0.55 - uNubes*0.35, 0.95, c) * uNubes;
          vec3 nube = mix(uHoriz*0.9, vec3(1.0), 0.35) * (0.75 + 0.5*pow(sd,4.0));
          nube = mix(nube, uCenit*0.55, smoothstep(0.6, 1.0, uNubes)*0.7);
          col = mix(col, nube, c * smoothstep(0.0, 0.18, y));
          float st = step(0.9975, h(floor(d.xz/(y+0.3)*420.0))) * smoothstep(0.05, 0.5, y);
          col += vec3(0.9,0.95,1.0) * st * uEstrellas * (0.6 + 0.4*sin(uT*2.0 + h(floor(d.xz*300.0))*30.0));
        }
        col += vec3(0.75,0.82,1.0) * uRelampago * (0.6 + 0.4*smoothstep(-0.1,0.6,y));
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

/* ---------- Gradación: viñeta, grano, tinte partido ---------- */
export const GRADE = {
  uniforms: {
    tDiffuse: { value: null }, uT: { value: 0 }, uSombras: { value: new THREE.Color(0x1B1410) }, uLuces: { value: new THREE.Color(0xFFE4BE) },
    uSat: { value: 1 }, uVineta: { value: 0.32 }, uGrano: { value: 0.035 }, uFlash: { value: 0 }, uVelo: { value: 0 }, uAspecto: { value: 1.7 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uT,uSat,uVineta,uGrano,uFlash,uVelo,uAspecto; uniform vec3 uSombras,uLuces; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      float r2 = dot(c*vec2(uAspecto,1.0), c*vec2(uAspecto,1.0));
      // aberración mínima en los bordes, como en una lente antigua
      vec2 off = c * r2 * 0.006;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      col = mix(vec3(l), col, uSat);
      // tinte partido: sombras hacia un color, luces hacia otro
      col = mix(col, col * uSombras * 4.0, (1.0 - smoothstep(0.0, 0.45, l)) * 0.22);
      col *= mix(vec3(1.0), uLuces, smoothstep(0.35, 1.0, l) * 0.35);
      col *= 1.0 - uVineta * smoothstep(0.15, 0.95, r2);
      col += (h(vUv*vec2(1920.,1080.) + fract(uT)*31.0) - 0.5) * uGrano;
      col += uFlash * vec3(0.55,0.62,0.75);
      col = mix(col, vec3(0.035,0.03,0.025), uVelo);
      gl_FragColor = vec4(col, 1.0);
    }`
};
