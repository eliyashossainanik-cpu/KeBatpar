import {
  MEME_SLOTS,
  getRawClipBuffer,
  getSlotDisplayLabel,
  initMemePackStore,
  type MemeSlotId,
  type QuickMemeId,
} from './memePackStore';
import type { VehicleKind } from '../shared/types';

export type MemeSoundId = QuickMemeId;

export const BGM_TRACK_URL = '/assets/aistudio/frad_-_ditto_682be4e7.mp3';
const BGM_STORAGE_KEY = 'ke_batpar_bgm_enabled';
const BGM_NORMAL_VOLUME = 0.24;
const BGM_DUCKED_VOLUME = 0.11;

export function getQuickMemeList(): Array<{
  id: MemeSoundId;
  label: string;
  shortKey: string;
  isVoicePack?: boolean;
}> {
  return MEME_SLOTS.filter((s) => s.category === 'quick').map((s) => ({
    id: s.id as MemeSoundId,
    label: getSlotDisplayLabel(s.id),
    shortKey: s.shortKey ?? '1',
    isVoicePack: Boolean(s.isVoicePack),
  }));
}

export const MEME_SOUNDS: Array<{ id: MemeSoundId; label: string; shortKey: string; isVoicePack?: boolean }> =
  MEME_SLOTS.filter((s) => s.category === 'quick').map((s) => ({
    id: s.id as MemeSoundId,
    label: s.defaultLabel,
    shortKey: s.shortKey ?? '1',
    isVoicePack: Boolean(s.isVoicePack),
  }));

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private noiseBuffer: AudioBuffer | null = null;
  private decodedCache = new Map<MemeSlotId, { refBuf: ArrayBuffer; audio: AudioBuffer }>();
  private builtinRawCache = new Map<string, ArrayBuffer>();
  private builtinFetchPromises = new Map<string, Promise<ArrayBuffer | null>>();
  private activeSources = new Map<MemeSlotId, AudioBufferSourceNode>();
  private activeHtmlAudio = new Map<MemeSlotId, HTMLAudioElement>();
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmEnabled = true;
  private bgmDucked = false;
  private bgmListeners = new Set<() => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      initMemePackStore().catch(() => {});
      try {
        const saved = window.localStorage.getItem(BGM_STORAGE_KEY);
        if (saved === 'false') {
          this.bgmEnabled = false;
        }
      } catch {
        // ignore storage access issues
      }
      const unlockBgm = () => {
        this.preloadBuiltinClips();
        if (this.bgmEnabled && !this.muted) {
          this.startBgm();
        }
      };
      window.addEventListener('pointerdown', unlockBgm, { passive: true });
      window.addEventListener('keydown', unlockBgm, { passive: true });
    }
  }

  private fetchBuiltinRaw(url: string): Promise<ArrayBuffer | null> {
    const cached = this.builtinRawCache.get(url);
    if (cached) return Promise.resolve(cached);
    const existing = this.builtinFetchPromises.get(url);
    if (existing) return existing;
    if (typeof fetch !== 'function') return Promise.resolve(null);
    const p = fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((buf) => {
        if (buf && buf.byteLength > 0) {
          this.builtinRawCache.set(url, buf);
          return buf;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        this.builtinFetchPromises.delete(url);
      });
    this.builtinFetchPromises.set(url, p);
    return p;
  }

  private preloadBuiltinClips(): void {
    for (const slot of MEME_SLOTS) {
      if (slot.defaultAudioUrl && !this.builtinRawCache.has(slot.defaultAudioUrl)) {
        void this.fetchBuiltinRaw(slot.defaultAudioUrl);
      }
    }
  }

  private getTargetBgmVolume(): number {
    return this.bgmDucked ? BGM_DUCKED_VOLUME : BGM_NORMAL_VOLUME;
  }

  private ensureBgmElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    if (!this.bgmAudio) {
      const audio = new Audio(BGM_TRACK_URL);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = this.getTargetBgmVolume();
      audio.muted = this.muted || !this.bgmEnabled;
      this.bgmAudio = audio;
    }
    return this.bgmAudio;
  }

  private notifyBgmListeners(): void {
    for (const cb of this.bgmListeners) {
      try {
        cb();
      } catch {
        // ignore
      }
    }
  }

  private syncBgmState(): void {
    const audio = this.bgmAudio;
    if (!audio) return;
    audio.volume = this.getTargetBgmVolume();
    const shouldMute = this.muted || !this.bgmEnabled;
    audio.muted = shouldMute;
    if (shouldMute) {
      if (!audio.paused) {
        audio.pause();
      }
    } else if (audio.paused) {
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Will start automatically on next pointer/key interaction
        });
      }
    }
  }

  public startBgm(): void {
    if (this.muted || !this.bgmEnabled) return;
    const audio = this.ensureBgmElement();
    if (!audio) return;
    audio.volume = this.getTargetBgmVolume();
    audio.muted = false;
    if (audio.paused) {
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Blocked until user gesture; handled gracefully
        });
      }
    }
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  public setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(BGM_STORAGE_KEY, enabled ? 'true' : 'false');
      } catch {
        // ignore
      }
    }
    if (enabled && !this.muted) {
      this.startBgm();
    } else {
      this.syncBgmState();
    }
    this.notifyBgmListeners();
  }

  public toggleBgm(): boolean {
    const next = !this.bgmEnabled;
    this.setBgmEnabled(next);
    return next;
  }

  public setBgmDucked(ducked: boolean): void {
    if (this.bgmDucked === ducked) return;
    this.bgmDucked = ducked;
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.getTargetBgmVolume();
    }
  }

  public subscribeBgmState(cb: () => void): () => void {
    this.bgmListeners.add(cb);
    return () => {
      this.bgmListeners.delete(cb);
    };
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public invalidateDecodedSlot(slotId?: MemeSlotId): void {
    if (slotId) {
      this.decodedCache.delete(slotId);
    } else {
      this.decodedCache.clear();
    }
  }

  private playBufferForSlot(ctx: AudioContext, slotId: MemeSlotId, audio: AudioBuffer): void {
    const prev = this.activeSources.get(slotId);
    if (prev) {
      try {
        prev.stop();
        prev.disconnect();
      } catch {
        // ignore already-stopped nodes
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = audio;
    const gain = ctx.createGain();
    gain.gain.value = 0.85;
    src.connect(gain).connect(ctx.destination);
    this.activeSources.set(slotId, src);
    src.onended = () => {
      if (this.activeSources.get(slotId) === src) {
        this.activeSources.delete(slotId);
      }
    };
    src.start(0);
  }

  private playHtmlFallbackUrl(slotId: MemeSlotId, url: string, fallbackSynth: () => void): void {
    if (this.muted || typeof Audio === 'undefined') {
      fallbackSynth();
      return;
    }
    const prev = this.activeHtmlAudio.get(slotId);
    if (prev) {
      try {
        prev.pause();
        prev.currentTime = 0;
      } catch {
        // ignore
      }
    }
    try {
      const audio = new Audio(url);
      audio.volume = 0.88;
      this.activeHtmlAudio.set(slotId, audio);
      audio.onended = () => {
        if (this.activeHtmlAudio.get(slotId) === audio) {
          this.activeHtmlAudio.delete(slotId);
        }
      };
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => fallbackSynth());
      }
    } catch {
      fallbackSynth();
    }
  }

  private tryPlayCustomSlot(slotId: MemeSlotId, fallbackSynth: () => void): void {
    if (this.muted) return;
    const customRaw = getRawClipBuffer(slotId);
    const defaultUrl = MEME_SLOTS.find((s) => s.id === slotId)?.defaultAudioUrl;
    const raw = customRaw ?? (defaultUrl ? this.builtinRawCache.get(defaultUrl) : undefined);

    if (!raw && defaultUrl) {
      // Lazy-fetch built-in clip while playing cleanly via HTML5 Audio immediately
      void this.fetchBuiltinRaw(defaultUrl);
      this.playHtmlFallbackUrl(slotId, defaultUrl, fallbackSynth);
      return;
    }

    if (!raw) {
      fallbackSynth();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) {
      if (!customRaw && defaultUrl) {
        this.playHtmlFallbackUrl(slotId, defaultUrl, fallbackSynth);
      }
      return;
    }

    const cached = this.decodedCache.get(slotId);
    if (cached && cached.refBuf === raw) {
      this.playBufferForSlot(ctx, slotId, cached.audio);
      return;
    }

    ctx
      .decodeAudioData(raw.slice(0))
      .then((decoded) => {
        this.decodedCache.set(slotId, { refBuf: raw, audio: decoded });
        if (!this.muted) {
          this.playBufferForSlot(ctx, slotId, decoded);
        }
      })
      .catch(() => {
        if (!customRaw && defaultUrl) {
          this.playHtmlFallbackUrl(slotId, defaultUrl, fallbackSynth);
        } else {
          fallbackSynth();
        }
      });
  }

  public testSlot(slotId: MemeSlotId): void {
    this.tryPlayCustomSlot(slotId, () => {
      switch (slotId) {
        case 'vine_boom':
          this.playVineBoom();
          break;
        case 'bonk':
          this.playCartoonBonk();
          break;
        case 'sad_trombone':
          this.playSadTrombone();
          break;
        case 'airhorn':
          this.playAirhorn();
          break;
        case 'dun_dun':
          this.playDunDunDun();
          break;
        case 'chubani':
          this.playChubaniSplash();
          break;
        case 'aaho_bhatija':
        case 'helicopter_milon':
        case 'gacher_pata':
        case 'prank_call':
          this.playVineBoom();
          break;
        case 'event_kill':
          this.playKillSynth();
          break;
        case 'event_report':
        case 'event_meeting':
          this.playMeetingBellSynth();
          break;
        case 'event_eject':
        case 'event_eject_vondo':
          this.playChubaniSplash();
          break;
        case 'event_sabotage':
          this.playSadTrombone();
          break;
        case 'event_shield':
          this.playShieldSynth();
          break;
        case 'event_daroga':
          this.playDarogaSynth();
          break;
        case 'event_clean':
          this.playCleanSynth();
          break;
        case 'event_revive':
          this.playReviveSynth();
          break;
        case 'event_task':
          this.playTaskSynth();
          break;
        case 'event_vent':
          this.playVentSynth();
          break;
        case 'event_jump':
          this.playJumpSynth();
          break;
        case 'event_win':
          this.playAirhorn();
          break;
        case 'event_loss':
          this.playSadTrombone();
          break;
      }
    });
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = Math.floor(ctx.sampleRate * 0.8);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
    return buf;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.syncBgmState();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playMeme(id: MemeSoundId): void {
    this.tryPlayCustomSlot(id, () => {
      switch (id) {
        case 'vine_boom':
          this.playVineBoom();
          break;
        case 'bonk':
          this.playCartoonBonk();
          break;
        case 'sad_trombone':
          this.playSadTrombone();
          break;
        case 'airhorn':
          this.playAirhorn();
          break;
        case 'dun_dun':
          this.playDunDunDun();
          break;
        case 'chubani':
          this.playChubaniSplash();
          break;
        case 'aaho_bhatija':
        case 'helicopter_milon':
        case 'gacher_pata':
        case 'prank_call':
          this.playVineBoom();
          break;
      }
    });
  }

  public playVineBoom(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(125, t);
    sub.frequency.exponentialRampToValueAtTime(32, t + 0.55);
    subGain.gain.setValueAtTime(0.38, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
    sub.connect(subGain).connect(ctx.destination);
    sub.start(t);
    sub.stop(t + 0.68);

    const punch = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punch.type = 'triangle';
    punch.frequency.setValueAtTime(210, t);
    punch.frequency.exponentialRampToValueAtTime(48, t + 0.16);
    punchGain.gain.setValueAtTime(0.24, t);
    punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    punch.connect(punchGain).connect(ctx.destination);
    punch.start(t);
    punch.stop(t + 0.2);
  }

  public playCartoonBonk(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const bonk = ctx.createOscillator();
    const bonkGain = ctx.createGain();
    bonk.type = 'triangle';
    bonk.frequency.setValueAtTime(310, t);
    bonk.frequency.exponentialRampToValueAtTime(620, t + 0.045);
    bonk.frequency.exponentialRampToValueAtTime(160, t + 0.16);
    bonkGain.gain.setValueAtTime(0.28, t);
    bonkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    bonk.connect(bonkGain).connect(ctx.destination);
    bonk.start(t);
    bonk.stop(t + 0.2);

    const whistle = ctx.createOscillator();
    const wGain = ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(1180, t + 0.08);
    whistle.frequency.exponentialRampToValueAtTime(340, t + 0.34);
    wGain.gain.setValueAtTime(0.001, t + 0.08);
    wGain.gain.linearRampToValueAtTime(0.12, t + 0.11);
    wGain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    whistle.connect(wGain).connect(ctx.destination);
    whistle.start(t + 0.08);
    whistle.stop(t + 0.38);
  }

  public playSadTrombone(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [
      { f: 311.13, start: 0.0, dur: 0.22 },
      { f: 293.66, start: 0.24, dur: 0.22 },
      { f: 277.18, start: 0.48, dur: 0.22 },
      { f: 261.63, start: 0.72, dur: 0.52 },
    ];
    notes.forEach((n, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, t + n.start);
      if (idx === 3) {
        osc.frequency.linearRampToValueAtTime(n.f - 28, t + n.start + n.dur);
      }
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(980, t + n.start);
      filter.frequency.linearRampToValueAtTime(480, t + n.start + n.dur);
      gain.gain.setValueAtTime(0.001, t + n.start);
      gain.gain.linearRampToValueAtTime(0.13, t + n.start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.start + n.dur);
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start(t + n.start);
      osc.stop(t + n.start + n.dur + 0.02);
    });
  }

  public playAirhorn(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const hits = [0.0, 0.14, 0.28];
    hits.forEach((offset, idx) => {
      const dur = idx === 2 ? 0.38 : 0.1;
      [466.16, 587.33, 698.46].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t + offset);
        gain.gain.setValueAtTime(0.075, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + offset);
        osc.stop(t + offset + dur + 0.02);
      });
    });
  }

  public playDunDunDun(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const beats = [
      { f: 196.0, start: 0.0, dur: 0.16 },
      { f: 196.0, start: 0.19, dur: 0.16 },
      { f: 185.0, start: 0.38, dur: 0.55 },
    ];
    beats.forEach((b) => {
      [b.f, b.f * 1.5, b.f * 2].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, t + b.start);
        gain.gain.setValueAtTime(i === 0 ? 0.14 : 0.08, t + b.start);
        gain.gain.exponentialRampToValueAtTime(0.001, t + b.start + b.dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + b.start);
        osc.stop(t + b.start + b.dur + 0.02);
      });
    });
  }

  public playChubaniSplash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    const slip = ctx.createOscillator();
    const slipGain = ctx.createGain();
    slip.type = 'sine';
    slip.frequency.setValueAtTime(980, t);
    slip.frequency.exponentialRampToValueAtTime(190, t + 0.28);
    slipGain.gain.setValueAtTime(0.13, t);
    slipGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    slip.connect(slipGain).connect(ctx.destination);
    slip.start(t);
    slip.stop(t + 0.31);

    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1250, t + 0.24);
    filter.frequency.exponentialRampToValueAtTime(380, t + 0.72);
    filter.Q.value = 1.1;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.001, t + 0.24);
    nGain.gain.linearRampToValueAtTime(0.28, t + 0.28);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
    src.connect(filter).connect(nGain).connect(ctx.destination);
    src.start(t + 0.24);
    src.stop(t + 0.78);
  }

  public playFootstep(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pitchJitter = 0.9 + Math.random() * 0.2;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(125 * pitchJitter, t);
    osc.frequency.exponentialRampToValueAtTime(48 * pitchJitter, t + 0.055);
    gain.gain.setValueAtTime(0.042, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.065);
  }

  public playCardTick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(920, t);
    osc.frequency.exponentialRampToValueAtTime(360, t + 0.032);
    gain.gain.setValueAtTime(0.065, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.036);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  public playShhhhSound(isBatpar: boolean, isPagol = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    // Sharp initial "Sh" consonant transient
    const clickSrc = ctx.createBufferSource();
    clickSrc.buffer = this.getNoiseBuffer(ctx);
    const clickHp = ctx.createBiquadFilter();
    clickHp.type = 'highpass';
    clickHp.frequency.setValueAtTime(3200, t);
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.001, t);
    clickGain.gain.linearRampToValueAtTime(0.24, t + 0.015);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
    clickSrc.connect(clickHp).connect(clickGain).connect(ctx.destination);
    clickSrc.start(t);
    clickSrc.stop(t + 0.08);

    // Sustained breathy "SHHHHH!" sibilant sweep
    const shhSrc = ctx.createBufferSource();
    shhSrc.buffer = this.getNoiseBuffer(ctx);
    const shhFilter = ctx.createBiquadFilter();
    shhFilter.type = 'bandpass';
    shhFilter.frequency.setValueAtTime(2400, t);
    shhFilter.frequency.linearRampToValueAtTime(3400, t + 0.16);
    shhFilter.frequency.exponentialRampToValueAtTime(1650, t + 0.7);
    shhFilter.Q.value = 3.0;
    const shhGain = ctx.createGain();
    shhGain.gain.setValueAtTime(0.001, t);
    shhGain.gain.linearRampToValueAtTime(0.28, t + 0.06);
    shhGain.gain.setValueAtTime(0.24, t + 0.28);
    shhGain.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
    shhSrc.connect(shhFilter).connect(shhGain).connect(ctx.destination);
    shhSrc.start(t);
    shhSrc.stop(t + 0.74);

    // Dramatic Super Sus role reveal sting right under the tail of "Shhhhh!"
    if (isBatpar) {
      [
        { f: 146.83, delay: 0.24, dur: 0.45 },
        { f: 155.56, delay: 0.36, dur: 0.55 },
        { f: 110.0, delay: 0.48, dur: 0.75 },
      ].forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.f, t + n.delay);
        gain.gain.setValueAtTime(0.001, t + n.delay);
        gain.gain.linearRampToValueAtTime(0.14, t + n.delay + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + n.delay + n.dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + n.delay);
        osc.stop(t + n.delay + n.dur + 0.02);
      });
    } else if (isPagol) {
      [392, 493.88, 622.25, 783.99].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + 0.24 + idx * 0.07);
        gain.gain.setValueAtTime(0.11, t + 0.24 + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24 + idx * 0.07 + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + 0.24 + idx * 0.07);
        osc.stop(t + 0.24 + idx * 0.07 + 0.37);
      });
    } else {
      [392.0, 493.88, 587.33, 783.99].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + 0.24 + idx * 0.07);
        gain.gain.setValueAtTime(0.11, t + 0.24 + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24 + idx * 0.07 + 0.42);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + 0.24 + idx * 0.07);
        osc.stop(t + 0.24 + idx * 0.07 + 0.44);
      });
    }
  }

  public playRoleReveal(isBatpar: boolean): void {
    this.playShhhhSound(isBatpar, false);
  }

  public playEjectBuildup(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    // "1... 2... 3..." crowd drum taps
    [180, 225, 285].forEach((freq, idx) => {
      const start = t + idx * 0.44;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.55, start + 0.14);
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.17);
    });
    // Rising throw whistle right before pond flight
    const whoosh = ctx.createOscillator();
    const wGain = ctx.createGain();
    whoosh.type = 'sine';
    whoosh.frequency.setValueAtTime(240, t + 1.38);
    whoosh.frequency.exponentialRampToValueAtTime(920, t + 2.05);
    wGain.gain.setValueAtTime(0.001, t + 1.38);
    wGain.gain.linearRampToValueAtTime(0.12, t + 1.55);
    wGain.gain.exponentialRampToValueAtTime(0.001, t + 2.15);
    whoosh.connect(wGain).connect(ctx.destination);
    whoosh.start(t + 1.38);
    whoosh.stop(t + 2.18);
  }

  public playDoorSlam(): void {
    this.playVineBoom();
  }

  private playTaskSynth(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      gain.gain.setValueAtTime(0.001, t + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.13, t + idx * 0.06 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.24);
    });
  }

  public playTaskComplete(): void {
    this.tryPlayCustomSlot('event_task', () => this.playTaskSynth());
  }

  private playKillSynth(): void {
    this.playVineBoom();
    setTimeout(() => this.playCartoonBonk(), 90);
  }

  public playKill(): void {
    this.tryPlayCustomSlot('event_kill', () => this.playKillSynth());
  }

  private playMeetingBellSynth(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    [0, 0.2].forEach((offset) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(760, t + offset);
      osc2.frequency.setValueAtTime(1140, t + offset);
      gain.gain.setValueAtTime(0.18, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.36);
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + offset);
      osc2.start(t + offset);
      osc.stop(t + offset + 0.38);
      osc2.stop(t + offset + 0.38);
    });
    setTimeout(() => this.playDunDunDun(), 260);
  }

  public playMeetingBell(reason: 'body' | 'emergency' = 'emergency'): void {
    const slotId: MemeSlotId = reason === 'body' ? 'event_report' : 'event_meeting';
    this.tryPlayCustomSlot(slotId, () => this.playMeetingBellSynth());
  }

  public playSabotage(): void {
    this.tryPlayCustomSlot('event_sabotage', () => this.playSadTrombone());
  }

  private playVentSynth(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(640, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.2);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.23);
  }

  public playVent(): void {
    this.tryPlayCustomSlot('event_vent', () => this.playVentSynth());
  }

  public playVoteClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(780, t + 0.055);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playEject(wasVondo = false): void {
    if (wasVondo) {
      this.playChubaniSplash();
      window.setTimeout(() => {
        this.tryPlayCustomSlot('event_eject_vondo', () => {});
      }, 280);
      return;
    }
    this.tryPlayCustomSlot('event_eject', () => this.playChubaniSplash());
  }

  private playShieldSynth(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const boing = ctx.createOscillator();
    const bGain = ctx.createGain();
    boing.type = 'sine';
    boing.frequency.setValueAtTime(190, t);
    boing.frequency.exponentialRampToValueAtTime(540, t + 0.12);
    boing.frequency.exponentialRampToValueAtTime(320, t + 0.28);
    bGain.gain.setValueAtTime(0.2, t);
    bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    boing.connect(bGain).connect(ctx.destination);
    boing.start(t);
    boing.stop(t + 0.32);

    [520, 780, 1040].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + idx * 0.04);
      gain.gain.setValueAtTime(0.13, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.27);
    });
  }

  public playShieldBlock(): void {
    this.tryPlayCustomSlot('event_shield', () => this.playShieldSynth());
  }

  public playDisguise(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.16);
    osc.frequency.exponentialRampToValueAtTime(310, t + 0.32);
    gain.gain.setValueAtTime(0.13, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  public playClueScan(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    [660, 880, 1100].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.07);
      gain.gain.setValueAtTime(0.1, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.17);
    });
  }

  private playJumpSynth(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(490, t + 0.12);
    gain.gain.setValueAtTime(0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playJump(): void {
    this.tryPlayCustomSlot('event_jump', () => this.playJumpSynth());
  }

  private playDarogaSynth(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.18);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  public playDarogaShot(): void {
    this.tryPlayCustomSlot('event_daroga', () => this.playDarogaSynth());
  }

  private playCleanSynth(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.frequency.exponentialRampToValueAtTime(520, t + 0.28);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.32);
  }

  public playCleanBody(): void {
    this.tryPlayCustomSlot('event_clean', () => this.playCleanSynth());
  }

  private playReviveSynth(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.055);
      gain.gain.setValueAtTime(0.14, t + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.055 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + idx * 0.055);
      osc.stop(t + idx * 0.055 + 0.27);
    });
  }

  public playRevive(): void {
    this.tryPlayCustomSlot('event_revive', () => this.playReviveSynth());
  }

  public playLand(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(58, t + 0.08);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playLobbyJoin(leaving = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = leaving ? [540, 390] : [440, 660];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.055);
      gain.gain.setValueAtTime(0.085, t + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.055 + 0.11);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + idx * 0.055);
      osc.stop(t + idx * 0.055 + 0.12);
    });
  }

  public playLobbyReady(ready = true): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(ready ? 620 : 420, t);
    osc.frequency.exponentialRampToValueAtTime(ready ? 920 : 310, t + 0.07);
    gain.gain.setValueAtTime(0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playLobbyTick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.05);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playStartWhoosh(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(360, t);
    filter.frequency.exponentialRampToValueAtTime(2400, t + 0.28);
    filter.Q.value = 1.4;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.001, t);
    nGain.gain.linearRampToValueAtTime(0.22, t + 0.08);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    src.connect(filter).connect(nGain).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.4);

    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.22);
    oGain.gain.setValueAtTime(0.14, t);
    oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(oGain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playTrainHorn(volumeScale = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const scale = Math.max(0.05, Math.min(1, volumeScale));
    const t = ctx.currentTime;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(980, t);
    filter.Q.value = 1.1;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.001, t);
    master.gain.linearRampToValueAtTime(0.16 * scale, t + 0.08);
    master.gain.setValueAtTime(0.14 * scale, t + 0.58);
    master.gain.exponentialRampToValueAtTime(0.001, t + 0.96);
    filter.connect(master).connect(ctx.destination);

    for (const baseFreq of [277.18, 349.23]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.985, t + 0.94);
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + 0.98);
    }
  }

  public playVehicleEnter(kind: VehicleKind): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    if (kind === 'rickshaw') {
      // Bicycle bell + seat creak
      const bell = ctx.createOscillator();
      const bGain = ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(1680, t);
      bell.frequency.setValueAtTime(1920, t + 0.06);
      bGain.gain.setValueAtTime(0.09, t);
      bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
      bell.connect(bGain).connect(ctx.destination);
      bell.start(t);
      bell.stop(t + 0.2);
      return;
    }
    // Mechanical door / ignition rev
    const rev = ctx.createOscillator();
    const rGain = ctx.createGain();
    rev.type = kind === 'motorbike' || kind === 'cng' ? 'sawtooth' : 'triangle';
    const baseF = kind === 'minibus' || kind === 'pickup' ? 68 : kind === 'motorbike' ? 145 : 98;
    rev.frequency.setValueAtTime(baseF, t);
    rev.frequency.exponentialRampToValueAtTime(baseF * 2.1, t + 0.14);
    rev.frequency.exponentialRampToValueAtTime(baseF * 1.15, t + 0.34);
    rGain.gain.setValueAtTime(0.001, t);
    rGain.gain.linearRampToValueAtTime(0.14, t + 0.04);
    rGain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    rev.connect(rGain).connect(ctx.destination);
    rev.start(t);
    rev.stop(t + 0.38);
  }

  public playVehicleExit(kind: VehicleKind): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const startF = kind === 'rickshaw' || kind === 'motorbike' ? 220 : 140;
    osc.frequency.setValueAtTime(startF, t);
    osc.frequency.exponentialRampToValueAtTime(52, t + 0.11);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  public playVehicleHorn(kind: VehicleKind): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t = ctx.currentTime;

    if (kind === 'rickshaw') {
      // Classic Bangla rickshaw "tring-tring!" brass bell
      [0, 0.11].forEach((offset) => {
        [1850, 2790].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(f, t + offset);
          gain.gain.setValueAtTime(idx === 0 ? 0.12 : 0.06, t + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.16);
          osc.connect(gain).connect(ctx.destination);
          osc.start(t + offset);
          osc.stop(t + offset + 0.17);
        });
      });
      return;
    }

    if (kind === 'motorbike') {
      // Sharp scooter/bike "peep-peep!"
      [0, 0.11].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(640, t + offset);
        gain.gain.setValueAtTime(0.09, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.085);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t + offset);
        osc.stop(t + offset + 0.095);
      });
      return;
    }

    if (kind === 'cng') {
      // Dhaka CNG double nasal honk "pom-pom"
      [0, 0.14].forEach((offset) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(470, t + offset);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(980, t + offset);
        filter.Q.value = 1.6;
        gain.gain.setValueAtTime(0.14, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.11);
        osc.connect(filter).connect(gain).connect(ctx.destination);
        osc.start(t + offset);
        osc.stop(t + offset + 0.12);
      });
      return;
    }

    if (kind === 'minibus' || kind === 'pickup') {
      // Deep Dhaka bus/pickup dual air-horn
      const freqs = kind === 'minibus' ? [220, 277.18] : [261.63, 329.63];
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1250, t);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.03);
      gain.gain.setValueAtTime(0.13, t + 0.26);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      filter.connect(gain).connect(ctx.destination);
      for (const f of freqs) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t);
        osc.connect(filter);
        osc.start(t);
        osc.stop(t + 0.44);
      }
      return;
    }

    // Car / Taxi dual-tone horn
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.11, t + 0.02);
    gain.gain.setValueAtTime(0.1, t + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    filter.connect(gain).connect(ctx.destination);
    for (const f of [392.0, 493.88]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  }

  public playOutcome(win: boolean): void {
    if (win) {
      this.tryPlayCustomSlot('event_win', () => this.playAirhorn());
    } else {
      this.tryPlayCustomSlot('event_loss', () => this.playSadTrombone());
    }
  }
}

export const soundEngine = new SoundEngine();
