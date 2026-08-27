/**
 * KeyCascade — Deterministic 60 FPS Offline Video Exporter
 * Developed by Alon Ashkenazi
 *
 * Encodes frame-by-frame offline videos (1080p / 4K @ 60 FPS CFR)
 * with interleaved synchronized audio (MP4 / WebM with alpha transparency).
 */

import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer';
import { ExportConfig, ExportProgress, MidiNote, VisualSettings } from '../types/visualizer';
import { VisualizerRenderer } from './visualizerRenderer';
import { audioSynth } from './audioSynth';

export class VideoExporter {
  private isCanceled = false;

  public cancel() {
    this.isCanceled = true;
  }

  /**
   * Performs offline frame-by-frame deterministic video export at constant 60 FPS (1080p or 4K).
   */
  public async exportVideo(
    notes: MidiNote[],
    settings: VisualSettings,
    config: ExportConfig,
    onProgress: (progress: ExportProgress) => void
  ): Promise<Blob> {
    this.isCanceled = false;
    const startTimeMs = performance.now();
    const fps = config.fps;

    // Full export duration (with 0.5s tail for acoustic resonance decay)
    const exportStartTime = Math.max(0, config.startTime);
    const exportEndTime = Math.max(exportStartTime + 1.0, config.endTime);
    const duration = exportEndTime - exportStartTime;
    const totalFrames = Math.max(1, Math.ceil(duration * fps));

    onProgress({
      isExporting: true,
      currentFrame: 0,
      totalFrames,
      percentage: 0,
      fps: 0,
      estimatedRemainingSec: 0,
      phase: 'preparing',
    });

    // 1. Render complete audio buffer if audio is requested
    let audioBuffer: AudioBuffer | null = null;
    const sampleRate = config.format === 'webm' ? 48000 : 44100;

    if (config.includeAudio) {
      try {
        onProgress({
          isExporting: true,
          currentFrame: 0,
          totalFrames,
          percentage: 0,
          fps: 0,
          estimatedRemainingSec: 0,
          phase: 'rendering_audio',
        });
        audioBuffer = await audioSynth.renderOfflineAudio(notes, exportEndTime + 0.5, sampleRate);
      } catch (err) {
        console.warn('Audio rendering failed or was skipped:', err);
      }
    }

    // 2. Attempt WebCodecs offline frame-by-frame encoding
    const hasWebCodecs =
      typeof window !== 'undefined' &&
      'VideoEncoder' in window &&
      'VideoFrame' in window;

    if (hasWebCodecs) {
      try {
        return await this.exportWithWebCodecs(
          notes,
          settings,
          config,
          audioBuffer,
          sampleRate,
          exportStartTime,
          exportEndTime,
          totalFrames,
          onProgress,
          startTimeMs
        );
      } catch (err) {
        console.warn('WebCodecs export encountered an issue, using MediaRecorder fallback...', err);
      }
    }

    // 3. Fallback to MediaRecorder
    return await this.exportWithMediaRecorder(
      notes,
      settings,
      config,
      audioBuffer,
      exportStartTime,
      exportEndTime,
      totalFrames,
      onProgress,
      startTimeMs
    );
  }

  /**
   * Deterministic WebCodecs Offline Encoder with Lockstep Interleaved Audio & Video
   */
  private async exportWithWebCodecs(
    notes: MidiNote[],
    settings: VisualSettings,
    config: ExportConfig,
    audioBuffer: AudioBuffer | null,
    sampleRate: number,
    startTime: number,
    endTime: number,
    totalFrames: number,
    onProgress: (progress: ExportProgress) => void,
    startTimeMs: number
  ): Promise<Blob> {
    const fps = config.fps;
    const width = config.width;
    const height = config.height;
    const isTransparent = settings.bgMode === 'transparent' && config.format === 'webm';

    // Dedicated Offline Canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const exportCtx = exportCanvas.getContext('2d', { alpha: isTransparent })!;

    const offlineRenderer = new VisualizerRenderer();

    // Setup Muxer
    let mp4Muxer: Mp4Muxer<Mp4ArrayBufferTarget> | null = null;
    let webmMuxer: WebmMuxer<WebmArrayBufferTarget> | null = null;
    let videoCodecString = '';

    const hasAudio = !!audioBuffer && typeof AudioEncoder !== 'undefined';

    if (config.format === 'mp4') {
      videoCodecString = width > 1920 ? 'avc1.640034' : 'avc1.640033';
      const target = new Mp4ArrayBufferTarget();
      mp4Muxer = new Mp4Muxer({
        target,
        video: {
          codec: 'avc',
          width,
          height,
        },
        audio: hasAudio
          ? {
              codec: 'aac',
              numberOfChannels: 2,
              sampleRate,
            }
          : undefined,
        fastStart: 'in-memory',
      });
    } else {
      videoCodecString = 'vp09.00.10.08';
      const target = new WebmArrayBufferTarget();
      webmMuxer = new WebmMuxer({
        target,
        video: {
          codec: 'V_VP9',
          width,
          height,
          alpha: isTransparent,
        },
        audio: hasAudio
          ? {
              codec: 'A_OPUS',
              numberOfChannels: 2,
              sampleRate,
            }
          : undefined,
      });
    }

    // VideoEncoder
    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        if (mp4Muxer) mp4Muxer.addVideoChunk(chunk, meta);
        else if (webmMuxer) webmMuxer.addVideoChunk(chunk, meta);
      },
      error: (e) => console.error('VideoEncoder error:', e),
    });

    const isSupported = await VideoEncoder.isConfigSupported({
      codec: videoCodecString,
      width,
      height,
      bitrate: config.bitrate,
      framerate: fps,
    });

    let finalVideoCodec = videoCodecString;
    if (!isSupported.supported) {
      finalVideoCodec = config.format === 'mp4' ? 'avc1.42001f' : 'vp8';
    }

    videoEncoder.configure({
      codec: finalVideoCodec,
      width,
      height,
      bitrate: config.bitrate,
      framerate: fps,
      latencyMode: 'quality',
    });

    // AudioEncoder
    let audioEncoder: AudioEncoder | null = null;
    if (hasAudio && audioBuffer) {
      try {
        const audioCodec = config.format === 'mp4' ? 'mp4a.40.2' : 'opus';
        const audioSupported = await AudioEncoder.isConfigSupported({
          codec: audioCodec,
          numberOfChannels: 2,
          sampleRate,
          bitrate: 192000,
        });

        if (audioSupported.supported) {
          audioEncoder = new AudioEncoder({
            output: (chunk, meta) => {
              if (mp4Muxer) mp4Muxer.addAudioChunk(chunk, meta);
              else if (webmMuxer) webmMuxer.addAudioChunk(chunk, meta);
            },
            error: (e) => console.warn('AudioEncoder error:', e),
          });

          audioEncoder.configure({
            codec: audioCodec,
            numberOfChannels: 2,
            sampleRate,
            bitrate: 192000,
          });
        }
      } catch (audioErr) {
        console.warn('AudioEncoder configuration failed:', audioErr);
        audioEncoder = null;
      }
    }

    onProgress({
      isExporting: true,
      currentFrame: 0,
      totalFrames,
      percentage: 0,
      fps: 0,
      estimatedRemainingSec: 0,
      phase: 'encoding_video',
    });

    const frameIntervalUs = Math.round(1_000_000 / fps);
    const dt = 1 / fps;

    // Audio channels
    let leftChan: Float32Array | null = null;
    let rightChan: Float32Array | null = null;
    if (audioBuffer) {
      leftChan = audioBuffer.getChannelData(0);
      rightChan = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : leftChan;
    }

    // Frame-by-frame loop with interleaved audio/video
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (this.isCanceled) {
        videoEncoder.close();
        if (audioEncoder) audioEncoder.close();
        throw new Error('Export was canceled by user.');
      }

      const currentTime = startTime + frameIndex * dt;
      const timestampUs = frameIndex * frameIntervalUs;

      // 1. Draw frame deterministically
      offlineRenderer.renderFrame(exportCtx, notes, settings, {
        currentTime,
        width,
        height,
        dt,
        isOffline: true,
      });

      // 2. Encode video frame
      const videoFrame = new VideoFrame(exportCanvas, {
        timestamp: timestampUs,
        duration: frameIntervalUs,
      });
      const keyFrame = frameIndex % (fps * 2) === 0;
      videoEncoder.encode(videoFrame, { keyFrame });
      videoFrame.close();

      // 3. Interleaved Audio: encode corresponding audio samples for this frame slice
      if (audioEncoder && leftChan && rightChan) {
        const frameStartSample = Math.floor(currentTime * sampleRate);
        const frameEndSample = Math.min(leftChan.length, Math.floor((currentTime + dt) * sampleRate));
        const numSamples = Math.max(0, frameEndSample - frameStartSample);

        if (numSamples > 0) {
          const planarData = new Float32Array(numSamples * 2);
          planarData.set(leftChan.subarray(frameStartSample, frameStartSample + numSamples), 0);
          planarData.set(rightChan.subarray(frameStartSample, frameStartSample + numSamples), numSamples);

          const audioData = new AudioData({
            format: 'f32-planar',
            sampleRate,
            numberOfFrames: numSamples,
            numberOfChannels: 2,
            timestamp: timestampUs,
            data: planarData,
          });

          audioEncoder.encode(audioData);
          audioData.close();
        }
      }

      // Memory backpressure management
      if (videoEncoder.encodeQueueSize > 12) {
        await new Promise((r) => setTimeout(r, 8));
      }

      // Progress calculation
      const now = performance.now();
      const elapsedSec = (now - startTimeMs) / 1000;
      const currentFps = (frameIndex + 1) / Math.max(0.1, elapsedSec);
      const remainingFrames = totalFrames - (frameIndex + 1);
      const remainingSec = Math.round(remainingFrames / Math.max(1, currentFps));

      onProgress({
        isExporting: true,
        currentFrame: frameIndex + 1,
        totalFrames,
        percentage: Math.round(((frameIndex + 1) / totalFrames) * 100),
        fps: Math.round(currentFps),
        estimatedRemainingSec: remainingSec,
        phase: 'encoding_video',
      });
    }

    // Flush encoders
    await videoEncoder.flush();
    videoEncoder.close();

    if (audioEncoder) {
      await audioEncoder.flush();
      audioEncoder.close();
    }

    // Finalize container
    onProgress({
      isExporting: true,
      currentFrame: totalFrames,
      totalFrames,
      percentage: 100,
      fps: 0,
      estimatedRemainingSec: 0,
      phase: 'finalizing',
    });

    let buffer: ArrayBuffer;
    let mimeType = 'video/mp4';

    if (mp4Muxer) {
      mp4Muxer.finalize();
      buffer = mp4Muxer.target.buffer;
      mimeType = 'video/mp4';
    } else if (webmMuxer) {
      webmMuxer.finalize();
      buffer = webmMuxer.target.buffer;
      mimeType = isTransparent ? 'video/webm; codecs="vp9"' : 'video/webm';
    } else {
      throw new Error('Muxer failed to initialize');
    }

    return new Blob([buffer], { type: mimeType });
  }

  /**
   * Universal Fallback using Canvas MediaRecorder & Web Audio Destination
   */
  private async exportWithMediaRecorder(
    notes: MidiNote[],
    settings: VisualSettings,
    config: ExportConfig,
    audioBuffer: AudioBuffer | null,
    startTime: number,
    endTime: number,
    totalFrames: number,
    onProgress: (progress: ExportProgress) => void,
    startTimeMs: number
  ): Promise<Blob> {
    const width = config.width;
    const height = config.height;
    const fps = config.fps;
    const dt = 1 / fps;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const exportCtx = exportCanvas.getContext('2d')!;

    const canvasStream = exportCanvas.captureStream(fps);
    const streamTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

    let audioCtx: AudioContext | null = null;
    if (audioBuffer) {
      try {
        audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        const src = audioCtx.createBufferSource();
        src.buffer = audioBuffer;
        src.connect(dest);
        src.start(0, startTime);
        streamTracks.push(...dest.stream.getAudioTracks());
      } catch (e) {
        console.warn('MediaRecorder audio track error:', e);
      }
    }

    const combinedStream = new MediaStream(streamTracks);

    const mimeType =
      config.format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
        ? 'video/mp4;codecs=avc1'
        : 'video/webm;codecs=vp9';

    const recordedChunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
      videoBitsPerSecond: config.bitrate,
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    const completionPromise = new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        if (audioCtx) audioCtx.close().catch(() => {});
        const finalBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
        resolve(finalBlob);
      };
    });

    mediaRecorder.start();
    const offlineRenderer = new VisualizerRenderer();

    for (let f = 0; f < totalFrames; f++) {
      if (this.isCanceled) {
        mediaRecorder.stop();
        throw new Error('Export was canceled by user.');
      }

      const currentTime = startTime + f * dt;
      offlineRenderer.renderFrame(exportCtx, notes, settings, {
        currentTime,
        width,
        height,
        dt,
        isOffline: true,
      });

      const now = performance.now();
      const elapsedSec = (now - startTimeMs) / 1000;
      const currentFps = (f + 1) / Math.max(0.1, elapsedSec);
      const remainingSec = Math.round((totalFrames - (f + 1)) / Math.max(1, currentFps));

      onProgress({
        isExporting: true,
        currentFrame: f + 1,
        totalFrames,
        percentage: Math.round(((f + 1) / totalFrames) * 100),
        fps: Math.round(currentFps),
        estimatedRemainingSec: remainingSec,
        phase: 'encoding_video',
      });

      await new Promise((r) => setTimeout(r, 1000 / fps));
    }

    mediaRecorder.stop();
    return await completionPromise;
  }
}

export const videoExporter = new VideoExporter();
