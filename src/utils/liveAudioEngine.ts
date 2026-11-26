/**
 * Sukhan AI — Pure Gemini Live Ring-Buffer AudioWorklet Engine
 *
 * Playback:
 *   Dedicated 24000 Hz AudioContext + AudioWorkletProcessor ring buffer.
 *   Base64 PCM16 little-endian chunks from Gemini Live are decoded via
 *   DataView.getInt16(i, true) / 32768.0 into Float32Array and pushed
 *   directly into the ring buffer with zero filters, zero compressors,
 *   and zero AudioBufferSourceNode scheduling artifacts.
 *   Sending { type: 'clear' } immediately empties the ring buffer on
 *   serverContent.interrupted for instant, natural barge-in.
 *
 * Capture:
 *   getUserMedia({ echoCancellation, noiseSuppression, autoGainControl })
 *   -> Dedicated AudioWorkletProcessor downsampling cleanly to 16000 Hz
 *   16-bit little-endian PCM (audio/pcm;rate=16000) streamed via WebSocket.
 */

export const INPUT_TARGET_SAMPLE_RATE = 16000;
export const OUTPUT_TARGET_SAMPLE_RATE = 24000;

/**
 * Pure, unit-testable circular Float32 ring buffer matching the
 * AudioWorklet playback ring buffer algorithm.
 */
export class PcmRingBuffer {
  private readonly buffer: Float32Array;
  private readonly capacity: number;
  private readIndex = 0;
  private writeIndex = 0;
  private count = 0;

  constructor(capacitySamples = OUTPUT_TARGET_SAMPLE_RATE * 20) {
    this.capacity = Math.max(128, capacitySamples);
    this.buffer = new Float32Array(this.capacity);
  }

  public get available(): number {
    return this.count;
  }

  public push(samples: Float32Array): void {
    const len = samples.length;
    if (len === 0) return;

    // If incoming chunk alone exceeds capacity, keep only the newest tail
    if (len >= this.capacity) {
      const start = len - this.capacity;
      this.buffer.set(samples.subarray(start), 0);
      this.readIndex = 0;
      this.writeIndex = 0;
      this.count = this.capacity;
      return;
    }

    // Advance read pointer if buffer would overflow (drop oldest samples cleanly)
    const overflow = this.count + len - this.capacity;
    if (overflow > 0) {
      this.readIndex = (this.readIndex + overflow) % this.capacity;
      this.count -= overflow;
    }

    const firstPart = Math.min(len, this.capacity - this.writeIndex);
    this.buffer.set(samples.subarray(0, firstPart), this.writeIndex);
    const remaining = len - firstPart;
    if (remaining > 0) {
      this.buffer.set(samples.subarray(firstPart), 0);
    }

    this.writeIndex = (this.writeIndex + len) % this.capacity;
    this.count += len;
  }

  public read(target: Float32Array): number {
    const toRead = Math.min(target.length, this.count);
    if (toRead > 0) {
      const firstPart = Math.min(toRead, this.capacity - this.readIndex);
      target.set(
        this.buffer.subarray(this.readIndex, this.readIndex + firstPart),
        0
      );
      const remaining = toRead - firstPart;
      if (remaining > 0) {
        target.set(this.buffer.subarray(0, remaining), firstPart);
      }
      this.readIndex = (this.readIndex + toRead) % this.capacity;
      this.count -= toRead;
    }
    if (toRead < target.length) {
      target.fill(0, toRead);
    }
    return toRead;
  }

  public clear(): void {
    this.readIndex = 0;
    this.writeIndex = 0;
    this.count = 0;
  }
}

/**
 * Decodes raw 16-bit little-endian PCM base64 audio from Gemini Live
 * using exact DataView.getInt16(i, true) / 32768.0 conversion.
 */
export function decodePcm16Base64ToFloat32(base64: string): Float32Array {
  if (!base64) return new Float32Array(0);
  let bytes: Uint8Array;
  if (typeof atob === 'function') {
    const binary = atob(base64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
  } else {
    bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  }

  const byteLen = bytes.byteLength - (bytes.byteLength % 2);
  const sampleCount = byteLen / 2;
  const float32 = new Float32Array(sampleCount);
  const view = new DataView(bytes.buffer, bytes.byteOffset, byteLen);
  for (let i = 0; i < byteLen; i += 2) {
    float32[i / 2] = view.getInt16(i, true) / 32768.0;
  }
  return float32;
}

/**
 * Encodes an ArrayBuffer of little-endian 16-bit PCM bytes into base64.
 */
export function encodePcmBytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (typeof btoa === 'function') {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode(...sub);
    }
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

/**
 * Pure Float32 -> little-endian PCM16 base64 helper (used for tests & helpers).
 */
export function float32ToPcm16Base64(float32: Float32Array): string {
  const bytes = new Uint8Array(float32.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    const int16 =
      clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
    view.setInt16(i * 2, int16, true);
  }
  return encodePcmBytesToBase64(bytes.buffer);
}

/**
 * Linear-interpolated downsampler from any hardware sample rate to 16000 Hz.
 */
export function downsampleFloat32(
  input: Float32Array,
  inputSampleRate: number,
  targetSampleRate = INPUT_TARGET_SAMPLE_RATE
): Float32Array {
  if (
    !input.length ||
    inputSampleRate <= 0 ||
    targetSampleRate <= 0 ||
    Math.abs(inputSampleRate - targetSampleRate) < 1
  ) {
    return input;
  }
  const ratio = inputSampleRate / targetSampleRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[Math.min(idx + 1, input.length - 1)] ?? s0;
    output[i] = s0 + (s1 - s0) * frac;
  }
  return output;
}

export function computeRmsLevel(samples: Float32Array): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / samples.length));
}

/**
 * Dedicated 24000 Hz AudioWorkletProcessor Ring-Buffer Player.
 * Runs directly on the audio rendering thread for zero-gap, zero-distortion,
 * Gemini-App quality native audio streaming with instant 'clear' barge-in.
 */
const PLAYBACK_RING_WORKLET_CODE = `
class SukhanRingPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 25 seconds of 24kHz mono Float32 ring buffer capacity
    this.capacity = 24000 * 25;
    this.ring = new Float32Array(this.capacity);
    this.readIndex = 0;
    this.writeIndex = 0;
    this.available = 0;
    this.isPlaying = false;
    this.isBuffering = true;
    // Small ~35ms jitter cushion on initial start prevents first-packet click
    this.startThreshold = 840;
    this.fadeOutRemaining = 0;
    this.fadeOutTotal = 96; // 4ms de-click fade on clear
    this.lastSample = 0;
    this.meterCounter = 0;
    this.meterSumSq = 0;
    this.meterSamples = 0;

    this.port.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg === 'clear' || msg.type === 'clear') {
        this.readIndex = 0;
        this.writeIndex = 0;
        this.available = 0;
        this.isBuffering = true;
        this.fadeOutRemaining = this.isPlaying ? this.fadeOutTotal : 0;
        if (this.isPlaying) {
          this.isPlaying = false;
          this.port.postMessage({ type: 'state', playing: false, rms: 0 });
        }
        return;
      }
      const samples = msg instanceof Float32Array ? msg : msg.samples;
      if (samples && samples.length > 0) {
        this.enqueue(samples);
      }
    };
  }

  enqueue(samples) {
    const len = samples.length;
    if (len >= this.capacity) {
      const start = len - this.capacity;
      this.ring.set(samples.subarray(start), 0);
      this.readIndex = 0;
      this.writeIndex = 0;
      this.available = this.capacity;
    } else {
      const overflow = this.available + len - this.capacity;
      if (overflow > 0) {
        this.readIndex = (this.readIndex + overflow) % this.capacity;
        this.available -= overflow;
      }
      const firstPart = Math.min(len, this.capacity - this.writeIndex);
      this.ring.set(samples.subarray(0, firstPart), this.writeIndex);
      const remaining = len - firstPart;
      if (remaining > 0) {
        this.ring.set(samples.subarray(firstPart), 0);
      }
      this.writeIndex = (this.writeIndex + len) % this.capacity;
      this.available += len;
    }

    if (this.isBuffering && this.available >= this.startThreshold) {
      this.isBuffering = false;
      this.fadeOutRemaining = 0;
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.port.postMessage({ type: 'state', playing: true, rms: 0.12 });
      }
    }
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;
    const channel = output[0];
    const frames = channel.length;

    if (this.fadeOutRemaining > 0) {
      for (let i = 0; i < frames; i++) {
        if (this.fadeOutRemaining > 0) {
          const gain = this.fadeOutRemaining / this.fadeOutTotal;
          channel[i] = this.lastSample * gain;
          this.fadeOutRemaining--;
        } else {
          channel[i] = 0;
        }
      }
      this.lastSample = channel[frames - 1];
      return true;
    }

    if (this.isBuffering || this.available === 0) {
      channel.fill(0);
      this.lastSample = 0;
      if (this.isPlaying && this.available === 0) {
        this.isPlaying = false;
        this.isBuffering = true;
        this.port.postMessage({ type: 'state', playing: false, rms: 0 });
      }
      return true;
    }

    const toRead = Math.min(frames, this.available);
    const firstPart = Math.min(toRead, this.capacity - this.readIndex);
    channel.set(
      this.ring.subarray(this.readIndex, this.readIndex + firstPart),
      0
    );
    const remaining = toRead - firstPart;
    if (remaining > 0) {
      channel.set(this.ring.subarray(0, remaining), firstPart);
    }
    this.readIndex = (this.readIndex + toRead) % this.capacity;
    this.available -= toRead;

    if (toRead < frames) {
      // Tiny linear ramp-down to 0 on underrun so there is never an audible click
      const edgeSample = toRead > 0 ? channel[toRead - 1] : this.lastSample;
      const tailLen = Math.min(24, frames - toRead);
      for (let i = 0; i < tailLen; i++) {
        channel[toRead + i] = edgeSample * (1 - (i + 1) / tailLen);
      }
      channel.fill(0, toRead + tailLen);
      if (this.available === 0) {
        this.isPlaying = false;
        this.isBuffering = true;
        this.port.postMessage({ type: 'state', playing: false, rms: 0 });
      }
    }

    this.lastSample = channel[frames - 1];

    // Smooth amplitude telemetry (~24Hz) for breathing orb visualizer
    for (let i = 0; i < frames; i++) {
      const s = channel[i];
      this.meterSumSq += s * s;
    }
    this.meterSamples += frames;
    this.meterCounter++;
    if (this.meterCounter >= 8) {
      const rms = Math.min(1, Math.sqrt(this.meterSumSq / Math.max(1, this.meterSamples)) * 2.4);
      this.port.postMessage({ type: 'level', rms, playing: this.isPlaying });
      this.meterCounter = 0;
      this.meterSumSq = 0;
      this.meterSamples = 0;
    }

    return true;
  }
}

registerProcessor('sukhan-ring-player', SukhanRingPlayerProcessor);
`;

/**
 * Dedicated 16000 Hz Microphone Capture AudioWorkletProcessor.
 * Downsamples cleanly from the hardware sample rate (48kHz / 44.1kHz / 16kHz)
 * directly on the audio thread into little-endian 16-bit PCM frames.
 */
const MIC_CAPTURE_WORKLET_CODE = `
class SukhanMicCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 16000;
    this.ratio = sampleRate / this.targetRate;
    this.phase = 0;
    this.prevSample = 0;
    // 640 samples @ 16kHz = 40ms ultra-low-latency streaming packets
    this.chunkSize = 640;
    this.outPcm = new Int16Array(this.chunkSize);
    this.outOffset = 0;
    this.rmsAccum = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const ch = input[0];
    const len = ch.length;

    if (Math.abs(this.ratio - 1) < 0.001) {
      for (let i = 0; i < len; i++) {
        this.pushSample(ch[i]);
      }
    } else {
      // Continuous-phase linear interpolation downsampler to exact 16kHz
      while (this.phase < len) {
        const idx = Math.floor(this.phase);
        const frac = this.phase - idx;
        const s0 = idx === 0 ? this.prevSample : ch[idx - 1];
        const s1 = ch[idx];
        const interpolated = s0 + (s1 - s0) * frac;
        this.pushSample(interpolated);
        this.phase += this.ratio;
      }
      this.phase -= len;
      this.prevSample = ch[len - 1];
    }

    return true;
  }

  pushSample(sample) {
    const clamped = sample < -1 ? -1 : sample > 1 ? 1 : sample;
    this.rmsAccum += clamped * clamped;
    this.outPcm[this.outOffset++] =
      clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);

    if (this.outOffset >= this.chunkSize) {
      const rms = Math.min(1, Math.sqrt(this.rmsAccum / this.chunkSize) * 3.0);
      const payload = this.outPcm;
      this.outPcm = new Int16Array(this.chunkSize);
      this.outOffset = 0;
      this.rmsAccum = 0;
      this.port.postMessage(
        { pcmBuffer: payload.buffer, rms },
        [payload.buffer]
      );
    }
  }
}

registerProcessor('sukhan-mic-capture', SukhanMicCaptureProcessor);
`;

export interface LiveAudioEngineCallbacks {
  onMicPcmChunk: (base64Pcm16k: string, rms: number) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
}

export class LiveAudioEngine {
  private inputCtx: AudioContext | null = null;
  private outputCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micWorkletNode: AudioWorkletNode | null = null;
  private playerWorkletNode: AudioWorkletNode | null = null;
  private micBlobUrl: string | null = null;
  private playerBlobUrl: string | null = null;

  private pendingPlaybackChunks: Float32Array[] = [];
  private outputInitPromise: Promise<void> | null = null;
  private isMuted = false;
  private isPlaying = false;
  private inputLevel = 0;
  private outputLevel = 0;
  private destroyed = false;
  private callbacks: LiveAudioEngineCallbacks;

  constructor(callbacks: LiveAudioEngineCallbacks) {
    this.callbacks = callbacks;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.inputLevel = 0;
    }
    if (this.mediaStream) {
      for (const track of this.mediaStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getLevels(): { input: number; output: number } {
    return {
      input: this.isMuted ? 0 : this.inputLevel,
      output: this.outputLevel,
    };
  }

  /**
   * Initializes the dedicated 24000 Hz AudioContext and ring-buffer
   * AudioWorkletNode with zero intermediate filters or compressors.
   */
  public async initPlayback(): Promise<void> {
    if (this.destroyed) return;
    if (this.playerWorkletNode && this.outputCtx) {
      if (this.outputCtx.state === 'suspended') {
        await this.outputCtx.resume();
      }
      return;
    }
    if (this.outputInitPromise) {
      await this.outputInitPromise;
      return;
    }

    this.outputInitPromise = (async () => {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      const ctx = new AudioCtx({ sampleRate: OUTPUT_TARGET_SAMPLE_RATE });
      this.outputCtx = ctx;
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          // Will resume on next user interaction if autoplay restricted
        }
      }

      if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined') {
        throw new Error(
          'AudioWorklet is required for studio-grade 24kHz Gemini Live playback.'
        );
      }

      const blob = new Blob([PLAYBACK_RING_WORKLET_CODE], {
        type: 'application/javascript',
      });
      this.playerBlobUrl = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(this.playerBlobUrl);

      if (this.destroyed) return;

      const player = new AudioWorkletNode(ctx, 'sukhan-ring-player', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });

      player.port.onmessage = (
        event: MessageEvent<{ type?: string; playing?: boolean; rms?: number }>
      ) => {
        const data = event.data;
        if (!data) return;
        if (typeof data.rms === 'number') {
          this.outputLevel = data.rms;
        }
        if (typeof data.playing === 'boolean' && data.playing !== this.isPlaying) {
          this.isPlaying = data.playing;
          if (!data.playing) {
            this.outputLevel = 0;
          }
          this.callbacks.onPlaybackStateChange?.(data.playing);
        }
      };

      // Connect ring-buffer AudioWorklet directly to destination (zero distortion)
      player.connect(ctx.destination);
      this.playerWorkletNode = player;

      // Flush any chunks that arrived while worklet module was loading
      if (this.pendingPlaybackChunks.length > 0) {
        const queued = this.pendingPlaybackChunks;
        this.pendingPlaybackChunks = [];
        for (const chunk of queued) {
          player.port.postMessage({ type: 'push', samples: chunk }, [
            chunk.buffer,
          ]);
        }
      }
    })();

    try {
      await this.outputInitPromise;
    } finally {
      this.outputInitPromise = null;
    }
  }

  /**
   * Starts 16kHz mono PCM microphone capture via dedicated AudioWorkletNode.
   */
  public async startCapture(): Promise<void> {
    await this.initPlayback();
    if (this.destroyed) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone capture is not supported in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });

    if (this.destroyed) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }
    this.mediaStream = stream;
    this.setMuted(this.isMuted);

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    const inputCtx = new AudioCtx({ sampleRate: INPUT_TARGET_SAMPLE_RATE });
    this.inputCtx = inputCtx;
    if (inputCtx.state === 'suspended') {
      await inputCtx.resume();
    }

    if (!inputCtx.audioWorklet || typeof AudioWorkletNode === 'undefined') {
      throw new Error(
        'AudioWorklet is required for clean 16kHz microphone capture.'
      );
    }

    const blob = new Blob([MIC_CAPTURE_WORKLET_CODE], {
      type: 'application/javascript',
    });
    this.micBlobUrl = URL.createObjectURL(blob);
    await inputCtx.audioWorklet.addModule(this.micBlobUrl);

    if (this.destroyed) return;

    const source = inputCtx.createMediaStreamSource(stream);
    const micNode = new AudioWorkletNode(inputCtx, 'sukhan-mic-capture', {
      numberOfInputs: 1,
      numberOfOutputs: 0,
    });

    micNode.port.onmessage = (
      event: MessageEvent<{ pcmBuffer?: ArrayBuffer; rms?: number }>
    ) => {
      if (this.destroyed || this.isMuted) {
        this.inputLevel = 0;
        return;
      }
      const { pcmBuffer, rms = 0 } = event.data || {};
      this.inputLevel = rms;
      if (pcmBuffer) {
        const base64 = encodePcmBytesToBase64(pcmBuffer);
        this.callbacks.onMicPcmChunk(base64, rms);
      }
    };

    source.connect(micNode);
    this.micSource = source;
    this.micWorkletNode = micNode;
  }

  /**
   * Decodes incoming 24kHz little-endian PCM16 base64 chunk from Gemini Live
   * and transfers samples directly into the 24kHz AudioWorklet ring buffer.
   */
  public enqueuePcm24kBase64(base64Audio: string): void {
    if (this.destroyed || !base64Audio) return;
    const samples = decodePcm16Base64ToFloat32(base64Audio);
    if (!samples.length) return;

    if (this.outputCtx && this.outputCtx.state === 'suspended') {
      void this.outputCtx.resume();
    }

    if (this.playerWorkletNode) {
      this.playerWorkletNode.port.postMessage(
        { type: 'push', samples },
        [samples.buffer]
      );
    } else {
      this.pendingPlaybackChunks.push(samples);
      void this.initPlayback();
    }
  }

  /**
   * Sends 'clear' straight to the 24kHz AudioWorklet ring buffer to
   * immediately flush queued audio on serverContent.interrupted.
   */
  public clearPlayback(): void {
    this.pendingPlaybackChunks = [];
    this.outputLevel = 0;
    if (this.playerWorkletNode) {
      this.playerWorkletNode.port.postMessage('clear');
    }
    if (this.isPlaying) {
      this.isPlaying = false;
      this.callbacks.onPlaybackStateChange?.(false);
    }
  }

  public async destroy(): Promise<void> {
    this.destroyed = true;
    this.clearPlayback();

    if (this.micWorkletNode) {
      try {
        this.micWorkletNode.port.onmessage = null;
        this.micWorkletNode.disconnect();
      } catch {
        // Ignore
      }
      this.micWorkletNode = null;
    }

    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {
        // Ignore
      }
      this.micSource = null;
    }

    if (this.playerWorkletNode) {
      try {
        this.playerWorkletNode.port.onmessage = null;
        this.playerWorkletNode.disconnect();
      } catch {
        // Ignore
      }
      this.playerWorkletNode = null;
    }

    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }

    if (this.micBlobUrl) {
      URL.revokeObjectURL(this.micBlobUrl);
      this.micBlobUrl = null;
    }

    if (this.playerBlobUrl) {
      URL.revokeObjectURL(this.playerBlobUrl);
      this.playerBlobUrl = null;
    }

    if (this.inputCtx) {
      try {
        await this.inputCtx.close();
      } catch {
        // Ignore
      }
      this.inputCtx = null;
    }

    if (this.outputCtx) {
      try {
        await this.outputCtx.close();
      } catch {
        // Ignore
      }
      this.outputCtx = null;
    }

    this.inputLevel = 0;
    this.outputLevel = 0;
  }
}
