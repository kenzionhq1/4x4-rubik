/**
 * soundEffects.ts
 * Procedural Audio Synthesizer & Speech Voice Announcer for 4x4 Rubik's Cube Solver.
 * Uses Web Audio API for zero-latency, realistic mechanical clicks, solve chimes, and camera snaps.
 * Uses Web Speech Synthesis API for human move reading.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private speechEnabled: boolean = true;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public setSpeechEnabled(enabled: boolean) {
    this.speechEnabled = enabled;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsSpeechEnabled(): boolean {
    return this.speechEnabled;
  }

  /**
   * Mechanical Cube Slice Click (crisp tactile turn)
   */
  public playSliceTurn(direction: 'cw' | 'ccw' | 'wide' = 'cw') {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(direction === 'wide' ? 1400 : 2200, now);
    filter.Q.setValueAtTime(3.0, now);

    osc.type = 'triangle';
    const freq = direction === 'wide' ? 180 : 320;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * Camera Shutter Snap
   */
  public playCameraSnap() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Noise burst for shutter mechanical sound
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
  }

  /**
   * Solve Celebration Fanfare Arpeggio
   */
  public playSolveFanfare() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const now = ctx.currentTime + index * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    });
  }

  /**
   * AI Analysis Complete Chime
   */
  public playAiCompleteChime() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  /**
   * Speech Synthesis: Voice announcement for the current move notation
   */
  public speakMove(move: string) {
    if (this.isMuted || !this.speechEnabled || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // cancel previous unfinished speech

      let spoken = move;
      // Convert notation to friendly natural speech
      if (move === "U'") spoken = 'Up Prime';
      else if (move === 'U2') spoken = 'Up 2';
      else if (move === 'U') spoken = 'Up';
      else if (move === "D'") spoken = 'Down Prime';
      else if (move === 'D2') spoken = 'Down 2';
      else if (move === 'D') spoken = 'Down';
      else if (move === "R'") spoken = 'Right Prime';
      else if (move === 'R2') spoken = 'Right 2';
      else if (move === 'R') spoken = 'Right';
      else if (move === "L'") spoken = 'Left Prime';
      else if (move === 'L2') spoken = 'Left 2';
      else if (move === 'L') spoken = 'Left';
      else if (move === "F'") spoken = 'Front Prime';
      else if (move === 'F2') spoken = 'Front 2';
      else if (move === 'F') spoken = 'Front';
      else if (move === "B'") spoken = 'Back Prime';
      else if (move === 'B2') spoken = 'Back 2';
      else if (move === 'B') spoken = 'Back';
      else if (move === 'Rw') spoken = 'Wide Right';
      else if (move === "Rw'") spoken = 'Wide Right Prime';
      else if (move === 'Rw2') spoken = 'Wide Right 2';
      else if (move === 'Uw') spoken = 'Wide Up';
      else if (move === "Uw'") spoken = 'Wide Up Prime';
      else if (move === 'Uw2') spoken = 'Wide Up 2';
      else if (move === 'Lw') spoken = 'Wide Left';
      else if (move === "Lw'") spoken = 'Wide Left Prime';
      else if (move === 'Fw') spoken = 'Wide Front';
      else if (move === "Fw'") spoken = 'Wide Front Prime';
      else if (move === 'r') spoken = 'Inner Right Slice';
      else if (move === "r'") spoken = 'Inner Right Slice Prime';
      else if (move === 'r2') spoken = 'Inner Right 2';

      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.rate = 1.25;
      utterance.pitch = 1.05;
      utterance.volume = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis error ignored
    }
  }
}

export const soundFx = new SoundEngine();
