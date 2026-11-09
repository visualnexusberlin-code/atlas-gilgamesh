/* ============================================================
   SONIDO
   Todo se sintetiza: un bordón grave de caña, viento, lluvia,
   el crepitar del fuego y el trueno. No hay archivos de audio.
   Arranca sólo con el gesto de entrar, y se puede silenciar.
   ============================================================ */
export class Sonido {
  constructor() { this.ctx = null; this.on = true; }

  iniciar() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = 0; this.master.connect(c.destination);
    this.master.gain.linearRampToValueAtTime(this.on ? 0.8 : 0, c.currentTime + 3);
    const ruido = c.createBuffer(1, c.sampleRate * 4, c.sampleRate), d = ruido.getChannelData(0);
    let b = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = w * 0.6 + b * 3; }
    this.buf = ruido;
    const fuente = () => { const s = c.createBufferSource(); s.buffer = ruido; s.loop = true; s.start(c.currentTime + Math.random()); return s; };

    // bordón: quinta grave, filtro que respira
    this.bordon = c.createGain(); this.bordon.gain.value = 0.05;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 3;
    [[55, 'sawtooth', 0.5], [82.41, 'sawtooth', 0.35], [110.2, 'triangle', 0.25], [164.6, 'sine', 0.12]].forEach(([f, t, g]) => {
      const o = c.createOscillator(); o.type = t; o.frequency.value = f; o.detune.value = (Math.random() - .5) * 8;
      const gg = c.createGain(); gg.gain.value = g; o.connect(gg).connect(lp); o.start();
    });
    const lfo = c.createOscillator(); lfo.frequency.value = 0.05; const lg = c.createGain(); lg.gain.value = 180; lfo.connect(lg).connect(lp.frequency); lfo.start();
    lp.connect(this.bordon).connect(this.master);

    // viento
    this.viento = c.createGain(); this.viento.gain.value = 0;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.8;
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.09; const lg2 = c.createGain(); lg2.gain.value = 260; lfo2.connect(lg2).connect(bp.frequency); lfo2.start();
    fuente().connect(bp).connect(this.viento).connect(this.master);

    // lluvia
    this.lluvia = c.createGain(); this.lluvia.gain.value = 0;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const lp2 = c.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 7000;
    fuente().connect(hp).connect(lp2).connect(this.lluvia).connect(this.master);

    // fuego
    this.fuego = c.createGain(); this.fuego.gain.value = 0;
    const bp2 = c.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 2400; bp2.Q.value = 1.4;
    this.fuegoFiltro = bp2; bp2.connect(this.fuego).connect(this.master);
  }

  chasquido() {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.buf;
    const g = c.createGain(), t = c.currentTime;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 + Math.random(), t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04 + Math.random() * 0.05);
    s.connect(g).connect(this.fuegoFiltro); s.start(t, Math.random() * 3, 0.12);
  }

  trueno(retardo = 0.8) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + retardo, s = c.createBufferSource(); s.buffer = this.buf; s.playbackRate.value = 0.25;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(320, t); lp.frequency.exponentialRampToValueAtTime(60, t + 2.6);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1.4, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    s.connect(lp).connect(g).connect(this.master); s.start(t); s.stop(t + 4.2);
  }

  actualizar(atm, s, braseros, z) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    this.viento.gain.setTargetAtTime(0.02 + atm.viento * 0.12 + (1 - atm.hemi) * 0.01, t, 0.5);
    this.lluvia.gain.setTargetAtTime(atm.lluvia * 0.22, t, 0.6);
    let cerca = 0;
    for (const b of braseros) { const d = Math.abs(b.pos.z - z) + Math.abs(b.pos.x) * 0.5; if (d < 12) cerca = Math.max(cerca, 1 - d / 12); }
    this.fuego.gain.setTargetAtTime(cerca * 0.12, t, 0.3);
    if (cerca > 0.05 && Math.random() < 0.18) this.chasquido();
    this.bordon.gain.setTargetAtTime(0.045 + atm.estrellas * 0.02, t, 1.2);
  }

  alternar() {
    this.on = !this.on;
    if (this.ctx) this.master.gain.setTargetAtTime(this.on ? 0.8 : 0, this.ctx.currentTime, 0.3);
    return this.on;
  }
  pausar() { if (this.ctx) this.ctx.suspend(); }
}
