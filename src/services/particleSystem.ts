/**
 * KeyCascade — High-Performance Particle & VFX Engine
 * Developed by Alon Ashkenazi
 *
 * Implements Ethereal Stardust Vortex, Cosmic Nebula Smoke,
 * and High-Velocity Explosive Sparks with a zero-allocation circular buffer.
 */

export type ParticleType = 'stardust' | 'sparks' | 'smoke';

export interface Particle {
  active: boolean;
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  initialX: number;
  driftX: number;
  frequency: number;
  amplitude: number;
  phase: number;
  size: number;
  initialSize: number;
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
  // Pre-allocated object pool (Zero-allocation ring buffer for 60 FPS performance)
  private readonly MAX_PARTICLES = 450;
  private pool: Particle[] = [];
  private poolIndex = 0;

  private ambientBokehs: AmbientBokeh[] = [];

  constructor() {
    // Pre-allocate pool
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.pool.push({
        active: false,
        type: 'stardust',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        initialX: 0,
        driftX: 0,
        frequency: 0,
        amplitude: 0,
        phase: 0,
        size: 0,
        initialSize: 0,
        color: '#ffffff',
        coreColor: '#ffffff',
        life: 0,
        maxLife: 1,
        alpha: 0,
        twinklePhase: 0,
        twinkleSpeed: 0,
      });
    }
    this.initAmbientBokeh(30);
  }

  public clear() {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.pool[i].active = false;
    }
  }

  private obtain(): Particle {
    const p = this.pool[this.poolIndex];
    this.poolIndex = (this.poolIndex + 1) % this.MAX_PARTICLES;
    p.active = true;
    return p;
  }

  public initAmbientBokeh(count: number = 30) {
    this.ambientBokehs = [];
    for (let i = 0; i < count; i++) {
      this.ambientBokehs.push({
        x: Math.random(),
        y: Math.random() * 0.85,
        vx: (Math.random() - 0.5) * 0.012,
        vy: -(Math.random() * 0.015 + 0.005),
        radius: Math.random() * 10 + 4,
        color: Math.random() > 0.5 ? 'rgba(192, 132, 252, ' : 'rgba(244, 114, 182, ',
        alpha: Math.random() * 0.2 + 0.05,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  /**
   * Ethereal Stardust: Dissolves played notes into ascending ribbons of glittering stardust
   */
  public emitStardust(
    x: number,
    y: number,
    width: number,
    color: string,
    secondaryColor: string,
    velocity: number,
    count: number = 5,
    swirlMultiplier: number = 1.0,
    lifetimeMultiplier: number = 1.2
  ) {
    for (let i = 0; i < count; i++) {
      const p = this.obtain();
      const spawnX = x + (Math.random() - 0.5) * width * 0.9;
      const spawnY = y + (Math.random() - 0.5) * 4;

      p.type = 'stardust';
      p.x = spawnX;
      p.y = spawnY;
      p.initialX = spawnX;
      p.vy = -(Math.random() * 100 + 55) * (0.8 + 0.3 * velocity);
      p.driftX = (Math.random() - 0.5) * 16;
      p.frequency = (Math.random() * 3 + 2.5) * swirlMultiplier;
      p.amplitude = (Math.random() * 12 + 5) * swirlMultiplier;
      p.phase = Math.random() * Math.PI * 2;

      const maxLife = (Math.random() * 0.6 + 0.7) * lifetimeMultiplier;
      p.life = maxLife;
      p.maxLife = maxLife;
      p.size = Math.random() * 2.0 + 1.2;
      p.initialSize = p.size;
      p.color = color;
      p.coreColor = secondaryColor || '#ffffff';
      p.alpha = 1.0;
      p.twinklePhase = Math.random() * Math.PI * 2;
      p.twinkleSpeed = Math.random() * 10 + 6;
    }
  }

  /**
   * Cosmic Nebula Smoke: Soft billowing clouds rising from played keys
   */
  public emitSmoke(
    x: number,
    y: number,
    width: number,
    color: string,
    velocity: number,
    count: number = 3
  ) {
    for (let i = 0; i < count; i++) {
      const p = this.obtain();
      const spawnX = x + (Math.random() - 0.5) * width * 0.7;
      const spawnY = y + (Math.random() - 0.5) * 4;

      p.type = 'smoke';
      p.x = spawnX;
      p.y = spawnY;
      p.initialX = spawnX;
      p.vx = (Math.random() - 0.5) * 25;
      p.vy = -(Math.random() * 60 + 35) * (0.7 + 0.3 * velocity);
      p.driftX = p.vx;
      p.frequency = Math.random() * 1.5 + 1.0;
      p.amplitude = Math.random() * 8 + 4;
      p.phase = Math.random() * Math.PI * 2;

      const maxLife = Math.random() * 0.7 + 0.8;
      p.life = maxLife;
      p.maxLife = maxLife;
      p.initialSize = Math.random() * 4 + 4;
      p.size = p.initialSize;
      p.color = color;
      p.coreColor = '#ffffff';
      p.alpha = 0.5 * velocity;
      p.twinklePhase = 0;
      p.twinkleSpeed = 0;
    }
  }

  /**
   * Explosive Sparks: High-velocity spark burst fanning upward with gravity
   */
  public emitExplosiveSparks(
    x: number,
    y: number,
    width: number,
    color: string,
    secondaryColor: string,
    velocity: number,
    count: number = 16,
    speedMultiplier: number = 1.4
  ) {
    for (let i = 0; i < count; i++) {
      const p = this.obtain();
      const px = x + (Math.random() - 0.5) * width * 0.8;
      const py = y + (Math.random() - 0.5) * 3;

      // Upward fan burst angle (-150 to -30 degrees)
      const angle = (Math.random() * 0.65 - 0.325) * Math.PI - Math.PI / 2;
      const speed = (Math.random() * 240 + 120) * speedMultiplier * (0.65 + 0.4 * velocity);

      p.type = 'sparks';
      p.x = px;
      p.y = py;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed; // upward negative
      p.initialX = px;
      p.driftX = 0;
      p.frequency = 0;
      p.amplitude = 0;
      p.phase = 0;

      const maxLife = Math.random() * 0.35 + 0.3;
      p.life = maxLife;
      p.maxLife = maxLife;
      p.size = (Math.random() * 2.2 + 2.0) * (0.8 + 0.25 * velocity);
      p.initialSize = p.size;
      p.color = color;
      p.coreColor = secondaryColor || '#ffffff';
      p.alpha = 1.0;
      p.twinklePhase = 0;
      p.twinkleSpeed = 0;
    }
  }

  /**
   * Advances all active particle physics by dt seconds
   */
  public update(dt: number, gravityRatio: number = 0.16) {
    const gravity = gravityRatio * 1800; // px/s^2

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      const progress = p.life / p.maxLife; // 1 -> 0

      if (p.type === 'sparks') {
        // High-velocity sparks with gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += gravity * dt;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.alpha = Math.max(0, Math.min(1, progress));
      } else if (p.type === 'stardust') {
        // Rising sinuous vortex wave
        p.y += p.vy * dt;
        p.vy *= 0.985;
        p.phase += p.frequency * dt;
        p.initialX += p.driftX * dt;
        p.x = p.initialX + Math.sin(p.phase) * p.amplitude;
        p.twinklePhase += p.twinkleSpeed * dt;
        p.alpha = Math.max(0, Math.min(1, Math.pow(progress, 0.8)));
      } else if (p.type === 'smoke') {
        // Billowing expanding smoke
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.phase += p.frequency * dt;
        p.x += Math.sin(p.phase) * 0.5;
        p.vx *= 0.95;
        p.vy *= 0.97;
        // Expand radius as smoke diffuses
        p.size = p.initialSize + (1 - progress) * 16;
        p.alpha = Math.max(0, Math.min(1, Math.sin(progress * Math.PI) * 0.4));
      }
    }

    // Ambient floating bokeh
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
   * Renders background floating bokeh
   */
  public renderAmbientBokeh(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this.ambientBokehs.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const b of this.ambientBokehs) {
      const px = b.x * width;
      const py = b.y * height;
      const pulse = 1 + Math.sin(b.phase) * 0.2;
      const r = Math.max(1, b.radius * pulse);

      const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
      const alpha = b.alpha * (0.8 + Math.sin(b.phase) * 0.2);
      grad.addColorStop(0, `${b.color}${alpha})`);
      grad.addColorStop(0.5, `${b.color}${alpha * 0.3})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Ultra-fast Canvas 2D render loop (Zero per-particle shadowBlur calls)
   */
  public render(ctx: CanvasRenderingContext2D, blendMode: 'lighter' | 'source-over' = 'lighter') {
    ctx.save();
    ctx.globalCompositeOperation = blendMode;

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active || p.alpha <= 0.02) continue;

      if (p.type === 'stardust') {
        // Sparkling stardust
        const twinkle = 0.75 + Math.sin(p.twinklePhase) * 0.25;
        const currentAlpha = Math.min(1, p.alpha * twinkle);
        const currentSize = Math.max(0.6, p.size * (p.life / p.maxLife) * twinkle);

        // Soft outer glow halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentAlpha * 0.35;
        ctx.fill();

        // Intense core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fillStyle = p.coreColor;
        ctx.globalAlpha = currentAlpha * 0.95;
        ctx.fill();
      } else if (p.type === 'sparks') {
        // Bright collision sparks
        const curSize = Math.max(0.6, p.size * (p.life / p.maxLife));

        ctx.beginPath();
        ctx.arc(p.x, p.y, curSize * 2.0, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * 0.45;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, curSize, 0, Math.PI * 2);
        ctx.fillStyle = p.coreColor;
        ctx.globalAlpha = p.alpha * 0.95;
        ctx.fill();
      } else if (p.type === 'smoke') {
        // Soft billowing cloud
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
