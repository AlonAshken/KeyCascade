/**
 * KeyCascade — 88-Key Piano Geometry & Acoustic Standard Mapping
 * Developed by Alon Ashkenazi
 */

import { PianoKeyGeometry } from '../types/visualizer';

export const FIRST_MIDI_NOTE = 21;  // A0
export const LAST_MIDI_NOTE = 108;  // C8
export const TOTAL_WHITE_KEYS = 52;
export const TOTAL_KEYS = 88;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_KEY_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]); // C#, D#, F#, G#, A#

export function getNoteName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1;
  const name = NOTE_NAMES[pitch % 12];
  return `${name}${octave}`;
}

export function isBlackKey(pitch: number): boolean {
  return BLACK_KEY_PITCH_CLASSES.has(pitch % 12);
}

/**
 * Precomputes normalized [0..1] coordinates for all 88 piano keys.
 * Accurately models the natural acoustic grand piano layout (Steinway standard):
 * - 52 equal-width white keys
 * - 36 black keys with standard acoustic offsets in groups of 2 (C#, D#) and 3 (F#, G#, A#)
 */
export function computePianoGeometry(): Map<number, PianoKeyGeometry> {
  const map = new Map<number, PianoKeyGeometry>();
  const whiteKeyWidthRatio = 1 / TOTAL_WHITE_KEYS;
  const blackKeyWidthRatio = whiteKeyWidthRatio * 0.60;
  const blackKeyHeightRatio = 0.65;

  let currentWhiteIndex = 0;

  const keyInfo: { pitch: number; isBlack: boolean; whiteIndex?: number }[] = [];
  for (let pitch = FIRST_MIDI_NOTE; pitch <= LAST_MIDI_NOTE; pitch++) {
    const black = isBlackKey(pitch);
    if (!black) {
      keyInfo.push({ pitch, isBlack: false, whiteIndex: currentWhiteIndex++ });
    } else {
      keyInfo.push({ pitch, isBlack: true });
    }
  }

  for (let i = 0; i < keyInfo.length; i++) {
    const { pitch, isBlack, whiteIndex } = keyInfo[i];
    const noteName = getNoteName(pitch);

    if (!isBlack && whiteIndex !== undefined) {
      const leftRatio = whiteIndex * whiteKeyWidthRatio;
      map.set(pitch, {
        pitch,
        noteName,
        isBlack: false,
        leftRatio,
        widthRatio: whiteKeyWidthRatio,
        heightRatio: 1.0,
        whiteIndex,
      });
    } else {
      const pitchClass = pitch % 12;
      const prevWhite = keyInfo.slice(0, i).reverse().find(k => !k.isBlack);
      const nextWhite = keyInfo.slice(i + 1).find(k => !k.isBlack);

      if (prevWhite && nextWhite && prevWhite.whiteIndex !== undefined && nextWhite.whiteIndex !== undefined) {
        const boundary = nextWhite.whiteIndex * whiteKeyWidthRatio;

        let offsetFraction = 0;
        if (pitchClass === 1) offsetFraction = -0.10;      // C#
        else if (pitchClass === 3) offsetFraction = 0.10;  // D#
        else if (pitchClass === 6) offsetFraction = -0.14; // F#
        else if (pitchClass === 8) offsetFraction = 0.0;   // G#
        else if (pitchClass === 10) offsetFraction = 0.14; // A#

        const center = boundary + (offsetFraction * whiteKeyWidthRatio);
        const leftRatio = center - (blackKeyWidthRatio / 2);

        map.set(pitch, {
          pitch,
          noteName,
          isBlack: true,
          leftRatio,
          widthRatio: blackKeyWidthRatio,
          heightRatio: blackKeyHeightRatio,
        });
      }
    }
  }

  return map;
}

export const PIANO_GEOMETRY_CACHE = computePianoGeometry();
