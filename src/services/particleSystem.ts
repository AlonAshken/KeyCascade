/**
 * KeyCascade — Particle & Ethereal Stardust Physics Engine
 * Developed by Alon Ashkenazi
 *
 * Implements Grim Cat Piano style stardust vortex dissolve,
 * ambient floating bokeh motes, and explosive note collision sparks.
 */

export interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  coreColor: string;
  life: number;
  maxLife: number;
  alpha: number;
}

export interface StardustParticle {
  x: number;
  y: number;
  initialX: number;
  vy: number;
  driftX: number;
  frequency: number;
  amplitude: number;
  phase: number;
  size: number;
  color: string;
  coreColor: string;
  life: number;
  maxLife: number;
  alpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export interface AmbientBokeh {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  phase: number;
}

export class ParticleSystem {
  private particles: SparkParticle[] = [];
  private stardust: StardustParticle[] = [];
  private ambientBokehs: AmbientBokeh[] = [];
  private maxParticles = 800;
  private maxStardust = 1200;

  constructor() {
    this.initAmbientBokeh();
  }

  public clear() {
    this.particles = [];
    this.stardust = [];
  }

  /**
   * Initializes floating background ambient dust / bokeh motes
   */
  public initAmbientBokeh(count: number = 35) {
    this.ambientBokehs = [];
    for (let i = 0; i < count; i++) {
      this.ambientBokehs.push({
        x: Math.random(),
        y: Math.random() * 0.85,
        vx: (Math.random() - 0.5) * 0.015,
        vy: -(Math.random() * 0.02 + 0.005),
        radius: Math.random() * 12 + 4,
        color: Math.random() > 0.4 ? 'rgba(192, 132, 252, ' : 'rgba(244, 114, 182, ',
        alpha: Math.random() * 0.25 + 0.08,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  /**
   * Spawns Grim Cat Piano style dissolving stardust vortex streams
   */
  public emitDissolvingStardust(
    x: number,
    y: number,
    width: number,
    color: string,
    secondaryColor: string,
    velocity: number,
    intensity: number = 1.0,
    swirlMultiplier: number = 1.0,
    lifetimeMultiplier: number = 1.2
  ) {
    const count = Math.max(3, Math.round(14 * intensity * Math.max(0.4, velocity)));

    for (let i = 0; i < count; i++) {
      if (this.stardust.length >= this.maxStardust) {
        this.stardust.shift();
      }

      const spawnX = x + (Math.random() - 0.5) * width * 0.95;
      const spawnY = y + (Math.random() - 0.5) * 6;

      // Upward rising velocity with varied speeds (float like embers/dust)
      const vy = -(Math.random() * 110 + 60) * (0.8 + 0.3 * velocity);
      const driftX = (Math.random() - 0.5) * 20;

      // Sinuous vortex wave motion
      const frequency = (Math.random() * 3 + 2.5) * swirlMultiplier;
      const amplitude = (Math.random() * 14 + 6) * swirlMultiplier;
      const phase = Math.random() * Math.PI * 2;

      const maxLife = (Math.random() * 0.8 + 0.9) * lifetimeMultiplier;
      const size = Math.random() * 2.2 + 1.2;

      this.stardust.push({
        x: spawnX,
        y: spawnY,
        initialX: spawnX,
        vy,
        driftX,
        frequency,
        amplitude,
        phase,
        size,
        color,
        coreColor: secondaryColor || '#ffffff',
        life: maxLife,
        maxLife,
        alpha: 1.0,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 12 + 6,
      });
    }
  }

  /**
   * Spawns explosive spark bursts at key collision point (Rousseau style)
   */
  public emitStrikeBurst(
    x: number,
    y: number,
    width: number,
    color: string,
    secondaryColor: string,
    velocity: number,
    density: number = 18,
    speedMultiplier: number = 1.5,
    lifetimeMultiplier: number = 0.8,
    baseSize: number = 3
  ) {
    const count = Math.max(3, Math.round(density * Math.max(0.3, velocity)));

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const px = x + (Math.random() - 0.5) * width * 0.9;
      const py = y + (Math.random() - 0.5) * 4;

      const angle = (Math.random() * 0.6 - 0.3) * Math.PI - Math.PI / 2;
      const speed = (Math.random() * 180 + 80) * speedMultiplier * (0.6 + 0.4 * velocity);

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const maxLife = (Math.random() * 0.4 + 0.3) * lifetimeMultiplier;
      const size = (Math.random() * 2 + baseSize) * (0.7 + 0.3 * velocity);

      this.particles.push({
        x: px,
        y: py,
        vx,
        vy,
        size,
        color,
        coreColor: secondaryColor || '#ffffff',
        life: maxLife,
        maxLife,
        alpha: 1.0,
      });
    }
  }

  /**
   * Continuous gentle ember/sparks while a note is actively held down
   */
  public emitSustainEmber(
    x: number,
    y: number,
    width: number,
    color: string,
    velocity: number
  ) {
    if (this.particles.length >= this.maxParticles || Math.random() > 0.35) return;

    const px = x + (Math.random() - 0.5) * width * 0.8;
    const py = y + (Math.random() - 0.5) * 2;
    const vx = (Math.random() - 0.5) * 40;
    const vy = -(Math.random() * 70 + 40);
    const maxLife = Math.random() * 0.3 + 0.2;

    this.particles.push({
      x: px,
      y: py,
      vx,
      vy,
      size: Math.random() * 2 + 1.5,
      color,
      coreColor: '#ffffff',
      life: maxLife,
      maxLife,
      alpha: 0.8 * velocity,
    });
  }

  /**
   * Advances particle and stardust physics by dt seconds
   */
  public update(dt: number, gravityRatio: number = 0.15) {
    const gravity = gravityRatio * 1800; // px/s^2
    const drag = 0.97;

    // 1. Update collision sparks
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += gravity * dt;
      p.vx *= drag;
      p.vy *= drag;

      p.alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    }

    // 2. Update dissolving stardust (winding vortex drift)
    for (let i = this.stardust.length - 1; i >= 0; i--) {
      const s = this.stardust[i];
      s.life -= dt;

      if (s.life <= 0) {
        this.stardust.splice(i, 1);
        continue;
      }

      // Vertical rise with subtle upward deceleration
      s.y += s.vy * dt;
      s.vy *= 0.985;

      // Horizontal vortex wave: x = initialX + drift + sin(phase + t*freq) * amp
      const age = s.maxLife - s.life;
      s.phase += s.frequency * dt;
      s.initialX += s.driftX * dt;
      s.x = s.initialX + Math.sin(s.phase) * s.amplitude * Math.min(1.5, age * 1.8);

      // Twinkle modulation
      s.twinklePhase += s.twinkleSpeed * dt;

      const progress = s.life / s.maxLife;
      s.alpha = Math.max(0, Math.min(1, Math.pow(progress, 0.7)));
    }

    // 3. Update ambient background bokeh
    for (const b of this.ambientBokehs) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.phase += dt * 1.5;

      if (b.y < -0.05) {
        b.y = 0.9;
        b.x = Math.random();
      }
      if (b.x < 0) b.x = 1;
      if (b.x > 1) b.x = 0;
    }
  }

  /**
   * Renders background floating bokeh motes (creates cinematic depth)
   */
  public renderAmbientBokeh(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this.ambientBokehs.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const b of this.ambientBokehs) {
      const px = b.x * width;
      const py = b.y * height;
      const pulse = 1 + Math.sin(b.phase) * 0.25;
      const r = Math.max(1, b.radius * pulse);

      const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
      const alpha = b.alpha * (0.8 + Math.sin(b.phase) * 0.2);
      grad.addColorStop(0, `${b.color}${alpha})`);
      grad.addColorStop(0.5, `${b.color}${alpha * 0.4})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Renders all active sparks and stardust vortex streams
   */
  public render(ctx: CanvasRenderingContext2D, blendMode: 'lighter' | 'source-over' = 'lighter') {
    ctx.save();
    ctx.globalCompositeOperation = blendMode;

    // 1. Render dissolving stardust (Grim Cat sparkling vortex streams)
    for (const s of this.stardust) {
      if (s.alpha <= 0.01) continue;

      const twinkle = 0.7 + Math.sin(s.twinklePhase) * 0.3;
      const currentAlpha = Math.min(1, s.alpha * twinkle);
      const currentSize = Math.max(0.6, s.size * (s.life / s.maxLife) * twinkle);

      ctx.beginPath();
      ctx.arc(s.x, s.y, currentSize, 0, Math.PI * 2);

      // Outer sparkling glow
      ctx.fillStyle = s.color;
      ctx.globalAlpha = currentAlpha;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 10;
      ctx.fill();

      // White-hot stardust core
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(0.3, currentSize * 0.45), 0, Math.PI * 2);
      ctx.fillStyle = s.coreColor;
      ctx.globalAlpha = Math.min(1, currentAlpha * 1.4);
      ctx.shadowBlur = 4;
      ctx.fill();
    }

    // 2. Render collision sparks
    for (const p of this.particles) {
      if (p.alpha <= 0.01) continue;

      ctx.beginPath();
      const currentSize = p.size * (p.life / p.maxLife);
      ctx.arc(p.x, p.y, Math.max(0.5, currentSize), 0, Math.PI * 2);

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.3, currentSize * 0.45), 0, Math.PI * 2);
      ctx.fillStyle = p.coreColor;
      ctx.globalAlpha = Math.min(1, p.alpha * 1.3);
      ctx.shadowBlur = 4;
      ctx.fill();
    }

    ctx.restore();
  }
}
