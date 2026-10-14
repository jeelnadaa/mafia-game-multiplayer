// Web Audio API procedural sound engine & AudioManager (0 external audio files required)

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private currentAmbienceOsc: OscillatorNode | null = null;
  private isDucked: boolean = false;

  private masterVol: number = 0.8;
  private sfxVol: number = 0.8;
  private ambienceVol: number = 0.4;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedMute = localStorage.getItem('mafia-sound-muted');
        if (savedMute !== null) this.isMuted = savedMute === 'true';

        const savedMaster = localStorage.getItem('mafia-master-vol');
        if (savedMaster !== null) this.masterVol = Math.max(0, Math.min(1, parseFloat(savedMaster)));

        const savedSfx = localStorage.getItem('mafia-sfx-vol');
        if (savedSfx !== null) this.sfxVol = Math.max(0, Math.min(1, parseFloat(savedSfx)));

        const savedAmb = localStorage.getItem('mafia-ambience-vol');
        if (savedAmb !== null) this.ambienceVol = Math.max(0, Math.min(1, parseFloat(savedAmb)));
      } catch (_) {}

      // Mute audio when tab is hidden to respect user background audio
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.ctx && this.ctx.state === 'running') {
            this.ctx.suspend().catch(() => {});
          }
        } else {
          if (this.ctx && this.ctx.state === 'suspended' && !this.isMuted) {
            this.ctx.resume().catch(() => {});
          }
        }
      });
    }
  }

  private initCtx(): boolean {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return false;
      this.ctx = new AudioCtxClass();

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVol, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Ambience bus
      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.setValueAtTime(this.ambienceVol, this.ctx.currentTime);
      this.ambienceGain.connect(this.masterGain);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mafia-sound-muted', String(this.isMuted));
      } catch (_) {}
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVol, this.ctx.currentTime);
    }
    return !this.isMuted;
  }

  public setMasterVolume(v: number) {
    this.masterVol = Math.max(0, Math.min(1, v));
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('mafia-master-vol', String(this.masterVol)); } catch (_) {}
    }
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
    }
  }

  public setSfxVolume(v: number) {
    this.sfxVol = Math.max(0, Math.min(1, v));
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('mafia-sfx-vol', String(this.sfxVol)); } catch (_) {}
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
    }
  }

  public setAmbienceVolume(v: number) {
    this.ambienceVol = Math.max(0, Math.min(1, v));
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('mafia-ambience-vol', String(this.ambienceVol)); } catch (_) {}
    }
    if (this.ambienceGain && this.ctx) {
      const effective = this.isDucked ? this.ambienceVol * 0.2 : this.ambienceVol;
      this.ambienceGain.gain.setValueAtTime(effective, this.ctx.currentTime);
    }
  }

  /** Duck audio when someone speaks in voice chat */
  public setVoiceDucking(speaking: boolean) {
    this.isDucked = speaking;
    if (this.ambienceGain && this.ctx) {
      const effective = speaking ? this.ambienceVol * 0.2 : this.ambienceVol;
      this.ambienceGain.gain.setTargetAtTime(effective, this.ctx.currentTime, 0.1);
    }
  }

  // Phase Ambient Drone
  public setPhaseAmbience(phase: 'lobby' | 'night' | 'day' | 'voting' | 'gameover') {
    if (!this.initCtx() || !this.ctx || !this.ambienceGain || this.isMuted) return;

    if (this.currentAmbienceOsc) {
      try {
        this.currentAmbienceOsc.stop();
        this.currentAmbienceOsc.disconnect();
      } catch (_) {}
      this.currentAmbienceOsc = null;
    }

    if (phase === 'night') {
      // Low sinister rumble at 55 Hz
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, this.ctx.currentTime);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, this.ctx.currentTime);
      osc.connect(filter);
      filter.connect(this.ambienceGain);

      osc.start();
      this.currentAmbienceOsc = osc;
    } else if (phase === 'voting') {
      // Tension pulse at 82.4 Hz
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(82.4, this.ctx.currentTime);
      osc.connect(this.ambienceGain);
      osc.start();
      this.currentAmbienceOsc = osc;
    }
  }

  // Sound Effects (All zero-file procedural synthesis)
  public playNightBell() {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 1.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 1.2);
  }

  public playDayChime() {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.8);
    });
  }

  public playVoteStampThud() {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playPaperWhoosh() {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.Q.setValueAtTime(2, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(this.ctx.currentTime);
  }

  public playEliminationKnell() {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(130.81, now); // C3 deep gong
    osc.frequency.exponentialRampToValueAtTime(65.4, now + 2.0);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 2.0);
  }

  public playYourTurnChime() {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [659.25, 880].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.18, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.4);
    });
  }

  public playUiTick() {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playGavelStrike() {
    this.playVoteStampThud();
  }

  public playGunshot() {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.sfxGain) return;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(this.ctx.currentTime);
  }

  public playCountdownTick() {
    this.playUiTick();
  }

  public playFanfare(winner: 'town' | 'mafia' | 'jester') {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes =
      winner === 'town'
        ? [523.25, 659.25, 783.99, 1046.5]
        : winner === 'mafia'
        ? [440, 415.3, 392, 349.23]
        : [587.33, 739.99, 880, 1174.66];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = winner === 'mafia' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0.2, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.6);
    });
  }
}

export const audioManager = new AudioManager();

// Backwards-compatible standalone exports for existing codebase call-sites
export const initSound = () => !audioManager.getIsMuted();
export const toggleMute = () => audioManager.toggleMute();
export const getIsMuted = () => audioManager.getIsMuted();
export const playNightBell = () => audioManager.playNightBell();
export const playDayChime = () => audioManager.playDayChime();
export const playGavelStrike = () => audioManager.playGavelStrike();
export const playGunshot = () => audioManager.playGunshot();
export const playCountdownTick = () => audioManager.playCountdownTick();
export const playFanfare = (w: 'town' | 'mafia' | 'jester') => audioManager.playFanfare(w);
export const playVoteStampThud = () => audioManager.playVoteStampThud();
export const playPaperWhoosh = () => audioManager.playPaperWhoosh();
export const playEliminationKnell = () => audioManager.playEliminationKnell();
export const playYourTurnChime = () => audioManager.playYourTurnChime();
export const playUiTick = () => audioManager.playUiTick();
export const setVoiceDucking = (speaking: boolean) => audioManager.setVoiceDucking(speaking);
export const setPhaseAmbience = (p: any) => audioManager.setPhaseAmbience(p);
