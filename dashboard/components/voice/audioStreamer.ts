/**
 * Web Audio Streaming Pipeline for Gemini Live API.
 * - Captures audio from user microphone, cleanly downsamples to 16kHz 16-bit linear PCM.
 * - Plays 24kHz 16-bit linear PCM received from Gemini Live API with streaming queue.
 * - Supports instant barge-in interruption.
 */

function downsampleTo16kHz(inputData: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === 16000) {
    const pcm16 = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(inputData.length / ratio);
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetInput = 0;

  while (offsetResult < result.length) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetInput; i < nextOffsetInput && i < inputData.length; i++) {
      accum += inputData[i];
      count++;
    }
    const sample = count > 0 ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    offsetResult++;
    offsetInput = nextOffsetInput;
  }

  return result;
}

export class AudioStreamer {
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isRecording = false;

  public onVolumeChange?: (volume: number) => void;

  /**
   * Starts microphone recording and streams 16kHz linear PCM base64 chunks.
   */
  async startRecording(onAudioChunk: (base64Pcm: string) => void): Promise<void> {
    if (this.isRecording) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioContext = new AudioContextClass();
    if (this.inputAudioContext.state === "suspended") {
      await this.inputAudioContext.resume();
    }

    const actualSampleRate = this.inputAudioContext.sampleRate;
    this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.mediaStream);

    // 4096 buffer size gives ~85ms chunks at 48kHz, ~92ms at 44.1kHz, ~256ms at 16kHz
    this.processorNode = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);

      // Calculate volume for UI visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeChange?.(Math.min(1, rms * 5));

      // Downsample to clean 16kHz 16-bit linear PCM
      const pcm16 = downsampleTo16kHz(inputData, actualSampleRate);

      // Convert buffer to base64
      let binary = "";
      const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Chunk = btoa(binary);
      onAudioChunk(base64Chunk);
    };

    this.sourceNode.connect(this.processorNode);
    // Silent gain node to prevent audio feedback loop
    const silentGain = this.inputAudioContext.createGain();
    silentGain.gain.value = 0;
    this.processorNode.connect(silentGain);
    silentGain.connect(this.inputAudioContext.destination);

    this.isRecording = true;
  }

  /**
   * Initializes or returns output audio context at 24kHz for playback.
   */
  private getOutputContext(): AudioContext {
    if (!this.outputAudioContext || this.outputAudioContext.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioContext = new AudioContextClass({ sampleRate: 24000 });
    }
    if (this.outputAudioContext.state === "suspended") {
      this.outputAudioContext.resume().catch(() => {});
    }
    return this.outputAudioContext;
  }

  /**
   * Plays a 24kHz linear PCM base64 audio chunk from Gemini Live.
   */
  playAudioChunk(base64Pcm: string): void {
    try {
      const ctx = this.getOutputContext();
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const sampleCount = Math.floor(len / 2);
      if (sampleCount === 0) return;

      const bytes = new Uint8Array(sampleCount * 2);
      for (let i = 0; i < sampleCount * 2; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const dataView = new DataView(bytes.buffer);
      const float32Array = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        const int16 = dataView.getInt16(i * 2, true); // true = little-endian
        float32Array[i] = int16 / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, sampleCount, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }

      source.start(this.nextPlayTime);
      this.activeSources.push(source);

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
      };

      this.nextPlayTime += audioBuffer.duration;
    } catch (err) {
      console.warn("Audio playback chunk decode error:", err);
    }
  }

  /**
   * Immediately stops all currently playing and queued audio (Barge-in / Interruption).
   */
  stopPlayback(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.activeSources = [];
    if (this.outputAudioContext) {
      this.nextPlayTime = this.outputAudioContext.currentTime;
    }
  }

  /**
   * Stops recording and releases microphone and all audio resources.
   */
  stop(): void {
    this.isRecording = false;
    this.stopPlayback();

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.inputAudioContext && this.inputAudioContext.state !== "closed") {
      this.inputAudioContext.close().catch(() => {});
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext && this.outputAudioContext.state !== "closed") {
      this.outputAudioContext.close().catch(() => {});
      this.outputAudioContext = null;
    }
  }
}
