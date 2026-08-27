/**
 * KeyCascade — Video Export Studio Modal
 * Developed by Alon Ashkenazi
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Video,
  Download,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Film,
} from 'lucide-react';
import {
  ExportConfig,
  ExportFormat,
  ExportProgress,
  ExportResolution,
  MidiNote,
  VisualSettings,
} from '../types/visualizer';
import { videoExporter } from '../services/videoExporter';
import { formatTime } from '../utils/formatTime';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: MidiNote[];
  settings: VisualSettings;
  duration: number;
  songTitle: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  notes,
  settings,
  duration,
  songTitle,
}) => {
  const [resolution, setResolution] = useState<ExportResolution>('1080p');
  const [fps, setFps] = useState<60 | 30>(60);
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [exportFullSong, setExportFullSong] = useState(true);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(duration);

  // Synchronize duration when song changes or modal opens
  useEffect(() => {
    if (isOpen && duration > 0) {
      if (exportFullSong) {
        setStartTime(0);
        setEndTime(duration);
      }
    }
  }, [isOpen, duration, exportFullSong]);

  const [progress, setProgress] = useState<ExportProgress>({
    isExporting: false,
    currentFrame: 0,
    totalFrames: 0,
    percentage: 0,
    fps: 0,
    estimatedRemainingSec: 0,
    phase: 'preparing',
  });

  const [downloadBlob, setDownloadBlob] = useState<{ blob: Blob; url: string } | null>(null);

  if (!isOpen) return null;

  const resDims = {
    '4k': { width: 3840, height: 2160, bitrate: 45_000_000 },
    '1080p': { width: 1920, height: 1080, bitrate: 18_000_000 },
    '720p': { width: 1280, height: 720, bitrate: 8_000_000 },
  }[resolution];

  const handleStartExport = async () => {
    setDownloadBlob(null);

    const actualStart = exportFullSong ? 0 : startTime;
    const actualEnd = exportFullSong ? duration : Math.max(actualStart + 1.0, endTime);

    const config: ExportConfig = {
      resolution,
      width: resDims.width,
      height: resDims.height,
      fps,
      format,
      includeAudio,
      bitrate: resDims.bitrate,
      startTime: actualStart,
      endTime: actualEnd,
    };

    try {
      const blob = await videoExporter.exportVideo(
        notes,
        settings,
        config,
        (p) => setProgress(p)
      );

      const url = URL.createObjectURL(blob);
      setDownloadBlob({ blob, url });

      setProgress((prev) => ({
        ...prev,
        isExporting: false,
        phase: 'completed',
        percentage: 100,
      }));
    } catch (err: any) {
      if (err.message !== 'Export was canceled by user.') {
        console.error('Export failed:', err);
        setProgress((prev) => ({
          ...prev,
          isExporting: false,
          phase: 'error',
          errorMessage: err.message || 'Unknown export error',
        }));
      } else {
        setProgress((prev) => ({
          ...prev,
          isExporting: false,
          phase: 'canceled',
        }));
      }
    }
  };

  const handleCancelExport = () => {
    videoExporter.cancel();
  };

  const handleDownload = () => {
    if (!downloadBlob) return;
    const cleanTitle = (songTitle || 'Piano_Visualizer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const a = document.createElement('a');
    a.href = downloadBlob.url;
    a.download = `KeyCascade_${cleanTitle}_${resolution}_${fps}fps.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const effectiveStart = exportFullSong ? 0 : startTime;
  const effectiveEnd = exportFullSong ? duration : Math.max(effectiveStart + 1.0, endTime);
  const exportDuration = Math.max(1, Math.round(effectiveEnd - effectiveStart));
  const estimatedFrames = exportDuration * fps;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none animate-in fade-in duration-150">
      <div className="bg-[#0f111c] border border-[#23273b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="h-14 px-5 border-b border-[#1f2334] flex items-center justify-between bg-[#131624]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Export 60 FPS Video Studio
              </h2>
              <p className="text-[10px] text-cyan-300 font-mono">
                Frame-by-frame deterministic offline render • Alon Ashkenazi
              </p>
            </div>
          </div>
          {!progress.isExporting && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#1f2334] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-5">
          {/* Phase 1: Configuration */}
          {!progress.isExporting && progress.phase !== 'completed' && (
            <>
              {/* Resolution selection */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-2 font-semibold">
                  Resolution
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: '1080p', label: '1080p Full HD', dims: '1920×1080', badge: 'Recommended' },
                    { id: '4k', label: '4K Ultra HD', dims: '3840×2160', badge: 'Cinema 4K' },
                    { id: '720p', label: '720p Fast', dims: '1280×720', badge: 'Fast Preview' },
                  ].map((res) => (
                    <button
                      key={res.id}
                      onClick={() => setResolution(res.id as ExportResolution)}
                      className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                        resolution === res.id
                          ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-md shadow-cyan-500/20'
                          : 'bg-[#141724] border-[#222738] text-slate-300 hover:bg-[#1a1e2e]'
                      }`}
                    >
                      <span className="font-bold text-xs">{res.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">{res.dims}</span>
                      <span className="text-[9px] text-cyan-400 font-mono mt-1">{res.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Framerate & Container Format */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* FPS */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1.5 font-semibold">
                    Frame Rate
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[60, 30].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFps(f as 60 | 30)}
                        className={`py-2 rounded-md font-mono text-center border transition-all ${
                          fps === f
                            ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-[#141724] border-[#222738] text-slate-300'
                        }`}
                      >
                        {f} FPS
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1.5 font-semibold">
                    Container Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'mp4', label: 'MP4 (H.264)' },
                      { id: 'webm', label: 'WebM (VP9)' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        onClick={() => setFormat(fmt.id as ExportFormat)}
                        className={`py-2 rounded-md font-mono text-center border transition-all ${
                          format === fmt.id
                            ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-bold'
                            : 'bg-[#141724] border-[#222738] text-slate-300'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Duration & Range Setting */}
              <div className="p-3 bg-[#131624] border border-[#202538] rounded-lg space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="exportFullSong"
                      checked={exportFullSong}
                      onChange={(e) => setExportFullSong(e.target.checked)}
                      className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                    />
                    <label htmlFor="exportFullSong" className="font-semibold text-slate-200 cursor-pointer">
                      Export Entire Song ({formatTime(duration)})
                    </label>
                  </div>
                  <span className="font-mono text-cyan-400 text-[11px]">
                    {exportDuration}s • {estimatedFrames} frames
                  </span>
                </div>

                {/* Custom range if not full song */}
                {!exportFullSong && (
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-[#1f2334]">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Start Time (seconds)</span>
                      <input
                        type="number"
                        min="0"
                        max={duration}
                        step="1"
                        value={startTime}
                        onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-[#1a1e2d] border border-[#2d334d] px-2 py-1 rounded font-mono text-slate-200"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">End Time (seconds)</span>
                      <input
                        type="number"
                        min="1"
                        max={duration}
                        step="1"
                        value={endTime}
                        onChange={(e) => setEndTime(Math.min(duration, parseFloat(e.target.value) || duration))}
                        className="w-full bg-[#1a1e2d] border border-[#2d334d] px-2 py-1 rounded font-mono text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notice */}
              <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-black/40 p-2.5 rounded-md border border-white/5">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Offline renderer guarantees 0 dropped frames with synchronized audio track. Ready for direct video editing in Premiere, DaVinci Resolve, or YouTube.
                </span>
              </div>
            </>
          )}

          {/* Phase 2: Active Export Progress */}
          {progress.isExporting && (
            <div className="py-6 flex flex-col items-center justify-center space-y-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-slate-800 border-t-cyan-400 animate-spin" />
                <span className="absolute font-mono font-bold text-sm text-white">
                  {progress.percentage}%
                </span>
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-white">
                  {progress.phase === 'rendering_audio'
                    ? 'Rendering Synchronized Grand Piano Audio...'
                    : 'Encoding 60 FPS Video Frames...'}
                </p>
                <p className="text-xs font-mono text-slate-400">
                  Frame {progress.currentFrame.toLocaleString()} / {progress.totalFrames.toLocaleString()}
                </p>
                <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-cyan-300 pt-1">
                  <span>Speed: {progress.fps} FPS</span>
                  <span>•</span>
                  <span>ETA: {progress.estimatedRemainingSec}s</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#1a1e2d] h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-100"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              <button
                onClick={handleCancelExport}
                className="px-4 py-1.5 rounded-md text-xs font-medium bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:bg-rose-900 transition-all mt-2"
              >
                Cancel Export
              </button>
            </div>
          )}

          {/* Phase 3: Completed Successfully */}
          {!progress.isExporting && progress.phase === 'completed' && downloadBlob && (
            <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Full Video Render Complete!</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  {resDims.width}×{resDims.height} @ {fps} FPS • {exportDuration}s •{' '}
                  {(downloadBlob.blob.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black shadow-lg shadow-cyan-500/30 transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-black" />
                  <span>Download Video File</span>
                </button>
                <button
                  onClick={() => setProgress({ ...progress, phase: 'preparing' })}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-[#1a1e2d] hover:bg-[#252b40] text-slate-300 border border-[#2d334d] transition-all"
                >
                  Export Another
                </button>
              </div>
            </div>
          )}

          {/* Phase 4: Error */}
          {!progress.isExporting && progress.phase === 'error' && (
            <div className="py-4 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-300">{progress.errorMessage}</p>
              <button
                onClick={() => setProgress({ ...progress, phase: 'preparing' })}
                className="px-4 py-1.5 rounded text-xs bg-[#1a1e2d] text-slate-200 hover:bg-[#252b40]"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!progress.isExporting && progress.phase !== 'completed' && (
          <div className="h-14 px-5 border-t border-[#1f2334] flex items-center justify-between bg-[#131624]">
            <span className="text-[11px] font-mono text-slate-400">
              Total {estimatedFrames} frames ({fps} FPS)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleStartExport}
                className="flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <Film className="w-3.5 h-3.5 text-black" />
                <span>Start Offline Export</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
