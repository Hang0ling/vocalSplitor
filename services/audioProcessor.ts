import { StemType } from '../types';

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private masterGain: GainNode | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;

  // Track specific nodes (Gain + Filter chains)
  private trackNodes: Map<StemType, { gain: GainNode; filters: BiquadFilterNode[] }> = new Map();

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();
  }

  async loadAudio(file: File): Promise<number> {
    if (!this.audioContext) return 0;
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.setupGraph();
    return this.audioBuffer.duration;
  }

  private setupGraph() {
    if (!this.audioContext || !this.audioBuffer) return;

    // Create Master Gain
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);

    // Initialize Simulation Filters for each stem
    // Note: Real separation requires Server-side AI. This uses EQ to simulate the effect for the UI demo.
    this.createStemNodes(StemType.VOCALS, 'bandpass', 1000, 1.5); // Focus on mids
    this.createStemNodes(StemType.DRUMS, 'highpass', 150, 0, 'peaking', 3000, 5); // Transients
    this.createStemNodes(StemType.BASS, 'lowpass', 150, 10); // Lows
    this.createStemNodes(StemType.PIANO, 'peaking', 1200, 3, 'bandpass', 1200, 1);
    this.createStemNodes(StemType.OTHER, 'notch', 1000, 2); // Mid-scoop
    
    // Master is just a direct pass-through, we handle volume in UI
  }

  private createStemNodes(type: StemType, filterType: BiquadFilterType, freq: number, Q: number, filterType2?: BiquadFilterType, freq2?: number, gain2?: number) {
    if (!this.audioContext || !this.masterGain) return;

    const gainNode = this.audioContext.createGain();
    const filters: BiquadFilterNode[] = [];

    // Filter 1
    const f1 = this.audioContext.createBiquadFilter();
    f1.type = filterType;
    f1.frequency.value = freq;
    f1.Q.value = Q;
    filters.push(f1);

    // Optional Filter 2 for better simulation
    if (filterType2 && freq2) {
      const f2 = this.audioContext.createBiquadFilter();
      f2.type = filterType2;
      f2.frequency.value = freq2;
      if (gain2) f2.gain.value = gain2;
      filters.push(f2);
      f1.connect(f2);
      f2.connect(gainNode);
    } else {
      f1.connect(gainNode);
    }

    gainNode.connect(this.masterGain);
    this.trackNodes.set(type, { gain: gainNode, filters });
  }

  play() {
    if (this.isPlaying || !this.audioContext || !this.audioBuffer) return;

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;

    // Connect Source to All Stem Inputs
    // Original (Master track in UI) usually bypasses filters, but here we treat 'Master' as the dry signal
    // For the stems, we connect the source to their filter chains
    
    // 1. Connect to Master Dry (Simulates the "Original" track)
    // We actually don't need a node for ORIGINAL if we assume the stems sum up, 
    // but in this simulation, we mix the filtered versions. 
    // To make it sound good: The 'Original' track in UI controls a dry signal.
    const dryGain = this.audioContext.createGain();
    this.trackNodes.set(StemType.ORIGINAL, { gain: dryGain, filters: [] });
    this.sourceNode.connect(dryGain);
    dryGain.connect(this.masterGain!);

    // 2. Connect to Filter Chains
    this.trackNodes.forEach((nodes, type) => {
      if (type !== StemType.ORIGINAL && this.sourceNode) {
        if (nodes.filters.length > 0) {
          this.sourceNode.connect(nodes.filters[0]);
        }
      }
    });

    this.sourceNode.start(0, this.pauseTime);
    this.startTime = this.audioContext.currentTime - this.pauseTime;
    this.isPlaying = true;
  }

  pause() {
    if (!this.isPlaying || !this.sourceNode || !this.audioContext) return;
    this.sourceNode.stop();
    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.isPlaying = false;
    this.sourceNode = null;
  }

  stop() {
    this.pause();
    this.pauseTime = 0;
  }

  seek(time: number) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.pause();
    this.pauseTime = time;
    if (wasPlaying) this.play();
  }

  getCurrentTime(): number {
    if (!this.isPlaying || !this.audioContext) return this.pauseTime;
    return this.audioContext.currentTime - this.startTime;
  }

  setTrackVolume(type: StemType, volume: number) {
    const track = this.trackNodes.get(type);
    if (track) {
      track.gain.gain.setTargetAtTime(volume, this.audioContext!.currentTime, 0.05);
    }
  }

  getAnalyzer(): AnalyserNode | null {
    if (!this.audioContext || !this.masterGain) return null;
    const analyzer = this.audioContext.createAnalyser();
    analyzer.fftSize = 256;
    this.masterGain.connect(analyzer);
    return analyzer;
  }

  /**
   * Export logic using OfflineAudioContext. 
   * This renders the specific track (with its simulation filters) to a WAV file.
   */
  async exportTrack(type: StemType): Promise<Blob | null> {
    if (!this.audioBuffer) return null;

    // Create Offline Context
    const OfflineContext = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineContext(
      this.audioBuffer.numberOfChannels,
      this.audioBuffer.length,
      this.audioBuffer.sampleRate
    );

    const offlineSource = offlineCtx.createBufferSource();
    offlineSource.buffer = this.audioBuffer;

    // Recreate the specific filter chain for this track in the offline context
    let lastNode: AudioNode = offlineSource;

    if (type !== StemType.ORIGINAL) {
      // Re-apply simulation logic
      // This duplicates logic from setupGraph but in offline context
      // Simplified simulation for export
      if (type === StemType.BASS) {
        const f = offlineCtx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 150;
        lastNode.connect(f);
        lastNode = f;
      } else if (type === StemType.VOCALS) {
        const f = offlineCtx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 1000;
        lastNode.connect(f);
        lastNode = f;
      } else if (type === StemType.DRUMS) {
        const f = offlineCtx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 150;
        lastNode.connect(f);
        lastNode = f;
      }
      // Add other cases as needed for high fidelity simulation
    }

    lastNode.connect(offlineCtx.destination);
    offlineSource.start();

    const renderedBuffer = await offlineCtx.startRendering();
    return this.bufferToWave(renderedBuffer, renderedBuffer.length);
  }

  // Helper to convert AudioBuffer to WAV Blob
  private bufferToWave(abuffer: AudioBuffer, len: number) {
    let numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit (hardcoded in this example)

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    // write interleaved data
    for(i = 0; i < abuffer.numberOfChannels; i++)
      channels.push(abuffer.getChannelData(i));

    while(pos < len) {
      for(i = 0; i < numOfChan; i++) {             // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
        view.setInt16(44 + offset, sample, true);          // write 16-bit sample
        offset += 2;
      }
      pos++;
    }

    return new Blob([buffer], {type: "audio/wav"});

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  }
}
