/**
 * KeyCascade — Professional 4K Piano MIDI Visualizer & Video Generator
 * Developed by Alon Ashkenazi
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { CanvasViewport } from './components/CanvasViewport';
import { TransportControls } from './components/TransportControls';
import { CustomizationSidebar } from './components/CustomizationSidebar';
import { ExportModal } from './components/ExportModal';
import { ParsedMidi, VisualSettings, ThemePreset } from './types/visualizer';
import { DEMO_SONGS } from './services/demoSongs';
import { THEME_PRESETS } from './services/themePresets';
import { VisualizerRenderer } from './services/visualizerRenderer';
import { applyVisualColorsToNotes, parseMidiFile } from './services/midiParser';
import { audioSynth } from './services/audioSynth';

const DEFAULT_SETTINGS: VisualSettings = {
  // Timing & Geometry
  fallSpeed: 2.3,
  noteBorderRadius: 6,
  noteHorizontalPadding: 1.5,
  noteLengthScale: 1.0,

  // Note Appearance (Grim Cat Faceted Diamond)
  noteStyle: 'crystal',
  noteFacetDensity: 3,
  noteShineIntensity: 1.2,

  // Grim Cat Dissolving Stardust Effect
  dissolveMode: 'stardust',
  stardustIntensity: 1.4,
  stardustSwirl: 1.2,
  stardustLifetime: 1.6,
  ambientBokeh: true,
  ambientBokehCount: 35,

  // Lighting & Bloom
  glowIntensity: 1.3,
  bloomRadius: 20,
  enableBloom: true,

  // Strike Line / Saber
  showStrikeLine: true,
  strikeLineHeight: 3,
  strikeLineGlow: 22,
  saberColor: '#d946ef',
  saberGlow: '#a855f7',

  // Keyboard
  showKeyboard: true,
  keyboardHeightRatio: 0.18,
  showKeyLabels: true,
  activeKeyGlow: 1.5,

  // Particles
  showParticles: true,
  particleDensity: 18,
  particleSpeed: 1.4,
  particleGravity: 0.16,
  particleLifetime: 0.8,
  particleSize: 3,
  particleBlendMode: 'lighter',

  // Colors & Theme (Grim Cat Amethyst & Magenta)
  colorMode: 'hand',
  leftHandColor: '#9333ea',
  leftHandSecondary: '#c084fc',
  rightHandColor: '#f43f5e',
  rightHandSecondary: '#fb7185',
  splitPitch: 60,
  bgMode: 'black',
  customBgColor: '#000000',
};

export function App() {
  const renderer = useMemo(() => new VisualizerRenderer(), []);

  // Visual settings & preset state
  const [settings, setSettings] = useState<VisualSettings>(DEFAULT_SETTINGS);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('grim-cat-amethyst');

  // MIDI data state
  const [currentSong, setCurrentSong] = useState<ParsedMidi>(() => DEMO_SONGS[0].generate());
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);

  // Applied colored notes cache
  const coloredNotes = useMemo(() => {
    return applyVisualColorsToNotes(currentSong.notes, settings);
  }, [currentSong.notes, settings]);

  // Audio & playback timing references
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const playbackSpeedRef = useRef(playbackSpeed);
  playbackSpeedRef.current = playbackSpeed;

  const lastAnimTimeRef = useRef<number | null>(null);

  // Play notes that cross currentTime during playback
  const triggerNotesBetween = useCallback(
    (prevT: number, currT: number) => {
      const notes = currentSong.notes;
      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        if (n.time >= prevT && n.time < currT) {
          audioSynth.playNote(n.pitch, n.velocity, n.duration);
        }
        if (n.time > currT + 0.5) break;
      }
    },
    [currentSong.notes]
  );

  // Synchronized playback loop
  useEffect(() => {
    let animationFrameId: number;

    const tick = (now: number) => {
      if (isPlayingRef.current) {
        if (lastAnimTimeRef.current !== null) {
          const deltaSec = ((now - lastAnimTimeRef.current) / 1000) * playbackSpeedRef.current;
          const nextTime = currentTimeRef.current + deltaSec;

          if (nextTime >= currentSong.duration) {
            if (isLooping) {
              triggerNotesBetween(currentTimeRef.current, currentSong.duration);
              currentTimeRef.current = 0;
              setCurrentTime(0);
              renderer.reset();
              audioSynth.stopAll();
            } else {
              setIsPlaying(false);
              currentTimeRef.current = currentSong.duration;
              setCurrentTime(currentSong.duration);
              audioSynth.stopAll();
            }
          } else {
            triggerNotesBetween(currentTimeRef.current, nextTime);
            currentTimeRef.current = nextTime;
            setCurrentTime(nextTime);
          }
        }
        lastAnimTimeRef.current = now;
      } else {
        lastAnimTimeRef.current = null;
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentSong.duration, isLooping, triggerNotesBetween, renderer]);

  // Volume updates
  useEffect(() => {
    audioSynth.setVolume(volume);
  }, [volume]);

  // Play / Pause toggle
  const handlePlayPause = useCallback(async () => {
    await audioSynth.init();
    if (!isPlaying) {
      if (currentTime >= currentSong.duration) {
        setCurrentTime(0);
        currentTimeRef.current = 0;
        renderer.reset();
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      audioSynth.stopAll();
    }
  }, [isPlaying, currentTime, currentSong.duration, renderer]);

  // Seek timeline
  const handleSeek = useCallback(
    (newTime: number) => {
      audioSynth.stopAll();
      renderer.reset();
      currentTimeRef.current = newTime;
      setCurrentTime(newTime);
    },
    [renderer]
  );

  // Apply Theme Preset
  const handleSelectPreset = useCallback((preset: ThemePreset) => {
    setSelectedPresetId(preset.id);
    setSettings((prev) => ({
      ...prev,
      noteStyle: preset.noteStyle,
      dissolveMode: preset.dissolveMode,
      leftHandColor: preset.leftHandColor,
      leftHandSecondary: preset.leftHandSecondary,
      rightHandColor: preset.rightHandColor,
      rightHandSecondary: preset.rightHandSecondary,
      saberColor: preset.saberColor,
      saberGlow: preset.saberGlow,
      bgMode: preset.bgMode,
    }));
  }, []);

  // Load Demo Song
  const handleLoadDemo = useCallback(
    (demoId: string) => {
      const demo = DEMO_SONGS.find((s) => s.id === demoId);
      if (demo) {
        audioSynth.stopAll();
        renderer.reset();
        const parsed = demo.generate();
        setCurrentSong(parsed);
        setCurrentTime(0);
        currentTimeRef.current = 0;
        setIsPlaying(false);
      }
    },
    [renderer]
  );

  // File Upload Handler
  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        audioSynth.stopAll();
        renderer.reset();
        const buffer = await file.arrayBuffer();
        const parsed = await parseMidiFile(buffer, file.name, settings);
        setCurrentSong(parsed);
        setCurrentTime(0);
        currentTimeRef.current = 0;
        setIsPlaying(false);
      } catch (err) {
        console.error('Failed to parse MIDI file:', err);
        alert('Could not parse MIDI file. Please ensure it is a valid standard .mid or .midi file.');
      }
    },
    [renderer, settings]
  );

  // Keyboard Shortcuts (Space to play/pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#07080c] overflow-hidden text-slate-100 font-sans">
      {/* Top Header */}
      <Header
        currentSongTitle={currentSong.title}
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        onLoadDemo={handleLoadDemo}
        onFileUpload={handleFileUpload}
        onOpenExportModal={() => {
          setIsPlaying(false);
          audioSynth.stopAll();
          setExportModalOpen(true);
        }}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        isPlaying={isPlaying}
      />

      {/* Main Viewport + Customization Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        <CanvasViewport
          renderer={renderer}
          notes={coloredNotes}
          settings={settings}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onDropFile={handleFileUpload}
        />

        <CustomizationSidebar
          settings={settings}
          onChangeSettings={setSettings}
          onResetSettings={() => setSettings(DEFAULT_SETTINGS)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Transport Controls */}
      <TransportControls
        currentTime={currentTime}
        duration={currentSong.duration}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        playbackSpeed={playbackSpeed}
        onChangeSpeed={setPlaybackSpeed}
        volume={volume}
        onChangeVolume={setVolume}
        isLooping={isLooping}
        onToggleLoop={() => setIsLooping((prev) => !prev)}
      />

      {/* Offline 60 FPS Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        notes={coloredNotes}
        settings={settings}
        duration={currentSong.duration}
        songTitle={currentSong.title}
      />
    </div>
  );
}
export default App;
