export type GamePhase =
  | 'title'
  | 'lobby'
  | 'role_reveal'
  | 'playing'
  | 'meeting'
  | 'vote_results'
  | 'ejecting'
  | 'paused'
  | 'gameover';

export type PlayerRole = 'parabasi' | 'vondo';

export type SpecialRole =
  | 'none'
  | 'goyenda'
  | 'kobiraj'
  | 'mistri'
  | 'daroga'
  | 'neta'
  | 'daktar'
  | 'ghotok_khala'
  | 'master_moshai'
  | 'cctv_kaku'
  | 'hatur_daktar'
  | 'bohurupi'
  | 'jharudar'
  | 'supari_killer'
  | 'dalal'
  | 'pagol'
  | 'chamcha'
  | 'chandabaz'
  | 'tiktok_star';

export interface SpecialRoleMeta {
  id: SpecialRole;
  title: string;
  banglaTitle: string;
  faction: 'parabasi' | 'vondo' | 'neutral';
  accentHex: string;
  abilityLabel: string;
  shortDesc: string;
}

export const SPECIAL_ROLES: Record<SpecialRole, SpecialRoleMeta> = {
  none: {
    id: 'none',
    title: 'পাড়াবাসী',
    banglaTitle: 'পাড়াবাসী',
    faction: 'parabasi',
    accentHex: '#38bdf8',
    abilityLabel: 'কাজ সম্পন্ন করো',
    shortDesc: 'মহল্লার সব কাজ শেষ করো আর সালিশে আসল বাটপারকে ধরিয়ে দাও!',
  },
  goyenda: {
    id: 'goyenda',
    title: 'গোয়েন্দা মফিজ',
    banglaTitle: 'গোয়েন্দা মফিজ',
    faction: 'parabasi',
    accentHex: '#22d3ee',
    abilityLabel: 'গোয়েন্দা স্ক্যান [G]',
    shortDesc: 'পাড়ার পায়ের ছাপ দেখতে পাবে আর লাশ স্ক্যান করে খুনির রঙের সূত্র বের করতে পারবে!',
  },
  kobiraj: {
    id: 'kobiraj',
    title: 'কবিরাজ (তাবিজ বাবা)',
    banglaTitle: 'তাবিজ বাবা',
    faction: 'parabasi',
    accentHex: '#34d399',
    abilityLabel: 'তাবিজ ঢাল [G]',
    shortDesc: 'পাড়াবাসীকে সোনার তাবিজের সুরক্ষা দাও — একবার বাটপারের হামলা থেকে বাঁচাবে!',
  },
  mistri: {
    id: 'mistri',
    title: 'মিস্ত্রি বাবু',
    banglaTitle: 'মিস্ত্রি বাবু',
    faction: 'parabasi',
    accentHex: '#fbbf24',
    abilityLabel: 'ড্রেনে ঢোকো [V]',
    shortDesc: 'ড্রেনের পাইপ দিয়ে চলাচল করতে পারবে আর দূর থেকেই ডেসকো ও ওয়াইফাই লাইন ঠিক করতে পারবে!',
  },
  daroga: {
    id: 'daroga',
    title: 'পাড়া দারোগা',
    banglaTitle: 'পাড়া দারোগা',
    faction: 'parabasi',
    accentHex: '#f97316',
    abilityLabel: 'বাটপার গ্রেপ্তার [G]',
    shortDesc: 'আসল বাটপারকে ধরতে পারলে এক গুলিতেই খতম! কিন্তু নির্দোষ পাড়াবাসীকে মারলে নিজেই বাদ পড়বে!',
  },
  neta: {
    id: 'neta',
    title: 'মহল্লা নেতা',
    banglaTitle: 'মহল্লা নেতা',
    faction: 'parabasi',
    accentHex: '#facc15',
    abilityLabel: '২ গুণ ভোট ও বাড়তি ঘণ্টা',
    shortDesc: 'সালিশে তোমার ভোট ২টি হিসেবে গণনা হবে এবং বাড়তি ১টি জরুরি সালিশ ঘণ্টা পাবে!',
  },
  daktar: {
    id: 'daktar',
    title: 'পাড়া ডাক্তার',
    banglaTitle: 'পাড়া ডাক্তার',
    faction: 'parabasi',
    accentHex: '#2dd4bf',
    abilityLabel: 'স্যালাইন দাও [G]',
    shortDesc: 'ম্যাচে ১ বার রিপোর্ট না হওয়া পড়া প্রতিবেশীকে স্যালাইন দিয়ে জীবিত ফিরিয়ে আনতে পারবে!',
  },
  ghotok_khala: {
    id: 'ghotok_khala',
    title: 'ঘটক খালা',
    banglaTitle: 'ঘটক খালা',
    faction: 'parabasi',
    accentHex: '#f472b6',
    abilityLabel: 'মহল্লা বন্ধন [G]',
    shortDesc: '২ জন খেলোয়াড়কে ঘটক বন্ধনে জুড়ে দাও — একজন মরলেই অন্যজন ও খালা সতর্কবার্তা পাবে!',
  },
  master_moshai: {
    id: 'master_moshai',
    title: 'মাস্টার মশাই',
    banglaTitle: 'মাস্টার মশাই',
    faction: 'parabasi',
    accentHex: '#60a5fa',
    abilityLabel: 'খাতা যাচাই [G]',
    shortDesc: 'কাছের খেলোয়াড়ের খাতা পরীক্ষা করে ধরে ফেলো সে আসল পাড়াবাসী নাকি ভুয়া বাটপার!',
  },
  cctv_kaku: {
    id: 'cctv_kaku',
    title: 'সিসিটিভি কাকু',
    banglaTitle: 'সিসিটিভি কাকু',
    faction: 'parabasi',
    accentHex: '#fb923c',
    abilityLabel: 'রিমোট সিসিটিভি [G]',
    shortDesc: 'মহল্লার যেকোনো জায়গা থেকেই পকেট ফোনে লাইভ সিসিটিভি ক্যামেরা দেখতে পারবে!',
  },
  hatur_daktar: {
    id: 'hatur_daktar',
    title: 'হাতুড়ে ডাক্তার',
    banglaTitle: 'হাতুড়ে ডাক্তার',
    faction: 'parabasi',
    accentHex: '#a3e635',
    abilityLabel: 'ঝাঁঝালো ইনজেকশন [G]',
    shortDesc: 'পাড়াবাসীকে ১২ সেকেন্ডের ইনজেকশন দাও — ১২ সেকেন্ডের মধ্যে বাটপার মারলেও বেঁচে যাবে!',
  },
  bohurupi: {
    id: 'bohurupi',
    title: 'বহুরূপী বাটপার',
    banglaTitle: 'বহুরূপী বাটপার',
    faction: 'vondo',
    accentHex: '#fb7185',
    abilityLabel: 'চেহারা বদলাও [G]',
    shortDesc: 'অন্য পাড়াবাসীর ছদ্মবেশ ধরে সিসিটিভি ক্যামেরায় তাকে ফাঁসিয়ে দাও!',
  },
  jharudar: {
    id: 'jharudar',
    title: 'সাফাই বাটপার',
    banglaTitle: 'সাফাই বাটপার',
    faction: 'vondo',
    accentHex: '#f43f5e',
    abilityLabel: 'লাশ গায়েব [G]',
    shortDesc: 'শিকার করার পর পড়ে থাকা লাশ ঝাড়ু দিয়ে গায়েব করে দাও যাতে কেউ রিপোর্ট করতে না পারে!',
  },
  supari_killer: {
    id: 'supari_killer',
    title: 'সুপারি কিলার',
    banglaTitle: 'সুপারি কিলার',
    faction: 'vondo',
    accentHex: '#ef4444',
    abilityLabel: 'সুপারি বদল [G]',
    shortDesc: 'চিহ্নিত সুপারি টার্গেটকে খতম করলে পরের কিল কুলডাউন অর্ধেক (৫০%) কমে যাবে!',
  },
  dalal: {
    id: 'dalal',
    title: 'দালাল বাটপার',
    banglaTitle: 'দালাল বাটপার',
    faction: 'vondo',
    accentHex: '#dc2626',
    abilityLabel: 'দালাল জ্যাম [G]',
    shortDesc: 'দোকানের শাটার বন্ধের সময় +৮ সেকেন্ড বাড়ায় ও ১০ সেকেন্ডের জন্য রাডার-ভাইটালস অচল করে!',
  },
  pagol: {
    id: 'pagol',
    title: 'পাগলা বাবা',
    banglaTitle: 'পাগলা বাবা',
    faction: 'neutral',
    accentHex: '#c084fc',
    abilityLabel: 'ভোটের ফাঁদ পাতো',
    shortDesc: 'নিরপেক্ষ চরিত্র! সবাইকে সন্দেহে ফেলে নিজেকে পুকুরে চুবানি খাওয়াতে পারলেই জয়!',
  },
  chamcha: {
    id: 'chamcha',
    title: 'চামচা',
    banglaTitle: 'চামচা',
    faction: 'neutral',
    accentHex: '#a855f7',
    abilityLabel: 'বস বাছাই [G]',
    shortDesc: 'একজন দাদা বা আপাকে নিজের বস বানাও! বেঁচে থেকে বসের দল জিতলে তুমিও সহ-বিজয়ী!',
  },
  chandabaz: {
    id: 'chandabaz',
    title: 'চাঁদাবাজ',
    banglaTitle: 'চাঁদাবাজ',
    faction: 'neutral',
    accentHex: '#eab308',
    abilityLabel: 'চাঁদা আদায় [G]',
    shortDesc: 'সব জীবিত প্রতিবেশীর কাছ থেকে গোপনে চাঁদা তুলে টিকে থাকো — শিকার জানাজানি হলেই বিপদ!',
  },
  tiktok_star: {
    id: 'tiktok_star',
    title: 'টিকটক স্টার',
    banglaTitle: 'টিকটক স্টার',
    faction: 'neutral',
    accentHex: '#ec4899',
    abilityLabel: 'রিল শুট [G]',
    shortDesc: 'মহল্লার ৩টি আলাদা এলাকায় ভাইরাল রিল বানাও আর শেষ ৪ জনে টিকে থাকলেই একক জয়!',
  },
};

export type PlayerColorId =
  | 'lal'
  | 'neel'
  | 'shobuj'
  | 'holud'
  | 'beguni'
  | 'komola'
  | 'sada'
  | 'kalo'
  | 'golapi'
  | 'akashi'
  | 'badami'
  | 'tute'
  | 'jam'
  | 'olive'
  | 'tan'
  | 'korolla'
  | 'firoza'
  | 'sindur'
  | 'mehedi'
  | 'chandan';

export interface PlayerColorSpec {
  id: PlayerColorId;
  label: string;
  banglaName: string;
  hex: string;
  visorTint: string;
}

export const PLAYER_COLORS: PlayerColorSpec[] = [
  { id: 'lal', label: 'Lal Mia', banglaName: 'লাল মিয়া', hex: '#e11d48', visorTint: '#7dd3fc' },
  { id: 'neel', label: 'Neel Babu', banglaName: 'নীল বাবু', hex: '#2563eb', visorTint: '#bae6fd' },
  { id: 'shobuj', label: 'Shobuj Bhai', banglaName: 'সবুজ ভাই', hex: '#16a34a', visorTint: '#a7f3d0' },
  { id: 'holud', label: 'Holud Chacha', banglaName: 'হলুদ চাচা', hex: '#eab308', visorTint: '#fef08a' },
  { id: 'beguni', label: 'Beguni Apa', banglaName: 'বেগুনি আপা', hex: '#9333ea', visorTint: '#e9d5ff' },
  { id: 'komola', label: 'Komola Kaku', banglaName: 'কমলা কাকু', hex: '#ea580c', visorTint: '#fed7aa' },
  { id: 'sada', label: 'Sada Dada', banglaName: 'সাদা দাদা', hex: '#e2e8f0', visorTint: '#38bdf8' },
  { id: 'kalo', label: 'Kalo Ustad', banglaName: 'কালো ওস্তাদ', hex: '#334155', visorTint: '#67e8f9' },
  { id: 'golapi', label: 'Golapi Rani', banglaName: 'গোলাপি রানী', hex: '#ec4899', visorTint: '#fbcfe8' },
  { id: 'akashi', label: 'Akashi Tara', banglaName: 'আকাশী তারা', hex: '#06b6d4', visorTint: '#cffafe' },
  { id: 'badami', label: 'Badami Mama', banglaName: 'বাদামী মামা', hex: '#92400e', visorTint: '#fde68a' },
  { id: 'tute', label: 'Tute Chacha', banglaName: 'তুতে চাচা', hex: '#14b8a6', visorTint: '#ccfbf1' },
  { id: 'jam', label: 'Jam Kaka', banglaName: 'জাম কাকা', hex: '#6d28d9', visorTint: '#ddd6fe' },
  { id: 'olive', label: 'Pata Bhai', banglaName: 'পাতা ভাই', hex: '#65a30d', visorTint: '#ecfccb' },
  { id: 'tan', label: 'Sona Babu', banglaName: 'সোনা বাবু', hex: '#d97706', visorTint: '#fef3c7' },
  { id: 'korolla', label: 'Korolla Kaka', banglaName: 'করলা কাকা', hex: '#047857', visorTint: '#a7f3d0' },
  { id: 'firoza', label: 'Firoza Apu', banglaName: 'ফিরোজা আপু', hex: '#0ea5e9', visorTint: '#e0f2fe' },
  { id: 'sindur', label: 'Sindur Dada', banglaName: 'সিঁদুর দাদা', hex: '#ef4444', visorTint: '#fecaca' },
  { id: 'mehedi', label: 'Mehedi Mamu', banglaName: 'মেহেদি মামু', hex: '#4d7c0f', visorTint: '#d9f99d' },
  { id: 'chandan', label: 'Chandan Bhai', banglaName: 'চন্দন ভাই', hex: '#f59e0b', visorTint: '#fef3c7' },
];

export type TaskKind =
  | 'cha_mix'
  | 'fuse_fix'
  | 'rickshaw_pump'
  | 'dish_tune'
  | 'bazar_hisab'
  | 'pukur_check'
  | 'fuchka_serve'
  | 'saloon_trim'
  | 'cricket_tape'
  | 'pharmacy_mix'
  | 'pandal_dj'
  | 'kacchi_cook'
  | 'cyber_pc'
  | 'dorji_stitch'
  | 'gym_lift'
  | 'book_sort'
  | 'rail_signal';

export type TaskCategory = 'common' | 'short' | 'long';
export type TaskMedium = 'physical' | 'digital';

export interface TaskStation {
  id: string;
  kind: TaskKind;
  title: string;
  banglaTitle: string;
  zoneName: string;
  x: number;
  z: number;
  radius: number;
  category: TaskCategory;
  medium: TaskMedium;
  holdDurationSec: number;
  isVisual?: boolean;
}

export interface VentNode {
  id: string;
  label: string;
  x: number;
  z: number;
  targetIds: string[];
}

export interface WallAABB {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  zone?: string;
}

export type DoorZoneId = 'cha_dokan' | 'rickshaw_garage' | 'desco_power' | 'dish_roof';

export interface DoorSpec {
  id: string;
  zoneId: DoorZoneId;
  label: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

export interface ZoneDef {
  id: string;
  name: string;
  banglaName: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  color: string;
}

export interface SecurityCamDef {
  id: string;
  label: string;
  zoneId: string;
  camX: number;
  camZ: number;
  viewCenterX: number;
  viewCenterZ: number;
  viewRadius: number;
}

export interface RoofDeckDef {
  id: string;
  zoneId: string;
  label: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  elevationY: number;
  stairOpenings: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
}

export interface StairRampDef {
  id: string;
  roofId: string;
  label: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  axis: 'x' | 'z';
  bottomCoord: number;
  topCoord: number;
  topY: number;
  steps: number;
}

export interface PlayerTaskState {
  taskId: string;
  completed: boolean;
  isFake?: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  color: PlayerColorId;
  x: number;
  z: number;
  y?: number;
  vx: number;
  vz: number;
  yaw: number;
  role: PlayerRole;
  specialRole: SpecialRole;
  alive: boolean;
  inVent: boolean;
  watchingCams: boolean;
  visualTaskTimer: number; // >0 shows 3D scan/steam visual task effect within 6m
  abilityCooldown: number;
  shielded: boolean;
  disguiseColor: PlayerColorId | null;
  disguiseName: string | null;
  disguiseTimer: number;
  isBot: boolean;
  isHost: boolean;
  ready: boolean;
  pingMs?: number;
  tasks: PlayerTaskState[];
  killCooldownRemaining: number;
  emergencyMeetingsLeft: number;
  scansLeft?: number;
  shotsLeft?: number;
  cleansLeft?: number;
  revivesLeft?: number;
  pranksLeft?: number;
  jharuTargetBodyId?: string | null;
  jharuTimer?: number;
  haturProtectedUntil?: number;
  supariTargetId?: string | null;
  chamchaPatronId?: string | null;
  chandabazTargets?: string[];
  tiktokZones?: string[];
  ghotokPartnerId?: string | null;
  votedFor: string | null; // playerId | 'skip' | null
  hasVoted: boolean;
  vehicleId?: string | null;
}

export type VehicleKind = 'motorbike' | 'rickshaw' | 'cng' | 'car' | 'taxi' | 'pickup' | 'minibus';

export interface VehicleSpec {
  kind: VehicleKind;
  label: string;
  banglaName: string;
  maxSpeed: number;
  reverseSpeed: number;
  accel: number;
  turnRate: number;
  collisionRadius: number;
  seatOffsetX: number;
  seatOffsetY: number;
  seatOffsetZ: number;
  seatTiltX?: number;
}

export interface VehicleState {
  id: string;
  kind: VehicleKind;
  x: number;
  z: number;
  yaw: number;
  vx: number;
  vz: number;
  speed: number;
  steer: number;
  driverId: string | null;
  color: string;
}

export interface BodyMarker {
  id: string;
  victimId: string;
  victimName: string;
  color: PlayerColorId;
  x: number;
  z: number;
  reported: boolean;
  killedAt: number;
  killerColorHint: string;
  killerZoneHint: string;
}

export interface FootprintDot {
  id: string;
  x: number;
  z: number;
  color: PlayerColorId;
  expiresAt: number;
}

export type SabotageType = 'loadshedding' | 'wifi_down' | 'gas_leak';
export type SabotageSeverity = 'non_critical' | 'critical';

export interface GasValveState {
  id: 'valve_cha' | 'valve_rickshaw';
  label: string;
  zoneName: string;
  x: number;
  z: number;
  holderId: string | null;
}

export interface SabotageState {
  active: SabotageType | null;
  kind: SabotageSeverity | null;
  timeRemaining: number;
  fixStationX: number;
  fixStationZ: number;
  fixProgress: number; // 0..1 progress while holding E at fix station or both gas valves
  fixerId: string | null;
  valves: GasValveState[];
  cooldownRemaining: number;
}

export interface DoorLockState {
  cha_dokan: number; // seconds remaining
  rickshaw_garage: number;
  desco_power: number;
  dish_roof: number;
  cooldownRemaining: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: PlayerColorId;
  text: string;
  timestamp: number;
  system?: boolean;
  ghostOnly?: boolean;
}

export interface EjectionInfo {
  ejectedId: string | null;
  ejectedName: string | null;
  ejectedColor: PlayerColorId | null;
  wasVondo: boolean;
  wasSpecialRole: SpecialRole;
  reason: 'voted' | 'tie' | 'skipped';
  remainingVondos: number;
  confirmEjects: boolean;
}

export interface RoomSettings {
  vondoCount: number;
  killCooldownSec: number;
  meetingTimeSec: number;
  discussionTimeSec: number;
  moveSpeed: number;
  tasksPerPlayer: number;
  emergencyCooldownSec: number;
  emergencyMeetingsPerPlayer: number;
  confirmEjects: boolean;
  anonymousVotes: boolean;
  visualTasks: boolean;
  enableSpecialRoles: boolean;
  enableNeutralRoles: boolean;
  autoFillBots: boolean;
}

export type MatchOutcomeReason =
  | 'pagol_ejected'
  | 'chandabaz_extorted'
  | 'tiktok_viral'
  | 'tasks_completed'
  | 'batpars_out'
  | 'batpars_outnumber'
  | 'critical_sabotage_timeout';

export interface MatchOutcome {
  winner: 'parabasi' | 'vondo' | 'pagol' | 'chandabaz' | 'tiktok_star';
  reason: MatchOutcomeReason;
  winnerPlayerId?: string;
  winnerPlayerName?: string;
  coWinnerIds?: string[];
  coWinnerNames?: string[];
}

export interface RoomSnapshot {
  roomCode: string;
  isSolo?: boolean;
  phase: 'lobby' | 'role_reveal' | 'playing' | 'meeting' | 'vote_results' | 'ejecting' | 'gameover';
  players: PlayerState[];
  bodies: BodyMarker[];
  footprints: FootprintDot[];
  sabotage: SabotageState;
  doorLocks: DoorLockState;
  chat: ChatMessage[];
  lobbyChat?: ChatMessage[];
  lobbyCountdownSec?: number | null;
  hostAbortedReason?: string | null;
  netaRevealedId?: string | null;
  prankedLampUntil?: number;
  commsJammedUntil?: number;
  ghotokLinkedIds?: [string, string] | null;
  meetingCallerId: string | null;
  meetingReason: 'body' | 'emergency' | null;
  meetingTimer: number;
  discussionTimer?: number;
  emergencyCooldownRemaining: number;
  ejection: EjectionInfo | null;
  outcome: MatchOutcome | null;
  settings: RoomSettings;
  taskProgress: number;
  totalTasks: number;
  completedTasks: number;
  typingPlayerIds?: string[];
  vehicles?: VehicleState[];
}

export interface PublicRoomSummary {
  roomCode: string;
  playerCount: number;
  maxPlayers: number;
  phase: string;
  hostName: string;
}

export type ClientMessage =
  | { type: 'room:create'; name: string; color: PlayerColorId }
  | { type: 'room:join'; roomCode: string; name: string; color: PlayerColorId; reconnectToken?: string }
  | { type: 'room:list' }
  | { type: 'lobby:settings'; settings: Partial<RoomSettings> }
  | { type: 'lobby:customize'; name?: string; color?: PlayerColorId }
  | { type: 'lobby:ready'; ready: boolean }
  | { type: 'lobby:kick'; targetPlayerId: string }
  | { type: 'lobby:chat'; text: string }
  | { type: 'lobby:add_bot' }
  | { type: 'lobby:remove_bot'; targetPlayerId?: string }
  | { type: 'lobby:remove_bots' }
  | { type: 'lobby:start' }
  | { type: 'lobby:cancel_start' }
  | { type: 'player:move'; x: number; z: number; y?: number; vx: number; vz: number; yaw: number }
  | { type: 'player:task_complete'; taskId: string }
  | { type: 'player:visual_task_start'; taskId: string }
  | { type: 'player:kill'; targetId: string }
  | { type: 'player:vent_toggle'; ventId?: string; destinationVentId?: string }
  | { type: 'player:use_ability'; targetId?: string }
  | { type: 'player:sabotage'; sabotageType: SabotageType }
  | { type: 'player:lock_doors'; zoneId: DoorZoneId }
  | { type: 'player:fix_sabotage'; holding?: boolean; valveId?: 'valve_cha' | 'valve_rickshaw' }
  | { type: 'player:watch_cams'; watching: boolean }
  | { type: 'player:report_body'; bodyId: string }
  | { type: 'player:emergency_meeting' }
  | { type: 'meeting:chat'; text: string }
  | { type: 'meeting:typing'; typing: boolean }
  | { type: 'meeting:vote'; targetId: string | 'skip' }
  | { type: 'player:meme_sfx'; memeId: string }
  | { type: 'player:vehicle_toggle'; vehicleId?: string }
  | {
      type: 'player:vehicle_drive';
      vehicleId: string;
      x: number;
      z: number;
      yaw: number;
      vx: number;
      vz: number;
      speed: number;
      steer: number;
    }
  | { type: 'player:vehicle_horn' }
  | { type: 'room:play_again' }
  | { type: 'room:leave' };

export type ServerMessage =
  | { type: 'room:joined'; playerId: string; snapshot: RoomSnapshot; reconnectToken?: string }
  | { type: 'room:list_result'; rooms: PublicRoomSummary[] }
  | { type: 'room:state'; snapshot: RoomSnapshot }
  | { type: 'room:error'; message: string }
  | { type: 'room:kicked'; message: string }
  | { type: 'clue:result'; title: string; detail: string }
  | { type: 'meme:play'; memeId: string }
  | { type: 'memes:updated'; updatedAt: number }
  | {
      type: 'sfx:event';
      kind:
        | 'kill'
        | 'report'
        | 'meeting'
        | 'sabotage'
        | 'sabotage_critical'
        | 'task'
        | 'eject'
        | 'vent'
        | 'door'
        | 'shield'
        | 'disguise'
        | 'daroga'
        | 'clean'
        | 'revive'
        | 'clue'
        | 'prank'
        | 'lobby_join'
        | 'lobby_ready'
        | 'lobby_tick'
        | 'lobby_start'
        | 'vehicle_horn';
      vehicleKind?: VehicleKind;
    };

