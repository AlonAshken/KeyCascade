/**
 * KeyCascade — MIDI Parser & Hand Splitter
 * Developed by Alon Ashkenazi
 */

import { Midi } from '@tonejs/midi';
import { MidiNote, MidiTrackInfo, ParsedMidi, VisualSettings } from '../types/visualizer';
import { getNoteName } from './pianoGeometry';

export const TRACK_PALETTE = [
  { primary: '#00f2fe', secondary: '#4facfe' },
  { primary: '#ff0844', secondary: '#ffb199' },
  { primary: '#b153ff', secondary: '#f857a6' },
  { primary: '#00f5a0', secondary: '#00d9f5' },
  { primary: '#f6d365', secondary: '#fda085' },
  { primary: '#ff758c', secondary: '#ff7eb3' },
  { primary: '#a18cd1', secondary: '#fbc2eb' },
  { primary: '#43e97b', secondary: '#38f9d7' },
];

export async function parseMidiFile(
  arrayBuffer: ArrayBuffer,
  fileName: string = 'Untitled Piece',
  settings?: VisualSettings
): Promise<ParsedMidi> {
  const midi = new Midi(arrayBuffer);
  const splitPitch = settings?.splitPitch ?? 60;

  const tracks: MidiTrackInfo[] = [];
  const allNotes: MidiNote[] = [];
  let noteCounter = 0;

  midi.tracks.forEach((track, trackIdx) => {
    if (track.notes.length === 0) return;

    const palette = TRACK_PALETTE[trackIdx % TRACK_PALETTE.length];
    const trackInfo: MidiTrackInfo = {
      id: trackIdx,
      name: track.name || `Track ${trackIdx + 1}`,
      notesCount: track.notes.length,
      channel: track.channel,
      color: palette.primary,
      secondaryColor: palette.secondary,
      visible: true,
    };
    tracks.push(trackInfo);

    track.notes.forEach((note) => {
      if (note.midi < 21 || note.midi > 108) return;

      const hand = note.midi < splitPitch ? 'left' : 'right';

      allNotes.push({
        id: ++noteCounter,
        pitch: note.midi,
        name: note.name || getNoteName(note.midi),
        time: note.time,
        duration: Math.max(0.06, note.duration),
        endTime: note.time + Math.max(0.06, note.duration),
        velocity: Math.max(0.2, note.velocity),
        track: trackIdx,
        channel: track.channel,
        hand,
      });
    });
  });

  allNotes.sort((a, b) => a.time - b.time);

  const lastNoteEnd = allNotes.reduce((max, n) => Math.max(max, n.endTime), 0);
  const duration = Math.max(midi.duration, lastNoteEnd, 1.0);

  const bpm = midi.header.tempos.length > 0 ? Math.round(midi.header.tempos[0].bpm) : 120;
  const timeSignature: [number, number] = midi.header.timeSignatures.length > 0
    ? [midi.header.timeSignatures[0].timeSignature[0], midi.header.timeSignatures[0].timeSignature[1]]
    : [4, 4];

  return {
    title: midi.name || fileName.replace(/\.[^/.]+$/, ''),
    duration,
    notes: allNotes,
    tracks,
    bpm,
    timeSignature,
  };
}

export function applyVisualColorsToNotes(notes: MidiNote[], settings: VisualSettings): MidiNote[] {
  return notes.map((note) => {
    const hand = note.pitch < settings.splitPitch ? 'left' : 'right';
    let primary = settings.rightHandColor;
    let secondary = settings.rightHandSecondary;

    if (settings.colorMode === 'hand') {
      if (hand === 'left') {
        primary = settings.leftHandColor;
        secondary = settings.leftHandSecondary;
      }
    } else if (settings.colorMode === 'velocity') {
      const v = note.velocity;
      const hue = (1 - v) * 220;
      primary = `hsl(${hue}, 100%, 55%)`;
      secondary = `hsl(${hue + 20}, 100%, 70%)`;
    } else if (settings.colorMode === 'rainbow') {
      const ratio = (note.pitch - 21) / 88;
      const hue = Math.round(ratio * 360);
      primary = `hsl(${hue}, 95%, 55%)`;
      secondary = `hsl(${(hue + 35) % 360}, 95%, 75%)`;
    } else if (settings.colorMode === 'track') {
      const palette = TRACK_PALETTE[note.track % TRACK_PALETTE.length];
      primary = palette.primary;
      secondary = palette.secondary;
    }

    return {
      ...note,
      hand,
      color: primary,
      secondaryColor: secondary,
    };
  });
}
