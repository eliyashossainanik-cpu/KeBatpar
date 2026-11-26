import type {
  BodyMarker,
  DoorLockState,
  DoorZoneId,
  EjectionInfo,
  MatchOutcome,
  PlayerColorId,
  PlayerState,
  PlayerTaskState,
  RoomSettings,
  RoomSnapshot,
  SabotageSeverity,
  SabotageState,
  SabotageType,
  SpecialRole,
  VehicleState,
  VentNode,
} from './types';
import {
  distance2D,
  GAS_LEAK_VALVES,
  getZoneIdAt,
  hasLineOfSight,
  PLAYER_RADIUS,
  resolveCircleWallCollision,
  SABOTAGE_TARGETS,
  TASK_STATIONS,
  VEHICLE_SPECS,
  VENTS,
  WALLS,
} from './mapData';

export const KILL_RANGE = 2.95;
export const REPORT_RANGE = 4.2;
export const VENT_RANGE = 2.5;
export const INITIAL_KILL_COOLDOWN_SEC = 10;
export const VISUAL_TASK_VISIBLE_RANGE = 6.0;

export const SABOTAGE_INITIAL_LOCKOUT_SEC = 40;
export const SABOTAGE_COOLDOWN_SEC = 35;
export const NON_CRITICAL_SABOTAGE_DURATION_SEC = 90;
export const CRITICAL_SABOTAGE_DURATION_SEC = 75;
export const NON_CRITICAL_FIX_HOLD_SEC = 3.0;
export const GAS_VALVE_HOLD_SEC = 2.0;
export const SABOTAGE_FIX_RANGE = 3.2;
export const MISTRI_FIX_RANGE = 4.6;
export const DOOR_LOCK_DURATION_SEC = 10;
export const DOOR_LOCK_COOLDOWN_SEC = 18;

export const GOYENDA_INSPECT_RANGE = 4.6;
export const GOYENDA_SCANS_LIMIT = 2;
export const KOBIRAJ_SHIELD_RANGE = 3.8;
export const KOBIRAJ_COOLDOWN_SEC = 24;
export const MISTRI_VENT_COOLDOWN_SEC = 16;
export const MISTRI_VENT_AUDIBLE_RANGE = 8.0;
export const BOHURUPI_DISGUISE_DURATION_SEC = 14;
export const BOHURUPI_COOLDOWN_SEC = 26;
export const BOHURUPI_GLITCH_RANGE = 4.0;
export const DAROGA_ARREST_RANGE = 6.0;
export const DAROGA_COOLDOWN_SEC = 22;
export const DAKTAR_REVIVE_RANGE = 3.8;
export const DAKTAR_REVIVE_CHANNEL_SEC = 5.0;
export const JHARUDAR_CLEAN_RANGE = 3.6;
export const JHARUDAR_CLEAN_COOLDOWN_SEC = 20;
export const JHARUDAR_CLEAN_CHANNEL_SEC = 2.0;
export const JHARUDAR_CLEAN_USES = 3;

export const GHOTOK_PAIR_RANGE = 5.2;
export const GHOTOK_SECOND_RANGE = 12.0;
export const MASTER_INSPECT_RANGE = 4.2;
export const MASTER_COOLDOWN_SEC = 18;
export const CCTV_KAKU_COOLDOWN_SEC = 12;
export const HATUR_RANGE = 3.8;
export const HATUR_COOLDOWN_SEC = 24;
export const HATUR_DURATION_MS = 12000;
export const SUPARI_COOLDOWN_SEC = 20;
export const DALAL_COOLDOWN_SEC = 28;
export const DALAL_JAM_DURATION_MS = 10000;
export const DALAL_DOOR_EXTEND_SEC = 8;
export const CHAMCHA_RANGE = 6.5;
export const CHAMCHA_COOLDOWN_SEC = 10;
export const CHANDABAZ_RANGE = 2.6;
export const CHANDABAZ_COOLDOWN_SEC = 30;
export const CHANDABAZ_INITIAL_COOLDOWN_SEC = 20;
export const CHANDABAZ_GOAL = 5;
export const CHANDABAZ_WITNESS_RANGE = 7.0;
export const TIKTOK_COOLDOWN_SEC = 16;
export const TIKTOK_ZONE_GOAL = 3;
export const TIKTOK_MAX_ALIVE_TO_WIN = 4;

export const MIN_MATCH_PLAYERS = 5;
export const MAX_MATCH_PLAYERS = 20;
export const PLAYER_NAME_MAX_CHARS = 12;
export const LOBBY_CHAT_MAX_CHARS = 120;

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  vondoCount: 1,
  killCooldownSec: 18,
  meetingTimeSec: 30,
  discussionTimeSec: 15,
  moveSpeed: 9.0,
  tasksPerPlayer: 5,
  emergencyCooldownSec: 12,
  emergencyMeetingsPerPlayer: 2,
  confirmEjects: true,
  anonymousVotes: false,
  visualTasks: true,
  enableSpecialRoles: true,
  enableNeutralRoles: true,
  autoFillBots: false,
};

const BLOCKED_NAME_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'madarchod', 'bal', 'khanki', 'magi'];

export function isCriticalSabotage(type: SabotageType | null | undefined): boolean {
  return type === 'gas_leak';
}

export function getSabotageSeverity(type: SabotageType): SabotageSeverity {
  return SABOTAGE_TARGETS[type].severity;
}

export function createEmptySabotageState(cooldownRemaining = SABOTAGE_INITIAL_LOCKOUT_SEC): SabotageState {
  return {
    active: null,
    kind: null,
    timeRemaining: 0,
    fixStationX: 0,
    fixStationZ: 0,
    fixProgress: 0,
    fixerId: null,
    valves: GAS_LEAK_VALVES.map((v) => ({ ...v, holderId: null })),
    cooldownRemaining,
  };
}

export function createSabotageState(
  type: SabotageType,
  cooldownRemaining = SABOTAGE_COOLDOWN_SEC,
): SabotageState {
  const meta = SABOTAGE_TARGETS[type];
  return {
    active: type,
    kind: meta.severity,
    timeRemaining: meta.durationSec,
    fixStationX: meta.x,
    fixStationZ: meta.z,
    fixProgress: 0,
    fixerId: null,
    valves: GAS_LEAK_VALVES.map((v) => ({ ...v, holderId: null })),
    cooldownRemaining,
  };
}

export function makeEmptyDoorLocks(): DoorLockState {
  return {
    cha_dokan: 0,
    rickshaw_garage: 0,
    desco_power: 0,
    dish_roof: 0,
    cooldownRemaining: 0,
  };
}

export function findNearestGasValve(
  x: number,
  z: number,
  sabotage: SabotageState,
  range: number = SABOTAGE_FIX_RANGE,
) {
  if (sabotage.active !== 'gas_leak') return null;
  for (const v of sabotage.valves) {
    if (distance2D(x, z, v.x, v.z) <= range) {
      return v;
    }
  }
  return null;
}

/**
 * Advances sabotage timers, hold-to-fix progress, and dual-valve gas_leak logic.
 * Returns `{ fixed, expiredCritical, expiredNonCriticalType }`.
 */
export function advanceSabotageState(
  sabotage: SabotageState,
  players: PlayerState[],
  dt: number,
  holdingFixByPlayerId: Map<string, { valveId?: 'valve_cha' | 'valve_rickshaw' }>,
): {
  fixed: boolean;
  expiredCritical: boolean;
  expiredNonCriticalType: SabotageType | null;
} {
  if (!sabotage.active) {
    if (sabotage.cooldownRemaining > 0) {
      sabotage.cooldownRemaining = Math.max(0, sabotage.cooldownRemaining - dt);
    }
    return { fixed: false, expiredCritical: false, expiredNonCriticalType: null };
  }

  // Tick remaining duration
  sabotage.timeRemaining -= dt;

  if (sabotage.active === 'gas_leak') {
    const aliveMap = new Map(players.filter((p) => p.alive && !p.inVent).map((p) => [p.id, p]));
    for (const valve of sabotage.valves) {
      let holderFound: string | null = null;
      for (const [pid, hold] of holdingFixByPlayerId.entries()) {
        const pl = aliveMap.get(pid);
        if (!pl) continue;
        const maxR = pl.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
        if (
          (!hold.valveId || hold.valveId === valve.id) &&
          distance2D(pl.x, pl.z, valve.x, valve.z) <= maxR
        ) {
          holderFound = pid;
          break;
        }
      }
      valve.holderId = holderFound;
    }

    const v0 = sabotage.valves[0];
    const v1 = sabotage.valves[1];
    const bothHeldByDifferentPlayers =
      Boolean(v0?.holderId) && Boolean(v1?.holderId) && v0.holderId !== v1.holderId;

    if (bothHeldByDifferentPlayers) {
      sabotage.fixProgress = Math.min(1, sabotage.fixProgress + dt / GAS_VALVE_HOLD_SEC);
      if (sabotage.fixProgress >= 1) {
        const cleared = createEmptySabotageState(SABOTAGE_COOLDOWN_SEC);
        Object.assign(sabotage, cleared);
        return { fixed: true, expiredCritical: false, expiredNonCriticalType: null };
      }
    } else {
      sabotage.fixProgress = Math.max(0, sabotage.fixProgress - dt * 0.6);
    }
  } else {
    // Non-critical loadshedding or wifi_down: 1 alive player holds E for 3s
    let activeFixer: PlayerState | null = null;
    for (const [pid] of holdingFixByPlayerId.entries()) {
      const pl = players.find((p) => p.id === pid && p.alive && !p.inVent);
      if (!pl) continue;
      const maxR = pl.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
      if (distance2D(pl.x, pl.z, sabotage.fixStationX, sabotage.fixStationZ) <= maxR) {
        activeFixer = pl;
        break;
      }
    }
    sabotage.fixerId = activeFixer?.id ?? null;
    if (activeFixer) {
      sabotage.fixProgress = Math.min(1, sabotage.fixProgress + dt / NON_CRITICAL_FIX_HOLD_SEC);
      if (sabotage.fixProgress >= 1) {
        const cleared = createEmptySabotageState(SABOTAGE_COOLDOWN_SEC);
        Object.assign(sabotage, cleared);
        return { fixed: true, expiredCritical: false, expiredNonCriticalType: null };
      }
    } else {
      sabotage.fixProgress = Math.max(0, sabotage.fixProgress - dt * 0.5);
    }
  }

  if (sabotage.timeRemaining <= 0) {
    const expiredType = sabotage.active;
    if (isCriticalSabotage(expiredType)) {
      sabotage.timeRemaining = 0;
      return { fixed: false, expiredCritical: true, expiredNonCriticalType: null };
    }
    const cleared = createEmptySabotageState(SABOTAGE_COOLDOWN_SEC);
    Object.assign(sabotage, cleared);
    return { fixed: false, expiredCritical: false, expiredNonCriticalType: expiredType };
  }

  return { fixed: false, expiredCritical: false, expiredNonCriticalType: null };
}

export function makeDefaultPlayerState(
  overrides: Partial<PlayerState> & Pick<PlayerState, 'id' | 'name' | 'color'>,
): PlayerState {
  return {
    x: 0,
    z: 3.8,
    y: 0,
    vx: 0,
    vz: 0,
    yaw: 0,
    role: 'parabasi',
    specialRole: 'none',
    alive: true,
    inVent: false,
    watchingCams: false,
    visualTaskTimer: 0,
    abilityCooldown: 0,
    shielded: false,
    disguiseColor: null,
    disguiseName: null,
    disguiseTimer: 0,
    isBot: false,
    isHost: false,
    ready: false,
    pingMs: overrides.pingMs ?? (overrides.isBot ? 24 + Math.floor(Math.random() * 44) : 18),
    tasks: [],
    killCooldownRemaining: 0,
    emergencyMeetingsLeft: DEFAULT_ROOM_SETTINGS.emergencyMeetingsPerPlayer,
    scansLeft: overrides.specialRole === 'goyenda' ? GOYENDA_SCANS_LIMIT : 0,
    shotsLeft: overrides.specialRole === 'daroga' ? 1 : 0,
    cleansLeft: overrides.specialRole === 'jharudar' ? JHARUDAR_CLEAN_USES : 0,
    revivesLeft: overrides.specialRole === 'daktar' ? 1 : 0,
    pranksLeft: 1,
    jharuTargetBodyId: null,
    jharuTimer: 0,
    haturProtectedUntil: 0,
    supariTargetId: null,
    chamchaPatronId: null,
    chandabazTargets: [],
    tiktokZones: [],
    ghotokPartnerId: null,
    votedFor: null,
    hasVoted: false,
    vehicleId: null,
    ...overrides,
  };
}

export const NEUTRAL_SPECIAL_ROLES: readonly SpecialRole[] = [
  'pagol',
  'chamcha',
  'chandabaz',
  'tiktok_star',
];

export const BATPAR_SPECIAL_ROLES: readonly SpecialRole[] = [
  'bohurupi',
  'jharudar',
  'supari_killer',
  'dalal',
];

export const CREW_SPECIAL_ROLES: readonly SpecialRole[] = [
  'goyenda',
  'kobiraj',
  'mistri',
  'daroga',
  'neta',
  'daktar',
  'ghotok_khala',
  'master_moshai',
  'cctv_kaku',
  'hatur_daktar',
];

export function isNeutralRole(specialRole: SpecialRole): boolean {
  return (
    specialRole === 'pagol' ||
    specialRole === 'chamcha' ||
    specialRole === 'chandabaz' ||
    specialRole === 'tiktok_star'
  );
}

function shuffleWithRng<T>(arr: readonly T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export interface MatchTaskPlan {
  commonTaskIds: string[];
  shortPoolIds: string[];
  longPoolIds: string[];
}

export function createMatchTaskPlan(
  tasksPerPlayer: number = DEFAULT_ROOM_SETTINGS.tasksPerPlayer,
  rng: () => number = Math.random,
): MatchTaskPlan {
  const clamped = Math.max(3, Math.min(15, Math.round(tasksPerPlayer)));
  const commonWanted = clamped >= 10 ? 3 : clamped >= 4 ? 2 : 1;
  const commons = shuffleWithRng(
    TASK_STATIONS.filter((s) => s.category === 'common').map((s) => s.id),
    rng,
  ).slice(0, commonWanted);
  const shortPoolIds = shuffleWithRng(
    TASK_STATIONS.filter((s) => s.category === 'short').map((s) => s.id),
    rng,
  );
  const longPoolIds = shuffleWithRng(
    TASK_STATIONS.filter((s) => s.category === 'long').map((s) => s.id),
    rng,
  );
  return {
    commonTaskIds: commons,
    shortPoolIds,
    longPoolIds,
  };
}

function getStationSectorKey(stationId: string): string {
  const st = TASK_STATIONS.find((s) => s.id === stationId);
  if (!st) return 'center';
  const r = Math.hypot(st.x, st.z);
  const ring = r < 52 ? 'inner' : r < 105 ? 'mid' : 'outer';
  const quad = `${st.x >= 0 ? 'E' : 'W'}${st.z >= 0 ? 'S' : 'N'}`;
  return `${ring}_${quad}`;
}

function pickSpreadFromPool(
  poolIds: string[],
  alreadyPicked: Set<string>,
  targetTotal: number,
  rng: () => number,
): void {
  const remaining = shuffleWithRng(
    poolIds.filter((id) => !alreadyPicked.has(id)),
    rng,
  );
  const usedSectors = new Set<string>();
  for (const id of alreadyPicked) {
    usedSectors.add(getStationSectorKey(id));
  }

  // Pass 1: prioritize unvisited geographic sectors & stations >= 36m apart
  for (const id of remaining) {
    if (alreadyPicked.size >= targetTotal) break;
    const st = TASK_STATIONS.find((s) => s.id === id);
    if (!st) continue;
    const sector = getStationSectorKey(id);
    if (usedSectors.has(sector)) continue;
    const farEnough = Array.from(alreadyPicked).every((pid) => {
      const prev = TASK_STATIONS.find((s) => s.id === pid);
      return !prev || distance2D(prev.x, prev.z, st.x, st.z) >= 36;
    });
    if (farEnough) {
      alreadyPicked.add(id);
      usedSectors.add(sector);
    }
  }

  // Pass 2: fill any remaining needed slots from remaining shuffled pool
  for (const id of remaining) {
    if (alreadyPicked.size >= targetTotal) break;
    alreadyPicked.add(id);
  }
}

export function createPlayerTasks(
  count: number = DEFAULT_ROOM_SETTINGS.tasksPerPlayer,
  rng: () => number = Math.random,
  plan?: MatchTaskPlan,
  isFake = false,
): PlayerTaskState[] {
  const clamped = Math.max(3, Math.min(15, Math.round(count)));
  const resolvedPlan = plan ?? createMatchTaskPlan(clamped, rng);
  const picked = new Set<string>(resolvedPlan.commonTaskIds.slice(0, clamped));

  const remainingSlots = Math.max(0, clamped - picked.size);
  const longWanted = Math.min(
    resolvedPlan.longPoolIds.length,
    clamped >= 12 ? 4 : clamped >= 7 ? 2 : clamped >= 4 ? 1 : 0,
    remainingSlots,
  );
  const shortWanted = Math.max(0, remainingSlots - longWanted);

  pickSpreadFromPool(
    resolvedPlan.shortPoolIds,
    picked,
    Math.min(clamped, resolvedPlan.commonTaskIds.length + shortWanted),
    rng,
  );
  pickSpreadFromPool(resolvedPlan.longPoolIds, picked, clamped, rng);

  // Fallback fill across all stations (with geographic spread) for high task counts up to 15
  if (picked.size < clamped) {
    pickSpreadFromPool(
      TASK_STATIONS.map((s) => s.id),
      picked,
      clamped,
      rng,
    );
  }

  return Array.from(picked).map((taskId) => ({
    taskId,
    completed: false,
    ...(isFake ? { isFake: true } : {}),
  }));
}

export function assignMatchTasks(
  players: PlayerState[],
  tasksPerPlayer: number = DEFAULT_ROOM_SETTINGS.tasksPerPlayer,
  rng: () => number = Math.random,
): void {
  const plan = createMatchTaskPlan(tasksPerPlayer, rng);
  for (const p of players) {
    if (isNeutralRole(p.specialRole)) {
      p.tasks = [];
    } else if (p.role === 'vondo') {
      p.tasks = createPlayerTasks(tasksPerPlayer, rng, plan, true);
    } else {
      p.tasks = createPlayerTasks(tasksPerPlayer, rng, plan, false);
    }
  }
}

export function isTaskLockedBySabotage(taskId: string, sabotage: SabotageState): boolean {
  if (sabotage.active !== 'wifi_down') return false;
  const station = TASK_STATIONS.find((s) => s.id === taskId);
  return station?.medium === 'digital';
}

export function getMaxVondoCount(playerCount: number): number {
  if (playerCount >= 17) return 5;
  if (playerCount >= 14) return 4;
  if (playerCount >= 10) return 3;
  if (playerCount >= 6) return 2;
  return 1;
}

export function assignRoles<T extends Pick<PlayerState, 'id' | 'role'>>(
  players: T[],
  requestedVondoCount: number,
  rng: () => number = Math.random,
): T[] {
  if (players.length === 0) return players;
  const maxAllowed = getMaxVondoCount(players.length);
  const targetVondos = Math.max(1, Math.min(requestedVondoCount, maxAllowed));
  const indices = shuffleWithRng(
    players.map((_, idx) => idx),
    rng,
  );
  const vondoSet = new Set(indices.slice(0, targetVondos));
  return players.map((p, idx) => ({
    ...p,
    role: vondoSet.has(idx) ? 'vondo' : 'parabasi',
  }));
}

export interface RolePoolPreview {
  batparCount: number;
  specialBatparRange: string;
  specialCrewRange: string;
  neutralLabel: string;
  plainCrewMin: number;
  summary: string;
}

export function getRolePoolPreview(playerCount: number, settings: RoomSettings): RolePoolPreview {
  const clamped = Math.max(MIN_MATCH_PLAYERS, Math.min(MAX_MATCH_PLAYERS, playerCount));
  const maxVondo = getMaxVondoCount(clamped);
  const batparCount = Math.max(1, Math.min(maxVondo, settings.vondoCount));

  if (!settings.enableSpecialRoles) {
    return {
      batparCount,
      specialBatparRange: '০',
      specialCrewRange: '০',
      neutralLabel: 'বন্ধ',
      plainCrewMin: clamped - batparCount,
      summary: `${batparCount} বাটপার · ${clamped - batparCount} সাধারণ পাড়াবাসী (স্পেশাল রোল বন্ধ)`,
    };
  }

  let specialCrewRange = '১';
  let neutralLabel = '০';
  let plainCrewMin = 3;
  const specialBatparRange =
    clamped <= 7 ? '০–১' : clamped >= 16 && batparCount >= 4 ? '২–৩' : batparCount >= 3 ? '১–২' : batparCount > 1 ? '১–২' : '১';

  if (clamped === 5) {
    specialCrewRange = '১';
    neutralLabel = '০';
    plainCrewMin = 3;
  } else if (clamped === 6) {
    specialCrewRange = '২';
    neutralLabel = settings.enableNeutralRoles ? '০–১ (৬০%)' : '০';
    plainCrewMin = settings.enableNeutralRoles ? 2 : 3;
  } else if (clamped <= 10) {
    specialCrewRange = settings.enableNeutralRoles ? '২–৩' : '৩';
    neutralLabel = settings.enableNeutralRoles ? '০–১ (৬০%)' : '০';
    plainCrewMin = Math.max(2, Math.ceil((clamped - batparCount) * 0.4));
  } else if (clamped <= 15) {
    specialCrewRange = settings.enableNeutralRoles ? '৩–৫' : '৪–৫';
    neutralLabel = settings.enableNeutralRoles ? '০–২' : '০';
    plainCrewMin = Math.max(4, Math.ceil((clamped - batparCount) * 0.4));
  } else {
    specialCrewRange = settings.enableNeutralRoles ? '৪–৬' : '৫–৬';
    neutralLabel = settings.enableNeutralRoles ? '১–৩' : '০';
    plainCrewMin = Math.max(5, Math.ceil((clamped - batparCount) * 0.4));
  }

  return {
    batparCount,
    specialBatparRange,
    specialCrewRange,
    neutralLabel,
    plainCrewMin,
    summary: `${batparCount} বাটপার (স্পেশাল ${specialBatparRange}) · ${specialCrewRange} স্পেশাল পাড়াবাসী · নিরপেক্ষ ${neutralLabel} · ${plainCrewMin}+ সাধারণ পাড়াবাসী`,
  };
}

/**
 * Balanced distribution (5–20 players):
 * 5P: 1 Batpar, 1 special crew, 0 neutral, 3 plain Parabasi
 * 6P: 1 Batpar, 2 special crew, 0-1 neutral (60%), 2-3 plain Parabasi
 * 7-10P: 1-3 Batpar, 2-3 special crew, 0-1 neutral (60%), >=40% plain Parabasi
 * 11-15P: 1-4 Batpar, 3-5 special crew, 0-2 neutrals, >=40% plain Parabasi
 * 16-20P: up to 5 Batpar, 4-6 special crew, 1-3 neutrals, >=40% plain Parabasi
 */
export function assignSpecialRoles<T extends Pick<PlayerState, 'id' | 'role' | 'specialRole'>>(
  players: T[],
  enabled: boolean,
  forcedLocalSpecial?: SpecialRole,
  localPlayerId?: string,
  rng: () => number = Math.random,
  enableNeutralRoles: boolean = true,
): T[] {
  const out = players.map((p) => ({ ...p, specialRole: 'none' as SpecialRole }));
  if (!enabled || out.length === 0) return out;

  const takenSpecials = new Set<SpecialRole>();
  if (forcedLocalSpecial && forcedLocalSpecial !== 'none' && localPlayerId) {
    const localIdx = out.findIndex((p) => p.id === localPlayerId);
    if (localIdx >= 0) {
      out[localIdx].specialRole = forcedLocalSpecial;
      takenSpecials.add(forcedLocalSpecial);
    }
  }

  // Batpar specials: max 1 special Batpar when total players <= 7, 2 when 8-15, up to 3 when >= 16
  const vondoCandidates = shuffleWithRng(
    out.filter((p) => p.role === 'vondo' && p.specialRole === 'none'),
    rng,
  );
  const alreadyVondoSpecial = out.filter((p) => p.role === 'vondo' && p.specialRole !== 'none').length;
  const maxVondoSpecials = out.length <= 7 ? 1 : out.length >= 16 ? 3 : 2;
  const remainingVondoSpecialSlots = Math.max(0, maxVondoSpecials - alreadyVondoSpecial);
  const desiredVondoRoles = shuffleWithRng(BATPAR_SPECIAL_ROLES, rng);
  let assignedVondoSpecials = 0;
  for (const vr of desiredVondoRoles) {
    if (assignedVondoSpecials >= remainingVondoSpecialSlots) break;
    if (takenSpecials.has(vr)) continue;
    const nextV = vondoCandidates.shift();
    if (!nextV) break;
    nextV.specialRole = vr;
    takenSpecials.add(vr);
    assignedVondoSpecials++;
  }

  // Non-Batpar distribution
  const totalNonVondo = out.filter((p) => p.role === 'parabasi').length;
  const minPlainCrew = out.length <= 5 ? 3 : Math.max(2, Math.ceil(totalNonVondo * 0.4));

  const alreadyNeutralCount = out.filter((p) => isNeutralRole(p.specialRole)).length;
  const alreadyCrewSpecial = out.filter(
    (p) => p.role === 'parabasi' && p.specialRole !== 'none' && !isNeutralRole(p.specialRole),
  ).length;

  let targetNeutralTotal = alreadyNeutralCount;
  if (alreadyNeutralCount === 0 && enableNeutralRoles && out.length >= 6) {
    if (out.length >= 16) {
      targetNeutralTotal = rng() < 0.45 ? 3 : 2;
    } else if (rng() < 0.6) {
      targetNeutralTotal = 1;
      if (out.length >= 11 && rng() < 0.35) {
        targetNeutralTotal = 2;
      }
    }
  }

  let targetCrewSpecials = 1;
  if (out.length === 6) targetCrewSpecials = 2;
  else if (out.length >= 7 && out.length <= 10) targetCrewSpecials = targetNeutralTotal > 0 ? 2 : 3;
  else if (out.length >= 11 && out.length <= 15) targetCrewSpecials = Math.max(3, 5 - targetNeutralTotal);
  else if (out.length >= 16) targetCrewSpecials = Math.max(4, 7 - targetNeutralTotal);

  // Guarantee plain Parabasi minimum never gets violated
  const maxAllowedNonPlain = Math.max(0, totalNonVondo - minPlainCrew);
  if (targetNeutralTotal > maxAllowedNonPlain) {
    targetNeutralTotal = maxAllowedNonPlain;
  }
  if (targetCrewSpecials + targetNeutralTotal > maxAllowedNonPlain) {
    targetCrewSpecials = Math.max(0, maxAllowedNonPlain - targetNeutralTotal);
  }

  const nonVondoPool = shuffleWithRng(
    out.filter((p) => p.role === 'parabasi' && p.specialRole === 'none'),
    rng,
  );

  const neutralPool = shuffleWithRng(NEUTRAL_SPECIAL_ROLES, rng);
  const neededNeutrals = Math.max(0, targetNeutralTotal - alreadyNeutralCount);
  let addedNeutrals = 0;
  for (const nr of neutralPool) {
    if (addedNeutrals >= neededNeutrals) break;
    if (takenSpecials.has(nr)) continue;
    const p = nonVondoPool.shift();
    if (!p) break;
    p.specialRole = nr;
    takenSpecials.add(nr);
    addedNeutrals++;
  }

  const crewSpecialPool = shuffleWithRng(CREW_SPECIAL_ROLES, rng);
  const neededCrewSpecials = Math.max(0, targetCrewSpecials - alreadyCrewSpecial);
  let assignedCrew = 0;
  for (const r of crewSpecialPool) {
    if (assignedCrew >= neededCrewSpecials) break;
    if (takenSpecials.has(r)) continue;
    const nextPlayer = nonVondoPool.shift();
    if (!nextPlayer) break;
    nextPlayer.specialRole = r;
    takenSpecials.add(r);
    assignedCrew++;
  }

  return out;
}

export function computeTaskProgress(players: PlayerState[]): {
  completedTasks: number;
  totalTasks: number;
  progress: number;
} {
  let totalTasks = 0;
  let completedTasks = 0;
  for (const p of players) {
    // Crew (including dead ghost crew!) contribute to the shared task bar; exclude Batpar and Neutrals
    if (p.role !== 'parabasi' || isNeutralRole(p.specialRole)) continue;
    for (const t of p.tasks) {
      totalTasks++;
      if (t.completed) completedTasks++;
    }
  }
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
  return { completedTasks, totalTasks, progress };
}

export function canExecuteKill(
  killer: PlayerState,
  target: PlayerState,
): { allowed: boolean; reason?: string } {
  if (!killer.alive || killer.role !== 'vondo') {
    return { allowed: false, reason: 'শুধু জীবিত বাটপারই হামলা করতে পারবে।' };
  }
  if (killer.inVent) {
    return { allowed: false, reason: 'আগে ড্রেন থেকে বের হয়ে এসো।' };
  }
  if (killer.vehicleId) {
    return { allowed: false, reason: 'গাড়ি থেকে নেমে হামলা করো!' };
  }
  if (killer.killCooldownRemaining > 0.05) {
    return { allowed: false, reason: 'হামলার কুলডাউন চলছে।' };
  }
  if (!target.alive || target.id === killer.id || target.role === 'vondo') {
    return { allowed: false, reason: 'ভুল টার্গেট।' };
  }
  if (target.inVent) {
    return { allowed: false, reason: 'টার্গেট ড্রেনের ভেতর আছে।' };
  }
  const dist = distance2D(killer.x, killer.z, target.x, target.z);
  if (dist > KILL_RANGE) {
    return { allowed: false, reason: 'টার্গেট অনেক দূরে।' };
  }
  return { allowed: true };
}

export function canUseVent(player: PlayerState): boolean {
  if (!player.alive || player.vehicleId) return false;
  if (player.role === 'vondo') return true;
  if (player.specialRole === 'mistri') {
    return player.inVent || player.abilityCooldown <= 0.05;
  }
  return false;
}

export function canCompleteTasks(player: Pick<PlayerState, 'role' | 'specialRole'>): boolean {
  return player.role === 'parabasi' && !isNeutralRole(player.specialRole);
}

export function getConnectedVents(x: number, z: number): {
  currentVent: VentNode | null;
  targets: VentNode[];
} {
  let currentVent: VentNode | null = null;
  let bestDist = Infinity;
  for (const v of VENTS) {
    const d = distance2D(x, z, v.x, v.z);
    if (d < bestDist && d <= VENT_RANGE + 0.5) {
      bestDist = d;
      currentVent = v;
    }
  }
  if (!currentVent) return { currentVent: null, targets: [] };
  const targets = currentVent.targetIds
    .map((id) => VENTS.find((v) => v.id === id))
    .filter((v): v is VentNode => Boolean(v));
  return { currentVent, targets };
}

export function resolveVentHopTarget(
  x: number,
  z: number,
  destinationVentId: string,
): VentNode | null {
  const { currentVent, targets } = getConnectedVents(x, z);
  if (!currentVent) return null;
  return targets.find((t) => t.id === destinationVentId) ?? null;
}

export function getDirectionCompass(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
): { distance: number; arrow: string; cardinal: string } {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const distance = Math.round(Math.hypot(dx, dz));
  if (distance < 2) {
    return { distance, arrow: '•', cardinal: 'HERE' };
  }
  const angle = Math.atan2(dx, -dz); // 0 = North (-Z), +PI/2 = East (+X)
  const sector = Math.round(angle / (Math.PI / 4));
  const normalized = ((sector % 8) + 8) % 8;
  const dirs = [
    { arrow: '↑', cardinal: 'N' },
    { arrow: '↗', cardinal: 'NE' },
    { arrow: '→', cardinal: 'E' },
    { arrow: '↘', cardinal: 'SE' },
    { arrow: '↓', cardinal: 'S' },
    { arrow: '↙', cardinal: 'SW' },
    { arrow: '←', cardinal: 'W' },
    { arrow: '↖', cardinal: 'NW' },
  ];
  return { distance, ...dirs[normalized] };
}

export function sanitizeSoloConfig(
  playerCountInput: number = 7,
  partialSettings?: Partial<RoomSettings>,
): { playerCount: number; settings: RoomSettings } {
  const playerCount = Math.max(MIN_MATCH_PLAYERS, Math.min(MAX_MATCH_PLAYERS, Math.round(playerCountInput)));
  const merged: RoomSettings = { ...DEFAULT_ROOM_SETTINGS, ...partialSettings };
  const maxVondos = getMaxVondoCount(playerCount);
  merged.vondoCount = Math.max(1, Math.min(maxVondos, Math.round(merged.vondoCount)));
  merged.killCooldownSec = Math.max(10, Math.min(35, Math.round(merged.killCooldownSec)));
  merged.tasksPerPlayer = Math.max(3, Math.min(15, Math.round(merged.tasksPerPlayer)));
  merged.meetingTimeSec = Math.max(15, Math.min(90, Math.round(merged.meetingTimeSec)));
  merged.discussionTimeSec = Math.max(5, Math.min(45, Math.round(merged.discussionTimeSec)));
  merged.moveSpeed = Math.max(6, Math.min(18, Number(merged.moveSpeed) || DEFAULT_ROOM_SETTINGS.moveSpeed));
  merged.emergencyCooldownSec = Math.max(5, Math.min(30, Math.round(merged.emergencyCooldownSec)));
  merged.emergencyMeetingsPerPlayer = Math.max(
    1,
    Math.min(3, Math.round(merged.emergencyMeetingsPerPlayer)),
  );
  return { playerCount, settings: merged };
}

export function sanitizePlayerName(raw: string, existingNames: string[] = []): string {
  let clean = raw.replace(/[^\p{L}\p{N}\s._-]/gu, '').trim().replace(/\s+/g, ' ');
  for (const bad of BLOCKED_NAME_WORDS) {
    const re = new RegExp(bad, 'gi');
    clean = clean.replace(re, 'Mama');
  }
  clean = clean.slice(0, PLAYER_NAME_MAX_CHARS).trim();
  if (!clean) clean = 'Para Hero';

  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  if (!taken.has(clean.toLowerCase())) return clean;

  for (let suffix = 2; suffix < 99; suffix++) {
    const sfx = `${suffix}`;
    const candidate = `${clean.slice(0, PLAYER_NAME_MAX_CHARS - sfx.length).trim()}${sfx}`;
    if (!taken.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return clean.slice(0, PLAYER_NAME_MAX_CHARS);
}

export function canStartLobbyMatch(
  players: Pick<PlayerState, 'id' | 'name' | 'isBot' | 'isHost' | 'ready'>[],
): { ok: boolean; reason?: string } {
  if (players.length < MIN_MATCH_PLAYERS) {
    const missing = MIN_MATCH_PLAYERS - players.length;
    return { ok: false, reason: `আরও ${missing} জন লাগবে (কমপক্ষে ${MIN_MATCH_PLAYERS} জন)` };
  }
  const unready = players.find((p) => !p.isBot && !p.isHost && !p.ready);
  if (unready) {
    return { ok: false, reason: `${unready.name} এখনো রেডি না` };
  }
  return { ok: true };
}

/**
 * Strips private enemy/other-player role & task metadata before sending a snapshot to a specific player.
 * During lobby or gameover everyone sees real public data; during active gameplay only the local player
 * and fellow Batpars (for Batpar viewers) see secret roles.
 */
export function redactSnapshotForPlayer(snapshot: RoomSnapshot, viewerPlayerId: string): RoomSnapshot {
  if (snapshot.phase === 'lobby' || snapshot.phase === 'gameover') {
    return snapshot;
  }
  const viewer = snapshot.players.find((p) => p.id === viewerPlayerId);
  const viewerIsVondo = viewer?.role === 'vondo';
  const viewerIsAlive = viewer ? viewer.alive : true;
  const linked = snapshot.ghotokLinkedIds ?? null;
  const viewerSeesBond =
    Boolean(linked) &&
    (viewer?.specialRole === 'ghotok_khala' ||
      linked?.[0] === viewerPlayerId ||
      linked?.[1] === viewerPlayerId);

  return {
    ...snapshot,
    ghotokLinkedIds: viewerSeesBond ? linked : null,
    chat: snapshot.chat.filter((m) => !m.ghostOnly || !viewerIsAlive),
    players: snapshot.players.map((p) => {
      if (p.id === viewerPlayerId) {
        return { ...p, tasks: p.tasks.map((t) => ({ ...t })) };
      }
      const revealVondoPartner = viewerIsVondo && p.role === 'vondo';
      const revealNetaInShalish = snapshot.netaRevealedId === p.id;
      return {
        ...p,
        isBot: false,
        role: revealVondoPartner ? p.role : 'parabasi',
        specialRole: revealVondoPartner || revealNetaInShalish ? p.specialRole : 'none',
        supariTargetId: revealVondoPartner ? p.supariTargetId : null,
        chamchaPatronId: null,
        chandabazTargets: [],
        tiktokZones: [],
        ghotokPartnerId:
          viewerSeesBond && linked && (p.id === linked[0] || p.id === linked[1])
            ? p.id === linked[0]
              ? linked[1]
              : linked[0]
            : null,
        tasks: [],
      };
    }),
  };
}

export function getColorShadeHint(color: PlayerColorId): string {
  switch (color) {
    case 'lal':
    case 'holud':
    case 'komola':
    case 'sada':
    case 'golapi':
    case 'tan':
    case 'sindur':
    case 'chandan':
      return 'হালকা বা উষ্ণ রঙের পোশাক (লাল, হলুদ, কমলা, সাদা, গোলাপি, সিঁদুর বা চন্দন)';
    default:
      return 'গাঢ় বা শীতল রঙের পোশাক (নীল, সবুজ, বেগুনি, কালো, আকাশী, বাদামী, তুতে, জাম, করলা বা মেহেদি)';
  }
}

export function inspectBodyClue(body: BodyMarker, nowMs: number = Date.now()): { title: string; detail: string } {
  const ageSec = Math.max(1, Math.round((nowMs - body.killedAt) / 1000));
  return {
    title: `গোয়েন্দা সূত্র: ${body.victimName}`,
    detail: `~${ageSec} সেকেন্ড আগে ${body.killerZoneHint}-এর কাছে ঘটেছে। সূত্র: ${body.killerColorHint}।`,
  };
}

export function findNearestKillTarget(killer: PlayerState, players: PlayerState[]): PlayerState | null {
  if (!killer.alive || killer.role !== 'vondo' || killer.inVent) return null;
  let best: PlayerState | null = null;
  let bestDist = KILL_RANGE;
  for (const p of players) {
    if (!p.alive || p.id === killer.id || p.role === 'vondo' || p.inVent) continue;
    const d = distance2D(killer.x, killer.z, p.x, p.z);
    if (d <= bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function findNearestShieldTarget(kobiraj: PlayerState, players: PlayerState[]): PlayerState | null {
  if (!kobiraj.alive || kobiraj.specialRole !== 'kobiraj') return null;
  let best: PlayerState | null = null;
  let bestDist = KOBIRAJ_SHIELD_RANGE;
  for (const p of players) {
    if (!p.alive || p.id === kobiraj.id || p.inVent || p.shielded) continue;
    const d = distance2D(kobiraj.x, kobiraj.z, p.x, p.z);
    if (d <= bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function findNearestReportableBody(
  player: PlayerState,
  bodies: BodyMarker[],
  doorLocks?: DoorLockState,
): BodyMarker | null {
  if (!player.alive || player.inVent) return null;
  let best: BodyMarker | null = null;
  let bestDist = REPORT_RANGE;
  for (const b of bodies) {
    if (b.reported) continue;
    const d = distance2D(player.x, player.z, b.x, b.z);
    if (d <= bestDist && hasLineOfSight(player.x, player.z, b.x, b.z, undefined, doorLocks)) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

export function findNearestInspectableBody(goyenda: PlayerState, bodies: BodyMarker[]): BodyMarker | null {
  if (!goyenda.alive || goyenda.specialRole !== 'goyenda' || goyenda.inVent) return null;
  if ((goyenda.scansLeft ?? GOYENDA_SCANS_LIMIT) <= 0) return null;
  let best: BodyMarker | null = null;
  let bestDist = GOYENDA_INSPECT_RANGE;
  for (const b of bodies) {
    if (b.reported) continue;
    const d = distance2D(goyenda.x, goyenda.z, b.x, b.z);
    if (d <= bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

export function findNearestDarogaTarget(daroga: PlayerState, players: PlayerState[]): PlayerState | null {
  if (!daroga.alive || daroga.specialRole !== 'daroga' || daroga.inVent) return null;
  if ((daroga.shotsLeft ?? 1) <= 0) return null;
  let best: PlayerState | null = null;
  let bestDist = DAROGA_ARREST_RANGE;
  for (const p of players) {
    if (!p.alive || p.id === daroga.id || p.inVent) continue;
    const d = distance2D(daroga.x, daroga.z, p.x, p.z);
    if (d <= bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function resolveDarogaShot(
  daroga: PlayerState,
  target: PlayerState,
): { allowed: boolean; hitVondo: boolean; backfired: boolean } {
  if (
    !daroga.alive ||
    daroga.specialRole !== 'daroga' ||
    daroga.inVent ||
    daroga.abilityCooldown > 0.05 ||
    (daroga.shotsLeft ?? 1) <= 0
  ) {
    return { allowed: false, hitVondo: false, backfired: false };
  }
  if (!target.alive || target.id === daroga.id || target.inVent) {
    return { allowed: false, hitVondo: false, backfired: false };
  }
  if (distance2D(daroga.x, daroga.z, target.x, target.z) > DAROGA_ARREST_RANGE) {
    return { allowed: false, hitVondo: false, backfired: false };
  }
  const hitVondo = target.role === 'vondo';
  return { allowed: true, hitVondo, backfired: !hitVondo };
}

export function findNearestCleanableBody(jharudar: PlayerState, bodies: BodyMarker[]): BodyMarker | null {
  if (!jharudar.alive || jharudar.specialRole !== 'jharudar' || jharudar.inVent) return null;
  if ((jharudar.cleansLeft ?? JHARUDAR_CLEAN_USES) <= 0) return null;
  let best: BodyMarker | null = null;
  let bestDist = JHARUDAR_CLEAN_RANGE;
  for (const b of bodies) {
    if (b.reported) continue;
    const d = distance2D(jharudar.x, jharudar.z, b.x, b.z);
    if (d <= bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

export function executeGoyendaScan(
  goyenda: PlayerState,
  bodies: BodyMarker[],
  nowMs: number = Date.now(),
): {
  ok: boolean;
  reason?: 'no_scans_left' | 'no_body';
  clue?: { title: string; detail: string };
  scansRemaining: number;
} {
  const currentScans = goyenda.scansLeft ?? GOYENDA_SCANS_LIMIT;
  if (currentScans <= 0) {
    return { ok: false, reason: 'no_scans_left', scansRemaining: 0 };
  }
  const body = findNearestInspectableBody(goyenda, bodies);
  if (!body) {
    return { ok: false, reason: 'no_body', scansRemaining: currentScans };
  }
  const nextScans = Math.max(0, currentScans - 1);
  goyenda.scansLeft = nextScans;
  const baseClue = inspectBodyClue(body, nowMs);
  return {
    ok: true,
    scansRemaining: nextScans,
    clue: {
      title: baseClue.title,
      detail: `${baseClue.detail} (বাকি স্ক্যান: ${nextScans})`,
    },
  };
}

export function stepJharudarChannel(
  jharudar: PlayerState,
  bodies: BodyMarker[],
  dt: number,
): {
  completedBody: BodyMarker | null;
  cancelled: boolean;
} {
  if (!jharudar.jharuTargetBodyId) {
    return { completedBody: null, cancelled: false };
  }
  if (!jharudar.alive || jharudar.inVent) {
    jharudar.jharuTargetBodyId = null;
    jharudar.jharuTimer = 0;
    return { completedBody: null, cancelled: true };
  }
  const body = bodies.find((b) => b.id === jharudar.jharuTargetBodyId && !b.reported);
  if (!body || distance2D(jharudar.x, jharudar.z, body.x, body.z) > JHARUDAR_CLEAN_RANGE + 0.6) {
    jharudar.jharuTargetBodyId = null;
    jharudar.jharuTimer = 0;
    return { completedBody: null, cancelled: true };
  }
  const nextTimer = Math.max(0, (jharudar.jharuTimer ?? JHARUDAR_CLEAN_CHANNEL_SEC) - dt);
  jharudar.jharuTimer = nextTimer;
  if (nextTimer <= 0) {
    jharudar.jharuTargetBodyId = null;
    jharudar.jharuTimer = 0;
    jharudar.cleansLeft = Math.max(0, (jharudar.cleansLeft ?? JHARUDAR_CLEAN_USES) - 1);
    jharudar.abilityCooldown = JHARUDAR_CLEAN_COOLDOWN_SEC;
    return { completedBody: body, cancelled: false };
  }
  return { completedBody: null, cancelled: false };
}

export function isMistriVentAudibleTo(
  ventUser: Pick<PlayerState, 'id' | 'x' | 'z'>,
  listener: Pick<PlayerState, 'id' | 'x' | 'z'>,
): boolean {
  if (ventUser.id === listener.id) return true;
  return distance2D(ventUser.x, ventUser.z, listener.x, listener.z) <= MISTRI_VENT_AUDIBLE_RANGE;
}

export function findNearestRevivableBody(daktar: PlayerState, bodies: BodyMarker[]): BodyMarker | null {
  if (!daktar.alive || daktar.specialRole !== 'daktar' || daktar.inVent || (daktar.revivesLeft ?? 0) <= 0) {
    return null;
  }
  let best: BodyMarker | null = null;
  let bestDist = DAKTAR_REVIVE_RANGE;
  for (const b of bodies) {
    if (b.reported) continue;
    const d = distance2D(daktar.x, daktar.z, b.x, b.z);
    if (d <= bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

export function getPlayerVoteWeight(player: Pick<PlayerState, 'specialRole'>): number {
  return player.specialRole === 'neta' ? 2 : 1;
}

export function tallyVotes(players: PlayerState[], confirmEjects = true): EjectionInfo {
  const alivePlayers = players.filter((p) => p.alive);
  const counts = new Map<string, number>();
  let skipCount = 0;

  for (const p of alivePlayers) {
    const weight = getPlayerVoteWeight(p);
    if (!p.hasVoted || !p.votedFor || p.votedFor === 'skip') {
      skipCount += weight;
    } else {
      counts.set(p.votedFor, (counts.get(p.votedFor) ?? 0) + weight);
    }
  }

  let topTarget: string | null = null;
  let topCount = 0;
  let isTie = false;

  for (const [targetId, count] of counts.entries()) {
    if (count > topCount) {
      topCount = count;
      topTarget = targetId;
      isTie = false;
    } else if (count === topCount) {
      isTie = true;
    }
  }

  const remainingVondosBefore = alivePlayers.filter((p) => p.role === 'vondo').length;

  if (topCount === 0 || skipCount >= topCount) {
    return {
      ejectedId: null,
      ejectedName: null,
      ejectedColor: null,
      wasVondo: false,
      wasSpecialRole: 'none',
      reason: 'skipped',
      remainingVondos: remainingVondosBefore,
      confirmEjects,
    };
  }

  if (isTie || !topTarget) {
    return {
      ejectedId: null,
      ejectedName: null,
      ejectedColor: null,
      wasVondo: false,
      wasSpecialRole: 'none',
      reason: 'tie',
      remainingVondos: remainingVondosBefore,
      confirmEjects,
    };
  }

  const victim = alivePlayers.find((p) => p.id === topTarget);
  if (!victim) {
    return {
      ejectedId: null,
      ejectedName: null,
      ejectedColor: null,
      wasVondo: false,
      wasSpecialRole: 'none',
      reason: 'tie',
      remainingVondos: remainingVondosBefore,
      confirmEjects,
    };
  }

  const wasVondo = victim.role === 'vondo';
  return {
    ejectedId: victim.id,
    ejectedName: victim.name,
    ejectedColor: victim.color,
    wasVondo,
    wasSpecialRole: victim.specialRole,
    reason: 'voted',
    remainingVondos: wasVondo ? Math.max(0, remainingVondosBefore - 1) : remainingVondosBefore,
    confirmEjects,
  };
}

export function isPlayerShieldedNow(player: Pick<PlayerState, 'shielded' | 'haturProtectedUntil'>, nowMs: number = Date.now()): boolean {
  return Boolean(player.shielded || (player.haturProtectedUntil ?? 0) > nowMs);
}

export function findGhotokPairCandidates(
  ghotok: PlayerState,
  players: PlayerState[],
): [PlayerState, PlayerState] | null {
  if (!ghotok.alive || ghotok.specialRole !== 'ghotok_khala' || ghotok.inVent) return null;
  const others = players
    .filter((p) => p.alive && p.id !== ghotok.id && !p.inVent)
    .map((p) => ({ p, d: distance2D(ghotok.x, ghotok.z, p.x, p.z) }))
    .sort((a, b) => a.d - b.d);
  const first = others[0];
  if (!first || first.d > GHOTOK_PAIR_RANGE) return null;
  const second = others[1];
  if (second && second.d <= GHOTOK_SECOND_RANGE) {
    return [first.p, second.p];
  }
  return [first.p, ghotok];
}

export function findGhotokPartnerOnDeath(
  deadPlayerId: string,
  linkedIds: [string, string] | null | undefined,
  players: PlayerState[],
): { partner: PlayerState | null; ghotok: PlayerState | null } {
  if (!linkedIds) return { partner: null, ghotok: null };
  const [a, b] = linkedIds;
  if (deadPlayerId !== a && deadPlayerId !== b) {
    return { partner: null, ghotok: null };
  }
  const partnerId = deadPlayerId === a ? b : a;
  const partner = players.find((p) => p.id === partnerId && p.alive) ?? null;
  const ghotok = players.find((p) => p.specialRole === 'ghotok_khala' && p.alive) ?? null;
  return { partner, ghotok };
}

export function findNearestMasterTarget(master: PlayerState, players: PlayerState[]): PlayerState | null {
  if (!master.alive || master.specialRole !== 'master_moshai' || master.inVent) return null;
  let best: PlayerState | null = null;
  let bestDist = MASTER_INSPECT_RANGE;
  for (const p of players) {
    if (!p.alive || p.id === master.id || p.inVent) continue;
    const d = distance2D(master.x, master.z, p.x, p.z);
    if (d <= bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function inspectPlayerTaskAuthenticity(
  target: Pick<PlayerState, 'name' | 'role' | 'specialRole' | 'tasks'>,
): { title: string; detail: string; isSus: boolean } {
  if (target.role === 'vondo') {
    return {
      title: `খাতা সতর্কতা: ${target.name}`,
      detail: `${target.name} ভুয়া কাজের নাটক করছে! আসল খাতা একদম খালি — বাটপার নিশ্চিত!`,
      isSus: true,
    };
  }
  if (isNeutralRole(target.specialRole)) {
    return {
      title: `খাতা নিরপেক্ষ: ${target.name}`,
      detail: `${target.name}-এর কোনো মহল্লা কাজের খাতাই নেই — নিরপেক্ষ চরিত্র!`,
      isSus: true,
    };
  }
  const done = target.tasks.filter((t) => t.completed).length;
  return {
    title: `খাতা যাচাইকৃত: ${target.name}`,
    detail: `${target.name} আসল পাড়াবাসী! (${done}/${target.tasks.length} কাজ যাচাই হয়েছে)`,
    isSus: false,
  };
}

export function findNearestHaturTarget(
  hatur: PlayerState,
  players: PlayerState[],
  nowMs: number = Date.now(),
): PlayerState | null {
  if (!hatur.alive || hatur.specialRole !== 'hatur_daktar' || hatur.inVent) return null;
  let best: PlayerState | null = null;
  let bestDist = HATUR_RANGE;
  for (const p of players) {
    if (!p.alive || p.id === hatur.id || p.inVent) continue;
    if ((p.haturProtectedUntil ?? 0) > nowMs) continue;
    const d = distance2D(hatur.x, hatur.z, p.x, p.z);
    if (d <= bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function pickSupariContractTarget(
  killer: PlayerState,
  players: PlayerState[],
  currentTargetId?: string | null,
): PlayerState | null {
  const candidates = players.filter((p) => p.alive && p.id !== killer.id && p.role !== 'vondo');
  if (candidates.length === 0) return null;
  if (!currentTargetId) return candidates[0];
  const idx = candidates.findIndex((c) => c.id === currentTargetId);
  if (idx < 0) return candidates[0];
  return candidates[(idx + 1) % candidates.length];
}

export function applyDalalBrokerJam(
  doorLocks: DoorLockState,
  rng: () => number = Math.random,
): { extendedZones: DoorZoneId[]; newlyLockedZone: DoorZoneId | null } {
  const zones: DoorZoneId[] = ['cha_dokan', 'rickshaw_garage', 'desco_power', 'dish_roof'];
  const extendedZones: DoorZoneId[] = [];
  const unlockedZones: DoorZoneId[] = [];

  for (const z of zones) {
    if (doorLocks[z] > 0) {
      doorLocks[z] += DALAL_DOOR_EXTEND_SEC;
      extendedZones.push(z);
    } else {
      unlockedZones.push(z);
    }
  }

  let newlyLockedZone: DoorZoneId | null = null;
  if (unlockedZones.length > 0) {
    newlyLockedZone = unlockedZones[Math.floor(rng() * unlockedZones.length)] ?? unlockedZones[0];
    doorLocks[newlyLockedZone] = DOOR_LOCK_DURATION_SEC;
  }
  return { extendedZones, newlyLockedZone };
}

export function findNearestChamchaPatron(chamcha: PlayerState, players: PlayerState[]): PlayerState | null {
  if (!chamcha.alive || chamcha.specialRole !== 'chamcha' || chamcha.inVent) return null;
  let best: PlayerState | null = null;
  let bestDist = CHAMCHA_RANGE;
  for (const p of players) {
    if (!p.alive || p.id === chamcha.id || p.inVent) continue;
    const d = distance2D(chamcha.x, chamcha.z, p.x, p.z);
    if (d <= bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function getChandabazGoal(chandabaz: PlayerState, players: PlayerState[]): number {
  return players.filter((p) => p.alive && p.id !== chandabaz.id).length;
}

export function countAliveChandabazTargets(chandabaz: PlayerState, players: PlayerState[]): number {
  const targets = chandabaz.chandabazTargets ?? [];
  if (targets.length === 0) return 0;
  const aliveIds = new Set(players.filter((p) => p.alive && p.id !== chandabaz.id).map((p) => p.id));
  return targets.filter((id) => aliveIds.has(id)).length;
}

export function findNearestChandabazTarget(chandabaz: PlayerState, players: PlayerState[]): PlayerState | null {
  if (!chandabaz.alive || chandabaz.specialRole !== 'chandabaz' || chandabaz.inVent) return null;
  const collected = new Set(chandabaz.chandabazTargets ?? []);
  let best: PlayerState | null = null;
  let bestDist = CHANDABAZ_RANGE;
  for (const p of players) {
    if (!p.alive || p.id === chandabaz.id || p.inVent || collected.has(p.id)) continue;
    const d = distance2D(chandabaz.x, chandabaz.z, p.x, p.z);
    if (d <= bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function collectChandaFromTarget(
  chandabaz: PlayerState,
  target: PlayerState,
  players?: PlayerState[],
): { ok: boolean; count: number; reachedGoal: boolean } {
  const goal = players ? getChandabazGoal(chandabaz, players) : CHANDABAZ_GOAL;
  if (!chandabaz.alive || chandabaz.specialRole !== 'chandabaz' || !target.alive || target.id === chandabaz.id) {
    const activeCount = players
      ? countAliveChandabazTargets(chandabaz, players)
      : (chandabaz.chandabazTargets?.length ?? 0);
    return { ok: false, count: activeCount, reachedGoal: false };
  }
  const existing = chandabaz.chandabazTargets ?? [];
  if (existing.includes(target.id)) {
    const activeCount = players ? countAliveChandabazTargets(chandabaz, players) : existing.length;
    return { ok: false, count: activeCount, reachedGoal: goal >= 2 && activeCount >= goal };
  }
  const next = [...existing, target.id];
  chandabaz.chandabazTargets = next;
  const activeCount = players ? countAliveChandabazTargets(chandabaz, players) : next.length;
  return { ok: true, count: activeCount, reachedGoal: goal >= 2 && activeCount >= goal };
}

export function recordTiktokReelInZone(
  tiktok: PlayerState,
  zoneId: string | null = getZoneIdAt(tiktok.x, tiktok.z),
): { ok: boolean; reason?: 'outside_zone' | 'already_filmed'; zoneCount: number } {
  const existing = tiktok.tiktokZones ?? [];
  if (!zoneId) {
    return { ok: false, reason: 'outside_zone', zoneCount: existing.length };
  }
  if (existing.includes(zoneId)) {
    return { ok: false, reason: 'already_filmed', zoneCount: existing.length };
  }
  const next = [...existing, zoneId];
  tiktok.tiktokZones = next;
  return { ok: true, zoneCount: next.length };
}

/**
 * Single source of truth for win conditions.
 * Priority in the same tick:
 * 1. Pagol ejected -> Pagol wins
 * 2. Alive Chandabaz has collected Chanda from all living other players (at least 2 alive) -> Chandabaz wins
 * 3. Alive TikTok Star filmed 3 distinct zones & <= 4 alive players -> TikTok Star wins
 * 4. All Batpar ejected/dead OR 100% tasks done -> Parabasi wins
 * 5. Critical sabotage (gas_leak) timer reaches 0 -> Batpar wins
 * 6. Alive Batpar >= alive NON-Batpar (counts ALL alive non-Batpar incl. neutrals) -> Batpar wins
 * Plus: if outcome is Parabasi or Batpar and an alive Chamcha's Patron matches that winning faction, Chamcha co-wins!
 */
export function evaluateMatchOutcome(
  players: PlayerState[],
  taskProgress: number,
  criticalSabotageExpired: boolean = false,
  justEjectedPlayer?: PlayerState | null,
): MatchOutcome | null {
  if (justEjectedPlayer && justEjectedPlayer.specialRole === 'pagol') {
    return {
      winner: 'pagol',
      reason: 'pagol_ejected',
      winnerPlayerId: justEjectedPlayer.id,
      winnerPlayerName: justEjectedPlayer.name,
    };
  }

  const chandabazWinner = players.find((p) => {
    if (!p.alive || p.specialRole !== 'chandabaz') return false;
    const goal = getChandabazGoal(p, players);
    return goal >= 2 && countAliveChandabazTargets(p, players) >= goal;
  });
  if (chandabazWinner) {
    return {
      winner: 'chandabaz',
      reason: 'chandabaz_extorted',
      winnerPlayerId: chandabazWinner.id,
      winnerPlayerName: chandabazWinner.name,
    };
  }

  const aliveCount = players.filter((p) => p.alive).length;
  const tiktokWinner = players.find(
    (p) =>
      p.alive &&
      p.specialRole === 'tiktok_star' &&
      (p.tiktokZones?.length ?? 0) >= TIKTOK_ZONE_GOAL &&
      aliveCount <= TIKTOK_MAX_ALIVE_TO_WIN,
  );
  if (tiktokWinner) {
    return {
      winner: 'tiktok_star',
      reason: 'tiktok_viral',
      winnerPlayerId: tiktokWinner.id,
      winnerPlayerName: tiktokWinner.name,
    };
  }

  const attachChamchaCoWinners = (base: MatchOutcome): MatchOutcome => {
    if (base.winner !== 'parabasi' && base.winner !== 'vondo') return base;
    const coWinners = players.filter((p) => {
      if (!p.alive || p.specialRole !== 'chamcha' || !p.chamchaPatronId) return false;
      const patron = players.find((other) => other.id === p.chamchaPatronId);
      if (!patron || isNeutralRole(patron.specialRole)) return false;
      return patron.role === base.winner;
    });
    if (coWinners.length === 0) return base;
    return {
      ...base,
      coWinnerIds: coWinners.map((c) => c.id),
      coWinnerNames: coWinners.map((c) => c.name),
    };
  };

  const aliveVondos = players.filter((p) => p.alive && p.role === 'vondo').length;
  // Count ALL alive non-Batpar players (including neutrals such as Pagol/Chamcha/Chandabaz/TikTok Star)
  const aliveNonVondos = players.filter((p) => p.alive && p.role !== 'vondo').length;

  if (aliveVondos === 0 && players.some((p) => p.role === 'vondo')) {
    return attachChamchaCoWinners({ winner: 'parabasi', reason: 'batpars_out' });
  }

  if (
    taskProgress >= 1 &&
    players.some((p) => p.role === 'parabasi' && !isNeutralRole(p.specialRole))
  ) {
    return attachChamchaCoWinners({ winner: 'parabasi', reason: 'tasks_completed' });
  }

  if (criticalSabotageExpired) {
    return attachChamchaCoWinners({ winner: 'vondo', reason: 'critical_sabotage_timeout' });
  }

  if (aliveVondos > 0 && aliveVondos >= aliveNonVondos) {
    return attachChamchaCoWinners({ winner: 'vondo', reason: 'batpars_outnumber' });
  }

  return null;
}

export function dismountPlayerFromVehicle(
  player: PlayerState,
  vehicles: VehicleState[] | undefined,
  doorLocks?: DoorLockState,
  placeOutside = true,
): VehicleState | null {
  const vid = player.vehicleId;
  player.vehicleId = null;
  if (!vid || !vehicles) return null;
  const v = vehicles.find((item) => item.id === vid);
  if (!v) return null;
  if (v.driverId === player.id) {
    v.driverId = null;
  }
  v.vx = 0;
  v.vz = 0;
  v.speed = 0;
  v.steer = 0;

  if (placeOutside) {
    const spec = VEHICLE_SPECS[v.kind];
    const sideDist = spec.collisionRadius + 0.85;
    const cosY = Math.cos(v.yaw);
    const sinY = Math.sin(v.yaw);
    // Try driver left (-X local), right (+X local), rear (-Z local), front (+Z local)
    const offsets: Array<[number, number]> = [
      [-cosY * sideDist, sinY * sideDist],
      [cosY * sideDist, -sinY * sideDist],
      [-sinY * (sideDist + 0.5), -cosY * (sideDist + 0.5)],
      [sinY * (sideDist + 0.5), cosY * (sideDist + 0.5)],
    ];
    let bestPos: { x: number; z: number } | null = null;
    for (const [ox, oz] of offsets) {
      const candidate = resolveCircleWallCollision(v.x + ox, v.z + oz, PLAYER_RADIUS, WALLS, doorLocks);
      if (distance2D(candidate.x, candidate.z, v.x, v.z) >= spec.collisionRadius * 0.72) {
        bestPos = candidate;
        break;
      }
    }
    const finalPos = bestPos ?? resolveCircleWallCollision(v.x, v.z, PLAYER_RADIUS, WALLS, doorLocks);
    player.x = finalPos.x;
    player.z = finalPos.z;
    player.y = 0;
    player.vx = 0;
    player.vz = 0;
  }
  return v;
}

