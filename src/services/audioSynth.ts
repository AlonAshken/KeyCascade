/**
 * KeyCascade — Polyphonic Grand Piano Synthesis & Offline Audio Engine
 * Developed by Alon Ashkenazi
 */

import { MidiNote } from '../types/visualizer';

/**
 * Frequency calculation for MIDI note number (A4 = 440Hz, pitch 69).
 */
export function midiToFreq(pitch: number): number {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}

export class AudioSynthEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private isInitialized = false;

  private activeVoices: Map<number, { stop: () => void }> = new Map();

  /**
   * Initializes the Web Audio context after user interaction.
   */
  public async init(): Promise<void> {
    if (this.isInitialized && this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    this.compressor = this.audioCtx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-18, this.audioCtx.currentTime);
    this.compressor.knee.setValueAtTime(12, this.audioCtx.currentTime);
    this.compressor.ratio.setValueAtTime(4, this.audioCtx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.audioCtx.currentTime);

    this.convolver = this.audioCtx.createConvolver();
    this.convolver.buffer = this.createReverbBuffer(this.audioCtx, 1.8, 2.0);

    const reverbGain = this.audioCtx.createGain();
    reverbGain.gain.setValueAtTime(0.22, this.audioCtx.currentTime);

    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);

    this.compressor.connect(this.convolver);
    this.convolver.connect(reverbGain);
    reverbGain.connect(this.audioCtx.destination);

    this.isInitialized = true;
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.audioCtx.currentTime, 0.05);
    }
  }

  public playNote(pitch: number, velocity: number = 0.8, duration: number = 1.0) {
    if (!this.audioCtx || !this.compressor) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const voice = this.synthesizeVoice(this.audioCtx, this.compressor, pitch, velocity, this.audioCtx.currentTime, duration);
    this.activeVoices.set(pitch, voice);
  }

  public stopNote(pitch: number) {
    const voice = this.activeVoices.get(pitch);
    if (voice) {
      voice.stop();
      this.activeVoices.delete(pitch);
    }
  }

  public stopAll() {
    this.activeVoices.forEach((voice) => voice.stop());
    this.activeVoices.clear();
  }

  private synthesizeVoice(
    ctx: BaseAudioContext,
    destination: AudioNode,
    pitch: number,
    velocity: number,
    startTime: number,
    duration: number
  ): { stop: () => void } {
    const freq = midiToFreq(pitch);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3, startTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const filterFreq = Math.min(12000, freq * 4.5 * (0.8 + 0.4 * velocity));
    filter.frequency.setValueAtTime(filterFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.5), startTime + duration);

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const gain3 = ctx.createGain();

    gain1.gain.setValueAtTime(0.7, startTime);
    gain2.gain.setValueAtTime(0.25 * velocity, startTime);
    gain3.gain.setValueAtTime(0.12 * velocity, startTime);

    const envGain = ctx.createGain();
    const peakGain = 0.65 * Math.pow(velocity, 1.4);

    envGain.gain.setValueAtTime(0.0001, startTime);
    envGain.gain.exponentialRampToValueAtTime(Math.max(0.001, peakGain), startTime + 0.006);

    const decayTime = Math.min(duration * 0.8, 2.5);
    const sustainLevel = Math.max(0.001, peakGain * 0.25);
    envGain.gain.exponentialRampToValueAtTime(sustainLevel, startTime + 0.006 + decayTime);

    const stopTime = startTime + duration + 0.08;
    envGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);

    gain1.connect(filter);
    gain2.connect(filter);
    gain3.connect(filter);

    filter.connect(envGain);
    envGain.connect(destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    osc1.stop(stopTime + 0.1);
    osc2.stop(stopTime + 0.1);
    osc3.stop(stopTime + 0.1);

    return {
      stop: () => {
        try {
          const now = ctx.currentTime;
          envGain.gain.cancelScheduledValues(now);
          envGain.gain.setValueAtTime(envGain.gain.value, now);
          envGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
          osc1.stop(now + 0.06);
          osc2.stop(now + 0.06);
          osc3.stop(now + 0.06);
        } catch {
          // voice ended
        }
      },
    };
  }

  private createReverbBuffer(ctx: BaseAudioContext, duration: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const length = Math.ceil(rate * duration);
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const n = (Math.random() * 2 - 1) * Math.pow(1 - t / duration, decay);
      left[i] = n;
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - t / duration, decay);
    }
    return impulse;
  }

  public async renderOfflineAudio(
    notes: MidiNote[],
    duration: number,
    sampleRate: number = 44100
  ): Promise<AudioBuffer> {
    const totalLength = Math.ceil((duration + 1.0) * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, totalLength, sampleRate);

    const comp = offlineCtx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-16, 0);
    comp.knee.setValueAtTime(8, 0);
    comp.ratio.setValueAtTime(3.5, 0);
    comp.attack.setValueAtTime(0.003, 0);
    comp.release.setValueAtTime(0.2, 0);

    const master = offlineCtx.createGain();
    master.gain.setValueAtTime(0.9, 0);

    comp.connect(master);
    master.connect(offlineCtx.destination);

    // Schedule lightweight dual-harmonic piano voices (instant rendering)
    for (const note of notes) {
      if (note.time >= duration) continue;
      this.synthesizeOfflineVoice(offlineCtx, comp, note.pitch, note.velocity, note.time, note.duration);
    }

    // Safety timeout: guaranteed to never hang or block export
    const renderPromise = offlineCtx.startRendering();
    const timeoutPromise = new Promise<AudioBuffer>((_, reject) =>
      setTimeout(() => reject(new Error('Offline audio render timeout')), 3500)
    );

    return await Promise.race([renderPromise, timeoutPromise]);
  }

  private synthesizeOfflineVoice(
    ctx: BaseAudioContext,
    destination: AudioNode,
    pitch: number,
    velocity: number,
    startTime: number,
    duration: number
  ) {
    const freq = midiToFreq(pitch);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    const envGain = ctx.createGain();
    const peakGain = 0.5 * Math.pow(velocity, 1.2);

    envGain.gain.setValueAtTime(0.0001, startTime);
    envGain.gain.exponentialRampToValueAtTime(Math.max(0.001, peakGain), startTime + 0.005);

    const decayTime = Math.min(duration * 0.75, 2.0);
    const sustain = Math.max(0.0001, peakGain * 0.2);
    envGain.gain.exponentialRampToValueAtTime(sustain, startTime + 0.005 + decayTime);

    const stopTime = startTime + duration + 0.05;
    envGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    osc1.connect(envGain);
    osc2.connect(envGain);
    envGain.connect(destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
  }
}

/**
 * Converts an AudioBuffer into a standard 16-bit PCM WAV Blob (universal compatibility)
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  const channelData: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export const audioSynth = new AudioSynthEngine();
