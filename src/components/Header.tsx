/**
 * KeyCascade — Main Navigation Header
 * Developed by Alon Ashkenazi
 */

import React, { useRef } from 'react';
import { Upload, Music, Music2, Video, Sliders, Disc } from 'lucide-react';
import { DEMO_SONGS } from '../services/demoSongs';
import { THEME_PRESETS } from '../services/themePresets';
import { ThemePreset } from '../types/visualizer';

interface HeaderProps {
  currentSongTitle: string;
  selectedPresetId: string;
  onSelectPreset: (preset: ThemePreset) => void;
  onLoadDemo: (demoId: string) => void;
  onFileUpload: (file: File) => void;
  onOpenExportModal: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  showSheetMusic: boolean;
  onToggleSheetMusic: () => void;
  isPlaying: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentSongTitle,
  selectedPresetId,
  onSelectPreset,
  onLoadDemo,
  onFileUpload,
  onOpenExportModal,
  sidebarOpen,
  onToggleSidebar,
  showSheetMusic,
  onToggleSheetMusic,
  isPlaying,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <header className="h-14 bg-[#0d0f17]/95 border-b border-[#1f2334] px-4 flex items-center justify-between select-none z-20 backdrop-blur-md">
      {/* Brand Logo & Song Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-fuchsia-500 via-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-fuchsia-500/20 group-hover:shadow-fuchsia-500/40 transition-all">
            <Music className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wider bg-gradient-to-r from-fuchsia-400 via-purple-200 to-cyan-300 bg-clip-text text-transparent">
                KEYCASCADE
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-fuchsia-950/80 border border-fuchsia-800/60 text-fuchsia-300 font-medium">
                4K 60FPS
              </span>
            </div>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

        {/* Current Piece Title */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 bg-[#141724] border border-[#232738] px-2.5 py-1 rounded-md max-w-[200px] lg:max-w-xs truncate">
          <Disc className={`w-3.5 h-3.5 text-fuchsia-400 ${isPlaying ? 'animate-spin' : ''}`} />
          <span className="truncate font-medium">{currentSongTitle || 'No Song Loaded'}</span>
        </div>
      </div>

      {/* Middle Controls: Demo Picker & Themes */}
      <div className="flex items-center gap-2">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".mid,.midi"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Upload MIDI Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#1a1e2e] hover:bg-[#252b42] text-slate-200 border border-[#2d334d] transition-all hover:border-cyan-500/50 hover:text-white"
          title="Upload standard .mid or .midi file"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Upload MIDI</span>
        </button>

        {/* Demo Songs Dropdown */}
        <div className="relative group">
          <select
            onChange={(e) => onLoadDemo(e.target.value)}
            defaultValue=""
            className="appearance-none bg-[#1a1e2e] hover:bg-[#252b42] border border-[#2d334d] text-slate-200 text-xs font-medium rounded-md px-3 py-1.5 pr-7 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
          >
            <option value="" disabled>
              🎵 Choose Demo Song...
            </option>
            {DEMO_SONGS.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title} ({song.composer})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        {/* Theme Presets Dropdown */}
        <div className="relative hidden lg:block">
          <select
            value={selectedPresetId}
            onChange={(e) => {
              const preset = THEME_PRESETS.find((p) => p.id === e.target.value);
              if (preset) onSelectPreset(preset);
            }}
            className="appearance-none bg-[#1a1e2e] hover:bg-[#252b42] border border-[#2d334d] text-slate-200 text-xs font-medium rounded-md px-3 py-1.5 pr-7 focus:outline-none focus:border-fuchsia-500 transition-all cursor-pointer"
          >
            {THEME_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                ✨ {preset.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Right Actions: Sheet Music, Export Video & Settings Toggle */}
      <div className="flex items-center gap-2">
        {/* Sheet Music Toggle Button */}
        <button
          onClick={onToggleSheetMusic}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
            showSheetMusic
              ? 'bg-fuchsia-950/70 border-fuchsia-500 text-fuchsia-200 shadow-sm shadow-fuchsia-500/30'
              : 'bg-[#1a1e2e] border-[#2d334d] text-slate-300 hover:text-white'
          }`}
          title="Toggle Real-Time Running Sheet Music"
        >
          <Music2 className="w-3.5 h-3.5 text-fuchsia-400" />
          <span className="hidden sm:inline">Sheet Music</span>
        </button>

        {/* Export Video Button */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-fuchsia-500 via-purple-600 to-cyan-400 hover:from-fuchsia-400 hover:to-cyan-300 text-white shadow-md shadow-fuchsia-500/20 hover:shadow-fuchsia-500/40 transition-all active:scale-95"
        >
          <Video className="w-3.5 h-3.5 text-white" />
          <span>Export 60 FPS Video</span>
        </button>

        {/* Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className={`p-1.5 rounded-md text-xs border transition-all ${
            sidebarOpen
              ? 'bg-fuchsia-950/60 border-fuchsia-700/60 text-fuchsia-300'
              : 'bg-[#1a1e2e] border-[#2d334d] text-slate-300 hover:text-white'
          }`}
          title="Toggle VFX & Settings Sidebar"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
