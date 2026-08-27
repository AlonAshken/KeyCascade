/**
 * KeyCascade — Customization Studio Sidebar
 * Developed by Alon Ashkenazi
 */

import React, { useState } from 'react';
import {
  Palette,
  Sliders,
  Sparkles,
  Zap,
  RotateCcw,
  Layers,
  Gem,
  Wind,
} from 'lucide-react';
import { BgMode, ColorMode, DissolveMode, NoteStyle, VisualSettings } from '../types/visualizer';

interface CustomizationSidebarProps {
  settings: VisualSettings;
  onChangeSettings: (settings: VisualSettings) => void;
  onResetSettings: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomizationSidebar: React.FC<CustomizationSidebarProps> = ({
  settings,
  onChangeSettings,
  onResetSettings,
  isOpen,
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'dissolve' | 'theme' | 'fx' | 'keyboard'>('notes');

  if (!isOpen) return null;

  const update = <K extends keyof VisualSettings>(key: K, value: VisualSettings[K]) => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

  return (
    <aside className="w-80 lg:w-88 h-full bg-[#0d0f18]/95 border-l border-[#1f2334] flex flex-col select-none backdrop-blur-xl z-20 transition-all duration-200">
      {/* Sidebar Header */}
      <div className="h-12 border-b border-[#1f2334] px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>VFX & Note Studio</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onResetSettings}
            className="p-1 rounded hover:bg-[#1a1e2e] text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1"
            title="Reset to Default Settings"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#1f2334] bg-[#090b12] text-[11px] font-medium text-slate-400 overflow-x-auto">
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'notes'
              ? 'border-cyan-400 text-cyan-300 bg-[#121522]'
              : 'border-transparent hover:text-slate-200 hover:bg-[#0f111a]'
          }`}
        >
          <Gem className="w-3.5 h-3.5" />
          <span>Notes</span>
        </button>
        <button
          onClick={() => setActiveTab('dissolve')}
          className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'dissolve'
              ? 'border-fuchsia-400 text-fuchsia-300 bg-[#121522]'
              : 'border-transparent hover:text-slate-200 hover:bg-[#0f111a]'
          }`}
        >
          <Wind className="w-3.5 h-3.5" />
          <span>Dust FX</span>
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'theme'
              ? 'border-cyan-400 text-cyan-300 bg-[#121522]'
              : 'border-transparent hover:text-slate-200 hover:bg-[#0f111a]'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Colors</span>
        </button>
        <button
          onClick={() => setActiveTab('fx')}
          className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'fx'
              ? 'border-cyan-400 text-cyan-300 bg-[#121522]'
              : 'border-transparent hover:text-slate-200 hover:bg-[#0f111a]'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Glow</span>
        </button>
        <button
          onClick={() => setActiveTab('keyboard')}
          className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'keyboard'
              ? 'border-cyan-400 text-cyan-300 bg-[#121522]'
              : 'border-transparent hover:text-slate-200 hover:bg-[#0f111a]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Piano</span>
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
        {/* --- 1. NOTE APPEARANCE TAB --- */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="p-3 bg-[#121522] border border-[#1f2334] rounded-lg space-y-2.5">
              <label className="block text-[11px] uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                <Gem className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Note Appearance Style</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'crystal', label: '💎 Crystal Facet', desc: 'Faceted Diamond' },
                  { id: 'neon', label: '⚡ Neon Capsule', desc: 'Rousseau Classic' },
                  { id: 'glass', label: '✨ Frosted Glass', desc: 'Prismatic Luster' },
                  { id: 'minimal', label: '⬛ Clean Flat', desc: 'Modern Studio' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => update('noteStyle', st.id as NoteStyle)}
                    className={`p-2.5 rounded-md text-left border transition-all ${
                      settings.noteStyle === st.id
                        ? 'bg-fuchsia-950/80 border-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20'
                        : 'bg-[#1a1e2d] border-[#252a3d] text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="font-semibold block text-xs">{st.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{st.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fall Speed */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Fall Speed (Note Travel Time)</span>
                <span className="font-mono text-cyan-300">{settings.fallSpeed.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="4.5"
                step="0.1"
                value={settings.fallSpeed}
                onChange={(e) => update('fallSpeed', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Note Corner Radius */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Note Corner Curvature</span>
                <span className="font-mono text-cyan-300">{settings.noteBorderRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="14"
                step="1"
                value={settings.noteBorderRadius}
                onChange={(e) => update('noteBorderRadius', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Note Horizontal Padding */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Note Gap / Padding</span>
                <span className="font-mono text-cyan-300">{settings.noteHorizontalPadding.toFixed(1)}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="0.5"
                value={settings.noteHorizontalPadding}
                onChange={(e) => update('noteHorizontalPadding', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* --- 2. DISSOLVING DUST & PARTICLES TAB --- */}
        {activeTab === 'dissolve' && (
          <div className="space-y-4">
            <div className="p-3 bg-[#121522] border border-[#1f2334] rounded-lg space-y-2.5">
              <label className="block text-[11px] uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Note Dissolve Effect</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'stardust', label: '✨ Ethereal Stardust', desc: 'Ascending Vortex Dust' },
                  { id: 'sparks', label: '💥 Explosive Sparks', desc: 'High-Velocity Fountains' },
                  { id: 'smoke', label: '🌌 Cosmic Smoke', desc: 'Soft Billowing Mist' },
                  { id: 'off', label: '🚫 Clean Cut', desc: 'No Dissolve' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => update('dissolveMode', mode.id as DissolveMode)}
                    className={`p-2.5 rounded-md text-left border transition-all ${
                      settings.dissolveMode === mode.id
                        ? 'bg-fuchsia-950/80 border-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20'
                        : 'bg-[#1a1e2d] border-[#252a3d] text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="font-semibold block text-xs">{mode.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{mode.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stardust Density */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Dust & Spark Density</span>
                <span className="font-mono text-fuchsia-300">{settings.stardustIntensity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={settings.stardustIntensity}
                onChange={(e) => update('stardustIntensity', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Vortex Swirl */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Vortex Swirl & Winding Motion</span>
                <span className="font-mono text-fuchsia-300">{settings.stardustSwirl.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.2"
                step="0.1"
                value={settings.stardustSwirl}
                onChange={(e) => update('stardustSwirl', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Lifetime */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Particle Lifetime</span>
                <span className="font-mono text-fuchsia-300">{settings.stardustLifetime.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="2.5"
                step="0.1"
                value={settings.stardustLifetime}
                onChange={(e) => update('stardustLifetime', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Ambient Background Dust Motes */}
            <div className="flex items-center justify-between p-2.5 bg-[#121522] border border-[#1f2334] rounded-lg">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Ambient Background Dust Motes</span>
                <span className="text-[10px] text-slate-400">Soft floating glowing bokeh spheres</span>
              </div>
              <input
                type="checkbox"
                checked={settings.ambientBokeh}
                onChange={(e) => update('ambientBokeh', e.target.checked)}
                className="w-4 h-4 accent-fuchsia-500 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* --- 3. COLORS & THEMES TAB --- */}
        {activeTab === 'theme' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1.5 font-semibold">
                Color Mapping Mode
              </label>
              <select
                value={settings.colorMode}
                onChange={(e) => update('colorMode', e.target.value as ColorMode)}
                className="w-full bg-[#141724] border border-[#232738] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="hand">Dual-Hand (Bass / Treble)</option>
                <option value="track">Per-Track MIDI Colors</option>
                <option value="velocity">Velocity Heatmap (Dynamics)</option>
                <option value="rainbow">Full Spectrum Rainbow</option>
              </select>
            </div>

            {/* Left Hand / Bass Colors */}
            <div className="p-3 bg-[#121522] border border-[#1f2334] rounded-lg space-y-2.5">
              <div className="text-[11px] font-semibold text-cyan-300 flex items-center justify-between">
                <span>Left Hand (Bass)</span>
                <span className="text-[10px] text-slate-400 font-mono">Pills Gradient</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Base / Core</span>
                  <div className="flex items-center gap-2 bg-[#1a1e2d] px-2 py-1 rounded border border-[#282d42]">
                    <input
                      type="color"
                      value={settings.leftHandColor}
                      onChange={(e) => update('leftHandColor', e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-300">{settings.leftHandColor}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Top Fade</span>
                  <div className="flex items-center gap-2 bg-[#1a1e2d] px-2 py-1 rounded border border-[#282d42]">
                    <input
                      type="color"
                      value={settings.leftHandSecondary}
                      onChange={(e) => update('leftHandSecondary', e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-300">{settings.leftHandSecondary}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hand / Treble Colors */}
            <div className="p-3 bg-[#121522] border border-[#1f2334] rounded-lg space-y-2.5">
              <div className="text-[11px] font-semibold text-fuchsia-300 flex items-center justify-between">
                <span>Right Hand (Treble)</span>
                <span className="text-[10px] text-slate-400 font-mono">Pills Gradient</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Base / Core</span>
                  <div className="flex items-center gap-2 bg-[#1a1e2d] px-2 py-1 rounded border border-[#282d42]">
                    <input
                      type="color"
                      value={settings.rightHandColor}
                      onChange={(e) => update('rightHandColor', e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-300">{settings.rightHandColor}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Top Fade</span>
                  <div className="flex items-center gap-2 bg-[#1a1e2d] px-2 py-1 rounded border border-[#282d42]">
                    <input
                      type="color"
                      value={settings.rightHandSecondary}
                      onChange={(e) => update('rightHandSecondary', e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="font-mono text-[10px] text-slate-300">{settings.rightHandSecondary}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hand Split Point Slider */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Split Pitch (Bass / Treble)</span>
                <span className="font-mono text-cyan-300">MIDI {settings.splitPitch} (C4)</span>
              </div>
              <input
                type="range"
                min="48"
                max="72"
                step="1"
                value={settings.splitPitch}
                onChange={(e) => update('splitPitch', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Background Blend Mode */}
            <div className="p-3 bg-[#121522] border border-[#1f2334] rounded-lg space-y-2">
              <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Video Background Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'black', label: 'Pure Black (Screen Blend)' },
                  { id: 'transparent', label: 'Alpha Transparent' },
                  { id: 'green', label: 'Green Screen (Chroma)' },
                  { id: 'gradient', label: 'Studio Vignette' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => update('bgMode', mode.id as BgMode)}
                    className={`px-2.5 py-1.5 rounded text-[11px] text-left border transition-all ${
                      settings.bgMode === mode.id
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-medium'
                        : 'bg-[#1a1e2d] border-[#252a3d] text-slate-300 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- 4. GLOW & LIGHTING TAB --- */}
        {activeTab === 'fx' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-2.5 bg-[#121522] border border-[#1f2334] rounded-lg">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Multi-Pass Bloom Glow</span>
                <span className="text-[10px] text-slate-400">Radiant luminescent lighting</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enableBloom}
                onChange={(e) => update('enableBloom', e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Glow Intensity</span>
                <span className="font-mono text-cyan-300">{settings.glowIntensity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="2.5"
                step="0.1"
                value={settings.glowIntensity}
                onChange={(e) => update('glowIntensity', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Bloom Radius</span>
                <span className="font-mono text-cyan-300">{settings.bloomRadius}px</span>
              </div>
              <input
                type="range"
                min="4"
                max="35"
                step="1"
                value={settings.bloomRadius}
                onChange={(e) => update('bloomRadius', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="p-3 bg-[#121522] border border-[#1f2334] rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Saber Strike Line</span>
                <input
                  type="checkbox"
                  checked={settings.showStrikeLine}
                  onChange={(e) => update('showStrikeLine', e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Saber Laser Color</span>
                <div className="flex items-center gap-2 bg-[#1a1e2d] px-2 py-1 rounded border border-[#282d42]">
                  <input
                    type="color"
                    value={settings.saberColor}
                    onChange={(e) => update('saberColor', e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-[10px] text-slate-300">{settings.saberColor}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-300 mb-1">
                  <span>Line Thickness</span>
                  <span className="font-mono text-cyan-300">{settings.strikeLineHeight}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={settings.strikeLineHeight}
                  onChange={(e) => update('strikeLineHeight', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* --- 5. 88-KEY PIANO TAB --- */}
        {activeTab === 'keyboard' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-2.5 bg-[#121522] border border-[#1f2334] rounded-lg">
              <div>
                <span className="text-xs font-semibold text-fuchsia-300 block">Running Sheet Music (Grand Staff)</span>
                <span className="text-[10px] text-slate-400">Treble RH & Bass LH with active note glow</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showSheetMusic}
                onChange={(e) => update('showSheetMusic', e.target.checked)}
                className="w-4 h-4 accent-fuchsia-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#121522] border border-[#1f2334] rounded-lg">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">88-Key Virtual Keyboard</span>
                <span className="text-[10px] text-slate-400">Accurate 52 white + 36 black keys</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showKeyboard}
                onChange={(e) => update('showKeyboard', e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Keyboard Height Ratio</span>
                <span className="font-mono text-cyan-300">{Math.round(settings.keyboardHeightRatio * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.12"
                max="0.26"
                step="0.01"
                value={settings.keyboardHeightRatio}
                onChange={(e) => update('keyboardHeightRatio', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Active Key Glow Luminescence</span>
                <span className="font-mono text-cyan-300">{settings.activeKeyGlow.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={settings.activeKeyGlow}
                onChange={(e) => update('activeKeyGlow', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-[#121522] border border-[#1f2334] rounded-lg">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Pitch Labels (C1..C7)</span>
                <span className="text-[10px] text-slate-400">Displays octave markers on white keys</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showKeyLabels}
                onChange={(e) => update('showKeyLabels', e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer credits */}
      <div className="p-3 border-t border-[#1f2334] bg-[#090b12] text-center">
        <p className="text-[10px] text-slate-500 font-mono">
          KeyCascade Studio • Developed by Alon Ashkenazi
        </p>
      </div>
    </aside>
  );
};
