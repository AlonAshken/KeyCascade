/**
 * KeyCascade — High-DPI Canvas Viewport & Touch Keyboard
 * Developed by Alon Ashkenazi
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, Minimize2, Sparkles, Activity } from 'lucide-react';
import { MidiNote, VisualSettings } from '../types/visualizer';
import { VisualizerRenderer } from '../services/visualizerRenderer';
import { PIANO_GEOMETRY_CACHE } from '../services/pianoGeometry';
import { audioSynth } from '../services/audioSynth';

interface CanvasViewportProps {
  renderer: VisualizerRenderer;
  notes: MidiNote[];
  settings: VisualSettings;
  currentTime: number;
  isPlaying: boolean;
  onDropFile: (file: File) => void;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  renderer,
  notes,
  settings,
  currentTime,
  onDropFile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(60);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
  }, []);

  useEffect(() => {
    updateCanvasSize();
    const ro = new ResizeObserver(() => updateCanvasSize());
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    return () => ro.disconnect();
  }, [updateCanvasSize]);

  useEffect(() => {
    let animationFrameId: number;

    const renderLoop = (now: number) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;

      if (canvas && container) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const rect = container.getBoundingClientRect();
          const width = rect.width;
          const height = rect.height;
          const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
          lastTimeRef.current = now;

          renderer.renderFrame(ctx, notes, settings, {
            currentTime: currentTimeRef.current,
            width,
            height,
            dt,
            isOffline: false,
          });

          frameCountRef.current++;
          if (now - lastFpsUpdateRef.current >= 1000) {
            setFps(frameCountRef.current);
            frameCountRef.current = 0;
            lastFpsUpdateRef.current = now;
          }
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [renderer, notes, settings]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !settings.showKeyboard) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    const keyboardHeight = height * settings.keyboardHeightRatio;
    const strikeY = height - keyboardHeight;

    if (y < strikeY) return;

    const xRatio = x / width;
    const relY = y - strikeY;

    let clickedPitch: number | null = null;
    for (let pitch = 21; pitch <= 108; pitch++) {
      const geom = PIANO_GEOMETRY_CACHE.get(pitch);
      if (!geom || !geom.isBlack) continue;
      const keyH = keyboardHeight * geom.heightRatio;
      if (
        xRatio >= geom.leftRatio &&
        xRatio <= geom.leftRatio + geom.widthRatio &&
        relY <= keyH
      ) {
        clickedPitch = pitch;
        break;
      }
    }

    if (clickedPitch === null) {
      for (let pitch = 21; pitch <= 108; pitch++) {
        const geom = PIANO_GEOMETRY_CACHE.get(pitch);
        if (!geom || geom.isBlack) continue;
        if (
          xRatio >= geom.leftRatio &&
          xRatio <= geom.leftRatio + geom.widthRatio
        ) {
          clickedPitch = pitch;
          break;
        }
      }
    }

    if (clickedPitch !== null) {
      audioSynth.init().then(() => {
        audioSynth.playNote(clickedPitch!, 0.85, 0.8);
      });
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.mid') || file.name.endsWith('.midi'))) {
      onDropFile(file);
    }
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 w-full h-full bg-[#05060a] overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        className="w-full h-full block cursor-pointer"
      />

      {isDragOver && (
        <div className="absolute inset-0 bg-fuchsia-950/80 border-2 border-dashed border-fuchsia-400 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none z-30">
          <Sparkles className="w-12 h-12 text-fuchsia-300 animate-bounce mb-3" />
          <p className="text-lg font-bold text-white tracking-wide">Drop MIDI File to Load</p>
          <p className="text-xs text-fuchsia-300/80 mt-1">Supports standard Type 0 and Type 1 .mid files</p>
        </div>
      )}

      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-300 shadow-lg">
          <Activity className={`w-3 h-3 ${fps >= 55 ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span>{fps} FPS</span>
        </div>

        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white transition-all shadow-lg hover:border-fuchsia-500/50"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
