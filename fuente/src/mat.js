/* ============================================================
   MATERIALES Y GEOMETRÍA BASE
   Un material por superficie, compartido. Las UV se escalan en
   metros dentro de la geometría: la textura nunca se estira ni
   se repite de más, sea cual sea el tamaño del volumen.
   ============================================================ */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './tex.js';

export const M = {};
export const UNIDAD = {};

/* Variación macro en espacio de mundo: rompe la repetición y
   ensucia la base de los muros. Se inyecta en el shader estándar. */
const GLSL_RUIDO = `
float h3(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
`;
export const uSuciedad = { value: 0 };
function envejecer(mat, fuerza = 0.22, base = true) {
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMundo;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 wp = vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        vMundo = (modelMatrix * wp).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMundo;\n' + GLSL_RUIDO)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float mac = vn(vMundo*0.11)*0.6 + vn(vMundo*0.37)*0.4;
        diffuseColor.rgb *= mix(${(1 - fuerza).toFixed(3)}, ${(1 + fuerza * .45).toFixed(3)}, mac);
        ${base ? `float alt = fract(vMundo.y/12.0+0.0001)*12.0;
        diffuseColor.rgb *= mix(0.72, 1.0, smoothstep(0.0, 1.8, alt + vn(vMundo*1.3)*0.6));` : ''}`);
  };
  mat.customProgramCacheKey = () => 'env' + fuerza + base;
  return mat;
}

function estandar(set, extra = {}, unidad = 3, fuerza = .22, base = true) {
  const m = new THREE.MeshStandardMaterial({ map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap, roughness: 1, metalness: 0, ...extra });
  m.userData.unidad = unidad;
  return envejecer(m, fuerza, base);
}

export function prepararMateriales() {
  M.adobe = estandar(T.texAdobe(), {}, 2.6);
  M.cocido = estandar(T.texCocido(), {}, 2.0);
  M.suelo = estandar(T.texCocido(512, true), {}, 3.0, .25, false);
  M.tierra = estandar(T.texTierra(), {}, 5.0, .3, false);
  M.tierraRoja = estandar(T.texTierra(512, 0x8A5A3C), {}, 5.0, .3, false);
  M.caliza = estandar(T.texCaliza(), {}, 3.0, .16);
  M.roca = estandar(T.texRoca(), {}, 9.0, .3, false);
  M.rocaOscura = estandar(T.texRoca(512, 0x3E3C3E), {}, 9.0, .3, false);
  M.corteza = estandar(T.texCorteza(), {}, 3.0, .2, false);
  M.madera = estandar(T.texMadera(), {}, 2.0, .15, false);
  M.vidriado = estandar(T.texVidriado(1024), { envMapIntensity: 1.4 }, 3.4, .08);
  M.vidriadoToro = estandar(T.texVidriado(1024, T.frisoToro), { envMapIntensity: 1.4 }, 6.8, .06);
  M.escritura = estandar(T.texEscritura(), {}, 2.4, .12);
  M.tablilla = estandar(T.texTablilla(), {}, 1.6, .1, false);
  M.zigurat = estandar(T.texCocido(512), {}, 7.0, .35);
  M.casa = estandar(T.texAdobe(), { color: 0xffffff }, 5.0, .3);
  M.huerto = estandar(T.texTierra(512, 0x5E7038), {}, 6.0, .35, false);
  M.copa = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95 });
  M.canizo = new THREE.MeshStandardMaterial({ color: 0xB59A62, roughness: 1 });
  M.oro = new THREE.MeshStandardMaterial({ color: 0xD8A84E, metalness: 1, roughness: .28 });
  M.bronce = new THREE.MeshStandardMaterial({ color: 0x7A5130, metalness: .85, roughness: .45 });
  M.betun = new THREE.MeshStandardMaterial({ color: 0x1A1612, roughness: .55 });
  M.lapis = new THREE.MeshStandardMaterial({ color: 0x1D4FA0, roughness: .22, metalness: .05, envMapIntensity: 1.5 });
  M.lino = new THREE.MeshStandardMaterial({ color: 0xD8CDB6, roughness: .95, side: THREE.DoubleSide });
  M.follaje = new THREE.MeshStandardMaterial({ map: T.texFollaje(), alphaTest: .35, alphaToCoverage: true, side: THREE.DoubleSide, roughness: .9, color: 0xC4D0A8 });
  M.palma = new THREE.MeshStandardMaterial({ map: T.texPalma(), alphaTest: .35, alphaToCoverage: true, side: THREE.DoubleSide, roughness: .85 });
  M.arbusto = new THREE.MeshStandardMaterial({ color: 0x404826, roughness: 1 });
  M.vidriadoToro.userData.unidadV = 6.8;
}

/* ---------- Geometría con UV en metros ---------- */
export function geoCaja(w, h, d, unidad = 3, jitter = true) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const ox = jitter ? Math.random() * 7 : 0, oy = jitter ? Math.random() * 7 : 0;
  // orden de caras: +x, -x, +y, -y, +z, -z ; 4 vértices cada una
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, ox + uv.getX(i) * dims[f][0] / unidad, oy + uv.getY(i) * dims[f][1] / unidad);
  }
  return g;
}

/* Proyección de caja en coordenadas de mundo: las hiladas siguen siempre
   la horizontal y continúan sin costura de un volumen al vecino. */
export function uvMundo(g, unidad, off = new THREE.Vector3()) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + off.x, y = p.getY(i) + off.y, z = p.getZ(i) + off.z;
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, x / unidad, z / unidad);
    else if (ax >= az) uv.setXY(i, z / unidad, y / unidad);
    else uv.setXY(i, x / unidad, y / unidad);
  }
  uv.needsUpdate = true;
  return g;
}

export function caja(w, h, d, mat, x, y, z, ry = 0, sombra = true) {
  const u = mat.userData.unidad || 3;
  // sin giro, la textura se ancla al mundo; girada, a sí misma con desfase
  const g = ry === 0 ? uvMundo(new THREE.BoxGeometry(w, h, d), u, new THREE.Vector3(x, y, z)) : geoCaja(w, h, d, u);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z); m.rotation.y = ry;
  m.castShadow = sombra; m.receiveShadow = true;
  return m;
}

export function plano(w, d, mat, x, y, z, seg = 1) {
  const g = new THREE.PlaneGeometry(w, d, seg, seg);
  const u = mat.userData.unidad || 3, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / u, uv.getY(i) * d / u);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true;
  return m;
}

export function cilindro(r1, r2, h, mat, seg = 16) {
  const g = new THREE.CylinderGeometry(r1, r2, h, seg, 1);
  const u = mat.userData.unidad || 3, uv = g.attributes.uv;
  const circ = Math.PI * (r1 + r2);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ / u, uv.getY(i) * h / u);
  return g;
}

/* Almena escalonada: tres gradas decrecientes, el remate mesopotámico */
export function geoAlmena(ancho = 1.6, alto = 1.5, grosor = 0.9, unidad = 2) {
  const p = [];
  for (let k = 0; k < 3; k++) {
    const w = ancho * (1 - k * .28), h = alto / 3;
    const g = geoCaja(w, h, grosor, unidad, false); g.translate(0, h / 2 + k * h, 0); p.push(g);
  }
  return mergeGeometries(p);
}

/* Instancias: una geometría, muchas posiciones */
export function instancias(geo, mat, lista, sombra = true) {
  const im = new THREE.InstancedMesh(geo, mat, lista.length);
  const o = new THREE.Object3D();
  lista.forEach((t, i) => {
    o.position.set(t[0], t[1], t[2]); o.rotation.set(t[4] || 0, t[3] || 0, t[5] || 0);
    const s = t[6] || 1; o.scale.set(t[7] || s, t[8] || s, t[9] || s);
    o.updateMatrix(); im.setMatrixAt(i, o.matrix);
  });
  im.castShadow = sombra; im.receiveShadow = true;
  im.computeBoundingSphere();
  return im;
}
