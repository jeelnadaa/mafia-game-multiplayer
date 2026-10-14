// WebRTC Mesh Voice Engine with Phase-Gated Track Control & Audio RMS Analyser

export interface VoicePeerState {
  peerId: string;
  stream: MediaStream;
  audioEl: HTMLAudioElement;
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  isSpeaking: boolean;
  speakingLevel: number; // 0..1
  volume: number; // 0..1
  isMuted: boolean;
}

export type VoiceGlowTier = 'none' | 'light' | 'medium' | 'hard';

export interface VoiceGlowStyle {
  tier: VoiceGlowTier;
  borderColor: string;
  boxShadow: string;
  borderWidth: string;
  textColor: string;
  dotColor: string;
  bgTint: string;
  label: string;
}

/**
 * Calculates responsive green glow styling based on measured voice level and sensitivity gate.
 * - Silent / No Voice: No green (subtle neutral border, no glow)
 * - Low Voice: Light green (#86EFAC soft mint, subtle 6px glow)
 * - Normal Voice: Medium green (#2ED573 emerald, vibrant 12px glow)
 * - Loud / Strong Voice: Hard neon green (#00FF66 electric, intense 24px neon aura)
 */
export function getVoiceGlowStyle(level: number = 0, isSpeaking: boolean = false): VoiceGlowStyle {
  if (!isSpeaking || level <= 0) {
    return {
      tier: 'none',
      borderColor: 'rgba(255, 255, 255, 0.15)',
      boxShadow: 'none',
      borderWidth: '1px',
      textColor: '#ECE6D8',
      dotColor: '#A39D90',
      bgTint: 'bg-[#171A20]/40 border-transparent',
      label: 'Silent',
    };
  }

  // Low voice / quiet speech (just past sensitivity threshold) -> Light Green
  if (level <= 0.38) {
    return {
      tier: 'light',
      borderColor: '#86EFAC',
      boxShadow: '0 0 6px rgba(134, 239, 172, 0.45)',
      borderWidth: '1.5px',
      textColor: '#86EFAC',
      dotColor: '#86EFAC',
      bgTint: 'bg-[#0B1A13]/90 border border-[#86EFAC]/40 shadow-[0_0_8px_rgba(134,239,172,0.25)]',
      label: 'Speaking (Low)',
    };
  }

  // Normal conversational speech -> Medium Green
  if (level <= 0.72) {
    return {
      tier: 'medium',
      borderColor: '#2ED573',
      boxShadow: '0 0 10px #2ED573, 0 0 18px rgba(46, 213, 115, 0.6)',
      borderWidth: '2px',
      textColor: '#2ED573',
      dotColor: '#2ED573',
      bgTint: 'bg-[#0A1A12]/95 border border-[#2ED573]/60 shadow-[0_0_12px_rgba(46,213,115,0.35)]',
      label: 'Speaking',
    };
  }

  // More voice / loud speech -> Hard Neon Green
  return {
    tier: 'hard',
    borderColor: '#00FF66',
    boxShadow: '0 0 14px #00FF66, 0 0 28px rgba(0, 255, 102, 0.85)',
    borderWidth: '2.5px',
    textColor: '#00FF66',
    dotColor: '#00FF66',
    bgTint: 'bg-[#051F10] border border-[#00FF66] shadow-[0_0_16px_rgba(0,255,102,0.55)]',
    label: 'Speaking (Loud)',
  };
}

export type VoiceStateListener = (
  speakingMap: Record<string, boolean>,
  levelsMap?: Record<string, number>
) => void;

class VoiceEngine {
  private localStream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;
  private localAudioCtx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private localDataArray: Uint8Array | null = null;
  private peers: Map<string, VoicePeerState> = new Map();

  private isEnabled: boolean = false;
  private isSelfMuted: boolean = false;
  private isNightMuted: boolean = false;
  private isDeadMuted: boolean = false;
  private isPushToTalk: boolean = false;
  private isPttActive: boolean = false;

  private pollInterval: any = null;
  private listeners: Set<VoiceStateListener> = new Set();
  private maxPlayersCap: number = 20;
  private sensitivityLevel: number = 4;
  private thresholdValue: number = 12;
  private currentRoomCode: string | null = null;
  private cachedSpeakingMap: Record<string, boolean> = {};
  private cachedLevelsMap: Record<string, number> = {};

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('mafia_voice_self_muted');
      if (savedMute !== null) this.isSelfMuted = savedMute === 'true';
      const savedSens = localStorage.getItem('mafia_mic_sensitivity');
      if (savedSens !== null) {
        const val = parseInt(savedSens, 10);
        if (!isNaN(val) && val >= 1 && val <= 8) {
          this.sensitivityLevel = val;
          this.thresholdValue = 3 + (val - 1) * 3;
        }
      }
      const savedPtt = localStorage.getItem('mafia_voice_ptt_enabled');
      if (savedPtt !== null) this.isPushToTalk = savedPtt === 'true';
    }
  }

  public setSensitivity(level: number) {
    this.sensitivityLevel = Math.max(1, Math.min(8, level));
    this.thresholdValue = 3 + (this.sensitivityLevel - 1) * 3;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mafia_mic_sensitivity', String(this.sensitivityLevel));
      } catch (_) {}
    }
  }

  public getSensitivity(): number {
    return this.sensitivityLevel;
  }

  public hasPeer(peerId: string): boolean {
    return this.peers.has(peerId);
  }

  public getConnectedPeerIds(): string[] {
    return Array.from(this.peers.keys());
  }

  public setRoom(roomCode: string) {
    const clean = (roomCode || '').trim().toUpperCase();
    if (this.currentRoomCode && this.currentRoomCode !== clean) {
      // Switched rooms: purge previous room streams immediately
      this.clearAllPeers();
    }
    this.currentRoomCode = clean;
  }

  public getRoom(): string | null {
    return this.currentRoomCode;
  }

  public leaveRoom(roomCode?: string) {
    const clean = (roomCode || '').trim().toUpperCase();
    if (!clean || !this.currentRoomCode || this.currentRoomCode === clean) {
      this.disableVoice();
      this.clearAllPeers();
      this.currentRoomCode = null;
    }
  }

  public clearAllPeers() {
    this.peers.forEach((peer) => {
      try {
        peer.audioEl.pause();
        peer.audioEl.srcObject = null;
        peer.audioEl.remove();
      } catch (_) {}
    });
    this.peers.clear();
    this.notify();
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const speakingMap: Record<string, boolean> = {};
    const levelsMap: Record<string, number> = {};

    const canTransmit =
      Boolean(this.processedStream || this.localStream) &&
      !this.isSelfMuted &&
      !this.isNightMuted &&
      !this.isDeadMuted &&
      (!this.isPushToTalk || this.isPttActive);

    if (canTransmit) {
      const { isSpeaking, level } = this.checkLocalMetrics();
      speakingMap['local'] = isSpeaking;
      levelsMap['local'] = level;
    } else {
      speakingMap['local'] = false;
      levelsMap['local'] = 0;
    }

    this.peers.forEach((peer, id) => {
      const { isSpeaking, level } = this.getSpeechMetrics(peer.analyser, peer.dataArray);
      peer.isSpeaking = isSpeaking && !peer.isMuted;
      peer.speakingLevel = peer.isSpeaking ? level : 0;
      speakingMap[id] = peer.isSpeaking;
      levelsMap[id] = peer.speakingLevel;
    });

    this.cachedSpeakingMap = speakingMap;
    this.cachedLevelsMap = levelsMap;
    this.listeners.forEach((l) => l(speakingMap, levelsMap));
  }

  public async enableVoice(totalRoomPlayers: number): Promise<{ ok: boolean; reason?: string }> {
    if (totalRoomPlayers > this.maxPlayersCap) {
      return {
        ok: false,
        reason: `Voice chat is limited to rooms of ${this.maxPlayersCap} or fewer players to ensure low-latency peer-to-peer audio mesh performance.`,
      };
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { ok: false, reason: 'Microphone access is not supported by your browser.' };
    }

    try {
      // Disabling aggressive noiseSuppression avoids cutting off soft speech and word endings.
      // autoGainControl boosts quiet speakers naturally.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
          // Extended Chromium properties
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false,
        } as MediaTrackConstraints,
      });

      this.localStream = stream;
      this.isEnabled = true;

      // Audio analysis and dynamic normalization so quiet speakers are heard clearly without shouting
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.localAudioCtx = new AudioCtxClass();
        const source = this.localAudioCtx.createMediaStreamSource(stream);

        // Dynamics compressor to lift quiet speech and gently level loud speech
        const compressor = this.localAudioCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-36, this.localAudioCtx.currentTime);
        compressor.knee.setValueAtTime(24, this.localAudioCtx.currentTime);
        compressor.ratio.setValueAtTime(5, this.localAudioCtx.currentTime);
        compressor.attack.setValueAtTime(0.003, this.localAudioCtx.currentTime);
        compressor.release.setValueAtTime(0.2, this.localAudioCtx.currentTime);

        // Clean makeup gain (1.6x) so friends hear normal conversational volume without strain
        const boostGain = this.localAudioCtx.createGain();
        boostGain.gain.setValueAtTime(1.6, this.localAudioCtx.currentTime);

        source.connect(compressor);
        compressor.connect(boostGain);

        this.localAnalyser = this.localAudioCtx.createAnalyser();
        this.localAnalyser.fftSize = 256;
        this.localAnalyser.smoothingTimeConstant = 0.4;
        this.localDataArray = new Uint8Array(this.localAnalyser.frequencyBinCount);
        boostGain.connect(this.localAnalyser);

        if (this.localAudioCtx.createMediaStreamDestination) {
          const dest = this.localAudioCtx.createMediaStreamDestination();
          boostGain.connect(dest);
          this.processedStream = dest.stream;
        } else {
          this.processedStream = stream;
        }
      } else {
        this.processedStream = stream;
      }

      this.applyTrackState();
      this.startPolling();
      return { ok: true };
    } catch (err: any) {
      return {
        ok: false,
        reason: err?.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser settings.'
          : 'Unable to initialize microphone.',
      };
    }
  }

  public disableVoice() {
    this.isEnabled = false;
    this.stopPolling();

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.processedStream) {
      this.processedStream.getTracks().forEach((t) => t.stop());
      this.processedStream = null;
    }
    if (this.localAudioCtx) {
      this.localAudioCtx.close().catch(() => {});
      this.localAudioCtx = null;
    }

    // Clean up peer audio
    this.peers.forEach((peer) => {
      try {
        peer.audioEl.pause();
        peer.audioEl.srcObject = null;
        peer.audioEl.remove();
      } catch (_) {}
    });
    this.peers.clear();
    this.notify();
  }

  public getLocalStream(): MediaStream | null {
    return this.processedStream || this.localStream;
  }

  public isVoiceActive(): boolean {
    return this.isEnabled;
  }

  public isMuted(): boolean {
    return this.isSelfMuted;
  }

  public toggleSelfMute(): boolean {
    this.isSelfMuted = !this.isSelfMuted;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('mafia_voice_self_muted', String(this.isSelfMuted)); } catch (_) {}
    }
    this.applyTrackState();
    this.notify();
    return this.isSelfMuted;
  }

  public setPushToTalk(ptt: boolean) {
    this.isPushToTalk = ptt;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('mafia_voice_ptt_enabled', String(ptt)); } catch (_) {}
    }
    this.applyTrackState();
    this.notify();
  }

  public getPushToTalk(): boolean {
    return this.isPushToTalk;
  }

  public setPttActive(active: boolean) {
    if (this.isPttActive === active) return;
    this.isPttActive = active;
    this.applyTrackState();
    this.notify();
  }

  public getPttActive(): boolean {
    return this.isPttActive;
  }

  /**
   * Phase gating: Night operations disable all town audio to prevent leaks.
   * Dead players are strictly muted from transmitting.
   */
  public updatePhaseAndRole(phase: string, alive: boolean) {
    this.isNightMuted = phase === 'night';
    this.isDeadMuted = !alive;
    this.applyTrackState();
  }

  private applyTrackState() {
    const shouldTransmit =
      this.isEnabled &&
      !this.isSelfMuted &&
      !this.isNightMuted &&
      !this.isDeadMuted &&
      (!this.isPushToTalk || this.isPttActive);

    const tracks = [
      ...(this.localStream ? this.localStream.getAudioTracks() : []),
      ...(this.processedStream ? this.processedStream.getAudioTracks() : []),
    ];
    tracks.forEach((track) => {
      track.enabled = shouldTransmit;
    });
  }

  /** Configure low-bandwidth Opus bitrate (24..32 kbps) */
  public configureSenderBitrate(sender: RTCRtpSender) {
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = 28000; // 28 kbps mono Opus
      sender.setParameters(params).catch(() => {});
    } catch (_) {}
  }

  /** Register incoming peer media stream with room isolation */
  public addPeerStream(peerId: string, stream: MediaStream, roomCode?: string) {
    // Room Isolation: Reject streams that do not belong to the current active room
    if (roomCode && this.currentRoomCode && roomCode.toUpperCase() !== this.currentRoomCode) {
      return;
    }

    if (this.peers.has(peerId)) {
      this.removePeerStream(peerId);
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);

      const audioEl = document.createElement('audio');
      audioEl.srcObject = stream;
      audioEl.autoplay = true;
      (audioEl as any).playsInline = true;
      audioEl.play().catch(() => {});

      this.peers.set(peerId, {
        peerId,
        stream,
        audioEl,
        analyser,
        dataArray,
        isSpeaking: false,
        speakingLevel: 0,
        volume: 1.0,
        isMuted: false,
      });
    } catch (_) {}
  }

  public removePeerStream(peerId: string) {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    try {
      peer.audioEl.pause();
      peer.audioEl.srcObject = null;
      peer.audioEl.remove();
    } catch (_) {}
    this.peers.delete(peerId);
  }

  public setPeerVolume(peerId: string, volume: number) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.volume = Math.max(0, Math.min(1, volume));
    peer.audioEl.volume = peer.isMuted ? 0 : peer.volume;
  }

  public togglePeerMute(peerId: string): boolean {
    const peer = this.peers.get(peerId);
    if (!peer) return false;
    peer.isMuted = !peer.isMuted;
    peer.audioEl.volume = peer.isMuted ? 0 : peer.volume;
    return peer.isMuted;
  }

  /**
   * Calculates speech activity and normalized intensity (0..1) relative to sensitivity gate threshold.
   * If voice is below threshold: isSpeaking = false, level = 0 (no green).
   * If voice is just above threshold: low voice -> light green level (~0.2 - 0.35).
   * If voice is clear / loud: hard green level (~0.75 - 1.0).
   * Adjusting sensitivity directly scales this gate and shifts the color response.
   */
  public getSpeechMetrics(analyser: AnalyserNode, dataArray: Uint8Array): { isSpeaking: boolean; level: number } {
    try {
      analyser.getByteFrequencyData(dataArray as any);
      // Human voice frequencies reside primarily in 100 Hz - 3500 Hz (first 24 bins)
      const vocalBins = Math.min(24, dataArray.length);
      let sum = 0;
      for (let i = 1; i < vocalBins; i++) {
        sum += dataArray[i];
      }
      const vocalAvg = sum / Math.max(1, vocalBins - 1);
      const threshold = this.thresholdValue ?? 12;

      // Sensitivity Gate: If below sensitivity threshold -> no speech, level 0 (no green)
      if (vocalAvg < threshold) {
        return { isSpeaking: false, level: 0 };
      }

      // Above sensitivity threshold: scale level smoothly from 0.2 (low voice) to 1.0 (hard voice)
      const excess = vocalAvg - threshold;
      const dynamicSpan = Math.max(18, threshold * 2.2);
      const normalized = Math.min(1, excess / dynamicSpan);
      const level = Math.min(1, 0.2 + normalized * 0.8);

      return {
        isSpeaking: true,
        level,
      };
    } catch (_) {
      return { isSpeaking: false, level: 0 };
    }
  }

  private isSpeechActive(analyser: AnalyserNode, dataArray: Uint8Array): boolean {
    return this.getSpeechMetrics(analyser, dataArray).isSpeaking;
  }

  private checkLocalMetrics(): { isSpeaking: boolean; level: number } {
    if (!this.localAnalyser || !this.localDataArray) return { isSpeaking: false, level: 0 };
    return this.getSpeechMetrics(this.localAnalyser, this.localDataArray);
  }

  private checkLocalSpeaking(): boolean {
    return this.checkLocalMetrics().isSpeaking;
  }

  public getSpeakingMap(): Record<string, boolean> {
    return { ...this.cachedSpeakingMap };
  }

  public getLevelsMap(): Record<string, number> {
    return { ...this.cachedLevelsMap };
  }

  public getLevel(peerId: string): number {
    return this.cachedLevelsMap[peerId] || 0;
  }

  private startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    // Poll at 12.5 Hz (every 80ms) for real-time smooth voice level green adjustments
    this.pollInterval = setInterval(() => {
      this.notify();
    }, 80);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

export const voiceEngine = new VoiceEngine();
