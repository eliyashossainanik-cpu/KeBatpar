import { getApiUrl } from '../config/serverUrl';

export type QuickMemeId =
  | 'vine_boom'
  | 'bonk'
  | 'sad_trombone'
  | 'airhorn'
  | 'dun_dun'
  | 'chubani'
  | 'aaho_bhatija'
  | 'helicopter_milon'
  | 'gacher_pata'
  | 'prank_call';

export type EventMemeId =
  | 'event_kill'
  | 'event_report'
  | 'event_meeting'
  | 'event_eject'
  | 'event_eject_vondo'
  | 'event_sabotage'
  | 'event_shield'
  | 'event_daroga'
  | 'event_clean'
  | 'event_revive'
  | 'event_task'
  | 'event_vent'
  | 'event_jump'
  | 'event_win'
  | 'event_loss';

export type MemeSlotId = QuickMemeId | EventMemeId;

export interface MemeSlotMeta {
  id: MemeSlotId;
  category: 'quick' | 'event';
  isVoicePack?: boolean;
  defaultLabel: string;
  banglaHint: string;
  shortKey?: string;
  defaultAudioUrl?: string;
  keywords: string[];
}

export const MEME_SLOTS: MemeSlotMeta[] = [
  // Quick Soundboard Slots [1]-[6]
  {
    id: 'vine_boom',
    category: 'quick',
    defaultLabel: 'এই ভাই! (বুম)',
    banglaHint: 'স্লট [১] · তাৎক্ষণিক রিঅ্যাকশন সাউন্ড',
    shortKey: '1',
    keywords: ['boom', 'vine', 'eey', 'bhai', '1'],
  },
  {
    id: 'bonk',
    category: 'quick',
    defaultLabel: 'গ্যাপে নাও! (বঙ্ক)',
    banglaHint: 'স্লট [২] · তাৎক্ষণিক রিঅ্যাকশন সাউন্ড',
    shortKey: '2',
    keywords: ['bonk', 'gap', 'mara', '2'],
  },
  {
    id: 'sad_trombone',
    category: 'quick',
    defaultLabel: 'ধরা খাইসি (স্যাড)',
    banglaHint: 'স্লট [৩] · তাৎক্ষণিক রিঅ্যাকশন সাউন্ড',
    shortKey: '3',
    keywords: ['sad', 'wah', 'trombone', 'dhora', '3'],
  },
  {
    id: 'airhorn',
    category: 'quick',
    defaultLabel: 'খেলা হবে! (হর্ন)',
    banglaHint: 'স্লট [৪] · তাৎক্ষণিক রিঅ্যাকশন সাউন্ড',
    shortKey: '4',
    keywords: ['horn', 'khela', 'hobe', '4'],
  },
  {
    id: 'dun_dun',
    category: 'quick',
    defaultLabel: 'সিআইডি সন্দেহ!',
    banglaHint: 'স্লট [৫] · তাৎক্ষণিক রিঅ্যাকশন সাউন্ড',
    shortKey: '5',
    keywords: ['cid', 'dun', 'sus', 'shondeho', '5'],
  },
  {
    id: 'chubani',
    category: 'quick',
    defaultLabel: 'পুকুর চুবানি!',
    banglaHint: 'স্লট [৬] · তাৎক্ষণিক রিঅ্যাকশন সাউন্ড',
    shortKey: '6',
    keywords: ['chubani', 'pukur', 'splash', '6'],
  },
  {
    id: 'aaho_bhatija',
    category: 'quick',
    isVoicePack: true,
    defaultLabel: 'আহো ভাতিজা আহো!',
    banglaHint: 'ভয়েস প্যাক [৭] · ভাইরাল বাংলা ডায়লগ',
    shortKey: '7',
    defaultAudioUrl: '/assets/memes/aaho_bhatija_aaho.mp3',
    keywords: ['aaho', 'bhatija', '7'],
  },
  {
    id: 'helicopter_milon',
    category: 'quick',
    isVoicePack: true,
    defaultLabel: 'এই তোমরা কেমন আছো?',
    banglaHint: 'ভয়েস প্যাক [৮] · হেলিকপ্টার মিলন',
    shortKey: '8',
    defaultAudioUrl: '/assets/memes/helicopter_milon.mp3',
    keywords: ['helicopter', 'milon', 'kemon', '8'],
  },
  {
    id: 'gacher_pata',
    category: 'quick',
    isVoicePack: true,
    defaultLabel: 'গাছের পাতা সবুজ!',
    banglaHint: 'ভয়েস প্যাক [৯] · ভাইরাল মজার ভয়েস',
    shortKey: '9',
    defaultAudioUrl: '/assets/memes/gacher_pata_sobhuj.mp3',
    keywords: ['gacher', 'pata', 'sobhuj', '9'],
  },
  {
    id: 'prank_call',
    category: 'quick',
    isVoicePack: true,
    defaultLabel: 'চাঁটগাইয়া প্র্যাংক!',
    banglaHint: 'ভয়েস প্যাক [০] · প্র্যাংক কল ভয়েস',
    shortKey: '0',
    defaultAudioUrl: '/assets/memes/file_clip.mp3',
    keywords: ['prank', 'call', 'chittainga', 'file', '0'],
  },

  // Automatic Game Event Triggers
  {
    id: 'event_kill',
    category: 'event',
    isVoicePack: true,
    defaultLabel: 'রাগ করলা! (বাটপার কিল)',
    banglaHint: 'বাটপার কাউকে ঘায়েল করলে নিজে থেকেই "রাগ করলা" ভয়েস বাজবে',
    defaultAudioUrl: '/assets/memes/rag_korla.mp3',
    keywords: ['kill', 'rag', 'korla', 'size', 'murder'],
  },
  {
    id: 'event_report',
    category: 'event',
    defaultLabel: 'হায়রে! লাশ রিপোর্ট',
    banglaHint: 'পড়ে থাকা লাশ রিপোর্ট করলে নিজে থেকেই বাজবে',
    keywords: ['report', 'lash', 'body', 'haire', 'dead'],
  },
  {
    id: 'event_meeting',
    category: 'event',
    defaultLabel: 'সালিশ ঘণ্টা (মিটিং)',
    banglaHint: 'জরুরি সালিশ শুরু হলে নিজে থেকেই বাজবে',
    keywords: ['meeting', 'shalish', 'bell', 'emergency', 'adda'],
  },
  {
    id: 'event_eject',
    category: 'event',
    defaultLabel: 'পুকুর চুবানি (সাধারণ)',
    banglaHint: 'ভোটে পাড়াবাসীকে পুকুরে ফেললে বাজবে',
    keywords: ['eject', 'throw', 'out', 'bye'],
  },
  {
    id: 'event_eject_vondo',
    category: 'event',
    isVoicePack: true,
    defaultLabel: 'ভুল হইছে ক্ষমা দেন! (বাটপার চুবানি)',
    banglaHint: 'আসল বাটপারকে পুকুরে চুবানি দিলে নিজে থেকেই বাজবে!',
    defaultAudioUrl: '/assets/memes/amar_vul_hoyeche_khoma_kore_den.mp3',
    keywords: ['vul', 'khoma', 'vondo', 'batpar', 'eject'],
  },
  {
    id: 'event_sabotage',
    category: 'event',
    defaultLabel: 'কারেন্ট / ওয়াই-ফাই কাট',
    banglaHint: 'লোডশেডিং বা ওয়াই-ফাই নাশকতার সময় বাজবে',
    keywords: ['sabotage', 'current', 'wifi', 'power', 'alarm'],
  },
  {
    id: 'event_shield',
    category: 'event',
    defaultLabel: 'তাবিজ বাঁচিয়ে দিয়েছে',
    banglaHint: 'কবিরাজের তাবিজ ঢাল কাউকে বাঁচালে বাজবে',
    keywords: ['shield', 'tabiz', 'save', 'block'],
  },
  {
    id: 'event_daroga',
    category: 'event',
    defaultLabel: 'দারোগা গুলি শট',
    banglaHint: 'পাড়া দারোগা সন্দেহভাজনকে গুলি করলে বাজবে',
    keywords: ['daroga', 'police', 'sheriff', 'gun', 'shot'],
  },
  {
    id: 'event_clean',
    category: 'event',
    defaultLabel: 'ঝাড়ুদার লাশ গায়েব',
    banglaHint: 'ঝাড়ুদার পড়ে থাকা লাশ পরিষ্কার করলে বাজবে',
    keywords: ['clean', 'sweep', 'jharudar', 'janitor'],
  },
  {
    id: 'event_revive',
    category: 'event',
    defaultLabel: 'ডাক্তার স্যালাইন রিভাইভ',
    banglaHint: 'পাড়া ডাক্তার পড়ে থাকা প্রতিবেশীকে বাঁচালে বাজবে',
    keywords: ['revive', 'daktar', 'doctor', 'saline', 'heal'],
  },
  {
    id: 'event_task',
    category: 'event',
    defaultLabel: 'কাজ সম্পন্ন',
    banglaHint: 'মহল্লার যেকোনো কাজ শেষ করলে বাজবে',
    keywords: ['task', 'kaaj', 'complete', 'done'],
  },
  {
    id: 'event_vent',
    category: 'event',
    defaultLabel: 'ড্রেনে ঢোকা (ভেন্ট)',
    banglaHint: 'ড্রেন সুড়ঙ্গে ঢুকলে বাজবে',
    keywords: ['vent', 'dren', 'drain'],
  },
  {
    id: 'event_jump',
    category: 'event',
    defaultLabel: 'মহল্লা লাফ সাউন্ড',
    banglaHint: 'লাফ [Space] চাপলে ঐচ্ছিক কাস্টম সাউন্ড বাজবে',
    keywords: ['jump', 'boing', 'laf'],
  },
  {
    id: 'event_win',
    category: 'event',
    defaultLabel: 'জিতে গেছি! (বিজয়)',
    banglaHint: 'ম্যাচ জিতলে নিজে থেকেই বাজবে',
    keywords: ['win', 'victory', 'jitsi', 'champ'],
  },
  {
    id: 'event_loss',
    category: 'event',
    defaultLabel: 'খেলা শেষ (পরাজয়)',
    banglaHint: 'ম্যাচ হারলে নিজে থেকেই বাজবে',
    keywords: ['loss', 'lose', 'defeat', 'fail'],
  },
];

export interface StoredMemeMeta {
  fileName: string;
  mimeType: string;
  customLabel?: string;
  updatedAt: number;
}

interface StoredClipRecord {
  slotId: MemeSlotId;
  fileName: string;
  mimeType: string;
  buffer: ArrayBuffer;
  updatedAt: number;
}

const DB_NAME = 'ke_batpar_meme_pack';
const DB_VERSION = 1;
const STORE_NAME = 'clips';
const META_STORAGE_KEY = 'ke_batpar_meme_meta_v1';

const metaMap = new Map<MemeSlotId, StoredMemeMeta>();
const rawBufferMap = new Map<MemeSlotId, ArrayBuffer>();
const listeners = new Set<() => void>();
let initPromise: Promise<void> | null = null;

function notifyListeners(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // ignore
    }
  }
}

function loadMetaFromLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, StoredMemeMeta>;
    for (const [key, val] of Object.entries(parsed)) {
      if (val && typeof val === 'object') {
        metaMap.set(key as MemeSlotId, val);
      }
    }
  } catch {
    // ignore corrupted local storage
  }
}

function saveMetaToLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, StoredMemeMeta> = {};
    for (const [k, v] of metaMap.entries()) {
      obj[k] = v;
    }
    window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore storage quota errors
  }
}

loadMetaFromLocalStorage();

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'slotId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export interface ServerMemeEntry {
  slotId: MemeSlotId;
  fileName: string;
  mimeType: string;
  customLabel?: string;
  updatedAt: number;
  hasFile: boolean;
}

export interface ServerMemeManifestResponse {
  requiresPin: boolean;
  clips: Record<string, ServerMemeEntry>;
}

const serverClipSet = new Set<MemeSlotId>();
let serverRequiresPin = false;

export function isServerClip(slotId: MemeSlotId): boolean {
  return serverClipSet.has(slotId);
}

export function getServerClipCount(): number {
  return serverClipSet.size;
}

export function doesServerRequirePin(): boolean {
  return serverRequiresPin;
}

export async function syncServerMemePack(): Promise<void> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  try {
    const res = await fetch(getApiUrl('/api/memes'), { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as ServerMemeManifestResponse;
    serverRequiresPin = Boolean(data.requiresPin);
    const clips = data.clips ?? {};

    const incomingServerIds = new Set<MemeSlotId>();
    for (const [slotKey, entry] of Object.entries(clips)) {
      const slotId = slotKey as MemeSlotId;
      if (!MEME_SLOTS.some((s) => s.id === slotId)) continue;
      if (entry.hasFile) {
        incomingServerIds.add(slotId);
        const curMeta = metaMap.get(slotId);
        const needsDownload =
          !rawBufferMap.has(slotId) || !curMeta || curMeta.updatedAt < entry.updatedAt;
        if (needsDownload) {
          const audioRes = await fetch(
            getApiUrl(`/api/memes/file/${encodeURIComponent(slotId)}?t=${entry.updatedAt}`),
            {
              cache: 'no-store',
            },
          );
          if (audioRes.ok) {
            const buf = await audioRes.arrayBuffer();
            rawBufferMap.set(slotId, buf);
            metaMap.set(slotId, {
              fileName: entry.fileName,
              mimeType: entry.mimeType || 'audio/mpeg',
              customLabel: entry.customLabel,
              updatedAt: entry.updatedAt,
            });
          }
        } else if (curMeta && entry.customLabel !== undefined && curMeta.customLabel !== entry.customLabel) {
          metaMap.set(slotId, { ...curMeta, customLabel: entry.customLabel });
        }
      } else if (entry.customLabel) {
        const curMeta = metaMap.get(slotId);
        metaMap.set(slotId, {
          fileName: curMeta?.fileName ?? '',
          mimeType: curMeta?.mimeType ?? '',
          customLabel: entry.customLabel,
          updatedAt: entry.updatedAt,
        });
      }
    }

    // Remove stale server clips that were deleted on the server
    for (const prevServerSlot of Array.from(serverClipSet)) {
      if (!incomingServerIds.has(prevServerSlot)) {
        rawBufferMap.delete(prevServerSlot);
        metaMap.delete(prevServerSlot);
      }
    }
    serverClipSet.clear();
    for (const id of incomingServerIds) serverClipSet.add(id);

    saveMetaToLocalStorage();
    notifyListeners();
  } catch {
    // Offline or standalone fallback cleanly continues using local IndexedDB
  }
}

export async function initMemePackStore(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const db = await openDb();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => {
            const rows = (req.result as StoredClipRecord[]) ?? [];
            for (const r of rows) {
              if (r?.slotId && r.buffer instanceof ArrayBuffer) {
                rawBufferMap.set(r.slotId, r.buffer);
                const existingMeta = metaMap.get(r.slotId);
                metaMap.set(r.slotId, {
                  fileName: r.fileName,
                  mimeType: r.mimeType,
                  customLabel: existingMeta?.customLabel,
                  updatedAt: r.updatedAt,
                });
              }
            }
            saveMetaToLocalStorage();
            notifyListeners();
            resolve();
          };
          req.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
    await syncServerMemePack();
  })();
  return initPromise;
}

export function subscribeMemePack(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getSlotMeta(slotId: MemeSlotId): StoredMemeMeta | undefined {
  return metaMap.get(slotId);
}

export function getSlotDisplayLabel(slotId: MemeSlotId): string {
  const custom = metaMap.get(slotId)?.customLabel?.trim();
  if (custom) return custom;
  const def = MEME_SLOTS.find((s) => s.id === slotId);
  return def?.defaultLabel ?? slotId;
}

export function getRawClipBuffer(slotId: MemeSlotId): ArrayBuffer | undefined {
  return rawBufferMap.get(slotId);
}

export function hasCustomClip(slotId: MemeSlotId): boolean {
  return rawBufferMap.has(slotId);
}

export function getLoadedCustomCount(): number {
  return rawBufferMap.size;
}

export function stripAudioExtension(fileName: string): string {
  return fileName.replace(/\.(mp3|wav|ogg|m4a|webm|aac|flac)$/i, '').replace(/[_-]+/g, ' ').trim();
}

export async function setSlotAudioClip(
  slotId: MemeSlotId,
  fileName: string,
  mimeType: string,
  buffer: ArrayBuffer,
  customLabel?: string,
): Promise<void> {
  const copy = buffer.slice(0);
  const updatedAt = Date.now();
  rawBufferMap.set(slotId, copy);
  const prevMeta = metaMap.get(slotId);
  const meta = MEME_SLOTS.find((s) => s.id === slotId);
  const autoQuickLabel =
    meta?.category === 'quick'
      ? customLabel ?? prevMeta?.customLabel ?? stripAudioExtension(fileName).slice(0, 22)
      : customLabel ?? prevMeta?.customLabel;

  metaMap.set(slotId, {
    fileName,
    mimeType: mimeType || 'audio/mpeg',
    customLabel: autoQuickLabel,
    updatedAt,
  });
  saveMetaToLocalStorage();
  notifyListeners();

  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({
        slotId,
        fileName,
        mimeType: mimeType || 'audio/mpeg',
        buffer: copy,
        updatedAt,
      } satisfies StoredClipRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function setSlotCustomLabel(slotId: MemeSlotId, label: string): void {
  const clean = label.trim().slice(0, 24);
  const prev = metaMap.get(slotId);
  if (prev) {
    metaMap.set(slotId, { ...prev, customLabel: clean || undefined });
  } else if (clean) {
    metaMap.set(slotId, {
      fileName: '',
      mimeType: '',
      customLabel: clean,
      updatedAt: Date.now(),
    });
  }
  saveMetaToLocalStorage();
  notifyListeners();
}

export async function clearSlotClip(slotId: MemeSlotId): Promise<void> {
  rawBufferMap.delete(slotId);
  metaMap.delete(slotId);
  saveMetaToLocalStorage();
  notifyListeners();

  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(slotId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function clearAllClips(): Promise<void> {
  rawBufferMap.clear();
  metaMap.clear();
  saveMetaToLocalStorage();
  notifyListeners();

  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function matchFilenameToSlot(fileName: string, alreadyUsed: Set<MemeSlotId>): MemeSlotId | null {
  const low = fileName.toLowerCase();
  for (const slot of MEME_SLOTS) {
    if (alreadyUsed.has(slot.id)) continue;
    if (slot.keywords.some((kw) => low.includes(kw))) {
      return slot.id;
    }
  }
  for (const slot of MEME_SLOTS) {
    if (slot.category === 'quick' && !alreadyUsed.has(slot.id)) {
      return slot.id;
    }
  }
  for (const slot of MEME_SLOTS) {
    if (!alreadyUsed.has(slot.id)) {
      return slot.id;
    }
  }
  return null;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes.buffer;
}

export interface ExportedMemePack {
  version: 1;
  app: 'ke-batpar';
  clips: Array<{
    slotId: MemeSlotId;
    fileName: string;
    mimeType: string;
    customLabel?: string;
    dataBase64: string;
  }>;
}

export function exportMemePackJson(): string {
  const clips: ExportedMemePack['clips'] = [];
  for (const [slotId, buffer] of rawBufferMap.entries()) {
    const meta = metaMap.get(slotId);
    clips.push({
      slotId,
      fileName: meta?.fileName || `${slotId}.mp3`,
      mimeType: meta?.mimeType || 'audio/mpeg',
      customLabel: meta?.customLabel,
      dataBase64: arrayBufferToBase64(buffer),
    });
  }
  const payload: ExportedMemePack = {
    version: 1,
    app: 'ke-batpar',
    clips,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importMemePackJson(jsonText: string): Promise<number> {
  const parsed = JSON.parse(jsonText) as Partial<ExportedMemePack>;
  if (!parsed || !Array.isArray(parsed.clips)) {
    throw new Error('ভুল মিম প্যাক JSON ফাইল।');
  }
  let imported = 0;
  for (const c of parsed.clips) {
    if (!c?.slotId || !c.dataBase64) continue;
    const valid = MEME_SLOTS.some((s) => s.id === c.slotId);
    if (!valid) continue;
    const buf = base64ToArrayBuffer(c.dataBase64);
    await setSlotAudioClip(
      c.slotId,
      c.fileName || `${c.slotId}.mp3`,
      c.mimeType || 'audio/mpeg',
      buf,
      c.customLabel,
    );
    imported++;
  }
  return imported;
}

export async function uploadSlotAudioToServer(
  slotId: MemeSlotId,
  fileName: string,
  mimeType: string,
  buffer: ArrayBuffer,
  customLabel?: string,
  adminPin?: string,
): Promise<{ ok: boolean; error?: string }> {
  await setSlotAudioClip(slotId, fileName, mimeType, buffer, customLabel);
  try {
    const res = await fetch(getApiUrl(`/api/admin/memes/${encodeURIComponent(slotId)}`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(adminPin ? { 'x-admin-passcode': adminPin } : {}),
      },
      body: JSON.stringify({
        fileName,
        mimeType: mimeType || 'audio/mpeg',
        customLabel: customLabel ?? metaMap.get(slotId)?.customLabel,
        dataBase64: arrayBufferToBase64(buffer),
      }),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: errBody.error || `সার্ভার ত্রুটি (${res.status})` };
    }
    serverClipSet.add(slotId);
    notifyListeners();
    return { ok: true };
  } catch {
    return { ok: false, error: 'ব্রাউজারে সেভ হয়েছে; সার্ভারের সাথে সংযোগ মেলেনি।' };
  }
}

export async function saveSlotLabelToServer(
  slotId: MemeSlotId,
  customLabel: string,
  adminPin?: string,
): Promise<{ ok: boolean; error?: string }> {
  setSlotCustomLabel(slotId, customLabel);
  try {
    const res = await fetch(getApiUrl(`/api/admin/memes/${encodeURIComponent(slotId)}`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(adminPin ? { 'x-admin-passcode': adminPin } : {}),
      },
      body: JSON.stringify({
        customLabel: customLabel.trim().slice(0, 24),
        labelOnly: true,
      }),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: errBody.error || `সার্ভার ত্রুটি (${res.status})` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'নাম ব্রাউজারে সেভ হয়েছে।' };
  }
}

export async function deleteSlotAudioFromServer(
  slotId: MemeSlotId,
  adminPin?: string,
): Promise<{ ok: boolean; error?: string }> {
  await clearSlotClip(slotId);
  serverClipSet.delete(slotId);
  notifyListeners();
  try {
    const res = await fetch(getApiUrl(`/api/admin/memes/${encodeURIComponent(slotId)}`), {
      method: 'DELETE',
      headers: adminPin ? { 'x-admin-passcode': adminPin } : undefined,
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: errBody.error || `সার্ভার ত্রুটি (${res.status})` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'ব্রাউজার থেকে মুছে ফেলা হয়েছে।' };
  }
}

export async function clearAllServerMemes(
  adminPin?: string,
): Promise<{ ok: boolean; error?: string }> {
  await clearAllClips();
  serverClipSet.clear();
  notifyListeners();
  try {
    const res = await fetch(getApiUrl('/api/admin/memes/clear'), {
      method: 'POST',
      headers: adminPin ? { 'x-admin-passcode': adminPin } : undefined,
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: errBody.error || `সার্ভার ত্রুটি (${res.status})` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'লোকাল ক্লিপগুলো মুছে ফেলা হয়েছে।' };
  }
}
