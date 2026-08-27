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
  FolderOpen,
  Music,
  VolumeX,
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
  const [customFileName, setCustomFileName] = useState('');
  const [destinationFileHandle, setDestinationFileHandle] = useState<any | null>(null);
  const [savedLocationMsg, setSavedLocationMsg] = useState<string | null>(null);

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

  const getResolutionDimensions = (res: ExportResolution) => {
    switch (res) {
      case '4k':
        return { width: 3840, height: 2160, bitrate: 45_000_000, label: '4K Ultra HD (3840×2160)' };
      case '720p':
        return { width: 1280, height: 720, bitrate: 6_000_000, label: '720p HD (1280×720)' };
      case '1080p':
      default:
        return { width: 1920, height: 1080, bitrate: 18_000_000, label: '1080p Full HD (1920×1080)' };
    }
  };

  const resDims = getResolutionDimensions(resolution);

  const getDefaultFileName = () => {
    const cleanTitle = (songTitle || 'Piano_Visualizer').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `KeyCascade_${cleanTitle}_${resolution}_${fps}fps.${format}`;
  };

  /**
   * Allows user to pre-select their destination folder & filename via Native File System API
   */
  const handlePickDestination = async () => {
    const fileName = customFileName.trim() || getDefaultFileName();
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: format === 'mp4' ? 'MP4 Video (*.mp4)' : 'WebM Video (*.webm)',
              accept: {
                [format === 'mp4' ? 'video/mp4' : 'video/webm']: [`.${format}`],
              },
            },
          ],
        });
        setDestinationFileHandle(handle);
        setCustomFileName(handle.name);
        setSavedLocationMsg(null);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('File picker error:', err);
        }
      }
    }
  };

  const handleStartExport = async () => {
    setSavedLocationMsg(null);
    setDownloadBlob(null);

    const fileName = customFileName.trim() || getDefaultFileName();
    let fileHandle = destinationFileHandle;

    // If destination folder not picked yet, prompt user immediately before export
    if (!fileHandle && 'showSaveFilePicker' in window) {
      try {
        fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: format === 'mp4' ? 'MP4 Video (*.mp4)' : 'WebM Video (*.webm)',
              accept: {
                [format === 'mp4' ? 'video/mp4' : 'video/webm']: [`.${format}`],
              },
            },
          ],
        });
        setDestinationFileHandle(fileHandle);
        setCustomFileName(fileHandle.name);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User canceled file dialog - abort starting export
          return;
        }
      }
    }

    const actualStart = exportFullSong ? 0 : Math.max(0, startTime);
    const actualEnd = exportFullSong ? duration : Math.min(duration, Math.max(actualStart + 1.0, endTime));

    console.log(`Starting export: ${actualStart}s to ${actualEnd}s (${Math.round(actualEnd - actualStart)}s) @ ${fps} FPS`);

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

      // Automatically write directly to the chosen folder/file handle
      if (fileHandle) {
        try {
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          setSavedLocationMsg(`Saved directly to chosen location as "${fileHandle.name}"!`);
        } catch (saveErr) {
          console.warn('Auto-save to chosen handle failed:', saveErr);
        }
      }

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

  /**
   * Save As... (Allows user to select exact folder & location via Native File System API)
   */
  const handleSaveAs = async () => {
    if (!downloadBlob) return;
    const fileName = customFileName.trim() || getDefaultFileName();

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: format === 'mp4' ? 'MP4 Video (*.mp4)' : 'WebM Video (*.webm)',
              accept: {
                [format === 'mp4' ? 'video/mp4' : 'video/webm']: [`.${format}`],
              },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(downloadBlob.blob);
        await writable.close();

        setSavedLocationMsg(`Saved successfully to chosen location as "${handle.name}"!`);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User closed the file picker
          return;
        }
        console.warn('Native showSaveFilePicker failed, falling back to download:', err);
      }
    }

    // Fallback for browsers without File System Access API
    handleQuickDownload();
  };

  /**
   * Quick download to browser's default Downloads directory
   */
  const handleQuickDownload = () => {
    if (!downloadBlob) return;
    const fileName = customFileName.trim() || getDefaultFileName();
    const a = document.createElement('a');
    a.href = downloadBlob.url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setSavedLocationMsg(`Saved to your browser's Downloads folder as "${fileName}"`);
  };

  const effectiveStart = exportFullSong ? 0 : startTime;
  const effectiveEnd = exportFullSong ? duration : Math.max(effectiveStart + 1.0, endTime);
  const exportDuration = Math.max(1, Math.round(effectiveEnd - effectiveStart));
  const estimatedFrames = exportDuration * fps;

  if (!isOpen) return null;

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

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Phase 1: Configuration Form */}
          {!progress.isExporting && progress.phase !== 'completed' && (
            <>
              {/* Resolution Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Resolution
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['1080p', '4k', '720p'] as ExportResolution[]).map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-all ${
                        resolution === res
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-500/20'
                          : 'bg-[#161a29] border-[#252a3d] text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="font-bold">{res.toUpperCase()}</div>
                      <div className="text-[10px] text-slate-400">
                        {res === '4k' ? '3840×2160' : res === '1080p' ? '1920×1080' : '1280×720'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Framerate & Format */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Framerate
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFps(60)}
                      className={`py-1.5 rounded border text-xs font-semibold ${
                        fps === 60
                          ? 'bg-fuchsia-950/80 border-fuchsia-500 text-fuchsia-200'
                          : 'bg-[#161a29] border-[#252a3d] text-slate-300'
                      }`}
                    >
                      60 FPS
                    </button>
                    <button
                      onClick={() => setFps(30)}
                      className={`py-1.5 rounded border text-xs font-semibold ${
                        fps === 30
                          ? 'bg-fuchsia-950/80 border-fuchsia-500 text-fuchsia-200'
                          : 'bg-[#161a29] border-[#252a3d] text-slate-300'
                      }`}
                    >
                      30 FPS
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Container Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFormat('mp4')}
                      className={`py-1.5 rounded border text-xs font-semibold ${
                        format === 'mp4'
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                          : 'bg-[#161a29] border-[#252a3d] text-slate-300'
                      }`}
                    >
                      MP4 (H.264)
                    </button>
                    <button
                      onClick={() => setFormat('webm')}
                      className={`py-1.5 rounded border text-xs font-semibold ${
                        format === 'webm'
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200'
                          : 'bg-[#161a29] border-[#252a3d] text-slate-300'
                      }`}
                    >
                      WebM (Alpha)
                    </button>
                  </div>
                </div>
              </div>

              {/* Duration Scope: Entire Song vs Range */}
              <div className="p-3 bg-[#131726] border border-[#232840] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">Export Entire Song</span>
                    <span className="text-[10px] text-slate-400">
                      Renders from 0:00 to {formatTime(duration)} (full piece)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={exportFullSong}
                    onChange={(e) => {
                      setExportFullSong(e.target.checked);
                      if (e.target.checked) {
                        setStartTime(0);
                        setEndTime(duration);
                      }
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                {!exportFullSong && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#232840]">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        Start Time ({formatTime(startTime)})
                      </span>
                      <input
                        type="range"
                        min="0"
                        max={duration - 1}
                        step="0.5"
                        value={startTime}
                        onChange={(e) => setStartTime(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        End Time ({formatTime(endTime)})
                      </span>
                      <input
                        type="range"
                        min={startTime + 1}
                        max={duration}
                        step="0.5"
                        value={endTime}
                        onChange={(e) => setEndTime(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Audio Mode: MIDI Sound vs Video Only */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Audio Output
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIncludeAudio(true)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      includeAudio
                        ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md shadow-cyan-500/20'
                        : 'bg-[#141828] border-[#22283e] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5 text-cyan-300">
                      <Music className="w-3.5 h-3.5" />
                      <span>MIDI Sound</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Fast synchronized piano audio
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIncludeAudio(false)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      !includeAudio
                        ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md shadow-cyan-500/20'
                        : 'bg-[#141828] border-[#22283e] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5 text-slate-200">
                      <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                      <span>Video Only (Mute)</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Silent export for video editor overlays
                    </div>
                  </button>
                </div>
              </div>

              {/* Destination Folder & Save Location */}
              <div className="p-3.5 bg-[#131726] border border-[#232840] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-cyan-400" />
                    <span>Save Location & Folder</span>
                  </label>
                  {destinationFileHandle ? (
                    <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Location Selected
                    </span>
                  ) : (
                    <span className="text-[10px] text-cyan-400 font-medium">
                      Prompt before saving
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    placeholder={getDefaultFileName()}
                    className="flex-1 bg-[#0b0e17] border border-[#262c44] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    title="Video output file name"
                  />
                  <button
                    type="button"
                    onClick={handlePickDestination}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all whitespace-nowrap cursor-pointer ${
                      destinationFileHandle
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                        : 'bg-cyan-950/80 border-cyan-500 text-cyan-200 hover:bg-cyan-900/80 shadow-sm shadow-cyan-500/20'
                    }`}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{destinationFileHandle ? 'Change Folder...' : 'Choose Folder...'}</span>
                  </button>
                </div>

                {destinationFileHandle ? (
                  <div className="p-2 bg-emerald-950/40 border border-emerald-800/40 rounded-lg text-[11px] text-emerald-300 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-mono truncate">
                      <span className="text-slate-400">Saving to:</span>
                      <span className="font-bold text-white truncate">{destinationFileHandle.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDestinationFileHandle(null)}
                      className="text-[10px] text-slate-400 hover:text-white underline ml-2 whitespace-nowrap cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">
                    Click <strong className="text-cyan-300">Choose Folder...</strong> to select any folder on your computer (Desktop, Videos, external drive, etc.).
                  </p>
                )}
              </div>

              <div className="p-2.5 bg-cyan-950/30 border border-cyan-800/40 rounded-lg text-[11px] text-cyan-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-cyan-400" />
                <span>
                  Offline rendering processes each frame deterministically. Zero dropped frames, perfect audio-video synchronization, and uncompressed quality.
                </span>
              </div>
            </>
          )}

          {/* Phase 2: Active Export Progress */}
          {progress.isExporting && (
            <div className="py-6 space-y-4 text-center">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white capitalize">
                  {progress.phase === 'rendering_audio'
                    ? 'Preparing MIDI Sound Track...'
                    : progress.phase === 'encoding_video'
                    ? 'Rendering & Muxing 60 FPS Frames...'
                    : 'Finalizing Video File...'}
                </h3>
                <p className="text-xs text-cyan-300 font-mono">
                  Frame {progress.currentFrame} / {progress.totalFrames} ({progress.percentage}%)
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-[#1a1e2d] rounded-full overflow-hidden border border-[#2a3047]">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 rounded-full transition-all duration-150"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1">
                <span>Encoding speed: {progress.fps} FPS</span>
                <span>Remaining: ~{Math.ceil(progress.estimatedRemainingSec)}s</span>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCancelExport}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900 transition-all cursor-pointer"
                >
                  Cancel Export
                </button>
              </div>
            </div>
          )}

          {/* Phase 3: Completed Successfully */}
          {!progress.isExporting && progress.phase === 'completed' && downloadBlob && (
            <div className="py-5 flex flex-col items-center justify-center space-y-4 text-center">
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

              {/* Filename customization */}
              <div className="w-full max-w-sm text-left px-2">
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  Video File Name
                </label>
                <input
                  type="text"
                  value={customFileName || getDefaultFileName()}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  className="w-full bg-[#161a29] border border-[#2d334d] focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                />
              </div>

              {/* Save Location Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-sm pt-1">
                <button
                  onClick={handleSaveAs}
                  className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black shadow-lg shadow-cyan-500/30 transition-all active:scale-95 cursor-pointer"
                  title="Choose exact folder location on your computer to save video (Desktop, Videos, external drive, etc.)"
                >
                  <FolderOpen className="w-4 h-4 text-black" />
                  <span>Choose Save Location...</span>
                </button>

                <button
                  onClick={handleQuickDownload}
                  className="flex-1 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium bg-[#1a1e2d] hover:bg-[#252b40] text-slate-200 border border-[#2d334d] transition-all cursor-pointer"
                  title="Save directly to your browser's default Downloads folder"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Save to Downloads</span>
                </button>
              </div>

              {savedLocationMsg ? (
                <p className="text-[11px] text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-md font-mono">
                  ✓ {savedLocationMsg}
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 max-w-xs">
                  💡 Click <strong>Choose Save Location...</strong> to pick any folder on your computer, or <strong>Save to Downloads</strong>.
                </p>
              )}

              <button
                onClick={() => {
                  setSavedLocationMsg(null);
                  setProgress({ ...progress, phase: 'preparing' });
                }}
                className="text-xs text-slate-400 hover:text-white underline pt-1"
              >
                Export Another Video
              </button>
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
                <span>
                  {destinationFileHandle ? 'Start Export to Folder' : 'Start Offline Export'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
