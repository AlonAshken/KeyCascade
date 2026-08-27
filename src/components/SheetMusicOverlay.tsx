/**
 * KeyCascade — Real-Time Running Sheet Music (Grand Staff)
 * Developed by Alon Ashkenazi
 *
 * Renders Treble Clef (Right Hand) and Bass Clef (Left Hand)
 * with scrolling notes, ledger lines, accidentals, and active note highlighting.
 */

import React, { useRef, useEffect } from 'react';
import { MidiNote, VisualSettings } from '../types/visualizer';
import { X, Music2 } from 'lucide-react';

interface SheetMusicOverlayProps {
  notes: MidiNote[];
  currentTime: number;
  settings: VisualSettings;
  isOpen: boolean;
  onClose: () => void;
}

// Diatonic steps from C: C=0, D=1, E=2, F=3, G=4, A=5, B=6
const PITCH_CLASS_TO_DIATONIC = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const PITCH_CLASS_IS_SHARP = [false, true, false, true, false, false, true, false, true, false, true, false];

export function pitchToDiatonic(pitch: number): { step: number; isSharp: boolean } {
  const octave = Math.floor(pitch / 12) - 1;
  const pitchClass = pitch % 12;
  const step = octave * 7 + PITCH_CLASS_TO_DIATONIC[pitchClass];
  const isSharp = PITCH_CLASS_IS_SHARP[pitchClass];
  return { step, isSharp };
}

// Reference diatonic steps:
// E4 = octave 4, step 2 => 4 * 7 + 2 = 30 (Bottom line of Treble staff)
// F5 = octave 5, step 3 => 5 * 7 + 3 = 38 (Top line of Treble staff)
// G2 = octave 2, step 4 => 2 * 7 + 4 = 18 (Bottom line of Bass staff)
// A3 = octave 3, step 5 => 3 * 7 + 5 = 26 (Top line of Bass staff)
// C4 (Middle C) = 4 * 7 + 0 = 28
const DIATONIC_E4 = 30;
const DIATONIC_A3 = 26;

export const SheetMusicOverlay: React.FC<SheetMusicOverlayProps> = ({
  notes,
  currentTime,
  settings,
  isOpen,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear & Background
      ctx.fillStyle = '#0a0d18ee';
      ctx.fillRect(0, 0, width, height);

      // Layout geometry
      const staffLineSpacing = 9; // distance between 2 lines
      const halfStep = staffLineSpacing / 2; // 4.5px per diatonic step

      const trebleTopY = 28; // Top line of Treble (F5)
      const trebleBottomY = trebleTopY + staffLineSpacing * 4; // Bottom line of Treble (E4)

      const bassTopY = trebleBottomY + 34; // Top line of Bass (A3)
      const bassBottomY = bassTopY + staffLineSpacing * 4; // Bottom line of Bass (G2)

      const playheadX = Math.min(140, width * 0.18); // Cursor line position
      const pixelsPerSecond = 110; // Scroll speed
      const lookaheadSec = (width - playheadX) / pixelsPerSecond + 1.0;
      const historySec = playheadX / pixelsPerSecond + 0.5;

      // 1. Draw Grand Staff Lines
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;

      // Treble 5 lines
      for (let i = 0; i < 5; i++) {
        const y = trebleTopY + i * staffLineSpacing;
        ctx.beginPath();
        ctx.moveTo(35, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Bass 5 lines
      for (let i = 0; i < 5; i++) {
        const y = bassTopY + i * staffLineSpacing;
        ctx.beginPath();
        ctx.moveTo(35, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Vertical Grand Staff Bar line on left
      ctx.beginPath();
      ctx.moveTo(45, trebleTopY);
      ctx.lineTo(45, bassBottomY);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 2. Clef Glyphs & Hand Labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 22px serif';
      ctx.fillText('𝄞', 52, trebleTopY + 28); // Treble Clef

      ctx.font = 'bold 18px serif';
      ctx.fillText('𝄢', 52, bassTopY + 24); // Bass Clef

      // Labels (RH / LH)
      ctx.font = '600 9px monospace';
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('RH', 20, trebleTopY + 20);

      ctx.fillStyle = '#9333ea';
      ctx.fillText('LH', 20, bassTopY + 20);

      // 3. Playhead Marker Line (where active notes trigger)
      ctx.save();
      ctx.strokeStyle = '#d946ef';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#d946ef';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(playheadX, 10);
      ctx.lineTo(playheadX, height - 10);
      ctx.stroke();

      // Little playhead pointer arrows
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(playheadX - 4, 10);
      ctx.lineTo(playheadX + 4, 10);
      ctx.lineTo(playheadX, 16);
      ctx.fill();
      ctx.restore();

      // 4. Notes Drawing
      const minT = currentTime - historySec;
      const maxT = currentTime + lookaheadSec;

      for (const note of notes) {
        if (note.time < minT || note.time > maxT) continue;

        const noteX = playheadX + (note.time - currentTime) * pixelsPerSecond;
        const isActive = currentTime >= note.time && currentTime <= note.endTime;
        const isPast = currentTime > note.endTime;

        const { step, isSharp } = pitchToDiatonic(note.pitch);

        // Determine staff Y:
        // Right hand (or pitch >= 60) -> Treble Staff
        // Left hand (or pitch < 60) -> Bass Staff
        const isRightHand = note.hand === 'right' || note.pitch >= settings.splitPitch;

        let noteY = 0;
        if (isRightHand) {
          // Relative to E4 (bottom line of Treble)
          const stepsFromE4 = step - DIATONIC_E4;
          noteY = trebleBottomY - stepsFromE4 * halfStep;
        } else {
          // Relative to A3 (top line of Bass)
          const stepsFromA3 = step - DIATONIC_A3;
          noteY = bassTopY - stepsFromA3 * halfStep;
        }

        // Color
        const handColor = isRightHand ? settings.rightHandColor : settings.leftHandColor;

        ctx.save();

        // 4A. Ledger lines (if note is outside the 5 staff lines)
        ctx.strokeStyle = isActive ? '#ffffff' : '#64748b';
        ctx.lineWidth = 1.2;

        if (isRightHand) {
          // Below Treble (Middle C is step 28 = 2 steps below E4 => 1 ledger line)
          if (step <= 28) {
            for (let s = 28; s >= step; s -= 2) {
              const ly = trebleBottomY - (s - DIATONIC_E4) * halfStep;
              ctx.beginPath();
              ctx.moveTo(noteX - 7, ly);
              ctx.lineTo(noteX + 7, ly);
              ctx.stroke();
            }
          }
          // Above Treble (F5 is step 38, A5 is step 40)
          if (step >= 40) {
            for (let s = 40; s <= step; s += 2) {
              const ly = trebleBottomY - (s - DIATONIC_E4) * halfStep;
              ctx.beginPath();
              ctx.moveTo(noteX - 7, ly);
              ctx.lineTo(noteX + 7, ly);
              ctx.stroke();
            }
          }
        } else {
          // Above Bass (Middle C is step 28 = 2 steps above A3)
          if (step >= 28) {
            for (let s = 28; s <= step; s += 2) {
              const ly = bassTopY - (s - DIATONIC_A3) * halfStep;
              ctx.beginPath();
              ctx.moveTo(noteX - 7, ly);
              ctx.lineTo(noteX + 7, ly);
              ctx.stroke();
            }
          }
          // Below Bass (G2 is step 18, E2 is step 16)
          if (step <= 16) {
            for (let s = 16; s >= step; s -= 2) {
              const ly = bassTopY - (s - DIATONIC_A3) * halfStep;
              ctx.beginPath();
              ctx.moveTo(noteX - 7, ly);
              ctx.lineTo(noteX + 7, ly);
              ctx.stroke();
            }
          }
        }

        // 4B. Accidental Sharp (♯)
        if (isSharp) {
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = isActive ? '#ffffff' : handColor;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText('♯', noteX - 7, noteY);
        }

        // 4C. Note Head (Oval angled at -20 deg)
        ctx.translate(noteX, noteY);
        ctx.rotate(-0.35);

        ctx.beginPath();
        ctx.ellipse(0, 0, 5.5, 3.8, 0, 0, Math.PI * 2);

        if (isActive) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = handColor;
          ctx.shadowBlur = 14;
          ctx.fill();

          ctx.strokeStyle = handColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (isPast) {
          ctx.fillStyle = '#475569';
          ctx.globalAlpha = 0.4;
          ctx.fill();
        } else {
          ctx.fillStyle = handColor;
          ctx.shadowColor = handColor;
          ctx.shadowBlur = 4;
          ctx.fill();
        }

        ctx.restore();

        // 4D. Stem
        ctx.save();
        ctx.strokeStyle = isActive ? '#ffffff' : (isPast ? '#475569' : handColor);
        ctx.lineWidth = 1.2;
        ctx.beginPath();

        // Stem up or down
        const stemUp = isRightHand ? step < 34 : step < 22;
        if (stemUp) {
          ctx.moveTo(noteX + 4.8, noteY);
          ctx.lineTo(noteX + 4.8, noteY - 24);
        } else {
          ctx.moveTo(noteX - 4.8, noteY);
          ctx.lineTo(noteX - 4.8, noteY + 24);
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [notes, currentTime, settings, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-2 left-4 right-4 h-36 bg-[#0c0e18]/95 border border-[#232840] rounded-xl shadow-2xl backdrop-blur-xl z-25 overflow-hidden flex flex-col select-none"
    >
      {/* Top Bar with Title & Close */}
      <div className="h-6 px-3 bg-[#111422] border-b border-[#1f2438] flex items-center justify-between text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5 font-medium">
          <Music2 className="w-3.5 h-3.5 text-fuchsia-400" />
          <span className="font-semibold text-white">Interactive Running Sheet Music</span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            (Treble RH & Bass LH • Auto-Scroll)
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-[#1a1e2e] transition-all"
          title="Close Sheet Music"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grand Staff Canvas */}
      <div className="flex-1 w-full h-full relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
