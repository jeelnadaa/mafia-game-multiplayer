// WebRTC Mesh Voice Engine with Phase-Gated Track Control & Audio RMS Analyser

export interface VoicePeerState {
  peerId: string;
  stream: MediaStream;
  audioEl: HTMLAudioElement;
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  isSpeaking: boolean;
  volume: number; // 0..1
  isMuted: boolean;
}

export type VoiceStateListener = (speakingMap: Record<string, boolean>) => void;

class VoiceEngine {
  private localStream: MediaStream | null = null;
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
  private maxPlayersCap: number = 8;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('mafia_voice_self_muted');
      if (savedMute !== null) this.isSelfMuted = savedMute === 'true';
    }
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const map: Record<string, boolean> = {};
    if (this.localStream && !this.isSelfMuted && !this.isNightMuted && !this.isDeadMuted) {
      map['local'] = this.checkLocalSpeaking();
    }
    this.peers.forEach((peer, id) => {
      map[id] = peer.isSpeaking && !peer.isMuted;
    });
    this.listeners.forEach((l) => l(map));
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      this.localStream = stream;
      this.isEnabled = true;

      // Audio analysis for local speaking indicator
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.localAudioCtx = new AudioCtxClass();
        const source = this.localAudioCtx.createMediaStreamSource(stream);
        this.localAnalyser = this.localAudioCtx.createAnalyser();
        this.localAnalyser.fftSize = 256;
        this.localDataArray = new Uint8Array(this.localAnalyser.frequencyBinCount);
        source.connect(this.localAnalyser);
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
    return this.localStream;
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
    this.applyTrackState();
  }

  public setPttActive(active: boolean) {
    this.isPttActive = active;
    this.applyTrackState();
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
    if (!this.localStream) return;
    const shouldTransmit =
      this.isEnabled &&
      !this.isSelfMuted &&
      !this.isNightMuted &&
      !this.isDeadMuted &&
      (!this.isPushToTalk || this.isPttActive);

    this.localStream.getAudioTracks().forEach((track) => {
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

  /** Register incoming peer media stream */
  public addPeerStream(peerId: string, stream: MediaStream) {
    if (this.peers.has(peerId)) {
      this.removePeerStream(peerId);
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
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

  private checkLocalSpeaking(): boolean {
    if (!this.localAnalyser || !this.localDataArray) return false;
    this.localAnalyser.getByteFrequencyData(this.localDataArray as any);
    let sum = 0;
    for (let i = 0; i < this.localDataArray.length; i++) {
      sum += this.localDataArray[i];
    }
    const avg = sum / this.localDataArray.length;
    return avg > 18; // RMS sensitivity threshold
  }

  private startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    // Poll at 10 Hz (every 100ms) with hysteresis
    this.pollInterval = setInterval(() => {
      let changed = false;
      this.peers.forEach((peer) => {
        peer.analyser.getByteFrequencyData(peer.dataArray as any);
        let sum = 0;
        for (let i = 0; i < peer.dataArray.length; i++) {
          sum += peer.dataArray[i];
        }
        const avg = sum / peer.dataArray.length;
        const speakingNow = avg > 18;
        if (speakingNow !== peer.isSpeaking) {
          peer.isSpeaking = speakingNow;

          changed = true;
        }
      });

      this.notify();
    }, 100);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

export const voiceEngine = new VoiceEngine();
