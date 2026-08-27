/**
 * KeyCascade — Deterministic 60 FPS Offline Video Exporter
 * Developed by Alon Ashkenazi
 *
 * Encodes frame-by-frame offline videos (1080p / 4K @ 60 FPS CFR)
 * with robust hardware queue throttling and sample-aligned interleaved audio.
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

    // 2. Perform WebCodecs offline frame-by-frame encoding with backpressure management
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

    // Check AudioEncoder support
    let canEncodeAudio = false;
    let audioCodec = config.format === 'mp4' ? 'mp4a.40.2' : 'opus';

    if (audioBuffer && typeof AudioEncoder !== 'undefined') {
      try {
        const audioSupport = await AudioEncoder.isConfigSupported({
          codec: audioCodec,
          numberOfChannels: 2,
          sampleRate,
          bitrate: 192000,
        });
        canEncodeAudio = !!audioSupport.supported;
      } catch {
        canEncodeAudio = false;
      }
    }

    // Setup Muxer
    let mp4Muxer: Mp4Muxer<Mp4ArrayBufferTarget> | null = null;
    let webmMuxer: WebmMuxer<WebmArrayBufferTarget> | null = null;
    let videoCodecString = '';

    if (config.format === 'mp4') {
      videoCodecString = width > 1920 ? 'avc1.640034' : 'avc1.640033';
      const target = new Mp4ArrayBufferTarget();
      mp4Muxer = new Mp4Muxer({
        target,
        video: {
          codec: 'avc',
          width,
          height,
          frameRate: fps,
        },
        audio: canEncodeAudio
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
          frameRate: fps,
          alpha: isTransparent,
        },
        audio: canEncodeAudio
          ? {
              codec: 'A_OPUS',
              numberOfChannels: 2,
              sampleRate,
            }
          : undefined,
      });
    }

    // Configure VideoEncoder
    let encoderError: Error | null = null;

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        if (mp4Muxer) mp4Muxer.addVideoChunk(chunk, meta);
        else if (webmMuxer) webmMuxer.addVideoChunk(chunk, meta);
      },
      error: (e) => {
        console.error('VideoEncoder internal error:', e);
        encoderError = new Error(`Video encoder error: ${e.message}`);
      },
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

    // Configure AudioEncoder (using exact hardware transform block size: 1024 for AAC, 960 for Opus)
    const AUDIO_FRAME_SIZE = config.format === 'mp4' ? 1024 : 960;
    let audioEncoder: AudioEncoder | null = null;

    if (canEncodeAudio && audioBuffer) {
      try {
        audioEncoder = new AudioEncoder({
          output: (chunk, meta) => {
            if (mp4Muxer) mp4Muxer.addAudioChunk(chunk, meta);
            else if (webmMuxer) webmMuxer.addAudioChunk(chunk, meta);
          },
          error: (e) => console.warn('AudioEncoder warning:', e),
        });

        audioEncoder.configure({
          codec: audioCodec,
          numberOfChannels: 2,
          sampleRate,
          bitrate: 192000,
        });
      } catch (err) {
        console.warn('Failed to configure AudioEncoder, proceeding with video-only:', err);
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
    let nextAudioSample = Math.floor(startTime * sampleRate);
    const audioEndSample = Math.floor(endTime * sampleRate);

    if (audioBuffer) {
      leftChan = audioBuffer.getChannelData(0);
      rightChan = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : leftChan;
    }

    // Main frame loop
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (this.isCanceled) {
        videoEncoder.close();
        if (audioEncoder) audioEncoder.close();
        throw new Error('Export was canceled by user.');
      }
      if (encoderError) {
        throw encoderError;
      }

      const currentTime = startTime + frameIndex * dt;
      const timestampUs = frameIndex * frameIntervalUs;

      // 1. Deterministic visual render
      offlineRenderer.renderFrame(exportCtx, notes, settings, {
        currentTime,
        width,
        height,
        dt,
        isOffline: true,
      });

      // 2. Video frame encoding
      const videoFrame = new VideoFrame(exportCanvas, {
        timestamp: timestampUs,
        duration: frameIntervalUs,
      });
      const keyFrame = frameIndex % (fps * 2) === 0;
      videoEncoder.encode(videoFrame, { keyFrame });
      videoFrame.close();

      // 3. Audio chunk encoding (strictly aligned to AUDIO_FRAME_SIZE blocks)
      if (audioEncoder && leftChan && rightChan) {
        const targetSample = Math.min(
          audioEndSample,
          Math.floor((startTime + (frameIndex + 1) * dt) * sampleRate)
        );

        while (nextAudioSample + AUDIO_FRAME_SIZE <= targetSample) {
          const planarData = new Float32Array(AUDIO_FRAME_SIZE * 2);
          planarData.set(leftChan.subarray(nextAudioSample, nextAudioSample + AUDIO_FRAME_SIZE), 0);
          planarData.set(rightChan.subarray(nextAudioSample, nextAudioSample + AUDIO_FRAME_SIZE), AUDIO_FRAME_SIZE);

          const audioTimestampUs = Math.round((nextAudioSample / sampleRate) * 1_000_000);
          const audioData = new AudioData({
            format: 'f32-planar',
            sampleRate,
            numberOfFrames: AUDIO_FRAME_SIZE,
            numberOfChannels: 2,
            timestamp: audioTimestampUs,
            data: planarData,
          });

          audioEncoder.encode(audioData);
          audioData.close();

          nextAudioSample += AUDIO_FRAME_SIZE;
        }
      }

      // 4. Hardware encoder backpressure: wait until GPU queue drops to avoid crash/truncation
      while (videoEncoder.encodeQueueSize > 6) {
        await new Promise((r) => setTimeout(r, 4));
      }
      if (audioEncoder && audioEncoder.encodeQueueSize > 6) {
        await new Promise((r) => setTimeout(r, 4));
      }

      // Progress reporting
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

    // Flush any remaining audio samples to match full video length
    if (audioEncoder && leftChan && rightChan) {
      while (nextAudioSample < audioEndSample) {
        const remaining = Math.min(AUDIO_FRAME_SIZE, leftChan.length - nextAudioSample);
        const planarData = new Float32Array(AUDIO_FRAME_SIZE * 2);

        if (remaining > 0 && nextAudioSample < leftChan.length) {
          planarData.set(leftChan.subarray(nextAudioSample, nextAudioSample + remaining), 0);
          planarData.set(rightChan.subarray(nextAudioSample, nextAudioSample + remaining), AUDIO_FRAME_SIZE);
        }

        const audioTimestampUs = Math.round((nextAudioSample / sampleRate) * 1_000_000);
        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: AUDIO_FRAME_SIZE,
          numberOfChannels: 2,
          timestamp: audioTimestampUs,
          data: planarData,
        });

        audioEncoder.encode(audioData);
        audioData.close();

        nextAudioSample += AUDIO_FRAME_SIZE;
      }
    }

    // Flush encoders cleanly
    await videoEncoder.flush();
    videoEncoder.close();

    if (audioEncoder) {
      try {
        await audioEncoder.flush();
        audioEncoder.close();
      } catch (err) {
        console.warn('Audio flush error:', err);
      }
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
}

export const videoExporter = new VideoExporter();
