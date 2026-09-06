/**
 * Web Audio Streaming Pipeline for Gemini Live API.
 * - Captures 16kHz 16-bit linear PCM from user microphone.
 * - Plays 24kHz 16-bit linear PCM received from Gemini Live API.
 * - Supports instant barge-in interruption.
 */

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
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
    if (this.inputAudioContext.state === "suspended") {
      await this.inputAudioContext.resume();
    }

    this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    // Buffer size 2048 gives ~128ms chunks at 16kHz
    this.processorNode = this.inputAudioContext.createScriptProcessor(2048, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const inputData = e.inputBuffer.getChannelData(0);

      // Calculate volume for UI visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeChange?.(Math.min(1, rms * 4));

      // Convert Float32Array to 16-bit PCM (Little Endian)
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Convert buffer to base64
      let binary = "";
      const bytes = new Uint8Array(pcm16.buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Chunk = btoa(binary);
      onAudioChunk(base64Chunk);
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.inputAudioContext.destination);
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
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = ctx.createBufferNode ? (ctx as any).createBufferNode() : ctx.createBufferSource();
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
