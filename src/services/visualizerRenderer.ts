/**
 * KeyCascade — Visualizer & 60 FPS Canvas Rendering Engine
 * Developed by Alon Ashkenazi
 *
 * High-performance 60 FPS render loop with crystal facet diamond notes,
 * ethereal stardust vortex dissolve, cosmic nebula smoke, explosive sparks,
 * strike saber flares, and ambient bokeh atmosphere.
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

    // 4. Render Saber Strike Line
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

    // Studio Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0c0714');
    bgGrad.addColorStop(0.65, '#050309');
    bgGrad.addColorStop(1, '#020104');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Renders falling notes with selected style
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

      // Note Pill Path
      ctx.beginPath();
      const r = Math.min(radius, noteWidth / 2, noteHeight / 2);
      ctx.roundRect(noteX, actualTopY, noteWidth, noteHeight, [r, r, r, r]);

      // Base Gradient
      const grad = ctx.createLinearGradient(0, actualTopY, 0, actualBottomY);
      grad.addColorStop(0, secondary);
      grad.addColorStop(1, primary);

      ctx.fillStyle = grad;

      // Multi-pass Bloom Glow
      if (settings.enableBloom && settings.glowIntensity > 0) {
        ctx.shadowColor = primary;
        ctx.shadowBlur = settings.bloomRadius * settings.glowIntensity * (0.8 + 0.3 * note.velocity);
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fill();

      // Style-specific facets and highlights
      if (style === 'crystal' && noteHeight > 8) {
        this.renderCrystalFacets(ctx, noteX, actualTopY, noteWidth, noteHeight, note.pitch);
      }

      if (style === 'glass') {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.stroke();
      } else if (style !== 'minimal') {
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.stroke();
      }

      // Strike line collision cap
      if (isActive) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(noteX, actualBottomY - 3, noteWidth, 3);

        if (settings.dissolveMode === 'stardust' || settings.dissolveMode === 'smoke') {
          ctx.fillStyle = primary;
          ctx.fillRect(noteX - 1, actualBottomY - 5, noteWidth + 2, 2);
        }
      }
    }

    ctx.restore();
  }

  /**
   * Renders diamond crystal facet refractions
   */
  private renderCrystalFacets(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    seed: number
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 4);
    ctx.clip();

    const facetHeight = Math.min(width * 1.5, 24);
    const numRows = Math.ceil(height / facetHeight);

    const pseudoRandom = (val: number) => Math.abs(Math.sin(seed * 9301 + val * 49297) % 1);

    for (let row = 0; row < numRows; row++) {
      const rowY = y + row * facetHeight;
      const midY = rowY + facetHeight / 2;
      const nextY = Math.min(y + height, rowY + facetHeight);
      const midX = x + width / 2;

      const glint = pseudoRandom(row * 7 + 1);

      // Upper facet triangle
      ctx.beginPath();
      ctx.moveTo(x, rowY);
      ctx.lineTo(x + width, rowY);
      ctx.lineTo(midX, midY);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + glint * 0.4})`;
      ctx.fill();

      // Left diamond facet
      ctx.beginPath();
      ctx.moveTo(x, rowY);
      ctx.lineTo(midX, midY);
      ctx.lineTo(x, nextY);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + glint * 0.2})`;
      ctx.fill();

      // Right diamond facet
      ctx.beginPath();
      ctx.moveTo(x + width, rowY);
      ctx.lineTo(midX, midY);
      ctx.lineTo(x + width, nextY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fill();

      // Lower facet triangle
      ctx.beginPath();
      ctx.moveTo(x, nextY);
      ctx.lineTo(x + width, nextY);
      ctx.lineTo(midX, midY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fill();

      // Diamond vertex lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Bright vertical refraction core
    ctx.beginPath();
    ctx.rect(x + width * 0.4, y, width * 0.2, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();

    ctx.restore();
  }

  /**
   * Renders the glowing strike line separating falling notes from keyboard
   */
  private renderStrikeLine(
    ctx: CanvasRenderingContext2D,
    strikeY: number,
    width: number,
    settings: VisualSettings,
    activeNotes: Map<number, MidiNote>
  ) {
    ctx.save();

    const lineH = Math.max(1, settings.strikeLineHeight);
    const color = settings.saberColor || '#b153ff';
    const glow = settings.saberGlow || '#ff007f';

    // Base glowing saber line
    ctx.beginPath();
    ctx.rect(0, strikeY - lineH / 2, width, lineH);
    ctx.fillStyle = color;
    ctx.shadowColor = glow;
    ctx.shadowBlur = settings.strikeLineGlow * settings.glowIntensity;
    ctx.fill();

    // White-hot core line
    ctx.beginPath();
    ctx.rect(0, strikeY - 0.75, width, 1.5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#ffffff';
    ctx.fill();

    // Radiant flares above currently pressed keys
    if (activeNotes.size > 0) {
      ctx.globalCompositeOperation = 'lighter';
      for (const [pitch, note] of activeNotes) {
        const geom = PIANO_GEOMETRY_CACHE.get(pitch);
        if (!geom) continue;

        const centerX = geom.leftRatio * width + (geom.widthRatio * width) / 2;
        const flareWidth = geom.widthRatio * width * 2.8;

        const flareGrad = ctx.createRadialGradient(
          centerX, strikeY, 1,
          centerX, strikeY, flareWidth
        );
        const noteColor = note.color || color;
        flareGrad.addColorStop(0, '#ffffff');
        flareGrad.addColorStop(0.35, noteColor);
        flareGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = flareGrad;
        ctx.fillRect(centerX - flareWidth, strikeY - 16, flareWidth * 2, 32);
      }
    }

    ctx.restore();
  }

  /**
   * Renders the 88-key piano keyboard with dynamic backlight and key depression
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

    // 1. Piano bed
    ctx.fillStyle = '#0b0c12';
    ctx.fillRect(0, startY, width, height);

    // 2. 52 White Keys
    for (let pitch = 21; pitch <= 108; pitch++) {
      const geom = PIANO_GEOMETRY_CACHE.get(pitch);
      if (!geom || geom.isBlack) continue;

      const keyX = geom.leftRatio * width;
      const keyW = geom.widthRatio * width;
      const keyH = height;
      const activeNote = activeNotes.get(pitch);

      if (activeNote) {
        const pressGrad = ctx.createLinearGradient(0, startY, 0, startY + keyH);
        const noteColor = activeNote.color || settings.rightHandColor;
        pressGrad.addColorStop(0, noteColor);
        pressGrad.addColorStop(0.25, '#ffffff');
        pressGrad.addColorStop(0.65, noteColor);
        pressGrad.addColorStop(1, '#e0e7ff');

        ctx.fillStyle = pressGrad;
        ctx.shadowColor = noteColor;
        ctx.shadowBlur = 20 * settings.activeKeyGlow;
        ctx.fillRect(keyX + 0.5, startY, keyW - 1, keyH);
        ctx.shadowBlur = 0;
      } else {
        const whiteGrad = ctx.createLinearGradient(0, startY, 0, startY + keyH);
        whiteGrad.addColorStop(0, '#e5e7eb');
        whiteGrad.addColorStop(0.85, '#ffffff');
        whiteGrad.addColorStop(1, '#d1d5db');

        ctx.fillStyle = whiteGrad;
        ctx.fillRect(keyX + 0.5, startY, keyW - 1, keyH);

        // Bottom lip
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(keyX + 0.5, startY + keyH - 4, keyW - 1, 4);
      }

      // Key boundary line
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(keyX, startY, 0.75, keyH);

      // Pitch octave markers (C1..C7)
      if (settings.showKeyLabels && geom.noteName.startsWith('C') && !geom.isBlack) {
        ctx.fillStyle = activeNote ? '#0f172a' : '#64748b';
        ctx.font = `600 ${Math.max(9, Math.round(keyW * 0.4))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(geom.noteName, keyX + keyW / 2, startY + keyH - 8);
      }
    }

    // 3. 36 Black Keys
    for (let pitch = 21; pitch <= 108; pitch++) {
      const geom = PIANO_GEOMETRY_CACHE.get(pitch);
      if (!geom || !geom.isBlack) continue;

      const keyX = geom.leftRatio * width;
      const keyW = geom.widthRatio * width;
      const keyH = height * geom.heightRatio;
      const activeNote = activeNotes.get(pitch);

      if (activeNote) {
        const noteColor = activeNote.color || settings.rightHandColor;
        const activeBlackGrad = ctx.createLinearGradient(0, startY, 0, startY + keyH);
        activeBlackGrad.addColorStop(0, '#ffffff');
        activeBlackGrad.addColorStop(0.35, noteColor);
        activeBlackGrad.addColorStop(1, '#090a10');

        ctx.fillStyle = activeBlackGrad;
        ctx.shadowColor = noteColor;
        ctx.shadowBlur = 22 * settings.activeKeyGlow;
        ctx.fillRect(keyX, startY, keyW, keyH);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(keyX, startY, keyW, keyH);
      } else {
        // Shadow underneath black key
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(keyX - 1, startY, keyW + 2, keyH + 4);

        const blackGrad = ctx.createLinearGradient(keyX, startY, keyX + keyW, startY);
        blackGrad.addColorStop(0, '#1c1d24');
        blackGrad.addColorStop(0.3, '#2a2c35');
        blackGrad.addColorStop(0.7, '#22232b');
        blackGrad.addColorStop(1, '#111216');

        ctx.fillStyle = blackGrad;
        ctx.fillRect(keyX, startY, keyW, keyH);

        const capGrad = ctx.createLinearGradient(0, startY, 0, startY + keyH * 0.75);
        capGrad.addColorStop(0, '#3f4252');
        capGrad.addColorStop(1, '#1e2029');
        ctx.fillStyle = capGrad;
        ctx.fillRect(keyX + 1, startY + 1, keyW - 2, keyH * 0.75);

        ctx.fillStyle = '#0f1015';
        ctx.fillRect(keyX, startY + keyH - 3, keyW, 3);
      }
    }

    ctx.restore();
  }

  public getActiveNotes(): Map<number, MidiNote> {
    return this.activePitches;
  }
}
