/**
 * KeyCascade — Professional 4K Piano MIDI Visualizer & Video Generator
 * Developed by Alon Ashkenazi
 */

export type HandType = 'left' | 'right';

export interface MidiNote {
  id: number;
  pitch: number;          // 21 (A0) to 108 (C8)
  name: string;           // e.g. "C4"
  time: number;           // start time in seconds
  duration: number;       // duration in seconds
  endTime: number;        // time + duration
  velocity: number;       // 0 to 1
  track: number;          // track index
  channel: number;        // MIDI channel
  hand: HandType;         // 'left' (bass) or 'right' (treble)
  color?: string;
  secondaryColor?: string;
}

export interface MidiTrackInfo {
  id: number;
  name: string;
  notesCount: number;
  channel: number;
  color: string;
  secondaryColor: string;
  visible: boolean;
}

export interface ParsedMidi {
  title: string;
  duration: number;       // total duration in seconds
  notes: MidiNote[];
  tracks: MidiTrackInfo[];
  bpm: number;
  timeSignature: [number, number];
}

export type BgMode = 'black' | 'green' | 'transparent' | 'gradient';
export type ColorMode = 'hand' | 'track' | 'velocity' | 'rainbow';
export type NoteStyle = 'crystal' | 'neon' | 'glass' | 'obsidian' | 'minimal';
export type DissolveMode = 'stardust' | 'sparks' | 'smoke' | 'off';

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  noteStyle: NoteStyle;
  dissolveMode: DissolveMode;
  leftHandColor: string;
  leftHandSecondary: string;
  rightHandColor: string;
  rightHandSecondary: string;
  saberColor: string;
  saberGlow: string;
  bgMode: BgMode;
  customBg?: string;
}

export interface VisualSettings {
  // Timing & Geometry
  fallSpeed: number;             // Seconds for note to travel viewport (e.g. 1.2 to 4.5)
  noteBorderRadius: number;      // Corner radius in px
  noteHorizontalPadding: number; // Gap between adjacent notes in px
  noteLengthScale: number;       // Visual duration multiplier (default 1.0)
  showFallingNotes: boolean;     // Toggle falling waterfall notes cascade (default true)
  
  // Note Appearance
  noteStyle: NoteStyle;          // 'crystal' (faceted diamond), 'neon', 'glass', 'minimal'
  noteFacetDensity: number;      // Density of crystal facets (1 to 5)
  noteShineIntensity: number;    // Specular glint intensity (0 to 2)

  // Dissolving Dust & Particle System
  dissolveMode: DissolveMode;    // 'stardust' (winding ethereal dust), 'sparks', 'smoke', 'off'
  stardustIntensity: number;     // Particle spawn rate (0.5 to 3.0)
  stardustSwirl: number;         // Sinusoidal turbulence / vortex wind (0.5 to 3.0)
  stardustLifetime: number;      // How long dust drifts upward before vanishing (0.8s to 3.5s)
  ambientBokeh: boolean;         // Soft floating glowing dust motes in background
  ambientBokehCount: number;     // Number of floating background motes (10 to 60)

  // Lighting & Bloom
  glowIntensity: number;         // Multiplier for shadowBlur & highlights (0 to 3)
  bloomRadius: number;           // Glow blur radius
  enableBloom: boolean;          // High quality multi-pass glow
  
  // Strike Line / Saber & Impact Flares
  showStrikeLine: boolean;
  strikeLineHeight: number;
  strikeLineGlow: number;
  saberColor: string;
  saberGlow: string;
  anamorphicFlare: boolean;      // Cinematic anamorphic lens flare horizontal streaks
  
  // Keyboard
  showKeyboard: boolean;
  keyboardHeightRatio: number;   // Ratio of canvas height (0.12 to 0.28)
  showKeyLabels: boolean;
  activeKeyGlow: number;

  // Sheet Music (Grand Staff)
  showSheetMusic: boolean;
  
  // Particles (Collision sparks)
  showParticles: boolean;
  particleDensity: number;       // Number of sparks per strike (4 to 40)
  particleSpeed: number;         // Velocity multiplier (0.5 to 3.0)
  particleGravity: number;       // Gravity acceleration (0.05 to 0.5)
  particleLifetime: number;      // Seconds before fade-out (0.2 to 1.5)
  particleSize: number;          // Particle radius in px
  particleBlendMode: 'lighter' | 'source-over';
  
  // Colors & Theme
  colorMode: ColorMode;
  leftHandColor: string;
  leftHandSecondary: string;
  rightHandColor: string;
  rightHandSecondary: string;
  splitPitch: number;            // MIDI note to split hands (default 60 = Middle C)
  bgMode: BgMode;
  customBgColor: string;
}

export interface PianoKeyGeometry {
  pitch: number;
  noteName: string;
  isBlack: boolean;
  leftRatio: number;      // Normalized [0..1] x position relative to piano width
  widthRatio: number;     // Normalized [0..1] key width
  heightRatio: number;    // 1.0 for white, ~0.64 for black
  whiteIndex?: number;    // 0 to 51 for white keys
}

export type ExportResolution = '1080p' | '4k' | '720p';
export type ExportFormat = 'mp4' | 'webm';

export interface ExportConfig {
  resolution: ExportResolution;
  width: number;
  height: number;
  fps: 60 | 30;
  format: ExportFormat;
  includeAudio: boolean;
  bitrate: number;         // bps
  startTime: number;
  endTime: number;
}

export interface ExportProgress {
  isExporting: boolean;
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  fps: number;
  estimatedRemainingSec: number;
  phase: 'preparing' | 'rendering_audio' | 'encoding_video' | 'finalizing' | 'completed' | 'canceled' | 'error';
  errorMessage?: string;
  videoBlobUrl?: string;
}
