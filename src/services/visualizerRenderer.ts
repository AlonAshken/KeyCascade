/**
 * KeyCascade — Next-Gen Designer Shader & VFX Rendering Engine
 * Developed by Alon Ashkenazi
 *
 * Professional-grade procedural shaders for falling notes:
 * - Prismatic Crystal Rods (3D diamond facets, traveling caustics, chromatic aberration)
 * - Liquid Plasma Neon (Volumetric glass tube, pulsating white-hot filament, electric corona)
 * - Frosted Holographic Glass (VisionOS iridescent dispersion & frosted diffusion)
 * - Molten Obsidian & Magma (Glossy mirror obsidian with internal molten fissures)
 * - Anamorphic Cinema Lens Flares & Volumetric Laser Saber
 */

import { MidiNote, VisualSettings } from '../types/visualizer';
import { PIANO_GEOMETRY_CACHE } from './pianoGeometry';
import { ParticleSystem } from './particleSystem';

export interface RenderContextState {
  currentTime: number;
  width: number;
  height: number;
  dt: number;
  isOffline?: boolean;
}

export class VisualizerRenderer {
  public particleSystem: ParticleSystem;
  private lastTriggeredNoteIds = new Set<number>();
  private activePitches = new Map<number, MidiNote>();

  constructor() {
    this.particleSystem = new ParticleSystem();
  }

  public reset() {
    this.particleSystem.clear();
    this.lastTriggeredNoteIds.clear();
    this.activePitches.clear();
  }

  /**
   * Main render method. Called in requestAnimationFrame or offline frame-by-frame.
   */
  public renderFrame(
    ctx: CanvasRenderingContext2D,
    notes: MidiNote[],
    settings: VisualSettings,
    renderState: RenderContextState
  ) {
    const { currentTime, width, height, dt } = renderState;
    const keyboardHeight = settings.showKeyboard ? height * settings.keyboardHeightRatio : 0;
    const strikeY = height - keyboardHeight;
    const travelDuration = Math.max(0.8, settings.fallSpeed);
    const pixelsPerSecond = strikeY / travelDuration;

    // 1. Render Background & Ambient Bokeh
    this.renderBackground(ctx, settings, width, height);

    if (settings.ambientBokeh && settings.bgMode !== 'transparent') {
      this.particleSystem.renderAmbientBokeh(ctx, width, height);
    }

    // 2. Identify visible notes and active key presses
    const minTime = currentTime - 0.1;
    const maxTime = currentTime + travelDuration + 1.0;

    const visibleNotes: MidiNote[] = [];
    const currentActiveNotes = new Map<number, MidiNote>();

    for (const note of notes) {
      if (note.endTime < minTime) continue;
      if (note.time > maxTime) break; // chronological

      visibleNotes.push(note);

      // Check if note is actively sounding
      if (currentTime >= note.time && currentTime <= note.endTime) {
        currentActiveNotes.set(note.pitch, note);

        const geom = PIANO_GEOMETRY_CACHE.get(note.pitch);
        if (geom) {
          const keyX = geom.leftRatio * width + (geom.widthRatio * width) / 2;
          const keyW = geom.widthRatio * width;
          const noteColor = note.color || settings.rightHandColor;
          const secondaryColor = note.secondaryColor || '#ffffff';

          const isInitialHit = !this.lastTriggeredNoteIds.has(note.id);

          if (isInitialHit) {
            this.lastTriggeredNoteIds.add(note.id);

            // Initial Hit Bursts
            if (settings.dissolveMode === 'sparks') {
              this.particleSystem.emitExplosiveSparks(
                keyX,
                strikeY,
                keyW,
                noteColor,
                secondaryColor,
                note.velocity,
                Math.round(settings.particleDensity * 0.9),
                settings.particleSpeed
              );
            } else if (settings.dissolveMode === 'stardust') {
              this.particleSystem.emitStardust(
                keyX,
                strikeY,
                keyW,
                noteColor,
                secondaryColor,
                note.velocity,
                Math.round(6 * settings.stardustIntensity),
                settings.stardustSwirl,
                settings.stardustLifetime
              );
            } else if (settings.dissolveMode === 'smoke') {
              this.particleSystem.emitSmoke(
                keyX,
                strikeY,
                keyW,
                noteColor,
                note.velocity,
                3
              );
            }
          } else {
            // Sustained emission (strictly throttled for 60 FPS performance)
            if (settings.dissolveMode === 'stardust' && Math.random() < 0.22) {
              this.particleSystem.emitStardust(
                keyX,
                strikeY,
                keyW,
                noteColor,
                secondaryColor,
                note.velocity,
                1,
                settings.stardustSwirl,
                settings.stardustLifetime
              );
            } else if (settings.dissolveMode === 'smoke' && Math.random() < 0.14) {
              this.particleSystem.emitSmoke(
                keyX,
                strikeY,
                keyW,
                noteColor,
                note.velocity,
                1
              );
            } else if (settings.dissolveMode === 'sparks' && Math.random() < 0.15) {
              this.particleSystem.emitExplosiveSparks(
                keyX,
                strikeY,
                keyW,
                noteColor,
                secondaryColor,
                note.velocity,
                2,
                0.7
              );
            }
          }
        }
      }
    }

    // Cleanup old note IDs
    if (this.lastTriggeredNoteIds.size > 300) {
      this.lastTriggeredNoteIds.clear();
      for (const [_, note] of currentActiveNotes) {
        this.lastTriggeredNoteIds.add(note.id);
      }
    }

    this.activePitches = currentActiveNotes;

    // 3. Render Falling Notes (White notes layer first, then Black notes on top)
    if (settings.showFallingNotes !== false) {
      const whiteNotes: MidiNote[] = [];
      const blackNotes: MidiNote[] = [];

      for (const note of visibleNotes) {
        const geom = PIANO_GEOMETRY_CACHE.get(note.pitch);
        if (geom?.isBlack) {
          blackNotes.push(note);
        } else {
          whiteNotes.push(note);
        }
      }

      this.renderNoteBatch(ctx, whiteNotes, currentTime, strikeY, pixelsPerSecond, settings, width);
      this.renderNoteBatch(ctx, blackNotes, currentTime, strikeY, pixelsPerSecond, settings, width);
    }

    // 4. Render Saber Strike Line & Anamorphic Flares
    if (settings.showStrikeLine) {
      this.renderStrikeLine(ctx, strikeY, width, settings, currentActiveNotes);
    }

    // 5. Update & Render Particle Physics (Zero shadowBlur - ultra fast)
    this.particleSystem.update(dt, settings.particleGravity);
    this.particleSystem.render(ctx, settings.particleBlendMode);

    // 6. Render 88-Key Virtual Piano
    if (settings.showKeyboard) {
      this.renderKeyboard(ctx, strikeY, keyboardHeight, width, settings, currentActiveNotes);
    }
  }

  /**
   * Renders background mode
   */
  private renderBackground(
    ctx: CanvasRenderingContext2D,
    settings: VisualSettings,
    width: number,
    height: number
  ) {
    if (settings.bgMode === 'transparent') {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    if (settings.bgMode === 'green') {
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    if (settings.bgMode === 'black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    // Deep Studio Vignette with Subdued Indigo Center
    const bgGrad = ctx.createRadialGradient(
      width * 0.5, height * 0.45, 10,
      width * 0.5, height * 0.5, Math.max(width, height) * 0.85
    );
    bgGrad.addColorStop(0, '#100b1a');
    bgGrad.addColorStop(0.5, '#07050d');
    bgGrad.addColorStop(1, '#020104');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Renders falling notes with advanced procedural designer shaders
   */
  private renderNoteBatch(
    ctx: CanvasRenderingContext2D,
    notes: MidiNote[],
    currentTime: number,
    strikeY: number,
    pixelsPerSecond: number,
    settings: VisualSettings,
    canvasWidth: number
  ) {
    if (notes.length === 0) return;

    ctx.save();
    const hPadding = settings.noteHorizontalPadding;
    const radius = settings.noteBorderRadius;
    const style = settings.noteStyle || 'crystal';

    for (const note of notes) {
      const geom = PIANO_GEOMETRY_CACHE.get(note.pitch);
      if (!geom) continue;

      const keyX = geom.leftRatio * canvasWidth;
      const keyWidth = geom.widthRatio * canvasWidth;

      const noteX = keyX + hPadding;
      const noteWidth = Math.max(2, keyWidth - hPadding * 2);

      const noteBottomY = strikeY - (note.time - currentTime) * pixelsPerSecond;
      const noteTopY = strikeY - (note.endTime - currentTime) * pixelsPerSecond;

      const actualBottomY = Math.min(strikeY, noteBottomY);
      const actualTopY = noteTopY;
      const noteHeight = actualBottomY - actualTopY;

      if (noteHeight <= 1) continue;

      const primary = note.color || settings.rightHandColor;
      const secondary = note.secondaryColor || settings.rightHandSecondary;
      const isActive = currentTime >= note.time && currentTime <= note.endTime;
      const r = Math.min(radius, noteWidth / 2, noteHeight / 2);

      // --- SHADER PASS 1: ATMOSPHERIC BLOOM CORONA ---
      if (settings.enableBloom && settings.glowIntensity > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.roundRect(noteX - 2, actualTopY - 2, noteWidth + 4, noteHeight + 4, [r, r, r, r]);
        ctx.shadowColor = primary;
        ctx.shadowBlur = settings.bloomRadius * settings.glowIntensity * (0.8 + 0.4 * note.velocity);
        ctx.fillStyle = primary;
        ctx.globalAlpha = 0.25 * settings.glowIntensity;
        ctx.fill();
        ctx.restore();
      }

      // --- SHADER PASS 2: BASE 3D CYLINDRICAL VOLUME ---
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(noteX, actualTopY, noteWidth, noteHeight, [r, r, r, r]);
      ctx.clip();

      if (style === 'crystal') {
        this.renderCrystalShader(ctx, noteX, actualTopY, noteWidth, noteHeight, primary, secondary, note, currentTime, r);
      } else if (style === 'neon') {
        this.renderNeonShader(ctx, noteX, actualTopY, noteWidth, noteHeight, primary, secondary, note, currentTime, r);
      } else if (style === 'glass') {
        this.renderGlassShader(ctx, noteX, actualTopY, noteWidth, noteHeight, primary, secondary, note, currentTime, r);
      } else if (style === 'obsidian') {
        this.renderObsidianShader(ctx, noteX, actualTopY, noteWidth, noteHeight, primary, secondary, note, currentTime, r);
      } else {
        // Minimal Bauhaus
        const minGrad = ctx.createLinearGradient(0, actualTopY, 0, actualBottomY);
        minGrad.addColorStop(0, secondary);
        minGrad.addColorStop(1, primary);
        ctx.fillStyle = minGrad;
        ctx.fillRect(noteX, actualTopY, noteWidth, noteHeight);
      }

      ctx.restore();

      // --- SHADER PASS 3: HIGH-GLOSS BORDER & BEVEL SHEEN ---
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(noteX, actualTopY, noteWidth, noteHeight, [r, r, r, r]);

      if (style === 'crystal') {
        // Crisp diamond facet rim with chromatic split
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.stroke();
      } else if (style === 'glass') {
        ctx.lineWidth = 1.5;
        const rimGrad = ctx.createLinearGradient(noteX, actualTopY, noteX + noteWidth, actualBottomY);
        rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        rimGrad.addColorStop(0.5, 'rgba(200, 240, 255, 0.4)');
        rimGrad.addColorStop(1, 'rgba(255, 200, 255, 0.8)');
        ctx.strokeStyle = rimGrad;
        ctx.stroke();
      } else if (style === 'neon') {
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.stroke();
      }
      ctx.restore();

      // --- SHADER PASS 4: WHITE-HOT STRIKE LINE COLLISION CAP ---
      if (isActive) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Blazing white contact cap
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(noteX, actualBottomY - 4, noteWidth, 4);

        // Radiant compression wavefront
        const waveGrad = ctx.createLinearGradient(0, actualBottomY - 14, 0, actualBottomY);
        waveGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        waveGrad.addColorStop(1, '#ffffff');
        ctx.fillStyle = waveGrad;
        ctx.fillRect(noteX - 1, actualBottomY - 14, noteWidth + 2, 14);

        ctx.restore();
      }
    }

    ctx.restore();
  }

  /**
   * 💎 PRISMATIC CRYSTAL SHADER:
   * 3D diamond facets, internal Snell's law refractions, traveling caustic glints,
   * and white-hot specular center filament.
   */
  private renderCrystalShader(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    primary: string,
    secondary: string,
    note: MidiNote,
    currentTime: number,
    r: number
  ) {
    // 1. 3D Cylindrical Gemstone Volume Gradient (Left to Right)
    const horizGrad = ctx.createLinearGradient(x, 0, x + width, 0);
    horizGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    horizGrad.addColorStop(0.12, 'rgba(255, 255, 255, 0.6)'); // Left specular reflection streak
    horizGrad.addColorStop(0.28, primary);
    horizGrad.addColorStop(0.5, '#ffffff'); // Luminous white-hot core
    horizGrad.addColorStop(0.72, primary);
    horizGrad.addColorStop(0.92, secondary);
    horizGrad.addColorStop(1, 'rgba(0, 0, 0, 0.55)'); // Right ambient occlusion shadow

    // 2. Vertical Light Absorption Gradient
    const vertGrad = ctx.createLinearGradient(0, y, 0, y + height);
    vertGrad.addColorStop(0, secondary);
    vertGrad.addColorStop(0.85, primary);
    vertGrad.addColorStop(1, '#ffffff');

    ctx.fillStyle = vertGrad;
    ctx.fillRect(x, y, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = horizGrad;
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    // 3. Diamond Facet Caustic Geometry & Traveling Specular Sweep
    const facetH = Math.min(width * 1.6, 26);
    const numRows = Math.ceil(height / facetH);
    const midX = x + width / 2;

    // Time-dependent light wave sweeping down diamond facets
    const sweepPhase = currentTime * 4.0 + note.pitch * 0.3;

    for (let row = 0; row < numRows; row++) {
      const rowY = y + row * facetH;
      const nextY = Math.min(y + height, rowY + facetH);
      const rowMidY = (rowY + nextY) / 2;

      // Sparkling glint wave
      const glintIntensity = Math.max(0, Math.sin(sweepPhase - row * 0.65));

      // Upper facet kite
      ctx.beginPath();
      ctx.moveTo(x, rowY);
      ctx.lineTo(x + width, rowY);
      ctx.lineTo(midX, rowMidY);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.14 + glintIntensity * 0.45})`;
      ctx.fill();

      // Left facet diamond
      ctx.beginPath();
      ctx.moveTo(x, rowY);
      ctx.lineTo(midX, rowMidY);
      ctx.lineTo(x, nextY);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + glintIntensity * 0.3})`;
      ctx.fill();

      // Right facet diamond (darker reflection)
      ctx.beginPath();
      ctx.moveTo(x + width, rowY);
      ctx.lineTo(midX, rowMidY);
      ctx.lineTo(x + width, nextY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fill();

      // Lower facet kite
      ctx.beginPath();
      ctx.moveTo(x, nextY);
      ctx.lineTo(x + width, nextY);
      ctx.lineTo(midX, rowMidY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fill();

      // Facet wireframe glint
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + glintIntensity * 0.5})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Diamond vertex sparkle star
      if (glintIntensity > 0.85) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(midX, rowMidY, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 4. White-Hot Central Core Ribbon
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const coreGrad = ctx.createLinearGradient(x + width * 0.4, 0, x + width * 0.6, 0);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    coreGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.75)');
    coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(x + width * 0.4, y, width * 0.2, height);
    ctx.restore();
  }

  /**
   * ⚡ LIQUID PLASMA NEON SHADER:
   * Translucent glass tube with white-hot central electric filament and volumetric gas glow.
   */
  private renderNeonShader(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    primary: string,
    secondary: string,
    note: MidiNote,
    currentTime: number,
    r: number
  ) {
    // 1. Volumetric Glass Tube Body
    const tubeGrad = ctx.createLinearGradient(x, 0, x + width, 0);
    tubeGrad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    tubeGrad.addColorStop(0.12, 'rgba(255, 255, 255, 0.7)'); // Glass reflection streak
    tubeGrad.addColorStop(0.25, primary);
    tubeGrad.addColorStop(0.75, primary);
    tubeGrad.addColorStop(0.9, secondary);
    tubeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');

    const vertGrad = ctx.createLinearGradient(0, y, 0, y + height);
    vertGrad.addColorStop(0, secondary);
    vertGrad.addColorStop(1, primary);

    ctx.fillStyle = vertGrad;
    ctx.fillRect(x, y, width, height);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = tubeGrad;
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    // 2. Pulsing White-Hot Plasma Filament
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const pulse = 0.8 + 0.2 * Math.sin(currentTime * 10.0 + note.pitch * 0.5);
    const filamentW = Math.max(1.5, width * 0.26);
    const filamentX = x + (width - filamentW) / 2;

    const filamentGrad = ctx.createLinearGradient(filamentX, 0, filamentX + filamentW, 0);
    filamentGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    filamentGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.95 * pulse})`);
    filamentGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = filamentGrad;
    ctx.fillRect(filamentX, y, filamentW, height);

    ctx.restore();
  }

  /**
   * ✨ FROSTED HOLOGRAPHIC GLASS SHADER:
   * Apple VisionOS aesthetic — frosted translucent glass with prismatic iridescent borders.
   */
  private renderGlassShader(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    primary: string,
    secondary: string,
    note: MidiNote,
    currentTime: number,
    r: number
  ) {
    // 1. Frosted Translucent Glass Base
    const glassGrad = ctx.createLinearGradient(x, y, x + width, y + height);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    glassGrad.addColorStop(0.4, 'rgba(180, 210, 255, 0.12)');
    glassGrad.addColorStop(0.85, 'rgba(255, 220, 240, 0.15)');
    glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

    ctx.fillStyle = glassGrad;
    ctx.fillRect(x, y, width, height);

    // 2. Tinted Color Wash
    const tintGrad = ctx.createLinearGradient(0, y, 0, y + height);
    tintGrad.addColorStop(0, secondary);
    tintGrad.addColorStop(1, primary);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = tintGrad;
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    // 3. Diagonal Specular Caustic Glint
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sheenY = y + ((currentTime * 120 + note.pitch * 20) % Math.max(height * 2, 200)) - 50;
    const sheenGrad = ctx.createLinearGradient(x, sheenY, x + width, sheenY + 40);
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
    sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  /**
   * 🔥 MOLTEN OBSIDIAN & MAGMA SHADER:
   * Glossy black mirror obsidian with glowing molten core fissures.
   */
  private renderObsidianShader(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    primary: string,
    secondary: string,
    note: MidiNote,
    currentTime: number,
    r: number
  ) {
    // 1. Deep Glossy Obsidian Glass
    const obsidianGrad = ctx.createLinearGradient(x, 0, x + width, 0);
    obsidianGrad.addColorStop(0, '#06060a');
    obsidianGrad.addColorStop(0.15, 'rgba(255, 255, 255, 0.5)'); // Gloss mirror streak
    obsidianGrad.addColorStop(0.3, '#10121a');
    obsidianGrad.addColorStop(0.7, '#0b0d14');
    obsidianGrad.addColorStop(1, '#030406');

    ctx.fillStyle = obsidianGrad;
    ctx.fillRect(x, y, width, height);

    // 2. Glowing Molten Core Fissure
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const heatPulse = 0.85 + 0.15 * Math.sin(currentTime * 8.0 + note.pitch);
    const fissureW = Math.max(2, width * 0.28);
    const fissureX = x + (width - fissureW) / 2;

    const magmaGrad = ctx.createLinearGradient(0, y, 0, y + height);
    magmaGrad.addColorStop(0, '#ff9900');
    magmaGrad.addColorStop(0.5, '#ff2255');
    magmaGrad.addColorStop(1, '#ffffff');

    ctx.fillStyle = magmaGrad;
    ctx.globalAlpha = heatPulse;
    ctx.fillRect(fissureX, y, fissureW, height);

    ctx.restore();
  }

  /**
   * Renders the glowing strike line separating falling notes from keyboard
   * with Volumetric Laser Saber and Anamorphic Cinema Lens Flares.
   */
  private renderStrikeLine(
    ctx: CanvasRenderingContext2D,
    strikeY: number,
    width: number,
    settings: VisualSettings,
    activeNotes: Map<number, MidiNote>
  ) {
    ctx.save();

    const lineH = Math.max(1.5, settings.strikeLineHeight);
    const color = settings.saberColor || '#b153ff';
    const glow = settings.saberGlow || '#ff007f';

    // 1. Wide Volumetric Atmospheric Aura
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const auraGrad = ctx.createLinearGradient(0, strikeY - 18, 0, strikeY + 18);
    auraGrad.addColorStop(0, 'rgba(0,0,0,0)');
    auraGrad.addColorStop(0.5, glow);
    auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = auraGrad;
    ctx.globalAlpha = 0.35 * settings.glowIntensity;
    ctx.fillRect(0, strikeY - 18, width, 36);
    ctx.restore();

    // 2. Base glowing saber beam
    ctx.beginPath();
    ctx.rect(0, strikeY - lineH / 2, width, lineH);
    ctx.fillStyle = color;
    ctx.shadowColor = glow;
    ctx.shadowBlur = settings.strikeLineGlow * settings.glowIntensity;
    ctx.fill();

    // 3. White-hot laser core thread
    ctx.beginPath();
    ctx.rect(0, strikeY - 0.75, width, 1.5);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ffffff';
    ctx.fill();

    // 4. Anamorphic Cinema Lens Flares above active key strikes
    if (activeNotes.size > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (const [pitch, note] of activeNotes) {
        const geom = PIANO_GEOMETRY_CACHE.get(pitch);
        if (!geom) continue;

        const centerX = geom.leftRatio * width + (geom.widthRatio * width) / 2;
        const keyW = geom.widthRatio * width;
        const noteColor = note.color || color;

        // A. Cinema-style Horizontal Anamorphic Lens Flare Streak
        if (settings.anamorphicFlare !== false) {
          const streakWidth = Math.max(width * 0.4, keyW * 12);
          const streakGrad = ctx.createLinearGradient(
            centerX - streakWidth, 0,
            centerX + streakWidth, 0
          );
          streakGrad.addColorStop(0, 'rgba(0,0,0,0)');
          streakGrad.addColorStop(0.3, noteColor);
          streakGrad.addColorStop(0.5, '#ffffff'); // Pure white epicenter
          streakGrad.addColorStop(0.7, noteColor);
          streakGrad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = streakGrad;
          ctx.fillRect(centerX - streakWidth, strikeY - 2.5, streakWidth * 2, 5);
        }

        // B. Radiant Radial Bloom Halo
        const flareRadius = keyW * 2.5;
        const flareGrad = ctx.createRadialGradient(
          centerX, strikeY, 0,
          centerX, strikeY, flareRadius
        );
        flareGrad.addColorStop(0, '#ffffff');
        flareGrad.addColorStop(0.3, noteColor);
        flareGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = flareGrad;
        ctx.fillRect(centerX - flareRadius, strikeY - flareRadius, flareRadius * 2, flareRadius * 2);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Renders the 88-key piano keyboard with dynamic backlight and 3D key depression
   */
  private renderKeyboard(
    ctx: CanvasRenderingContext2D,
    startY: number,
    height: number,
    width: number,
    settings: VisualSettings,
    activeNotes: Map<number, MidiNote>
  ) {
    ctx.save();

    // 1. Piano wooden fallboard shadow
    ctx.fillStyle = '#08080d';
    ctx.fillRect(0, startY, width, height);

    // 2. 52 White Keys (with authentic 3D Steinway Ivory finish)
    for (let pitch = 21; pitch <= 108; pitch++) {
      const geom = PIANO_GEOMETRY_CACHE.get(pitch);
      if (!geom || geom.isBlack) continue;

      const keyX = geom.leftRatio * width;
      const keyW = geom.widthRatio * width;
      const keyH = height;
      const activeNote = activeNotes.get(pitch);

      if (activeNote) {
        // Physical key depression: dips down 2.5px with dynamic underglow
        const noteColor = activeNote.color || settings.rightHandColor;
        const pressGrad = ctx.createLinearGradient(0, startY + 2, 0, startY + keyH);
        pressGrad.addColorStop(0, '#ffffff');
        pressGrad.addColorStop(0.18, noteColor);
        pressGrad.addColorStop(0.65, noteColor);
        pressGrad.addColorStop(1, '#e0e7ff');

        ctx.fillStyle = pressGrad;
        ctx.shadowColor = noteColor;
        ctx.shadowBlur = 22 * settings.activeKeyGlow;
        ctx.fillRect(keyX + 0.5, startY + 2, keyW - 1, keyH - 2);
        ctx.shadowBlur = 0;

        // Front bevel shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(keyX + 0.5, startY + keyH - 3, keyW - 1, 3);
      } else {
        // Natural Ivory acoustic gradient
        const whiteGrad = ctx.createLinearGradient(0, startY, 0, startY + keyH);
        whiteGrad.addColorStop(0, '#d1d5db');
        whiteGrad.addColorStop(0.08, '#f3f4f6');
        whiteGrad.addColorStop(0.85, '#ffffff');
        whiteGrad.addColorStop(1, '#d8dade');

        ctx.fillStyle = whiteGrad;
        ctx.fillRect(keyX + 0.5, startY, keyW - 1, keyH);

        // Realistic front lip bevel & wooden felt shadow
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(keyX + 0.5, startY + keyH - 4, keyW - 1, 4);
      }

      // Vertical key slit
      ctx.fillStyle = '#111827';
      ctx.fillRect(keyX, startY, 0.75, keyH);

      // Pitch octave markers (C1..C7)
      if (settings.showKeyLabels && geom.noteName.startsWith('C') && !geom.isBlack) {
        ctx.fillStyle = activeNote ? '#0f172a' : '#64748b';
        ctx.font = `600 ${Math.max(9, Math.round(keyW * 0.4))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(geom.noteName, keyX + keyW / 2, startY + keyH - 8);
      }
    }

    // 3. 36 Black Keys (Satin Ebony acoustic grand piano finish)
    for (let pitch = 21; pitch <= 108; pitch++) {
      const geom = PIANO_GEOMETRY_CACHE.get(pitch);
      if (!geom || !geom.isBlack) continue;

      const keyX = geom.leftRatio * width;
      const keyW = geom.widthRatio * width;
      const keyH = height * geom.heightRatio;
      const activeNote = activeNotes.get(pitch);

      if (activeNote) {
        // Pressed black key
        const noteColor = activeNote.color || settings.rightHandColor;
        const activeBlackGrad = ctx.createLinearGradient(0, startY + 2, 0, startY + keyH);
        activeBlackGrad.addColorStop(0, '#ffffff');
        activeBlackGrad.addColorStop(0.28, noteColor);
        activeBlackGrad.addColorStop(1, '#07080d');

        ctx.fillStyle = activeBlackGrad;
        ctx.shadowColor = noteColor;
        ctx.shadowBlur = 24 * settings.activeKeyGlow;
        ctx.fillRect(keyX, startY + 2, keyW, keyH - 2);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(keyX, startY + 2, keyW, keyH - 2);
      } else {
        // Realistic 3D Cast Shadow underneath black key
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(keyX - 1.5, startY, keyW + 3, keyH + 4);

        // Ebony Satin Body
        const blackGrad = ctx.createLinearGradient(keyX, startY, keyX + keyW, startY);
        blackGrad.addColorStop(0, '#16171e');
        blackGrad.addColorStop(0.3, '#262833');
        blackGrad.addColorStop(0.7, '#1f2029');
        blackGrad.addColorStop(1, '#0d0e13');

        ctx.fillStyle = blackGrad;
        ctx.fillRect(keyX, startY, keyW, keyH);

        // Top Gloss Bevel Cap
        const capGrad = ctx.createLinearGradient(0, startY, 0, startY + keyH * 0.75);
        capGrad.addColorStop(0, '#3e4152');
        capGrad.addColorStop(1, '#1b1c24');
        ctx.fillStyle = capGrad;
        ctx.fillRect(keyX + 1, startY + 1, keyW - 2, keyH * 0.75);

        // Bottom Edge Bevel
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(keyX, startY + keyH - 3, keyW, 3);
      }
    }

    ctx.restore();
  }

  public getActiveNotes(): Map<number, MidiNote> {
    return this.activePitches;
  }
}
