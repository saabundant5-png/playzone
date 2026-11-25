class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playTone(
    freq: number,
    durationSec = 0.08,
    type: OscillatorType = 'sine',
    volume = 0.08
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationSec);
    } catch {
      // Ignore audio failures when autoplay is blocked
    }
  }

  public playClick(): void {
    this.playTone(540, 0.045, 'triangle', 0.05);
  }

  public playScore(): void {
    this.playTone(660, 0.07, 'sine', 0.07);
    setTimeout(() => this.playTone(880, 0.09, 'sine', 0.07), 55);
  }

  public playHit(): void {
    this.playTone(170, 0.14, 'sawtooth', 0.07);
  }

  public playWin(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.14, 'triangle', 0.08), idx * 80);
    });
  }
}

export const soundFX = new SoundEngine();
