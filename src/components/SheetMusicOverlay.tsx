/**
 * KeyCascade — Real-Time Running Sheet Music (Grand Staff)
 * Developed by Alon Ashkenazi
 *
 * Full-height 1/3 viewport Grand Staff with Treble (RH) and Bass (LH) split,
 * hand isolation toggles, ledger lines, accidentals, and active note glowing highlights.
 */

import React, { useRef, useEffect, useState } from 'react';
import { MidiNote, VisualSettings } from '../types/visualizer';
import { X, Music2, Eye, EyeOff } from 'lucide-react';

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

function pitchToDiatonic(pitch: number): { step: number; isSharp: boolean } {
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
const DIATONIC_F5 = 38;
const DIATONIC_G2 = 18;
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

  // Hand isolation / note visibility toggles in sheet music
  const [showRightHand, setShowRightHand] = useState(true);
  const [showLeftHand, setShowLeftHand] = useState(true);
  const [notesVisible, setNotesVisible] = useState(true);

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
      // Canvas height accounts for top header bar (~30px)
      const height = Math.floor(rect.height) - 30;

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
      ctx.fillStyle = '#0a0d18f5';
      ctx.fillRect(0, 0, width, height);

      // Layout geometry:
      // We calculate staff positions dynamically centered in the canvas
      // so high treble runs and low bass notes NEVER cut off!
      const staffLineSpacing = 10; // distance between 2 lines
      const halfStep = staffLineSpacing / 2; // 5px per diatonic step

      const centerY = height / 2;
      const middleCY = centerY;

      // Treble Staff: Bottom line (E4) is 18px above middle C
      const trebleBottomY = middleCY - 20;
      const trebleTopY = trebleBottomY - staffLineSpacing * 4; // F5

      // Bass Staff: Top line (A3) is 18px below middle C
      const bassTopY = middleCY + 20;
      const bassBottomY = bassTopY + staffLineSpacing * 4; // G2

      const playheadX = Math.min(160, width * 0.18); // Cursor line position
      const pixelsPerSecond = 115; // Scroll speed
      const lookaheadSec = (width - playheadX) / pixelsPerSecond + 1.0;
      const historySec = playheadX / pixelsPerSecond + 0.5;

      // 1. Draw Grand Staff Lines
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;

      // Treble 5 lines
      for (let i = 0; i < 5; i++) {
        const y = trebleTopY + i * staffLineSpacing;
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Bass 5 lines
      for (let i = 0; i < 5; i++) {
        const y = bassTopY + i * staffLineSpacing;
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Vertical Grand Staff Bar line on left
      ctx.beginPath();
      ctx.moveTo(50, trebleTopY);
      ctx.lineTo(50, bassBottomY);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Middle C subtle guide line on left
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(40, middleCY);
      ctx.lineTo(85, middleCY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Clef Glyphs & Hand Labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 26px serif';
      ctx.fillText('𝄞', 58, trebleTopY + 31); // Treble Clef

      ctx.font = 'bold 21px serif';
      ctx.fillText('𝄢', 58, bassTopY + 26); // Bass Clef

      // Labels (RH / LH)
      ctx.font = '700 10px monospace';
      ctx.fillStyle = showRightHand ? settings.rightHandColor : '#475569';
      ctx.fillText('RH', 20, trebleTopY + 22);

      ctx.fillStyle = showLeftHand ? settings.leftHandColor : '#475569';
      ctx.fillText('LH', 20, bassTopY + 22);

      // 3. Playhead Marker Line (where active notes trigger)
      ctx.save();
      ctx.strokeStyle = '#d946ef';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#d946ef';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(playheadX, 6);
      ctx.lineTo(playheadX, height - 6);
      ctx.stroke();

      // Little playhead pointer arrows
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, 6);
      ctx.lineTo(playheadX + 5, 6);
      ctx.lineTo(playheadX, 13);
      ctx.fill();
      ctx.restore();

      // 4. Notes Drawing (if notes are visible)
      if (notesVisible) {
        const minT = currentTime - historySec;
        const maxT = currentTime + lookaheadSec;

        for (const note of notes) {
          if (note.time < minT || note.time > maxT) continue;

          const isRightHand = note.hand === 'right' || note.pitch >= settings.splitPitch;

          // Check if hand is toggled on
          if (isRightHand && !showRightHand) continue;
          if (!isRightHand && !showLeftHand) continue;

          const noteX = playheadX + (note.time - currentTime) * pixelsPerSecond;
          const isActive = currentTime >= note.time && currentTime <= note.endTime;
          const isPast = currentTime > note.endTime;

          const { step, isSharp } = pitchToDiatonic(note.pitch);

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
          ctx.strokeStyle = isActive ? '#ffffff' : 'rgba(148, 163, 184, 0.7)';
          ctx.lineWidth = 1.4;

          if (isRightHand) {
            // Below Treble (Middle C is step 28 = 2 steps below E4 => 1 ledger line)
            if (step <= 28) {
              for (let s = 28; s >= step; s -= 2) {
                const ly = trebleBottomY - (s - DIATONIC_E4) * halfStep;
                ctx.beginPath();
                ctx.moveTo(noteX - 8, ly);
                ctx.lineTo(noteX + 8, ly);
                ctx.stroke();
              }
            }
            // Above Treble (F5 is step 38, A5 is step 40)
            if (step >= 40) {
              for (let s = 40; s <= step; s += 2) {
                const ly = trebleBottomY - (s - DIATONIC_E4) * halfStep;
                ctx.beginPath();
                ctx.moveTo(noteX - 8, ly);
                ctx.lineTo(noteX + 8, ly);
                ctx.stroke();
              }
            }
          } else {
            // Above Bass (Middle C is step 28 = 2 steps above A3)
            if (step >= 28) {
              for (let s = 28; s <= step; s += 2) {
                const ly = bassTopY - (s - DIATONIC_A3) * halfStep;
                ctx.beginPath();
                ctx.moveTo(noteX - 8, ly);
                ctx.lineTo(noteX + 8, ly);
                ctx.stroke();
              }
            }
            // Below Bass (G2 is step 18, E2 is step 16)
            if (step <= 16) {
              for (let s = 16; s >= step; s -= 2) {
                const ly = bassTopY - (s - DIATONIC_A3) * halfStep;
                ctx.beginPath();
                ctx.moveTo(noteX - 8, ly);
                ctx.lineTo(noteX + 8, ly);
                ctx.stroke();
              }
            }
          }

          // 4B. Accidental Sharp (♯)
          if (isSharp) {
            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = isActive ? '#ffffff' : handColor;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText('♯', noteX - 8, noteY);
          }

          // 4C. Note Head (Oval angled at -20 deg)
          ctx.translate(noteX, noteY);
          ctx.rotate(-0.35);

          ctx.beginPath();
          ctx.ellipse(0, 0, 5.8, 4.0, 0, 0, Math.PI * 2);

          if (isActive) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = handColor;
            ctx.shadowBlur = 16;
            ctx.fill();

            ctx.strokeStyle = handColor;
            ctx.lineWidth = 1.8;
            ctx.stroke();
          } else if (isPast) {
            ctx.fillStyle = '#475569';
            ctx.globalAlpha = 0.45;
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
          ctx.lineWidth = 1.3;
          ctx.beginPath();

          // Stem up or down
          const stemUp = isRightHand ? step < DIATONIC_E4 + 4 : step < DIATONIC_G2 + 4;
          if (stemUp) {
            ctx.moveTo(noteX + 5.0, noteY);
            ctx.lineTo(noteX + 5.0, noteY - 26);
          } else {
            ctx.moveTo(noteX - 5.0, noteY);
            ctx.lineTo(noteX - 5.0, noteY + 26);
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [notes, currentTime, settings, isOpen, showRightHand, showLeftHand, notesVisible]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-2 left-4 right-4 h-[34vh] min-h-[250px] max-h-[350px] bg-[#0c0e18]/95 border border-[#232840] rounded-xl shadow-2xl backdrop-blur-xl z-25 overflow-hidden flex flex-col select-none"
    >
      {/* Top Bar with Title, Hand Toggles, Note Visibility & Close */}
      <div className="h-7 px-3 bg-[#111422] border-b border-[#1f2438] flex items-center justify-between text-[11px] text-slate-300">
        <div className="flex items-center gap-2 font-medium">
          <Music2 className="w-3.5 h-3.5 text-fuchsia-400" />
          <span className="font-semibold text-white">Grand Staff Sheet Music</span>
          <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
            (Treble RH & Bass LH • Real-Time)
          </span>
        </div>

        {/* Action Controls: Hand Toggles & Note Visibility */}
        <div className="flex items-center gap-2">
          {/* Toggle All Sheet Notes On/Off */}
          <button
            onClick={() => setNotesVisible((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
              notesVisible
                ? 'bg-cyan-950/70 border-cyan-500/80 text-cyan-300'
                : 'bg-[#1a1e2e] border-[#2d334d] text-slate-400'
            }`}
            title="Toggle Notes in Sheet Music On/Off"
          >
            {notesVisible ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
            <span>Notes {notesVisible ? 'ON' : 'OFF'}</span>
          </button>

          {/* Right Hand Filter */}
          <button
            onClick={() => setShowRightHand((prev) => !prev)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
              showRightHand
                ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                : 'bg-[#1a1e2e] border-[#2d334d] text-slate-500 line-through'
            }`}
            title="Toggle Right Hand (Treble Clef) notes"
          >
            RH
          </button>

          {/* Left Hand Filter */}
          <button
            onClick={() => setShowLeftHand((prev) => !prev)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
              showLeftHand
                ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                : 'bg-[#1a1e2e] border-[#2d334d] text-slate-500 line-through'
            }`}
            title="Toggle Left Hand (Bass Clef) notes"
          >
            LH
          </button>

          <div className="h-3 w-px bg-slate-700 mx-0.5" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-[#1a1e2e] transition-all"
            title="Close Sheet Music"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grand Staff Canvas */}
      <div className="flex-1 w-full h-full relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
