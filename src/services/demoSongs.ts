/**
 * KeyCascade — Demo Classical & Virtuoso Piano Pieces
 * Developed by Alon Ashkenazi
 */

import { MidiNote, ParsedMidi } from '../types/visualizer';
import { getNoteName } from './pianoGeometry';

export interface DemoSongMetadata {
  id: string;
  title: string;
  composer: string;
  bpm: number;
  difficulty: string;
  notesCount: number;
  duration: number;
  generate: () => ParsedMidi;
}

function generateFurElise(): ParsedMidi {
  const bpm = 136;
  const beat = 60 / bpm;
  const eighth = beat / 2;
  const sixteenth = beat / 4;
  const notes: MidiNote[] = [];
  let id = 1;

  const add = (pitch: number, time: number, dur: number, vel: number, hand: 'left' | 'right', track = 0) => {
    notes.push({
      id: id++,
      pitch,
      name: getNoteName(pitch),
      time,
      duration: dur,
      endTime: time + dur,
      velocity: vel,
      track,
      channel: 0,
      hand,
    });
  };

  let t = 0.5;
  const motif = [
    { p: 76, d: sixteenth }, // E5
    { p: 75, d: sixteenth }, // D#5
    { p: 76, d: sixteenth }, // E5
    { p: 75, d: sixteenth }, // D#5
    { p: 76, d: sixteenth }, // E5
    { p: 71, d: sixteenth }, // B4
    { p: 74, d: sixteenth }, // D5
    { p: 72, d: sixteenth }, // C5
    { p: 69, d: eighth },    // A4
  ];

  for (let cycle = 0; cycle < 3; cycle++) {
    for (const n of motif) {
      add(n.p, t, n.d * 0.95, 0.75, 'right', 0);
      t += n.d;
    }

    const bassTime = t - eighth;
    add(33, bassTime, eighth * 2, 0.65, 'left', 1);
    add(40, bassTime + sixteenth, eighth, 0.6, 'left', 1);
    add(45, bassTime + eighth, eighth, 0.6, 'left', 1);
    add(48, bassTime + eighth + sixteenth, eighth, 0.65, 'left', 1);
    add(52, bassTime + eighth * 2, eighth, 0.6, 'left', 1);

    add(48, t, sixteenth, 0.7, 'right', 0); t += sixteenth;
    add(52, t, sixteenth, 0.7, 'right', 0); t += sixteenth;
    add(57, t, sixteenth, 0.7, 'right', 0); t += sixteenth;
    add(59, t, eighth, 0.8, 'right', 0); t += eighth;

    const bassTime2 = t - eighth;
    add(28, bassTime2, eighth * 2, 0.65, 'left', 1);
    add(40, bassTime2 + sixteenth, eighth, 0.6, 'left', 1);
    add(44, bassTime2 + eighth, eighth, 0.6, 'left', 1);
    add(52, bassTime2 + eighth + sixteenth, eighth, 0.6, 'left', 1);

    add(52, t, sixteenth, 0.7, 'right', 0); t += sixteenth;
    add(56, t, sixteenth, 0.7, 'right', 0); t += sixteenth;
    add(59, t, sixteenth, 0.7, 'right', 0); t += sixteenth;
    add(60, t, eighth, 0.8, 'right', 0); t += eighth;

    t += sixteenth;
  }

  const arpeggio = [45, 48, 52, 57, 60, 64, 69, 72, 76, 81, 84, 88];
  for (let i = 0; i < arpeggio.length; i++) {
    add(arpeggio[i], t, sixteenth * 0.9, 0.85, i < 4 ? 'left' : 'right', i < 4 ? 1 : 0);
    t += sixteenth * 0.75;
  }

  add(33, t, beat * 2.5, 0.85, 'left', 1);
  add(45, t, beat * 2.5, 0.85, 'left', 1);
  add(57, t, beat * 2.5, 0.85, 'right', 0);
  add(60, t, beat * 2.5, 0.85, 'right', 0);
  add(64, t, beat * 2.5, 0.85, 'right', 0);
  add(69, t, beat * 2.5, 0.9, 'right', 0);
  add(81, t, beat * 2.5, 0.95, 'right', 0);

  t += beat * 3;

  return {
    title: 'Für Elise',
    duration: t,
    notes,
    tracks: [
      { id: 0, name: 'Right Hand', notesCount: notes.filter(n => n.track === 0).length, channel: 0, color: '#f43f5e', secondaryColor: '#fb7185', visible: true },
      { id: 1, name: 'Left Hand', notesCount: notes.filter(n => n.track === 1).length, channel: 0, color: '#9333ea', secondaryColor: '#c084fc', visible: true },
    ],
    bpm,
    timeSignature: [3, 8],
  };
}

function generateMoonlightSonata(): ParsedMidi {
  const bpm = 54;
  const beat = 60 / bpm;
  const triplet = beat / 3;
  const notes: MidiNote[] = [];
  let id = 1;

  const add = (pitch: number, time: number, dur: number, vel: number, hand: 'left' | 'right', track = 0) => {
    notes.push({
      id: id++,
      pitch,
      name: getNoteName(pitch),
      time,
      duration: dur,
      endTime: time + dur,
      velocity: vel,
      track,
      channel: 0,
      hand,
    });
  };

  let t = 0.5;

  const chords = [
    { bass: [25, 37], arpeggio: [56, 61, 64], melody: null },
    { bass: [23, 35], arpeggio: [56, 59, 64], melody: null },
    { bass: [21, 33], arpeggio: [53, 57, 61], melody: { p: 68, delay: beat * 2 } },
    { bass: [20, 32], arpeggio: [51, 56, 59], melody: { p: 68, delay: beat } },
    { bass: [25, 37], arpeggio: [56, 61, 64], melody: { p: 68, delay: 0 } },
  ];

  for (const bar of chords) {
    for (const b of bar.bass) {
      add(b, t, beat * 3.8, 0.7, 'left', 1);
    }

    for (let g = 0; g < 4; g++) {
      for (let i = 0; i < 3; i++) {
        const noteTime = t + (g * 3 + i) * triplet;
        add(bar.arpeggio[i], noteTime, triplet * 0.9, 0.55 + (i === 0 ? 0.05 : 0), 'right', 0);
      }
    }

    if (bar.melody) {
      add(bar.melody.p, t + bar.melody.delay, beat * 1.8, 0.85, 'right', 0);
    }

    t += beat * 4;
  }

  return {
    title: 'Moonlight Sonata (Adagio)',
    duration: t + 2.0,
    notes,
    tracks: [
      { id: 0, name: 'Treble (Triplets & Melody)', notesCount: notes.filter(n => n.track === 0).length, channel: 0, color: '#f43f5e', secondaryColor: '#fb7185', visible: true },
      { id: 1, name: 'Bass Octaves', notesCount: notes.filter(n => n.track === 1).length, channel: 0, color: '#9333ea', secondaryColor: '#c084fc', visible: true },
    ],
    bpm,
    timeSignature: [4, 4],
  };
}

function generateVirtuosoCascade(): ParsedMidi {
  const bpm = 150;
  const beat = 60 / bpm;
  const s = beat / 4;
  const notes: MidiNote[] = [];
  let id = 1;

  const add = (pitch: number, time: number, dur: number, vel: number, hand: 'left' | 'right', track = 0) => {
    notes.push({
      id: id++,
      pitch,
      name: getNoteName(pitch),
      time,
      duration: dur,
      endTime: time + dur,
      velocity: vel,
      track,
      channel: 0,
      hand,
    });
  };

  let t = 0.5;

  const scale = [21, 24, 26, 28, 31, 33, 36, 38, 40, 43, 45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 100, 105, 108];

  for (let i = 0; i < scale.length; i++) {
    const pitch = scale[i];
    const hand = pitch < 60 ? 'left' : 'right';
    add(pitch, t, s * 1.5, 0.7 + 0.25 * (i / scale.length), hand, hand === 'left' ? 1 : 0);
    t += s * 0.75;
  }

  for (let i = scale.length - 1; i >= 0; i -= 2) {
    const pitch = scale[i];
    add(pitch, t, s * 2, 0.85, 'right', 0);
    if (i - 7 >= 0) {
      add(scale[i - 7], t, s * 2, 0.75, 'left', 1);
    }
    t += s * 0.8;
  }

  const finale = [24, 36, 48, 60, 64, 67, 72, 76, 79, 84, 96];
  for (const p of finale) {
    add(p, t, beat * 3.5, 0.95, p < 60 ? 'left' : 'right', p < 60 ? 1 : 0);
  }

  t += beat * 4;

  return {
    title: 'KeyCascade Crystal Virtuoso Run',
    duration: t,
    notes,
    tracks: [
      { id: 0, name: 'Treble Stardust', notesCount: notes.filter(n => n.track === 0).length, channel: 0, color: '#f43f5e', secondaryColor: '#fb7185', visible: true },
      { id: 1, name: 'Bass Waves', notesCount: notes.filter(n => n.track === 1).length, channel: 0, color: '#9333ea', secondaryColor: '#c084fc', visible: true },
    ],
    bpm,
    timeSignature: [4, 4],
  };
}

export const DEMO_SONGS: DemoSongMetadata[] = [
  {
    id: 'fur-elise',
    title: 'Für Elise',
    composer: 'Ludwig van Beethoven',
    bpm: 136,
    difficulty: 'Intermediate',
    notesCount: 78,
    duration: 18.5,
    generate: generateFurElise,
  },
  {
    id: 'moonlight-sonata',
    title: 'Moonlight Sonata (Adagio)',
    composer: 'Ludwig van Beethoven',
    bpm: 54,
    difficulty: 'Beginner / Expressive',
    notesCount: 65,
    duration: 22.0,
    generate: generateMoonlightSonata,
  },
  {
    id: 'virtuoso-cascade',
    title: 'KeyCascade Crystal Virtuoso Run',
    composer: 'Alon Ashkenazi',
    bpm: 150,
    difficulty: 'Virtuoso / 60 FPS Showcase',
    notesCount: 92,
    duration: 16.0,
    generate: generateVirtuosoCascade,
  },
];
