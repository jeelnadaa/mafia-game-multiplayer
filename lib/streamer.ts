// Streamer & God Spectator Mode Manager with LocalStorage Persistence & Event Broadcasting

export type CasterMode = 'blind' | 'god';

class StreamerManager {
  private isStreamerSafe: boolean = false;
  private casterMode: CasterMode = 'blind';
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedStreamer = localStorage.getItem('mafia_streamer_mode');
        if (savedStreamer !== null) {
          this.isStreamerSafe = savedStreamer === 'true';
        }
        const savedCaster = localStorage.getItem('mafia_caster_mode') as CasterMode | null;
        if (savedCaster === 'blind' || savedCaster === 'god') {
          this.casterMode = savedCaster;
        }
      } catch (_) {}
    }
  }

  public isEnabled(): boolean {
    return this.isStreamerSafe;
  }

  public getCasterMode(): CasterMode {
    return this.casterMode;
  }

  public toggleStreamerMode(): boolean {
    this.isStreamerSafe = !this.isStreamerSafe;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mafia_streamer_mode', String(this.isStreamerSafe));
      } catch (_) {}
    }
    this.notify();
    return this.isStreamerSafe;
  }

  public setStreamerMode(enabled: boolean) {
    if (this.isStreamerSafe === enabled) return;
    this.isStreamerSafe = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mafia_streamer_mode', String(this.isStreamerSafe));
      } catch (_) {}
    }
    this.notify();
  }

  public setCasterMode(mode: CasterMode) {
    if (this.casterMode === mode) return;
    this.casterMode = mode;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mafia_caster_mode', mode);
      } catch (_) {}
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const streamerManager = new StreamerManager();
