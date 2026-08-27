/**
 * KeyCascade — Transport & Playback Bar
 * Developed by Alon Ashkenazi
 */

import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Repeat,
  FastForward,
} from 'lucide-react';

interface TransportControlsProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  volume: number;
  onChangeVolume: (volume: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
}
import { formatTime } from '../utils/formatTime';

export const TransportControls: React.FC<TransportControlsProps> = ({
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSeek,
  playbackSpeed,
  onChangeSpeed,
  volume,
  onChangeVolume,
  isLooping,
  onToggleLoop,
}) => {
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const prevVolumeRef = useRef(volume);
  const scrubberRef = useRef<HTMLDivElement>(null);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * duration);
    setHoverX(e.clientX - rect.left);
  };

  const handleScrubberMouseLeave = () => {
    setHoverTime(null);
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || duration <= 0) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pos * duration);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      onChangeVolume(prevVolumeRef.current || 0.8);
    } else {
      prevVolumeRef.current = volume;
      setIsMuted(true);
      onChangeVolume(0);
    }
  };

  return (
    <div className="h-16 bg-[#0c0e16]/95 border-t border-[#1f2334] px-4 flex flex-col justify-center select-none backdrop-blur-md z-20">
      {/* 1. Scrubber Timeline Bar */}
      <div
        ref={scrubberRef}
        onClick={handleScrubberClick}
        onMouseMove={handleScrubberMouseMove}
        onMouseLeave={handleScrubberMouseLeave}
        className="relative w-full h-3 flex items-center cursor-pointer group mb-1"
      >
        <div className="w-full h-1 group-hover:h-2 bg-[#1a1e2d] rounded-full overflow-hidden transition-all">
          <div
            className="h-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          className="absolute w-3 h-3 group-hover:w-3.5 group-hover:h-3.5 rounded-full bg-white shadow-lg shadow-fuchsia-500/50 border border-fuchsia-400 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none"
          style={{ left: `${progressPercent}%` }}
        />

        {hoverTime !== null && (
          <div
            className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-fuchsia-300 pointer-events-none shadow-xl"
            style={{ left: `${hoverX}px` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* 2. Control Buttons & Status */}
      <div className="flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 min-w-[120px]">
          <span className="text-white font-medium">{formatTime(currentTime)}</span>
          <span className="text-slate-600">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSeek(0)}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#1a1e2d] transition-all"
            title="Rewind to beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayPause}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-fuchsia-500 via-purple-600 to-cyan-400 hover:from-fuchsia-400 hover:to-cyan-300 text-white flex items-center justify-center shadow-lg shadow-fuchsia-500/30 hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white text-white" />
            ) : (
              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
            )}
          </button>

          <button
            onClick={onToggleLoop}
            className={`p-1.5 rounded-full transition-all ${
              isLooping
                ? 'text-fuchsia-400 bg-fuchsia-950/60 border border-fuchsia-800'
                : 'text-slate-400 hover:text-white hover:bg-[#1a1e2d]'
            }`}
            title={isLooping ? 'Loop Enabled' : 'Enable Loop'}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-[#141724] border border-[#232738] rounded-md px-2 py-1">
            <FastForward className="w-3 h-3 text-fuchsia-400" />
            <select
              value={playbackSpeed.toString()}
              onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
              className="bg-transparent text-[11px] font-mono text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="0.5" className="bg-[#141724]">0.5x</option>
              <option value="0.75" className="bg-[#141724]">0.75x</option>
              <option value="1" className="bg-[#141724]">1.0x</option>
              <option value="1.25" className="bg-[#141724]">1.25x</option>
              <option value="1.5" className="bg-[#141724]">1.5x</option>
              <option value="2" className="bg-[#141724]">2.0x</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-white transition-all"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setIsMuted(false);
                onChangeVolume(parseFloat(e.target.value));
              }}
              className="w-16 h-1 cursor-pointer"
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
