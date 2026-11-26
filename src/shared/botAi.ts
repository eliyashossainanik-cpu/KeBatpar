import {
  BOHURUPI_COOLDOWN_SEC,
  BOHURUPI_DISGUISE_DURATION_SEC,
  CHAMCHA_COOLDOWN_SEC,
  CHANDABAZ_COOLDOWN_SEC,
  CHANDABAZ_INITIAL_COOLDOWN_SEC,
  CHANDABAZ_WITNESS_RANGE,
  DALAL_COOLDOWN_SEC,
  DAROGA_COOLDOWN_SEC,
  HATUR_COOLDOWN_SEC,
  HATUR_DURATION_MS,
  JHARUDAR_CLEAN_CHANNEL_SEC,
  JHARUDAR_CLEAN_USES,
  KOBIRAJ_COOLDOWN_SEC,
  MASTER_COOLDOWN_SEC,
  MISTRI_FIX_RANGE,
  MISTRI_VENT_COOLDOWN_SEC,
  SABOTAGE_COOLDOWN_SEC,
  SABOTAGE_FIX_RANGE,
  TIKTOK_COOLDOWN_SEC,
  TIKTOK_ZONE_GOAL,
  VENT_RANGE,
  applyDalalBrokerJam,
  canCompleteTasks,
  canExecuteKill,
  collectChandaFromTarget,
  countAliveChandabazTargets,
  createSabotageState,
  executeGoyendaScan,
  findGhotokPairCandidates,
  findNearestChamchaPatron,
  findNearestChandabazTarget,
  findNearestCleanableBody,
  findNearestDarogaTarget,
  findNearestGasValve,
  findNearestHaturTarget,
  findNearestKillTarget,
  findNearestMasterTarget,
  findNearestReportableBody,
  findNearestRevivableBody,
  findNearestShieldTarget,
  getChandabazGoal,
  getColorShadeHint,
  getConnectedVents,
  inspectPlayerTaskAuthenticity,
  isMistriVentAudibleTo,
  isNeutralRole,
  isPlayerShieldedNow,
  isTaskLockedBySabotage,
  pickSupariContractTarget,
  recordTiktokReelInZone,
  resolveDarogaShot,
} from './gameRules';
import {
  BOT_WAYPOINTS,
  DOORS,
  GAS_LEAK_VALVES,
  PLAYER_RADIUS,
  TASK_STATIONS,
  VENTS,
  WALLS,
  ZONES,
  distance2D,
  getZoneIdAt,
  getZoneNameAt,
  hasLineOfSight,
  resolveCircleWallCollision,
} from './mapData';
import type {
  BodyMarker,
  ChatMessage,
  DoorLockState,
  DoorZoneId,
  PlayerColorId,
  PlayerState,
  RoomSettings,
  SabotageState,
  SabotageType,
} from './types';

/**
 * Master tuning object for AI bot behavior, perception imperfection, movement,
 * meeting chat pacing, and voting psychology. Adjust these values to fine-tune.
 */
export const BOT_AI_CONFIG = {
  voteRandomness: 0.2,
  chatDelayRange: [2.0, 9.8] as readonly [number, number],
  memoryErrorChance: 0.14,
  riskyKillChance: 0.24,
  bandwagonStrength: 0.52,
  selfReportChance: 0.14,
  busPartnerChance: 0.34,
  pauseChance: 0.028,
  mindChangeChance: 0.04,
  buddyFollowChance: 0.28,
  wanderOffset: 0.22,
  typingDurationRange: [1.1, 2.6] as readonly [number, number],
  silentBotChance: 0.24,
} as const;

export type BotPersonality =
  | 'leader'
  | 'follower'
  | 'skeptic'
  | 'quiet'
  | 'chatty'
  | 'paranoid'
  | 'chill';

const PERSONALITIES: readonly BotPersonality[] = [
  'leader',
  'follower',
  'skeptic',
  'quiet',
  'chatty',
  'paranoid',
  'chill',
];

export interface BotSightingMemory {
  id: string;
  perceivedName: string;
  perceivedColor: PlayerColorId;
  zoneName: string;
  x: number;
  z: number;
  atMs: number;
  misremembered?: boolean;
}

export interface BotBodyMemory {
  bodyId: string;
  victimId: string;
  victimName: string;
  zoneName: string;
  x: number;
  z: number;
  killedAt: number;
  discoveredAtMs: number;
  killerColorHint?: string;
}

export interface BotHeardClaim {
  speakerId: string;
  speakerName: string;
  accusedId?: string;
  claimedZone?: string;
  defendedSelf?: boolean;
  timestamp: number;
}

export interface BotScheduledChat {
  id: string;
  typingStartSec: number;
  sendAtSec: number;
  text: string;
  accusedId?: string;
  defended?: boolean;
  sent?: boolean;
}

export interface BotBrainState {
  personality: BotPersonality;
  targetWaypointIdx: number;
  pauseTimer: number;
  activeTaskId: string | null;
  voteTimer: number;
  hasChatted: boolean;
  huntTargetId: string | null;
  sabotageDelayTimer: number;
  stuckTimer: number;
  lastX: number;
  lastZ: number;
  detourNodeIdx: number | null;
  detourTimer: number;
  suspicion: Record<string, number>;
  trust: Record<string, number>;
  seenNearKill: string | null;
  killWaitTimer?: number;
  recentSightings: BotSightingMemory[];
  knownBodies: BotBodyMemory[];
  heardClaims: BotHeardClaim[];
  clearedIds: string[];
  lastSightSampleMs: number;
  cachedHopX?: number;
  cachedHopZ?: number;
  cachedGoalX?: number;
  cachedGoalZ?: number;
  cachedDoorMask?: number;
  pathRefreshTimer?: number;
  processedMeetingClues?: boolean;
  zoneHistory: string[];
  lastZoneSampleMs: number;
  fakeStoryZone: string;
  ventTimer?: number;
  ventTargetId?: string | null;
  forensicHint?: string | null;
  masterAccusedId?: string | null;
  buddyTargetId: string | null;
  buddyTimer: number;
  mindChangeTimer: number;
  wanderSeed: number;
  wanderPhase: number;
  postKillCoverTimer: number;
  sabotageReactDelay: number;
  observedValveHolders: string[];
  pendingChats: BotScheduledChat[];
  meetingElapsedSec: number;
  processedChatIds: string[];
  isTypingInMeeting: boolean;
  geminiApplied: boolean;
  hasRespondedToDefense: boolean;
  reportedCallerId?: string | null;
}

export interface BotPlayContext {
  players: PlayerState[];
  bodies: BodyMarker[];
  sabotage: SabotageState;
  doorLocks: DoorLockState;
  settings: RoomSettings;
  holdingFixMap: Map<string, { valveId?: 'valve_cha' | 'valve_rickshaw' }>;
  brains: Map<string, BotBrainState>;
  dt: number;
  nowMs: number;
  rng?: () => number;
  onFootprint?: (p: PlayerState, distMoved: number) => void;
  onReportBody?: (reporter: PlayerState, body: BodyMarker) => void;
  onKill?: (killer: PlayerState, victim: PlayerState, shieldedBlocked: boolean) => void;
  onSabotage?: (type: SabotageType) => void;
  onDoorLock?: (zoneId: DoorZoneId) => void;
  onRevive?: (daktar: PlayerState, victim: PlayerState) => void;
  onTaskCompletedCheckWin?: () => boolean;
}

export interface BotGeminiMeetingBotContext {
  id: string;
  name: string;
  color: PlayerColorId;
  personality: BotPersonality;
  role: 'parabasi' | 'vondo';
  specialRole: string;
  partnerName?: string;
  ownRecentZones: string[];
  fakeAlibiZone?: string;
  privateMemory: string[];
  topSuspectName?: string;
  shouldBeSilent: boolean;
}

export interface BatchedGeminiMeetingPayload {
  roomCode: string;
  phase?: 'opening' | 'reaction';
  reason: 'body' | 'emergency' | null;
  callerName: string | null;
  victimName: string | null;
  bodyZone: string | null;
  aliveNames: string[];
  chatHistory: Array<{ senderName: string; text: string }>;
  bots: BotGeminiMeetingBotContext[];
}

export interface BatchedGeminiChatReply {
  botId: string;
  text: string;
  delaySec: number;
  suspectName?: string;
}

export const BOT_BANTER_LINES = [
  'আমি তো চায়ের দোকানেই ছিলাম ভাই, একদম ক্লিয়ার',
  'ভাই কেউ কিছু দেখো নাই? অনেক সন্দেহ লাগতেছে কিন্তু',
  'কারেন্ট যাওয়ার সময় কে পাশে ছিল বলো তো?',
  'আমি ডেসকো তে লাইন চেক করতেছিলাম ভাই',
  'রিকশা গ্যারেজের দিকে কাউকে দৌড়াতে দেখলা নাকি?',
  'আমার ওপর কোনো প্রমাণ নাই, খামাখা ফাঁসাইয়ো না',
  'ফুচকা কর্নারে ছিলাম আমি, টাস্ক করতেছিলাম',
  'সেলুনের পাশে একজন সন্দেহজনক ঘুরতেছিল মনে হলো',
  'ক্রিকেট মাঠে ছিলাম ভাই, একদম ক্লিয়ার আমি',
  'প্যান্ডেলের দিকে গেছিলাম কিন্তু কাউকে দেখি নাই',
];

export const PAGOL_BANTER_LINES = [
  'হেহে আমি তো কিছু করি নাই রে মামা, পুকুরে চুবানি দিও না প্লিজ',
  'আমি তো খালি পুকুর ঘাটে চুপচাপ দাঁড়ায় ছিলাম ভাই!',
  'আমাকে ভোট দিলে কিন্তু পরে সবাই পস্তাবা হেহে',
];

const EXTRA_NAV_NODES: Array<{ x: number; z: number }> = [
  { x: -31.2, z: -26.5 },
  { x: -31.2, z: -19.5 },
  { x: 31.2, z: -26.5 },
  { x: 31.2, z: -19.5 },
  { x: -31.2, z: 26.5 },
  { x: -31.2, z: 19.5 },
  { x: 31.2, z: 26.5 },
  { x: 31.2, z: 19.5 },
  { x: -29.0, z: -32.0 },
  { x: -35.5, z: -32.2 },
  { x: -41.5, z: -32.0 },
  { x: 38.0, z: -29.5 },
  { x: 31.5, z: -32.0 },
  { x: -31.2, z: 32.5 },
  { x: -34.0, z: 27.5 },
  { x: -34.0, z: 37.0 },
  { x: 34.5, z: 29.0 },
  { x: 29.5, z: 32.0 },
  { x: -55.0, z: -26.0 },
  { x: -60.5, z: -26.0 },
  { x: -55.0, z: 26.0 },
  { x: -60.5, z: 26.0 },
  { x: -37.5, z: -12.0 },
  { x: -37.5, z: 12.0 },
  { x: -54.0, z: -12.0 },
  { x: -54.0, z: 12.0 },
  { x: -8.5, z: -8.5 },
  { x: 8.5, z: -8.5 },
  { x: -8.5, z: 8.5 },
  { x: 8.5, z: 8.5 },
  { x: -21.0, z: -15.0 },
  { x: 21.0, z: -15.0 },
  { x: -21.0, z: 15.0 },
  { x: 21.0, z: 15.0 },
  { x: -11.0, z: -34.5 },
  { x: 11.0, z: -34.5 },
  { x: -11.0, z: 34.5 },
  { x: 11.0, z: 34.5 },
  { x: -24.0, z: -52.0 },
  { x: 24.0, z: -52.0 },
  { x: -24.0, z: 52.0 },
  { x: 24.0, z: 52.0 },
  { x: -52.0, z: -52.0 },
  { x: 52.0, z: -52.0 },
  { x: -52.0, z: 52.0 },
  { x: 52.0, z: 52.0 },
  { x: -86.0, z: -72.0 },
  { x: -86.0, z: -52.0 },
  { x: -86.0, z: 0.0 },
  { x: -86.0, z: 52.0 },
  { x: -86.0, z: 72.0 },
  { x: 86.0, z: -72.0 },
  { x: 86.0, z: -52.0 },
  { x: 86.0, z: 0.0 },
  { x: 86.0, z: 52.0 },
  { x: 86.0, z: 72.0 },
  { x: -74.0, z: -72.0 },
  { x: -52.0, z: -72.0 },
  { x: -32.0, z: -72.0 },
  { x: 32.0, z: -72.0 },
  { x: 52.0, z: -72.0 },
  { x: 74.0, z: -72.0 },
  { x: -74.0, z: -79.0 },
  { x: -74.0, z: -86.5 },
  { x: -32.0, z: -79.0 },
  { x: -32.0, z: -86.5 },
  { x: 32.0, z: -79.0 },
  { x: 32.0, z: -86.5 },
  { x: 74.0, z: -79.0 },
  { x: 74.0, z: -86.5 },
  { x: -52.0, z: 72.0 },
  { x: -26.0, z: 72.0 },
  { x: 0.0, z: 72.0 },
  { x: -5.5, z: 74.0 },
  { x: 26.0, z: 72.0 },
  { x: 52.0, z: 72.0 },
  { x: -52.0, z: 96.0 },
  { x: 0.0, z: 96.0 },
  { x: 52.0, z: 96.0 },
  // Intermediate connectors bridging North Para (-72), North Colony (-114), Jheel/Park (-82), and Opar Para (112/144)
  { x: 0.0, z: -92.0 },
  { x: -52.0, z: -92.0 },
  { x: 52.0, z: -92.0 },
  { x: -86.0, z: -92.0 },
  { x: 86.0, z: -92.0 },
  { x: -118.0, z: -98.0 },
  { x: 118.0, z: -98.0 },
  { x: -118.0, z: -72.0 },
  { x: 118.0, z: -72.0 },
  { x: -118.0, z: 128.0 },
  { x: 118.0, z: 128.0 },
  { x: -118.0, z: 144.0 },
  { x: -86.0, z: 144.0 },
  { x: 86.0, z: 144.0 },
  { x: 118.0, z: 144.0 },
  { x: 133.0, z: -64.0 },
  { x: -127.5, z: -64.0 },
  { x: -74.0, z: -114.0 },
  { x: -32.0, z: -114.0 },
  { x: 32.0, z: -114.0 },
  { x: 74.0, z: -114.0 },
  { x: -58.5, z: 128.0 },
];

export const NAV_NODES: Array<{ x: number; z: number }> = (() => {
  const pts: Array<{ x: number; z: number }> = [];
  const pushUnique = (x: number, z: number) => {
    if (!pts.some((p) => Math.hypot(p.x - x, p.z - z) < 2.2)) {
      pts.push({ x, z });
    }
  };
  for (const w of BOT_WAYPOINTS) pushUnique(w.x, w.z);
  for (const n of EXTRA_NAV_NODES) pushUnique(n.x, n.z);
  return pts;
})();

function segmentHitsExpandedAABB(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  pad: number,
): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  const eMinX = minX - pad;
  const eMaxX = maxX + pad;
  const eMinZ = minZ - pad;
  const eMaxZ = maxZ + pad;

  if (Math.abs(dx) < 1e-8) {
    if (ax < eMinX || ax > eMaxX) return false;
  } else {
    const invDx = 1 / dx;
    let r = (eMinX - ax) * invDx;
    let r2 = (eMaxX - ax) * invDx;
    if (r > r2) {
      const tmp = r;
      r = r2;
      r2 = tmp;
    }
    if (r > t0) t0 = r;
    if (r2 < t1) t1 = r2;
    if (t0 > t1) return false;
  }

  if (Math.abs(dz) < 1e-8) {
    if (az < eMinZ || az > eMaxZ) return false;
  } else {
    const invDz = 1 / dz;
    let r = (eMinZ - az) * invDz;
    let r2 = (eMaxZ - az) * invDz;
    if (r > r2) {
      const tmp = r;
      r = r2;
      r2 = tmp;
    }
    if (r > t0) t0 = r;
    if (r2 < t1) t1 = r2;
    if (t0 > t1) return false;
  }

  return t0 <= t1;
}

export function isPathSegmentWalkable(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  doorLocks?: DoorLockState,
  pad = PLAYER_RADIUS + 0.15,
): boolean {
  const segMinX = (ax < bx ? ax : bx) - pad;
  const segMaxX = (ax > bx ? ax : bx) + pad;
  const segMinZ = (az < bz ? az : bz) - pad;
  const segMaxZ = (az > bz ? az : bz) + pad;
  for (let i = 0; i < WALLS.length; i++) {
    const w = WALLS[i];
    if (w.maxX < segMinX || w.minX > segMaxX || w.maxZ < segMinZ || w.minZ > segMaxZ) continue;
    if (segmentHitsExpandedAABB(ax, az, bx, bz, w.minX, w.maxX, w.minZ, w.maxZ, pad)) {
      return false;
    }
  }
  if (doorLocks) {
    for (let i = 0; i < DOORS.length; i++) {
      const d = DOORS[i];
      if (doorLocks[d.zoneId] <= 0) continue;
      if (d.maxX < segMinX || d.minX > segMaxX || d.maxZ < segMinZ || d.minZ > segMaxZ) continue;
      if (segmentHitsExpandedAABB(ax, az, bx, bz, d.minX, d.maxX, d.minZ, d.maxZ, pad)) {
        return false;
      }
    }
  }
  return true;
}

interface NavEdge {
  to: number;
  cost: number;
  doorZone?: DoorZoneId;
}

const STATIC_NAV_ADJ: NavEdge[][] = (() => {
  const n = NAV_NODES.length;
  const adj: NavEdge[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = NAV_NODES[i];
      const b = NAV_NODES[j];
      const d = distance2D(a.x, a.z, b.x, b.z);
      if (d > 34) continue;
      if (!isPathSegmentWalkable(a.x, a.z, b.x, b.z, undefined, PLAYER_RADIUS + 0.15)) {
        continue;
      }
      let doorZone: DoorZoneId | undefined;
      for (const door of DOORS) {
        if (
          segmentHitsExpandedAABB(
            a.x,
            a.z,
            b.x,
            b.z,
            door.minX,
            door.maxX,
            door.minZ,
            door.maxZ,
            PLAYER_RADIUS + 0.15,
          )
        ) {
          doorZone = door.zoneId;
          break;
        }
      }
      adj[i].push({ to: j, cost: d, doorZone });
      adj[j].push({ to: i, cost: d, doorZone });
    }
  }
  return adj;
})();

const STATIC_ALL_PAIRS = (() => {
  const n = NAV_NODES.length;
  const dist = Array.from({ length: n }, () => new Float64Array(n).fill(Infinity));
  const nextHop = Array.from({ length: n }, () => new Int32Array(n).fill(-1));
  for (let i = 0; i < n; i++) {
    dist[i][i] = 0;
    nextHop[i][i] = i;
    for (const e of STATIC_NAV_ADJ[i]) {
      dist[i][e.to] = e.cost;
      nextHop[i][e.to] = e.to;
    }
  }
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      const dik = dist[i][k];
      if (dik === Infinity) continue;
      for (let j = 0; j < n; j++) {
        const alt = dik + dist[k][j];
        if (alt < dist[i][j]) {
          dist[i][j] = alt;
          nextHop[i][j] = nextHop[i][k];
        }
      }
    }
  }
  return { dist, nextHop };
})();

function hasAnyLockedDoor(doorLocks?: DoorLockState): boolean {
  if (!doorLocks) return false;
  return (
    doorLocks.cha_dokan > 0 ||
    doorLocks.rickshaw_garage > 0 ||
    doorLocks.desco_power > 0 ||
    doorLocks.dish_roof > 0
  );
}

function findNearestWalkableNodes(
  x: number,
  z: number,
  doorLocks?: DoorLockState,
): number[] {
  const dists: Array<{ idx: number; dist: number }> = [];
  for (let i = 0; i < NAV_NODES.length; i++) {
    const node = NAV_NODES[i];
    const dist = distance2D(x, z, node.x, node.z);
    if (dist <= 38) dists.push({ idx: i, dist });
  }
  dists.sort((a, b) => a.dist - b.dist);

  const clearIds: number[] = [];
  const fallbackIds: number[] = [];
  const limit = Math.min(dists.length, 16);
  for (let i = 0; i < limit; i++) {
    const item = dists[i];
    const node = NAV_NODES[item.idx];
    if (isPathSegmentWalkable(x, z, node.x, node.z, doorLocks, PLAYER_RADIUS + 0.05)) {
      clearIds.push(item.idx);
      if (clearIds.length >= 6) break;
    } else if (fallbackIds.length < 2) {
      fallbackIds.push(item.idx);
    }
  }
  return clearIds.length > 0 ? clearIds : fallbackIds;
}

/**
 * Computes the next obstacle-free steering point toward (goalX, goalZ) using
 * direct segment clearance first and shortest path over Moholla corridors otherwise.
 */
export function computeNextMoveTarget(
  fromX: number,
  fromZ: number,
  goalX: number,
  goalZ: number,
  doorLocks?: DoorLockState,
): { x: number; z: number } {
  if (distance2D(fromX, fromZ, goalX, goalZ) < 1.2) {
    return { x: goalX, z: goalZ };
  }
  if (isPathSegmentWalkable(fromX, fromZ, goalX, goalZ, doorLocks, PLAYER_RADIUS + 0.1)) {
    return { x: goalX, z: goalZ };
  }

  const starts = findNearestWalkableNodes(fromX, fromZ, doorLocks);
  const goals = findNearestWalkableNodes(goalX, goalZ, doorLocks);
  if (starts.length === 0 || goals.length === 0) {
    return { x: goalX, z: goalZ };
  }

  if (!hasAnyLockedDoor(doorLocks)) {
    let bestFirst = -1;
    let bestGoal = -1;
    let bestCost = Infinity;
    for (const s of starts) {
      const dStart = distance2D(fromX, fromZ, NAV_NODES[s].x, NAV_NODES[s].z);
      for (const g of goals) {
        const mid = STATIC_ALL_PAIRS.dist[s][g];
        if (!Number.isFinite(mid)) continue;
        const dGoal = distance2D(NAV_NODES[g].x, NAV_NODES[g].z, goalX, goalZ);
        const total = dStart + mid + dGoal;
        if (total < bestCost) {
          bestCost = total;
          bestFirst = s;
          bestGoal = g;
        }
      }
    }
    if (bestFirst >= 0 && bestGoal >= 0) {
      let hopIdx = bestFirst;
      let steps = 0;
      while (hopIdx !== bestGoal && steps++ < 6) {
        const nextIdx = STATIC_ALL_PAIRS.nextHop[hopIdx][bestGoal];
        if (nextIdx < 0 || nextIdx === hopIdx) break;
        if (
          isPathSegmentWalkable(
            fromX,
            fromZ,
            NAV_NODES[nextIdx].x,
            NAV_NODES[nextIdx].z,
            doorLocks,
            PLAYER_RADIUS + 0.08,
          )
        ) {
          hopIdx = nextIdx;
        } else {
          break;
        }
      }
      return NAV_NODES[hopIdx];
    }
  }

  const goalSet = new Set(goals);
  const n = NAV_NODES.length;
  const dist = new Float64Array(n).fill(Infinity);
  const firstHop = new Int32Array(n).fill(-1);
  const parent = new Int32Array(n).fill(-1);
  const visited = new Uint8Array(n);

  for (const s of starts) {
    const d0 = distance2D(fromX, fromZ, NAV_NODES[s].x, NAV_NODES[s].z);
    dist[s] = d0;
    firstHop[s] = s;
  }

  let bestGoalNode = -1;
  let bestTotalCost = Infinity;
  let closestReachableNode = -1;
  let closestReachableDist = Infinity;

  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      if (!visited[i] && dist[i] < bestD) {
        bestD = dist[i];
        u = i;
      }
    }
    if (u < 0) break;
    visited[u] = 1;

    const dToGoal = distance2D(NAV_NODES[u].x, NAV_NODES[u].z, goalX, goalZ);
    if (dToGoal < closestReachableDist) {
      closestReachableDist = dToGoal;
      closestReachableNode = u;
    }

    if (goalSet.has(u)) {
      const total = dist[u] + dToGoal;
      if (total < bestTotalCost) {
        bestTotalCost = total;
        bestGoalNode = u;
      }
    }

    const edges = STATIC_NAV_ADJ[u];
    for (let eIdx = 0; eIdx < edges.length; eIdx++) {
      const e = edges[eIdx];
      if (e.doorZone && doorLocks && doorLocks[e.doorZone] > 0) continue;
      const nd = dist[u] + e.cost;
      if (nd < dist[e.to]) {
        dist[e.to] = nd;
        firstHop[e.to] = firstHop[u];
        parent[e.to] = u;
      }
    }
  }

  const targetNode = bestGoalNode >= 0 ? bestGoalNode : closestReachableNode;
  if (targetNode >= 0 && firstHop[targetNode] >= 0) {
    const path: number[] = [];
    let cur = targetNode;
    let guard = 0;
    while (cur >= 0 && guard++ < n) {
      path.push(cur);
      if (parent[cur] < 0) break;
      cur = parent[cur];
    }
    path.reverse();
    let hopIdx = path[0];
    for (let k = 1; k < path.length && k <= 6; k++) {
      const nextIdx = path[k];
      if (
        isPathSegmentWalkable(
          fromX,
          fromZ,
          NAV_NODES[nextIdx].x,
          NAV_NODES[nextIdx].z,
          doorLocks,
          PLAYER_RADIUS + 0.08,
        )
      ) {
        hopIdx = nextIdx;
      } else {
        break;
      }
    }
    return NAV_NODES[hopIdx];
  }

  return NAV_NODES[starts[0]];
}

// ============================================================================
// Personality, Brain Initialization & Private Perception Helpers
// ============================================================================

export function pickPersonality(rng: () => number = Math.random): BotPersonality {
  return PERSONALITIES[Math.floor(rng() * PERSONALITIES.length)] ?? 'chill';
}

export function createBotBrainState(rng: () => number = Math.random): BotBrainState {
  const personality = pickPersonality(rng);
  return {
    personality,
    targetWaypointIdx: Math.floor(rng() * BOT_WAYPOINTS.length),
    pauseTimer: 0.4 + rng() * 1.1,
    activeTaskId: null,
    voteTimer: 2.2 + rng() * 5.2,
    hasChatted: false,
    huntTargetId: null,
    sabotageDelayTimer: 32 + rng() * 24,
    killWaitTimer: 3 + rng() * 3,
    recentSightings: [],
    knownBodies: [],
    heardClaims: [],
    clearedIds: [],
    lastSightSampleMs: 0,
    stuckTimer: 0,
    lastX: 0,
    lastZ: 0,
    detourNodeIdx: null,
    detourTimer: 0,
    suspicion: {},
    trust: {},
    seenNearKill: null,
    processedMeetingClues: false,
    zoneHistory: [],
    lastZoneSampleMs: 0,
    fakeStoryZone: ZONES[Math.floor(rng() * ZONES.length)]?.name ?? 'Adda Chowk',
    ventTimer: 0,
    ventTargetId: null,
    forensicHint: null,
    masterAccusedId: null,
    buddyTargetId: null,
    buddyTimer: 0,
    mindChangeTimer: 4 + rng() * 6,
    wanderSeed: rng() * Math.PI * 2,
    wanderPhase: rng() * Math.PI * 2,
    postKillCoverTimer: 0,
    sabotageReactDelay: 0,
    observedValveHolders: [],
    pendingChats: [],
    meetingElapsedSec: 0,
    processedChatIds: [],
    isTypingInMeeting: false,
    geminiApplied: false,
    hasRespondedToDefense: false,
    reportedCallerId: null,
  };
}

function resolvePerceivedPlayerIdentity(
  subject: PlayerState,
  allPlayers: PlayerState[],
): { perceivedId: string; perceivedName: string; perceivedColor: PlayerColorId } {
  if (subject.disguiseColor && subject.disguiseName) {
    const lookalike = allPlayers.find(
      (pl) => pl.id !== subject.id && pl.color === subject.disguiseColor,
    );
    return {
      perceivedId: lookalike?.id ?? subject.id,
      perceivedName: subject.disguiseName,
      perceivedColor: subject.disguiseColor,
    };
  }
  return {
    perceivedId: subject.id,
    perceivedName: subject.name,
    perceivedColor: subject.color,
  };
}

function getAdjacentNoisyZoneName(actualZoneName: string, rng: () => number): string {
  const candidates = ZONES.filter((z) => z.name !== actualZoneName);
  if (candidates.length === 0) return actualZoneName;
  const actual = ZONES.find((z) => z.name === actualZoneName);
  if (!actual) return candidates[Math.floor(rng() * candidates.length)].name;
  const nearby = [...candidates]
    .sort((a, b) => distance2D(a.x, a.z, actual.x, actual.z) - distance2D(b.x, b.z, actual.x, actual.z))
    .slice(0, 3);
  return nearby[Math.floor(rng() * nearby.length)].name;
}

export function resetBotBrainsForMeeting(
  brains: Map<string, BotBrainState>,
  rng: () => number = Math.random,
): void {
  for (const brain of brains.values()) {
    brain.voteTimer =
      brain.personality === 'leader'
        ? 1.8 + rng() * 3.2
        : brain.personality === 'quiet' || brain.personality === 'skeptic'
          ? 3.2 + rng() * 5.2
          : 2.2 + rng() * 4.4;
    brain.hasChatted = false;
    brain.pauseTimer = 0.3 + rng() * 0.6;
    brain.detourNodeIdx = null;
    brain.detourTimer = 0;
    brain.killWaitTimer = 41 + rng() * 16;
    brain.processedMeetingClues = false;
    brain.ventTimer = 0;
    brain.ventTargetId = null;
    brain.postKillCoverTimer = 0;
    brain.buddyTargetId = null;
    brain.buddyTimer = 0;
    brain.observedValveHolders = [];
    brain.heardClaims = [];
    brain.pendingChats = [];
    brain.meetingElapsedSec = 0;
    brain.processedChatIds = [];
    brain.isTypingInMeeting = false;
    brain.geminiApplied = false;
    brain.hasRespondedToDefense = false;
    brain.reportedCallerId = null;
    // Slight natural suspicion decay between rounds so old weak rumors don't stick forever
    for (const k of Object.keys(brain.suspicion)) {
      brain.suspicion[k] = Number((brain.suspicion[k] * 0.65).toFixed(2));
      if (brain.suspicion[k] < 0.25) delete brain.suspicion[k];
    }
  }
}

export function recordKillWitnesses(
  brains: Map<string, BotBrainState>,
  players: PlayerState[],
  killer: PlayerState,
  victim: PlayerState,
  sabotageActive: SabotageType | null,
  doorLocks: DoorLockState,
  rng: () => number = Math.random,
): void {
  const visionRange = sabotageActive === 'loadshedding' ? 9.5 : 19.5;
  const perceived = resolvePerceivedPlayerIdentity(killer, players);

  for (const observer of players) {
    if (!observer.isBot || !observer.alive) continue;
    if (observer.id === killer.id || observer.id === victim.id || observer.role === 'vondo') continue;
    const dist = distance2D(observer.x, observer.z, victim.x, victim.z);
    if (dist > visionRange) continue;
    if (!hasLineOfSight(observer.x, observer.z, victim.x, victim.z, WALLS, doorLocks)) continue;
    const brain = brains.get(observer.id);
    if (!brain) continue;

    // Edge-of-vision or darkness can cause realistic witness error
    const riskyDist = dist > visionRange * 0.72 || sabotageActive === 'loadshedding';
    if (riskyDist && rng() < BOT_AI_CONFIG.memoryErrorChance * 0.65) {
      brain.suspicion[perceived.perceivedId] = (brain.suspicion[perceived.perceivedId] ?? 0) + 2.8;
      continue;
    }

    brain.seenNearKill = perceived.perceivedId;
    brain.suspicion[perceived.perceivedId] = (brain.suspicion[perceived.perceivedId] ?? 0) + 6.5;
  }
}

function hasKillWitnesses(
  killer: PlayerState,
  victim: PlayerState,
  players: PlayerState[],
  sabotageActive: SabotageType | null,
  doorLocks: DoorLockState,
  rng: () => number,
): boolean {
  const visionRange = sabotageActive === 'loadshedding' ? 5.6 : 10.5;
  let nearbyWitnessCount = 0;
  for (const other of players) {
    if (!other.alive) continue;
    if (other.id === killer.id || other.id === victim.id || other.role === 'vondo') continue;
    const d = distance2D(other.x, other.z, victim.x, victim.z);
    if (d > visionRange) continue;
    if (hasLineOfSight(other.x, other.z, victim.x, victim.z, WALLS, doorLocks)) {
      nearbyWitnessCount++;
    }
  }
  if (nearbyWitnessCount === 0) return false;
  // Risky daring kills only happen rarely if just 1 distant bystander is near edge of sight
  if (nearbyWitnessCount === 1 && rng() < BOT_AI_CONFIG.riskyKillChance * 0.35) {
    return false;
  }
  return true;
}

/**
 * Updates ONE bot's strictly private perception from LOS, nearby sounds,
 * visual task animations, and body discovery. Zero global / role leaks.
 */
function updateBotPerception(
  p: PlayerState,
  brain: BotBrainState,
  players: PlayerState[],
  bodies: BodyMarker[],
  sabotage: SabotageState,
  doorLocks: DoorLockState,
  settings: RoomSettings,
  nowMs: number,
  rng: () => number,
): void {
  // Record visited zones for authentic alibi stories
  if (nowMs - brain.lastZoneSampleMs >= 2200) {
    brain.lastZoneSampleMs = nowMs;
    const zn = getZoneNameAt(p.x, p.z);
    if (zn && brain.zoneHistory[brain.zoneHistory.length - 1] !== zn) {
      brain.zoneHistory.push(zn);
      if (brain.zoneHistory.length > 5) brain.zoneHistory.shift();
      if (p.role !== 'vondo' || brain.postKillCoverTimer > 0 || p.killCooldownRemaining > 5) {
        brain.fakeStoryZone = zn;
      }
    }
  }

  // Track nearby bodies personally discovered via LOS
  const bodyVision = sabotage.active === 'loadshedding' ? 9.5 : 15.0;
  for (const b of bodies) {
    if (b.reported) continue;
    if (distance2D(p.x, p.z, b.x, b.z) > bodyVision) continue;
    if (!hasLineOfSight(p.x, p.z, b.x, b.z, WALLS, doorLocks)) continue;
    if (!brain.knownBodies.some((kb) => kb.bodyId === b.id)) {
      brain.knownBodies.push({
        bodyId: b.id,
        victimId: b.victimId,
        victimName: b.victimName,
        zoneName: getZoneNameAt(b.x, b.z),
        x: b.x,
        z: b.z,
        killedAt: b.killedAt,
        discoveredAtMs: nowMs,
      });
      if (brain.knownBodies.length > 6) brain.knownBodies.shift();
    }
  }

  // Track visible valve holders personally seen during gas_leak (persist across doorway LOS breaks to prevent ping-pong)
  if (sabotage.active === 'gas_leak') {
    const knownOccupied = new Set(brain.observedValveHolders);
    for (const v of sabotage.valves) {
      const distV = distance2D(p.x, p.z, v.x, v.z);
      const hasLosV = distV <= 18 && hasLineOfSight(p.x, p.z, v.x, v.z, WALLS, doorLocks);
      if (hasLosV) {
        if (v.holderId && v.holderId !== p.id) {
          knownOccupied.add(v.id);
        } else if (distV <= 5.5 && !v.holderId) {
          knownOccupied.delete(v.id);
        }
      }
    }
    brain.observedValveHolders = Array.from(knownOccupied);
  } else {
    brain.observedValveHolders = [];
  }

  if (nowMs - brain.lastSightSampleMs < 550) return;
  brain.lastSightSampleMs = nowMs;

  const sights = brain.recentSightings.filter((s) => nowMs - s.atMs <= 80000);
  const cleared = new Set(brain.clearedIds);
  const sightRange = sabotage.active === 'loadshedding' ? 10.5 : 22.0;

  for (const other of players) {
    if (!other.alive || other.id === p.id) continue;

    // Audible drain vent check for Mistri/nearby vents
    if (other.inVent && isMistriVentAudibleTo(other, p)) {
      if (p.role === 'parabasi' && other.specialRole !== 'mistri') {
        brain.suspicion[other.id] = (brain.suspicion[other.id] ?? 0) + 2.4;
      }
      continue;
    }
    if (other.inVent) continue;

    const d = distance2D(p.x, p.z, other.x, other.z);
    if (d > sightRange) continue;
    if (!hasLineOfSight(p.x, p.z, other.x, other.z, WALLS, doorLocks)) continue;

    const perceived = resolvePerceivedPlayerIdentity(other, players);
    const actualZone = getZoneNameAt(other.x, other.z);
    const noisy = (d > sightRange * 0.72 || sabotage.active === 'loadshedding') && rng() < BOT_AI_CONFIG.memoryErrorChance;
    const recordedZone = noisy ? getAdjacentNoisyZoneName(actualZone, rng) : actualZone;

    // Sharp Crewmate deduction: catch someone popping right out of a distant vent/manhole
    if (p.role === 'parabasi' && !isNeutralRole(p.specialRole) && d <= 16 && other.specialRole !== 'mistri') {
      const prevSight = [...sights].reverse().find((sg) => sg.id === perceived.perceivedId);
      const nearVentNow = VENTS.some((vn) => distance2D(other.x, other.z, vn.x, vn.z) <= 4.8);
      if (
        prevSight &&
        nearVentNow &&
        nowMs - prevSight.atMs <= 3400 &&
        distance2D(prevSight.x, prevSight.z, other.x, other.z) > 22 &&
        !cleared.has(perceived.perceivedId)
      ) {
        brain.suspicion[perceived.perceivedId] = (brain.suspicion[perceived.perceivedId] ?? 0) + 2.6;
      }
    }

    sights.push({
      id: perceived.perceivedId,
      perceivedName: perceived.perceivedName,
      perceivedColor: perceived.perceivedColor,
      zoneName: recordedZone,
      x: other.x,
      z: other.z,
      atMs: nowMs,
      misremembered: noisy,
    });

    // Visual task confirmation clears a player in this bot's eyes
    if (other.visualTaskTimer > 0 && settings.visualTasks) {
      cleared.add(perceived.perceivedId);
      brain.trust[perceived.perceivedId] = (brain.trust[perceived.perceivedId] ?? 0) + 2.5;
    }

    // Seeing someone visibly fixing a critical sabotage boosts trust
    if (sabotage.active === 'gas_leak' && sabotage.valves.some((v) => v.holderId === other.id)) {
      brain.trust[perceived.perceivedId] = (brain.trust[perceived.perceivedId] ?? 0) + 0.35;
    }

    // Paranoid bots feel slightly suspicious if someone trails them closely while alone
    if (
      p.role === 'parabasi' &&
      brain.personality === 'paranoid' &&
      d < 4.0 &&
      !cleared.has(perceived.perceivedId) &&
      rng() < 0.14
    ) {
      brain.suspicion[perceived.perceivedId] = (brain.suspicion[perceived.perceivedId] ?? 0) + 0.45;
    }
  }

  brain.recentSightings = sights.slice(-32);
  brain.clearedIds = Array.from(cleared);
}

/**
 * Decides an individual bot's tactical movement destination without global hive-mind assignment.
 */
function decideBotGoal(
  p: PlayerState,
  brain: BotBrainState,
  players: PlayerState[],
  bodies: BodyMarker[],
  sabotage: SabotageState,
  doorLocks: DoorLockState,
  nowMs: number,
  rng: () => number,
): {
  goalX: number;
  goalZ: number;
  activeStationTarget: (typeof TASK_STATIONS)[number] | null;
  sprintBoost: boolean;
  tookVent: boolean;
} {
  let goalX = BOT_WAYPOINTS[brain.targetWaypointIdx % BOT_WAYPOINTS.length].x;
  let goalZ = BOT_WAYPOINTS[brain.targetWaypointIdx % BOT_WAYPOINTS.length].z;
  let activeStationTarget: (typeof TASK_STATIONS)[number] | null = null;
  let sprintBoost = false;

  // Individual crew sabotage response using private LOS + recent sightings (zero hive-mind!)
  if (sabotage.active === 'gas_leak' && p.role === 'parabasi' && !isNeutralRole(p.specialRole)) {
    const v0 = GAS_LEAK_VALVES[0];
    const v1 = GAS_LEAK_VALVES[1];
    const d0 = distance2D(p.x, p.z, v0.x, v0.z);
    const d1 = distance2D(p.x, p.z, v1.x, v1.z);
    const v0OccupiedSeen = brain.observedValveHolders.includes(v0.id);
    const v1OccupiedSeen = brain.observedValveHolders.includes(v1.id);
    const nearbyHelperAtV0 = players.some(
      (pl) =>
        pl.alive &&
        pl.id !== p.id &&
        pl.role === 'parabasi' &&
        !isNeutralRole(pl.specialRole) &&
        distance2D(pl.x, pl.z, v0.x, v0.z) < 9 &&
        hasLineOfSight(p.x, p.z, pl.x, pl.z, WALLS, doorLocks),
    );
    const nearbyHelperAtV1 = players.some(
      (pl) =>
        pl.alive &&
        pl.id !== p.id &&
        pl.role === 'parabasi' &&
        !isNeutralRole(pl.specialRole) &&
        distance2D(pl.x, pl.z, v1.x, v1.z) < 9 &&
        hasLineOfSight(p.x, p.z, pl.x, pl.z, WALLS, doorLocks),
    );

    // Infer from personal recent sightings whether crewmates were already on the West (Cha) or East (Rickshaw) wing
    const westRecent = brain.recentSightings.filter((s) => nowMs - s.atMs <= 14000 && s.x < -8).length;
    const eastRecent = brain.recentSightings.filter((s) => nowMs - s.atMs <= 14000 && s.x > 8).length;
    const personalityBiasEast = brain.personality === 'leader' || brain.personality === 'skeptic' || brain.personality === 'paranoid';

    let chosenValve = d0 <= d1 ? v0 : v1;
    if ((v0OccupiedSeen || nearbyHelperAtV0) && !v1OccupiedSeen && !nearbyHelperAtV1) {
      chosenValve = v1;
    } else if ((v1OccupiedSeen || nearbyHelperAtV1) && !v0OccupiedSeen && !nearbyHelperAtV0) {
      chosenValve = v0;
    } else if (d0 <= d1 && westRecent >= 1 && eastRecent === 0 && personalityBiasEast) {
      chosenValve = v1;
    } else if (d1 < d0 && eastRecent >= 1 && westRecent === 0 && personalityBiasEast) {
      chosenValve = v0;
    } else if (Math.abs(d0 - d1) < 24 && brain.wanderSeed > Math.PI) {
      chosenValve = chosenValve.id === v0.id ? v1 : v0;
    }

    // Mistri may hop via drain shortcut toward critical gas valve
    if (p.specialRole === 'mistri' && p.abilityCooldown <= 0.05) {
      const nearVent = VENTS.find((vn) => distance2D(p.x, p.z, vn.x, vn.z) <= VENT_RANGE);
      if (nearVent) {
        const hop = getConnectedVents(nearVent.x, nearVent.z).targets.sort(
          (a, b) => distance2D(a.x, a.z, chosenValve.x, chosenValve.z) - distance2D(b.x, b.z, chosenValve.x, chosenValve.z),
        )[0];
        if (hop && distance2D(hop.x, hop.z, chosenValve.x, chosenValve.z) + 6 < distance2D(p.x, p.z, chosenValve.x, chosenValve.z)) {
          p.inVent = true;
          p.x = nearVent.x;
          p.z = nearVent.z;
          brain.ventTargetId = hop.id;
          brain.ventTimer = 0.55;
          return { goalX: chosenValve.x, goalZ: chosenValve.z, activeStationTarget: null, sprintBoost: true, tookVent: true };
        }
      }
    }

    return {
      goalX: chosenValve.x,
      goalZ: chosenValve.z,
      activeStationTarget: null,
      sprintBoost: true,
      tookVent: false,
    };
  }

  if (brain.detourNodeIdx !== null && brain.detourTimer > 0) {
    const dNode = NAV_NODES[brain.detourNodeIdx % NAV_NODES.length];
    return { goalX: dNode.x, goalZ: dNode.z, activeStationTarget: null, sprintBoost: false, tookVent: false };
  }

  if (
    sabotage.active &&
    sabotage.active !== 'gas_leak' &&
    p.role === 'parabasi' &&
    !isNeutralRole(p.specialRole)
  ) {
    const distToFix = distance2D(p.x, p.z, sabotage.fixStationX, sabotage.fixStationZ);
    const eagerness =
      brain.personality === 'leader'
        ? 85
        : brain.personality === 'follower'
          ? 65
          : brain.personality === 'chill'
            ? 38
            : 54;
    if (distToFix <= eagerness && brain.sabotageReactDelay <= 0) {
      return {
        goalX: sabotage.fixStationX,
        goalZ: sabotage.fixStationZ,
        activeStationTarget: null,
        sprintBoost: distToFix > 12,
        tookVent: false,
      };
    }
  }

  // Jharudar sweeps only bodies personally visible within sight
  if (
    p.specialRole === 'jharudar' &&
    p.abilityCooldown <= 0.05 &&
    (p.cleansLeft ?? JHARUDAR_CLEAN_USES) > 0
  ) {
    const visibleBody = bodies
      .filter((b) => !b.reported && distance2D(p.x, p.z, b.x, b.z) <= 20 && hasLineOfSight(p.x, p.z, b.x, b.z, WALLS, doorLocks))
      .sort((a, b) => distance2D(p.x, p.z, a.x, a.z) - distance2D(p.x, p.z, b.x, b.z))[0];
    if (visibleBody) {
      return { goalX: visibleBody.x, goalZ: visibleBody.z, activeStationTarget: null, sprintBoost: true, tookVent: false };
    }
  }

  // Impostor post-kill cover: move to a busy/open Moholla hub or fake a task station for a solid alibi!
  if (p.role === 'vondo' && brain.postKillCoverTimer > 0) {
    const coverStation = p.tasks
      .map((t) => TASK_STATIONS.find((s) => s.id === t.taskId))
      .filter((s): s is (typeof TASK_STATIONS)[number] => Boolean(s))
      .filter((s) => distance2D(p.x, p.z, s.x, s.z) > 10)
      .sort((a, b) => distance2D(p.x, p.z, a.x, a.z) - distance2D(p.x, p.z, b.x, b.z))[0];
    if (coverStation) {
      return {
        goalX: coverStation.x,
        goalZ: coverStation.z,
        activeStationTarget: coverStation,
        sprintBoost: false,
        tookVent: false,
      };
    }
  }

  // Impostor hunting using ONLY personal LOS + remembered recent sightings (zero wall-hack!)
  if (
    p.role === 'vondo' &&
    p.killCooldownRemaining <= 2.5 &&
    (brain.killWaitTimer ?? 0) <= 1.2 &&
    brain.postKillCoverTimer <= 0
  ) {
    const visibleRange = sabotage.active === 'loadshedding' ? 12 : 24;
    let isolated: PlayerState | null = null;
    let bestScore = Infinity;

    for (const cand of players) {
      if (!cand.alive || cand.role === 'vondo' || cand.inVent) continue;
      const dist = distance2D(p.x, p.z, cand.x, cand.z);
      if (dist > visibleRange) continue;
      if (!hasLineOfSight(p.x, p.z, cand.x, cand.z, WALLS, doorLocks)) continue;

      const visibleCrowd = players.filter(
        (o) =>
          o.alive &&
          o.id !== cand.id &&
          o.id !== p.id &&
          o.role !== 'vondo' &&
          distance2D(o.x, o.z, cand.x, cand.z) < 11 &&
          hasLineOfSight(p.x, p.z, o.x, o.z, WALLS, doorLocks),
      ).length;

      const contractBonus = p.specialRole === 'supari_killer' && cand.id === p.supariTargetId ? -12 : 0;
      const score = dist + visibleCrowd * 20 + contractBonus;
      if (score < bestScore) {
        bestScore = score;
        isolated = cand;
      }
    }

    if (isolated) {
      return {
        goalX: isolated.x,
        goalZ: isolated.z,
        activeStationTarget: null,
        sprintBoost: distance2D(p.x, p.z, isolated.x, isolated.z) < 12,
        tookVent: false,
      };
    }

    // No target in LOS right now: drift toward last remembered non-partner sighting or patrol Moholla hubs
    const recentMem = brain.recentSightings
      .filter((s) => {
        if (nowMs - s.atMs >= 20000) return false;
        const pl = players.find((o) => o.id === s.id);
        return !pl || pl.role !== 'vondo';
      })
      .sort((a, b) => b.atMs - a.atMs)[0];
    if (recentMem && distance2D(p.x, p.z, recentMem.x, recentMem.z) > 3.5) {
      return {
        goalX: recentMem.x,
        goalZ: recentMem.z,
        activeStationTarget: null,
        sprintBoost: false,
        tookVent: false,
      };
    }
    const patrolHub = TASK_STATIONS[brain.targetWaypointIdx % TASK_STATIONS.length];
    if (patrolHub) {
      return {
        goalX: patrolHub.x,
        goalZ: patrolHub.z,
        activeStationTarget: null,
        sprintBoost: false,
        tookVent: false,
      };
    }
  }

  // Chamcha sticks close to Patron
  if (p.specialRole === 'chamcha' && p.chamchaPatronId) {
    const patron = players.find((pl) => pl.id === p.chamchaPatronId && pl.alive && !pl.inVent);
    if (patron && distance2D(p.x, p.z, patron.x, patron.z) > 4.5) {
      return { goalX: patron.x, goalZ: patron.z, activeStationTarget: null, sprintBoost: false, tookVent: false };
    }
  }

  if (p.specialRole === 'chandabaz' && p.abilityCooldown <= 2) {
    const extorted = new Set(p.chandabazTargets ?? []);
    const target = players
      .filter((pl) => pl.alive && pl.id !== p.id && !pl.inVent && !extorted.has(pl.id))
      .sort((a, b) => distance2D(p.x, p.z, a.x, a.z) - distance2D(p.x, p.z, b.x, b.z))[0];
    if (target) {
      return { goalX: target.x, goalZ: target.z, activeStationTarget: null, sprintBoost: false, tookVent: false };
    }
  }

  if (p.specialRole === 'tiktok_star' && p.abilityCooldown <= 2) {
    const filmed = new Set(p.tiktokZones ?? []);
    const unfilmedZone = ZONES.find((z) => z.id !== 'adda_chowk' && !filmed.has(z.id));
    if (unfilmedZone) {
      return { goalX: unfilmedZone.x, goalZ: unfilmedZone.z, activeStationTarget: null, sprintBoost: false, tookVent: false };
    }
  }

  // Crewmate occasional brief buddy following when scared (death happened or lights out)
  const anyDead = players.some((pl) => !pl.alive) || bodies.length > 0;
  if (
    p.role === 'parabasi' &&
    !isNeutralRole(p.specialRole) &&
    (anyDead || sabotage.active === 'loadshedding') &&
    brain.buddyTargetId &&
    brain.buddyTimer > 0
  ) {
    const buddy = players.find((pl) => pl.id === brain.buddyTargetId && pl.alive && !pl.inVent);
    if (
      buddy &&
      distance2D(p.x, p.z, buddy.x, buddy.z) <= 18 &&
      hasLineOfSight(p.x, p.z, buddy.x, buddy.z, WALLS, doorLocks)
    ) {
      if (distance2D(p.x, p.z, buddy.x, buddy.z) > 3.8) {
        return { goalX: buddy.x, goalZ: buddy.z, activeStationTarget: null, sprintBoost: false, tookVent: false };
      }
    } else {
      brain.buddyTargetId = null;
      brain.buddyTimer = 0;
    }
  }

  // Primary crew real task or Batpar fake task (commit to activeTaskId so no mid-walk zigzags, while naturally spreading routes!)
  const nextTasks = p.tasks.filter((t) => !t.completed && !isTaskLockedBySabotage(t.taskId, sabotage));
  let st =
    brain.activeTaskId && nextTasks.some((t) => t.taskId === brain.activeTaskId)
      ? TASK_STATIONS.find((s) => s.id === brain.activeTaskId) ?? null
      : null;
  if (!st && nextTasks.length > 0) {
    const candidates = nextTasks
      .map((t) => ({ t, station: TASK_STATIONS.find((s) => s.id === t.taskId) }))
      .filter((entry): entry is { t: (typeof nextTasks)[number]; station: (typeof TASK_STATIONS)[number] } => Boolean(entry.station))
      .sort(
        (a, b) =>
          distance2D(p.x, p.z, a.station.x, a.station.z) -
          distance2D(p.x, p.z, b.station.x, b.station.z),
      );
    if (candidates.length > 0) {
      let idx = 0;
      if (candidates.length > 2) {
        const roll = rng();
        if (roll < 0.62) {
          idx = 0;
        } else if (roll < 0.88) {
          idx = 1 + Math.floor(rng() * Math.min(2, candidates.length - 1));
        } else {
          const curZone = getZoneIdAt(p.x, p.z);
          const distantStart = Math.min(2, candidates.length - 1);
          const outerPool = candidates
            .map((c, i) => ({ c, i }))
            .slice(distantStart)
            .filter(({ c }) => getZoneIdAt(c.station.x, c.station.z) !== curZone);
          if (outerPool.length > 0) {
            idx = outerPool[Math.floor(rng() * outerPool.length)].i;
          } else {
            idx = distantStart + Math.floor(rng() * (candidates.length - distantStart));
          }
        }
      } else if (candidates.length === 2 && rng() < 0.3) {
        idx = 1;
      }
      st = candidates[idx].station;
      brain.activeTaskId = st.id;
    }
  }
  if (st) {
    activeStationTarget = st;
    goalX = st.x;
    goalZ = st.z;
    if (p.role === 'parabasi' && distance2D(p.x, p.z, st.x, st.z) > 36) {
      sprintBoost = true;
    }
  }

  // Occasionally consider buddying up with a nearby trusted neighbor
  if (
    p.role === 'parabasi' &&
    !brain.buddyTargetId &&
    (anyDead || sabotage.active === 'loadshedding') &&
    (brain.personality === 'follower' || brain.personality === 'paranoid') &&
    rng() < BOT_AI_CONFIG.buddyFollowChance * 0.04
  ) {
    const candidate = players.find(
      (pl) =>
        pl.alive &&
        pl.id !== p.id &&
        !pl.inVent &&
        (brain.suspicion[pl.id] ?? 0) < 1.5 &&
        distance2D(p.x, p.z, pl.x, pl.z) < 11 &&
        hasLineOfSight(p.x, p.z, pl.x, pl.z, WALLS, doorLocks),
    );
    if (candidate) {
      brain.buddyTargetId = candidate.id;
      brain.buddyTimer = 4.5 + rng() * 5.0;
    }
  }

  return { goalX, goalZ, activeStationTarget, sprintBoost, tookVent: false };
}

/**
 * Alerts bot victim and nearby witnesses with LOS whenever a Chandabaz extorts someone.
 */
export function notifyBotsOfChandabazExtort(
  chandabaz: PlayerState,
  target: PlayerState,
  players: PlayerState[],
  brains: Map<string, BotBrainState>,
  doorLocks: DoorLockState,
): void {
  if (target.isBot) {
    const tBrain = brains.get(target.id);
    if (tBrain) {
      tBrain.suspicion[chandabaz.id] = (tBrain.suspicion[chandabaz.id] ?? 0) + 2.3;
      tBrain.trust[chandabaz.id] = Math.min(0, (tBrain.trust[chandabaz.id] ?? 0) - 2.0);
      tBrain.clearedIds = tBrain.clearedIds.filter((id) => id !== chandabaz.id);
    }
  }
  for (const observer of players) {
    if (!observer.alive || !observer.isBot || observer.id === chandabaz.id || observer.id === target.id) continue;
    const dist = distance2D(observer.x, observer.z, chandabaz.x, chandabaz.z);
    if (dist <= CHANDABAZ_WITNESS_RANGE && hasLineOfSight(observer.x, observer.z, chandabaz.x, chandabaz.z, WALLS, doorLocks)) {
      const oBrain = brains.get(observer.id);
      if (oBrain) {
        oBrain.suspicion[chandabaz.id] = (oBrain.suspicion[chandabaz.id] ?? 0) + 1.65;
        oBrain.trust[chandabaz.id] = Math.min(0, (oBrain.trust[chandabaz.id] ?? 0) - 1.2);
        oBrain.clearedIds = oBrain.clearedIds.filter((id) => id !== chandabaz.id);
      }
    }
  }
}

/**
 * Moves a bot along its path with human-like subtle wander, pauses, mind changes,
 * and anti-stuck wall collision handling.
 */
function stepHumanizedMovement(
  p: PlayerState,
  brain: BotBrainState,
  goalX: number,
  goalZ: number,
  sprintBoost: boolean,
  doorLocks: DoorLockState,
  settings: RoomSettings,
  dt: number,
  rng: () => number,
  onFootprint?: (p: PlayerState, distMoved: number) => void,
): void {
  if (brain.pathRefreshTimer && brain.pathRefreshTimer > 0) {
    brain.pathRefreshTimer = Math.max(0, brain.pathRefreshTimer - dt);
  }

  const doorMask =
    (doorLocks.cha_dokan > 0 ? 1 : 0) |
    (doorLocks.rickshaw_garage > 0 ? 2 : 0) |
    (doorLocks.desco_power > 0 ? 4 : 0) |
    (doorLocks.dish_roof > 0 ? 8 : 0);

  let nextHop: { x: number; z: number };
  const goalSame =
    brain.cachedGoalX !== undefined &&
    brain.cachedGoalZ !== undefined &&
    distance2D(goalX, goalZ, brain.cachedGoalX, brain.cachedGoalZ) < 1.5;
  const hopRefreshDist = Math.max(1.25, settings.moveSpeed * dt * 1.15);
  const hopValid =
    goalSame &&
    brain.cachedHopX !== undefined &&
    brain.cachedHopZ !== undefined &&
    (brain.pathRefreshTimer ?? 0) > 0 &&
    distance2D(p.x, p.z, brain.cachedHopX, brain.cachedHopZ) > hopRefreshDist &&
    brain.cachedDoorMask === doorMask;

  if (hopValid) {
    nextHop = { x: brain.cachedHopX!, z: brain.cachedHopZ! };
  } else {
    nextHop = computeNextMoveTarget(p.x, p.z, goalX, goalZ, doorLocks);
    brain.cachedHopX = nextHop.x;
    brain.cachedHopZ = nextHop.z;
    brain.cachedGoalX = goalX;
    brain.cachedGoalZ = goalZ;
    brain.cachedDoorMask = doorMask;
    brain.pathRefreshTimer = 0.85;
  }

  const dx = nextHop.x - p.x;
  const dz = nextHop.z - p.z;
  const hopDist = Math.hypot(dx, dz);
  if (hopDist < 0.05) {
    brain.pathRefreshTimer = 0;
    brain.stuckTimer += dt;
    if (brain.stuckTimer > 0.4) {
      brain.stuckTimer = 0;
      const candidates = findNearestWalkableNodes(p.x, p.z, doorLocks);
      if (candidates.length > 0) {
        brain.detourNodeIdx = candidates[Math.floor(rng() * candidates.length)];
        brain.detourTimer = 1.4;
      }
      brain.targetWaypointIdx = Math.floor(rng() * BOT_WAYPOINTS.length);
    }
    return;
  }

  // Subtle lateral drift so bots don't travel on robotic pixel-straight lines
  brain.wanderPhase += dt * 1.4;
  const dirX = dx / hopDist;
  const dirZ = dz / hopDist;
  const perpX = -dirZ;
  const perpZ = dirX;
  const lateralAmt =
    hopDist > 3.2 && brain.stuckTimer <= 0.05
      ? Math.sin(brain.wanderPhase + brain.wanderSeed) * BOT_AI_CONFIG.wanderOffset
      : 0;
  const steerX = dirX + perpX * lateralAmt;
  const steerZ = dirZ + perpZ * lateralAmt;
  const steerLen = Math.hypot(steerX, steerZ) || 1;

  const isHuntingVondo =
    p.role === 'vondo' &&
    p.killCooldownRemaining <= 2.5 &&
    (brain.killWaitTimer ?? 0) <= 1.2 &&
    brain.postKillCoverTimer <= 0;
  const baseRate = sprintBoost
    ? 1.05
    : !isHuntingVondo && brain.personality === 'chill'
      ? 0.83
      : 0.9;
  const maxStepSpeed = Math.min(settings.moveSpeed * baseRate, hopDist / Math.max(0.016, dt));
  const speed = hopDist < settings.moveSpeed * baseRate * dt ? maxStepSpeed : settings.moveSpeed * baseRate;
  p.vx = (steerX / steerLen) * speed;
  p.vz = (steerZ / steerLen) * speed;
  p.yaw = Math.atan2(p.vx, p.vz);

  const resolved = resolveCircleWallCollision(
    p.x + p.vx * dt,
    p.z + p.vz * dt,
    PLAYER_RADIUS,
    WALLS,
    doorLocks,
  );
  const moved = Math.hypot(resolved.x - p.x, resolved.z - p.z);
  p.x = resolved.x;
  p.z = resolved.z;
  onFootprint?.(p, moved);

  // Stuck detection: if barely moving for >0.55s, take an unobstructed detour node
  if (moved < speed * dt * 0.2) {
    brain.stuckTimer += dt;
    if (brain.stuckTimer > 0.55) {
      brain.stuckTimer = 0;
      const candidates = findNearestWalkableNodes(p.x, p.z, doorLocks);
      if (candidates.length > 0) {
        brain.detourNodeIdx = candidates[Math.floor(rng() * candidates.length)];
        brain.detourTimer = 1.5;
      }
      brain.targetWaypointIdx = Math.floor(rng() * BOT_WAYPOINTS.length);
    }
  } else {
    brain.stuckTimer = 0;
  }
  brain.lastX = p.x;
  brain.lastZ = p.z;
}

export function stepBotsPlaying(ctx: BotPlayContext): boolean {
  const {
    players,
    bodies,
    sabotage,
    doorLocks,
    settings,
    holdingFixMap,
    brains,
    dt,
    nowMs,
  } = ctx;
  const rng = ctx.rng ?? Math.random;

  const aliveNonVondos = players.filter((p) => p.alive && p.role !== 'vondo').length;
  const aliveVondos = players.filter((p) => p.alive && p.role === 'vondo').length;
  const gameAlmostWonByVondo = aliveVondos >= Math.max(1, aliveNonVondos - 1);

  for (const p of players) {
    if (!p.isBot) continue;
    let brain = brains.get(p.id);
    if (!brain) {
      brain = createBotBrainState(rng);
      brain.lastX = p.x;
      brain.lastZ = p.z;
      brains.set(p.id, brain);
    }

    // Ghost crewmate bots continue finishing their remaining tasks like real players
    if (!p.alive) {
      if (!canCompleteTasks(p)) {
        p.vx = 0;
        p.vz = 0;
        continue;
      }
      if (brain.pauseTimer > 0) {
        brain.pauseTimer -= dt;
        p.vx = 0;
        p.vz = 0;
        if (brain.pauseTimer <= 0 && brain.activeTaskId) {
          const tItem = p.tasks.find(
            (t) => t.taskId === brain.activeTaskId && !t.completed && !isTaskLockedBySabotage(t.taskId, sabotage),
          );
          const st = tItem ? TASK_STATIONS.find((s) => s.id === tItem.taskId) : null;
          if (tItem && st && distance2D(p.x, p.z, st.x, st.z) <= st.radius + 1.5) {
            tItem.completed = true;
            brain.activeTaskId = null;
            if (ctx.onTaskCompletedCheckWin?.()) return true;
          }
        }
        continue;
      }
      const nextTasks = p.tasks.filter((t) => !t.completed && !isTaskLockedBySabotage(t.taskId, sabotage));
      let st =
        brain.activeTaskId && nextTasks.some((t) => t.taskId === brain.activeTaskId)
          ? TASK_STATIONS.find((s) => s.id === brain.activeTaskId) ?? null
          : null;
      if (!st && nextTasks.length > 0) {
        const picked = nextTasks
          .map((t) => TASK_STATIONS.find((s) => s.id === t.taskId))
          .filter((s): s is (typeof TASK_STATIONS)[number] => Boolean(s))
          .sort((a, b) => distance2D(p.x, p.z, a.x, a.z) - distance2D(p.x, p.z, b.x, b.z))[0];
        if (picked) {
          st = picked;
          brain.activeTaskId = picked.id;
        }
      }
      if (st) {
        const dx = st.x - p.x;
        const dz = st.z - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= st.radius * 0.75) {
          brain.activeTaskId = st.id;
          brain.pauseTimer = st.holdDurationSec + 34.0 + rng() * 14.0;
          p.vx = 0;
          p.vz = 0;
        } else {
          const ghostSpeed = settings.moveSpeed * 0.25;
          p.vx = (dx / dist) * ghostSpeed;
          p.vz = (dz / dist) * ghostSpeed;
          p.x += p.vx * dt;
          p.z += p.vz * dt;
          p.yaw = Math.atan2(p.vx, p.vz);
        }
      } else {
        p.vx = 0;
        p.vz = 0;
      }
      continue;
    }

    if (brain.sabotageDelayTimer > 0 && !sabotage.active && sabotage.cooldownRemaining <= 0) {
      brain.sabotageDelayTimer = Math.max(0, brain.sabotageDelayTimer - dt);
    }
    if (brain.detourTimer > 0) {
      brain.detourTimer = Math.max(0, brain.detourTimer - dt);
      if (brain.detourTimer === 0) brain.detourNodeIdx = null;
    }
    if (brain.buddyTimer > 0) {
      brain.buddyTimer = Math.max(0, brain.buddyTimer - dt);
      if (brain.buddyTimer === 0) brain.buddyTargetId = null;
    }
    if (brain.postKillCoverTimer > 0) {
      brain.postKillCoverTimer = Math.max(0, brain.postKillCoverTimer - dt);
    }
    if (brain.sabotageReactDelay > 0) {
      brain.sabotageReactDelay = Math.max(0, brain.sabotageReactDelay - dt);
    }
    if (!sabotage.active) {
      brain.sabotageReactDelay =
        brain.personality === 'leader' ? 0.1 : brain.personality === 'chill' ? 1.1 : 0.45;
    }

    // Update strictly private memory via LOS & audio
    updateBotPerception(p, brain, players, bodies, sabotage, doorLocks, settings, nowMs, rng);

    // Handle active vent escape / traversal
    if (p.inVent) {
      brain.ventTimer = Math.max(0, (brain.ventTimer ?? 0) - dt);
      p.vx = 0;
      p.vz = 0;
      if ((brain.ventTimer ?? 0) <= 0) {
        if (brain.ventTargetId) {
          const dest = VENTS.find((v) => v.id === brain.ventTargetId);
          if (dest) {
            p.x = dest.x;
            p.z = dest.z;
            if (p.role === 'vondo') {
              brain.fakeStoryZone = getZoneNameAt(dest.x, dest.z);
            }
          }
          brain.ventTargetId = null;
          brain.ventTimer = 0.42;
        } else {
          p.inVent = false;
          if (p.role === 'vondo') {
            brain.fakeStoryZone = getZoneNameAt(p.x, p.z);
          }
          if (p.specialRole === 'mistri') {
            p.abilityCooldown = MISTRI_VENT_COOLDOWN_SEC;
          }
          brain.pathRefreshTimer = 0;
        }
      }
      continue;
    }

    // 1. Jharudar sweeps nearby unreported body using 2s channel
    if (
      p.specialRole === 'jharudar' &&
      p.abilityCooldown <= 0.05 &&
      !p.jharuTargetBodyId &&
      (p.cleansLeft ?? JHARUDAR_CLEAN_USES) > 0
    ) {
      const cleanTarget = findNearestCleanableBody(p, bodies);
      if (cleanTarget && rng() < 0.5) {
        p.jharuTargetBodyId = cleanTarget.id;
        p.jharuTimer = JHARUDAR_CLEAN_CHANNEL_SEC;
        p.vx = 0;
        p.vz = 0;
        continue;
      }
    }
    if (p.jharuTargetBodyId) {
      p.vx = 0;
      p.vz = 0;
      continue;
    }

    // 2. Daktar revives nearby unreported body once
    if (p.specialRole === 'daktar' && (p.revivesLeft ?? 0) > 0) {
      const revBody = findNearestRevivableBody(p, bodies);
      if (revBody && rng() < 0.5) {
        const victim = players.find((pl) => pl.id === revBody.victimId);
        if (victim) {
          const idx = bodies.findIndex((b) => b.id === revBody.id);
          if (idx >= 0) bodies.splice(idx, 1);
          victim.alive = true;
          victim.x = revBody.x;
          victim.z = revBody.z;
          p.revivesLeft = 0;
          ctx.onRevive?.(p, victim);
          continue;
        }
      }
    }

    // 2.5. Goyenda scans unreported body BEFORE reporting it
    if (p.specialRole === 'goyenda' && (p.scansLeft ?? 0) > 0 && bodies.length > 0) {
      const scanRes = executeGoyendaScan(p, bodies, nowMs);
      if (scanRes.ok && scanRes.clue) {
        brain.forensicHint = scanRes.clue.detail;
      }
    }

    // 2.6. Daroga Sheriff shot on confident suspect (prefers reporting & meeting in opening minute)
    if (p.specialRole === 'daroga' && (p.shotsLeft ?? 0) > 0 && p.abilityCooldown <= 0.05 && nowMs >= 58000) {
      const darogaTarget = findNearestDarogaTarget(p, players);
      if (
        darogaTarget &&
        (darogaTarget.id === brain.seenNearKill ||
          darogaTarget.id === brain.masterAccusedId ||
          (brain.suspicion[darogaTarget.id] ?? 0) >= 5.5) &&
        hasLineOfSight(p.x, p.z, darogaTarget.x, darogaTarget.z, WALLS, doorLocks)
      ) {
        const shot = resolveDarogaShot(p, darogaTarget);
        if (shot.allowed) {
          p.shotsLeft = Math.max(0, (p.shotsLeft ?? 1) - 1);
          if (shot.hitVondo) {
            darogaTarget.alive = false;
            darogaTarget.watchingCams = false;
            p.abilityCooldown = DAROGA_COOLDOWN_SEC;
            bodies.push({
              id: `body_${nowMs}_${darogaTarget.id}_${Math.floor(rng() * 1000)}`,
              victimId: darogaTarget.id,
              victimName: darogaTarget.name,
              color: darogaTarget.color,
              x: darogaTarget.x,
              z: darogaTarget.z,
              reported: false,
              killedAt: nowMs,
              killerColorHint: getColorShadeHint(p.color),
              killerZoneHint: getZoneNameAt(darogaTarget.x, darogaTarget.z),
            });
            ctx.onKill?.(p, darogaTarget, false);
          } else {
            p.alive = false;
            p.watchingCams = false;
            bodies.push({
              id: `body_${nowMs}_${p.id}_${Math.floor(rng() * 1000)}`,
              victimId: p.id,
              victimName: p.name,
              color: p.color,
              x: p.x,
              z: p.z,
              reported: false,
              killedAt: nowMs,
              killerColorHint: getColorShadeHint(p.color),
              killerZoneHint: getZoneNameAt(p.x, p.z),
            });
            ctx.onKill?.(p, p, false);
          }
          if (ctx.onTaskCompletedCheckWin?.()) return true;
          continue;
        }
      }
    }

    // 3. Report discovered dead body (Crew reports; Impostor may self-report occasionally as innocent finder!)
    const reportable = findNearestReportableBody(p, bodies, doorLocks);
    if (reportable) {
      const timeSinceKill = nowMs - reportable.killedAt;
      const shouldReport =
        p.specialRole === 'pagol'
          ? rng() < 0.08
          : p.role === 'parabasi'
            ? true
            : p.specialRole !== 'jharudar' &&
              ((timeSinceKill >= 900 && timeSinceKill <= 2600 && rng() < BOT_AI_CONFIG.selfReportChance * 0.16) ||
                (timeSinceKill > 9000 && rng() < 0.03));
      if (shouldReport) {
        reportable.reported = true;
        ctx.onReportBody?.(p, reportable);
        return true;
      }
    }

    // 4. Smart Special Crew & Neutral Abilities (symmetrical across all targets!)
    if (p.specialRole === 'kobiraj' && p.abilityCooldown <= 0.05) {
      const ally = findNearestShieldTarget(p, players);
      if (ally && rng() < 0.35) {
        ally.shielded = true;
        p.abilityCooldown = KOBIRAJ_COOLDOWN_SEC;
      }
    }
    if (p.specialRole === 'hatur_daktar' && p.abilityCooldown <= 0.05) {
      const ally = findNearestHaturTarget(p, players, nowMs);
      if (ally && rng() < 0.3) {
        ally.haturProtectedUntil = nowMs + HATUR_DURATION_MS;
        p.abilityCooldown = HATUR_COOLDOWN_SEC;
      }
    }
    if (p.specialRole === 'master_moshai' && p.abilityCooldown <= 0.05) {
      const inspectTarget = findNearestMasterTarget(p, players);
      if (inspectTarget && rng() < 0.35) {
        const res = inspectPlayerTaskAuthenticity(inspectTarget);
        p.abilityCooldown = MASTER_COOLDOWN_SEC;
        if (res.isSus) {
          brain.suspicion[inspectTarget.id] = (brain.suspicion[inspectTarget.id] ?? 0) + 5.5;
          brain.masterAccusedId = inspectTarget.id;
        } else {
          const cleared = new Set(brain.clearedIds);
          cleared.add(inspectTarget.id);
          brain.clearedIds = Array.from(cleared);
          brain.trust[inspectTarget.id] = (brain.trust[inspectTarget.id] ?? 0) + 3.0;
        }
      }
    }
    if (p.specialRole === 'ghotok_khala') {
      const linked = players.some((pl) => pl.ghotokPartnerId);
      if (!linked) {
        const pair = findGhotokPairCandidates(p, players);
        if (pair && rng() < 0.35) {
          pair[0].ghotokPartnerId = pair[1].id;
          pair[1].ghotokPartnerId = pair[0].id;
        }
      }
    }
    if (p.specialRole === 'chamcha' && !p.chamchaPatronId && p.abilityCooldown <= 0.05) {
      const patron = findNearestChamchaPatron(p, players);
      if (patron && rng() < 0.45) {
        p.chamchaPatronId = patron.id;
        p.abilityCooldown = CHAMCHA_COOLDOWN_SEC;
      }
    }
    if (p.specialRole === 'chandabaz' && p.abilityCooldown <= 0.05 && sabotage.active !== 'gas_leak') {
      const target = findNearestChandabazTarget(p, players);
      const currentCollected = countAliveChandabazTargets(p, players);
      const nearbyCrowds = players.filter(
        (pl) =>
          pl.alive &&
          pl.id !== p.id &&
          pl.id !== target?.id &&
          !pl.inVent &&
          distance2D(p.x, p.z, pl.x, pl.z) <= CHANDABAZ_WITNESS_RANGE &&
          hasLineOfSight(pl.x, pl.z, p.x, p.z, WALLS, doorLocks),
      ).length;
      const chandaGoal = getChandabazGoal(p, players);
      const canFinishChanda = currentCollected < chandaGoal - 1 || nowMs >= CHANDABAZ_INITIAL_COOLDOWN_SEC * 4500;
      if (target && canFinishChanda && nearbyCrowds <= 1 && rng() < 0.04) {
        const res = collectChandaFromTarget(p, target, players);
        p.abilityCooldown = CHANDABAZ_COOLDOWN_SEC;
        if (res.ok) {
          notifyBotsOfChandabazExtort(p, target, players, brains, doorLocks);
        }
        if (res.reachedGoal) {
          if (ctx.onTaskCompletedCheckWin?.()) return true;
        }
      }
    }
    if (p.specialRole === 'tiktok_star' && p.abilityCooldown <= 0.05) {
      const zid = getZoneIdAt(p.x, p.z);
      const currentFilmed = p.tiktokZones?.length ?? 0;
      const deadCount = players.filter((pl) => !pl.alive).length;
      const canFinishTiktok = currentFilmed < TIKTOK_ZONE_GOAL - 1 || (nowMs >= 65000 && deadCount >= 1);
      if (zid && !(p.tiktokZones ?? []).includes(zid) && canFinishTiktok && rng() < 0.25) {
        recordTiktokReelInZone(p, zid);
        p.abilityCooldown = TIKTOK_COOLDOWN_SEC;
        if ((p.tiktokZones?.length ?? 0) >= TIKTOK_ZONE_GOAL) {
          if (ctx.onTaskCompletedCheckWin?.()) return true;
        }
      }
    }

    // 5. Bohurupi tactically disguises & Dalal jams locks
    if (p.specialRole === 'bohurupi' && p.abilityCooldown <= 0.05 && rng() < 0.04) {
      const disguises = players.filter((o) => o.alive && o.role !== 'vondo');
      if (disguises.length > 0) {
        const pick = disguises[Math.floor(rng() * disguises.length)];
        p.disguiseColor = pick.color;
        p.disguiseName = pick.name;
        p.disguiseTimer = BOHURUPI_DISGUISE_DURATION_SEC;
        p.abilityCooldown = BOHURUPI_COOLDOWN_SEC;
      }
    }
    if (p.specialRole === 'dalal' && p.abilityCooldown <= 0.05 && (bodies.length > 0 || sabotage.active) && rng() < 0.08) {
      applyDalalBrokerJam(doorLocks, rng);
      p.abilityCooldown = DALAL_COOLDOWN_SEC;
    }

    // 6. Batpar sabotage pacing
    if (p.role === 'vondo') {
      if (
        !sabotage.active &&
        sabotage.cooldownRemaining <= 0 &&
        brain.sabotageDelayTimer <= 0
      ) {
        const camWatchers = players.some((pl) => pl.alive && pl.role !== 'vondo' && pl.watchingCams);
        const crowdNearKiller = players.filter(
          (pl) =>
            pl.alive &&
            pl.role !== 'vondo' &&
            distance2D(p.x, p.z, pl.x, pl.z) <= 20 &&
            hasLineOfSight(p.x, p.z, pl.x, pl.z, WALLS, doorLocks),
        ).length;
        let totalT = 0;
        let doneT = 0;
        for (const pl of players) {
          if (!canCompleteTasks(pl)) continue;
          totalT += pl.tasks.length;
          doneT += pl.tasks.filter((t) => t.completed).length;
        }
        const taskProg = totalT > 0 ? doneT / totalT : 0;

        const roll = rng();
        let sabType: SabotageType;
        if (camWatchers && roll < 0.6) {
          sabType = 'wifi_down';
        } else if (crowdNearKiller >= 2 && p.killCooldownRemaining <= 4 && roll < 0.68) {
          sabType = 'loadshedding';
        } else if (taskProg >= 0.78 && roll < 0.22) {
          sabType = 'gas_leak';
        } else {
          sabType = roll < 0.52 ? 'loadshedding' : roll < 0.9 ? 'wifi_down' : 'gas_leak';
        }
        const newSab = createSabotageState(sabType, SABOTAGE_COOLDOWN_SEC);
        Object.assign(sabotage, newSab);
        for (const other of players) {
          if (other.role === 'vondo') {
            const ob = brains.get(other.id);
            if (ob) ob.sabotageDelayTimer = 34 + rng() * 24;
          }
        }
        ctx.onSabotage?.(sabType);
      } else if (doorLocks.cooldownRemaining <= 0 && rng() < 0.008) {
        const zones: DoorZoneId[] = ['cha_dokan', 'rickshaw_garage', 'desco_power', 'dish_roof'];
        const zPick = zones[Math.floor(rng() * zones.length)];
        ctx.onDoorLock?.(zPick);
      }
    }

    // 7. Crew sabotage repair hold when near target station / valve
    if (sabotage.active && p.role === 'parabasi' && !isNeutralRole(p.specialRole)) {
      const range = p.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
      if (sabotage.active === 'gas_leak') {
        const nearV = findNearestGasValve(p.x, p.z, sabotage, range);
        if (nearV && (!nearV.holderId || nearV.holderId === p.id)) {
          holdingFixMap.set(p.id, { valveId: nearV.id });
        } else {
          holdingFixMap.delete(p.id);
        }
      } else if (distance2D(p.x, p.z, sabotage.fixStationX, sabotage.fixStationZ) <= range) {
        holdingFixMap.set(p.id, {});
      }
    }

    if (p.role === 'vondo' && p.killCooldownRemaining <= 0) {
      brain.killWaitTimer = Math.max(0, (brain.killWaitTimer ?? 0) - dt);
    }

    // 8. Batpar kill with witness LOS check, Supari priority, & smart Vent / Alibi escape!
    if (p.role === 'vondo' && p.killCooldownRemaining <= 0 && (brain.killWaitTimer ?? 0) <= 0) {
      const victim = findNearestKillTarget(p, players);
      if (victim) {
        const check = canExecuteKill(p, victim);
        const witnessed = hasKillWitnesses(p, victim, players, sabotage.active, doorLocks, rng);
        if (check.allowed && (!witnessed || gameAlmostWonByVondo)) {
          if (isPlayerShieldedNow(victim, nowMs)) {
            victim.shielded = false;
            victim.haturProtectedUntil = 0;
            p.killCooldownRemaining = 6;
            brain.killWaitTimer = 8 + rng() * 10;
            ctx.onKill?.(p, victim, true);
          } else {
            victim.alive = false;
            victim.watchingCams = false;
            const hitSupariContract =
              p.specialRole === 'supari_killer' && victim.id === p.supariTargetId;
            p.killCooldownRemaining = hitSupariContract
              ? settings.killCooldownSec * 0.5
              : settings.killCooldownSec;
            if (p.specialRole === 'supari_killer') {
              p.supariTargetId = pickSupariContractTarget(p, players, p.supariTargetId)?.id ?? null;
            }
            brain.killWaitTimer = 47 + rng() * 18;
            const killerColorForClue = p.disguiseColor ?? p.color;
            bodies.push({
              id: `body_${nowMs}_${victim.id}_${Math.floor(rng() * 1000)}`,
              victimId: victim.id,
              victimName: victim.name,
              color: victim.color,
              x: victim.x,
              z: victim.z,
              reported: false,
              killedAt: nowMs,
              killerColorHint: getColorShadeHint(killerColorForClue),
              killerZoneHint: getZoneNameAt(victim.x, victim.z),
            });
            recordKillWitnesses(brains, players, p, victim, sabotage.active, doorLocks, rng);
            brain.huntTargetId = null;
            brain.pauseTimer = 0;
            brain.postKillCoverTimer = 8.0 + rng() * 6.0;

            // Smart Vent Escape if near a manhole & zero witnesses watching the grate
            if (!witnessed && p.specialRole !== 'jharudar') {
              const nearVent = VENTS.find((v) => distance2D(p.x, p.z, v.x, v.z) <= 5.5);
              const ventWatched =
                nearVent &&
                players.some(
                  (o) =>
                    o.alive &&
                    o.id !== p.id &&
                    o.id !== victim.id &&
                    o.role !== 'vondo' &&
                    distance2D(o.x, o.z, nearVent.x, nearVent.z) <= 13.0 &&
                    hasLineOfSight(o.x, o.z, nearVent.x, nearVent.z, WALLS, doorLocks),
                );
              if (nearVent && !ventWatched && rng() < 0.45) {
                const links = getConnectedVents(nearVent.x, nearVent.z).targets;
                if (links.length > 0) {
                  const pickHop = links[Math.floor(rng() * links.length)];
                  p.inVent = true;
                  p.x = nearVent.x;
                  p.z = nearVent.z;
                  brain.ventTargetId = pickHop.id;
                  brain.ventTimer = 0.65;
                  brain.fakeStoryZone = getZoneNameAt(pickHop.x, pickHop.z);
                }
              }
            }

            ctx.onKill?.(p, victim, false);
            if (ctx.onTaskCompletedCheckWin?.()) return true;
            if (p.inVent) continue;
          }
        }
      }
    }

    // 9. Holding sabotage / task station hold / natural movement
    if (holdingFixMap.has(p.id)) {
      p.vx = 0;
      p.vz = 0;
      brain.stuckTimer = 0;
      continue;
    }

    if (brain.pauseTimer > 0) {
      const readyHuntOpportunity =
        p.role === 'vondo' &&
        p.killCooldownRemaining <= 0.5 &&
        (brain.killWaitTimer ?? 0) <= 0 &&
        brain.postKillCoverTimer <= 0 &&
        players.some(
          (o) =>
            o.alive &&
            o.role !== 'vondo' &&
            !o.inVent &&
            distance2D(p.x, p.z, o.x, o.z) <= 14 &&
            hasLineOfSight(p.x, p.z, o.x, o.z, WALLS, doorLocks),
        );
      if (
        (sabotage.active === 'gas_leak' && p.role === 'parabasi' && !isNeutralRole(p.specialRole)) ||
        readyHuntOpportunity
      ) {
        brain.pauseTimer = 0;
        brain.activeTaskId = null;
        brain.pathRefreshTimer = 0;
      } else {
        brain.pauseTimer -= dt;
        p.vx = 0;
        p.vz = 0;
        brain.stuckTimer = 0;
        if (brain.pauseTimer <= 0 && brain.activeTaskId) {
          if (canCompleteTasks(p)) {
            const tItem = p.tasks.find(
              (t) =>
                t.taskId === brain.activeTaskId &&
                !t.completed &&
                !isTaskLockedBySabotage(t.taskId, sabotage),
            );
            const st = tItem ? TASK_STATIONS.find((s) => s.id === tItem.taskId) : null;
            if (tItem && st && distance2D(p.x, p.z, st.x, st.z) <= st.radius + 1.0) {
              tItem.completed = true;
              brain.activeTaskId = null;
              if (ctx.onTaskCompletedCheckWin?.()) return true;
            }
          } else if (p.role === 'vondo') {
            brain.activeTaskId = null;
          }
        }
        continue;
      }
    }

    // Occasional human-like mid-route brief pause or mind change
    brain.mindChangeTimer -= dt;
    if (brain.mindChangeTimer <= 0) {
      brain.mindChangeTimer = 4.0 + rng() * 6.0;
      if (rng() < BOT_AI_CONFIG.pauseChance * 4.5 && !sabotage.active) {
        brain.pauseTimer = 0.35 + rng() * 0.75;
        p.vx = 0;
        p.vz = 0;
        continue;
      }
      if (rng() < BOT_AI_CONFIG.mindChangeChance * 3.5 && !sabotage.active) {
        brain.wanderSeed = rng() * Math.PI * 2;
        brain.targetWaypointIdx = Math.floor(rng() * BOT_WAYPOINTS.length);
        brain.pathRefreshTimer = 0;
      }
    }

    const goal = decideBotGoal(p, brain, players, bodies, sabotage, doorLocks, nowMs, rng);
    if (goal.tookVent) continue;

    const distToGoal = distance2D(p.x, p.z, goal.goalX, goal.goalZ);
    const arrivalDist = goal.activeStationTarget ? goal.activeStationTarget.radius * 0.72 : 1.1;

    if (distToGoal <= arrivalDist) {
      if (goal.activeStationTarget) {
        brain.activeTaskId = goal.activeStationTarget.id;
        brain.pauseTimer =
          p.role === 'vondo'
            ? Math.max(1.8, goal.activeStationTarget.holdDurationSec * (0.65 + rng() * 0.55))
            : goal.activeStationTarget.holdDurationSec + 0.8 + rng() * 0.5;
        if (canCompleteTasks(p) && goal.activeStationTarget.isVisual && settings.visualTasks) {
          p.visualTaskTimer = 2.6;
        }
      } else {
        brain.activeTaskId = null;
        brain.pauseTimer = p.role === 'vondo' && p.killCooldownRemaining <= 2.5 ? 0.35 + rng() * 0.45 : 1.6 + rng() * 2.1;
        brain.targetWaypointIdx = Math.floor(rng() * BOT_WAYPOINTS.length);
      }
      p.vx = 0;
      p.vz = 0;
      brain.stuckTimer = 0;
      continue;
    }

    stepHumanizedMovement(
      p,
      brain,
      goal.goalX,
      goal.goalZ,
      goal.sprintBoost,
      doorLocks,
      settings,
      dt,
      rng,
      ctx.onFootprint,
    );
  }

  return false;
}

// ============================================================================
// Private Meeting Deduction, Human-Sounding Fallback Chat & Gemini Integration
// ============================================================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMentionedPlayer(text: string, players: PlayerState[], excludeId?: string): PlayerState | null {
  const low = text.toLowerCase();
  for (const pl of players) {
    if (pl.id === excludeId) continue;
    const full = pl.name.toLowerCase();
    const first = full.split(/\s+/)[0] ?? '';
    if (low.includes(full)) {
      return pl;
    }
    if (first.length >= 2) {
      const hasNonAscii = /[^\u0000-\u007f]/.test(first);
      if (hasNonAscii) {
        if (low.includes(first)) return pl;
      } else {
        const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(first)}([^a-z0-9]|$)`, 'i');
        if (re.test(low)) return pl;
      }
    }
  }
  return null;
}

function findMentionedZone(text: string): string | null {
  const low = text.toLowerCase();
  for (const z of ZONES) {
    if (z.banglaName && text.includes(z.banglaName)) return z.banglaName;
    const first = z.name.toLowerCase().split(' ')[0];
    if (low.includes(z.name.toLowerCase()) || (first.length >= 4 && low.includes(first))) {
      return z.name;
    }
  }
  if (/ডেসকো|কারেন্ট|লোডশেডিং|পাওয়ার/.test(text)) return 'ডেসকো পাওয়ার';
  if (/চায়ের|চা এর|চা-এর/.test(text)) return 'চায়ের দোকান';
  if (/ফুচকা/.test(text)) return 'ফুচকা কর্নার';
  if (/সেলুন|হিরো/.test(text)) return 'হিরো সেলুন';
  if (/পুকুর|ঘাট/.test(text)) return 'পুকুর ঘাট';
  if (/রিকশা|গ্যারেজ/.test(text)) return 'রিকশা গ্যারেজ';
  if (/রেল|স্টেশন/.test(text)) return 'মহল্লা রেল স্টেশন';
  if (/প্যান্ডেল|বিয়ে/.test(text)) return 'বিয়ে বাড়ি';
  if (/ক্রিকেট|মাঠ/.test(text)) return 'ক্রিকেট মাঠ';
  if (/ফার্মেসি|দাদু/.test(text)) return 'দাদু ফার্মেসি';
  if (/বাজার/.test(text)) return 'সবজি বাজার';
  if (/আড্ডা|চক/.test(text)) return 'আড্ডা চক';
  if (low.includes('deso') || low.includes('desco') || low.includes('current')) return 'DESCO Power';
  if (low.includes('cha') || low.includes('dokan')) return 'Cha-er Dokan';
  if (low.includes('fuchka')) return 'Fuchka Corner';
  if (low.includes('saloon')) return 'Hero Saloon';
  if (low.includes('pukur')) return 'Pukur Ghat';
  if (low.includes('garage') || low.includes('rickshaw')) return 'Rickshaw Garage';
  if (low.includes('rail')) return 'Moholla Rail';
  return null;
}

function isAccusationText(text: string): boolean {
  const low = text.toLowerCase();
  return (
    /বাটপার|ভণ্ড|সন্দেহ|মেরেছে|মারছে|খুন|ভোট|চোর|দেখেছি|দেখছি|মিথ্যা|নকল|ভেন্ট|ড্রেন|ফাঁসা|চুবানি|পুকুরে ফ্যালো|ফেলো|পাকড়াও/.test(
      text,
    ) || /sus|batpar|vondo|marse|size|felo|vote|chor|dekhsi|false|lie|mitha|fake|vent|dren|kill/i.test(low)
  );
}

/**
 * Feeds ANY meeting message (from human OR bot symmetrically!) into alive bots'
 * private memory, updates suspicion/trust via personality & contradictions, and
 * queues natural defense or reaction lines if needed.
 */
export function processChatMessageForBots(params: {
  msg: ChatMessage;
  players: PlayerState[];
  brains: Map<string, BotBrainState>;
  rng?: () => number;
}): void {
  const { msg, players, brains } = params;
  const rng = params.rng ?? Math.random;
  if (msg.system || msg.ghostOnly) return;

  const speaker = players.find((p) => p.id === msg.senderId && p.alive);
  if (!speaker) return;

  const mentioned = findMentionedPlayer(msg.text, players, speaker.id);
  const mentionedZone = findMentionedZone(msg.text);
  const accusesSomeone = Boolean(mentioned) && isAccusationText(msg.text);

  for (const bot of players) {
    if (!bot.isBot || !bot.alive || bot.id === speaker.id) continue;
    const brain = brains.get(bot.id);
    if (!brain) continue;
    if (brain.processedChatIds.includes(msg.id)) continue;
    brain.processedChatIds.push(msg.id);

    brain.heardClaims.push({
      speakerId: speaker.id,
      speakerName: speaker.name,
      accusedId: accusesSomeone && mentioned ? mentioned.id : undefined,
      claimedZone: mentionedZone ?? undefined,
      defendedSelf: !accusesSomeone && Boolean(mentionedZone),
      timestamp: msg.timestamp,
    });
    if (brain.heardClaims.length > 24) brain.heardClaims.shift();

    // Update suspicion privately from what THIS bot heard + personality filter
    if (accusesSomeone && mentioned) {
      if (mentioned.id === bot.id) {
        // Directly accused -> queue a defensive reply if not already defended
        if (!brain.hasRespondedToDefense && brain.pendingChats.filter((c) => !c.sent).length < 2) {
          brain.hasRespondedToDefense = true;
          const myZone = bot.role === 'vondo' ? brain.fakeStoryZone : brain.zoneHistory.at(-1) ?? 'আড্ডা চক';
          const shortSpeaker = speaker.name.split(' ')[0];
          const defenseLines =
            bot.role === 'vondo'
              ? [
                  `ভাই ${shortSpeaker} আজাইরা কথা বলো না, আমি ${myZone} এ ছিলাম`,
                  `কী বলিস ${shortSpeaker}?? আমি তো ${myZone} এ টাস্ক করতেছিলাম`,
                  `আমাকে কেন ধরতেছ ভাই আমি তো এইমাত্র ${myZone} থেকে আসলাম`,
                ]
              : [
                  `ভাই আমি না!! আমি কসম ${myZone} এ ছিলাম`,
                  `আরেহ ${shortSpeaker} উল্টাপাল্টা বলতেছ, আমি ${myZone} দিকে ছিলাম`,
                  `আমাকে ভোট দিলে ভুল করবা ভাই, আমি ${myZone} এ টাস্কে ছিলাম`,
                ];
          const text = defenseLines[Math.floor(rng() * defenseLines.length)];
          const delay = 1.4 + rng() * 2.2;
          const sendAtSec = brain.meetingElapsedSec + delay;
          brain.pendingChats.push({
            id: `def_${msg.id}_${bot.id}`,
            typingStartSec: Math.max(brain.meetingElapsedSec + 0.25, sendAtSec - (1.0 + rng() * 1.1)),
            sendAtSec,
            text,
            defended: true,
          });
        }
      } else {
        const trustSpeakerBonus = (brain.trust[speaker.id] ?? 0) > 1.5 ? 1.25 : 1.0;
        const isHardWitnessClaim =
          /সামনে|চোখে দেখছি|খাতা চেক|নকল টাস্ক|মারতে দেখ|ভেন্ট|ড্রেন দিয়ে/i.test(msg.text) ||
          /shamne|khata check|fake task|kill korte|batpar eta|vent/i.test(msg.text);
        const isSceneProximityClaim =
          /লাশ পাইছি.*পাশে|পাশে ঘুরতেছিল|গোয়েন্দা ক্লু পাইছি/i.test(msg.text);
        // Keep uncorroborated single-rumor suspicion restrained so bots don't blind-pile one name
        const priorAccusers = new Set(
          brain.heardClaims
            .filter((c) => c.accusedId === mentioned.id && c.speakerId !== speaker.id)
            .map((c) => c.speakerId),
        ).size;
        const corroborationBoost =
          priorAccusers >= 1 ? 1.18 : isHardWitnessClaim ? 0.95 : isSceneProximityClaim ? 0.88 : 0.72;
        const claimWeight = isHardWitnessClaim ? 2.85 : isSceneProximityClaim ? 1.65 : 0.68;
        const persMult =
          brain.personality === 'follower'
            ? 1.25
            : brain.personality === 'paranoid'
              ? 1.15
              : brain.personality === 'skeptic'
                ? 0.42
                : brain.personality === 'chill'
                  ? 0.55
                  : 0.9;
        const cleared = new Set(brain.clearedIds);
        if (!cleared.has(mentioned.id)) {
          brain.suspicion[mentioned.id] =
            (brain.suspicion[mentioned.id] ?? 0) +
            claimWeight * BOT_AI_CONFIG.bandwagonStrength * trustSpeakerBonus * persMult * corroborationBoost;
        }
      }
    } else if (!accusesSomeone && mentionedZone) {
      // Plausible self-defense slightly eases heat when consistent with bot's observations
      const mySight = [...brain.recentSightings].reverse().find((s) => s.id === speaker.id);
      if (mySight && mySight.zoneName === mentionedZone && (brain.suspicion[speaker.id] ?? 0) > 0) {
        brain.suspicion[speaker.id] = Math.max(0, (brain.suspicion[speaker.id] ?? 0) - 0.35);
        brain.trust[speaker.id] = (brain.trust[speaker.id] ?? 0) + 0.35;
      }
    }

    // Contradiction detector: did speaker claim a zone while bot PERSONALLY saw them elsewhere recently?
    if (mentionedZone && bot.role === 'parabasi') {
      const mySight = [...brain.recentSightings]
        .reverse()
        .find((s) => s.id === speaker.id);
      if (mySight && mySight.zoneName !== mentionedZone && !mySight.misremembered) {
        brain.suspicion[speaker.id] = (brain.suspicion[speaker.id] ?? 0) + 2.1;
        if (
          !brain.pendingChats.some((c) => c.id.startsWith('contra_')) &&
          brain.personality !== 'quiet' &&
          brain.pendingChats.filter((c) => !c.sent).length === 0 &&
          rng() < 0.55
        ) {
          const shortName = speaker.name.split(' ')[0];
          const delay = 1.8 + rng() * 2.6;
          const sendAtSec = brain.meetingElapsedSec + delay;
          brain.pendingChats.push({
            id: `contra_${msg.id}_${bot.id}`,
            typingStartSec: Math.max(brain.meetingElapsedSec + 0.3, sendAtSec - 1.4),
            sendAtSec,
            text: `দাঁড়াও! ${shortName} তো ${mySight.zoneName} দিকে ছিল, এখন ${mentionedZone} কেন বলতেছে??`,
            accusedId: speaker.id,
          });
        }
      }
    }
  }
}

function processPrivateMeetingCluesForBot(
  bot: PlayerState,
  brain: BotBrainState,
  players: PlayerState[],
  bodies: BodyMarker[],
  meetingReason: 'body' | 'emergency' | null,
  meetingCallerId: string | null,
): void {
  if (brain.processedMeetingClues) return;
  brain.processedMeetingClues = true;
  brain.reportedCallerId = meetingCallerId;

  const clearedSet = new Set(brain.clearedIds);
  // Reported body is public announcement context (ONLY reported body or bodies personally discovered)
  const publicReportedBody = meetingReason === 'body' ? bodies.find((b) => b.reported) ?? bodies.at(-1) : undefined;
  const knownMap = new Map<string, BotBodyMemory>();
  for (const kb of brain.knownBodies) knownMap.set(kb.bodyId, kb);
  if (publicReportedBody && !knownMap.has(publicReportedBody.id)) {
    knownMap.set(publicReportedBody.id, {
      bodyId: publicReportedBody.id,
      victimId: publicReportedBody.victimId,
      victimName: publicReportedBody.victimName,
      zoneName: getZoneNameAt(publicReportedBody.x, publicReportedBody.z),
      x: publicReportedBody.x,
      z: publicReportedBody.z,
      killedAt: publicReportedBody.killedAt,
      discoveredAtMs: publicReportedBody.killedAt,
      killerColorHint: publicReportedBody.killerColorHint,
    });
  }

  if (bot.role === 'parabasi') {
    for (const kb of knownMap.values()) {
      if (bot.specialRole === 'goyenda' && kb.killerColorHint && brain.recentSightings.length > 0) {
        for (const cand of players) {
          if (cand.alive && cand.id !== bot.id && getColorShadeHint(cand.color) === kb.killerColorHint) {
            brain.suspicion[cand.id] = (brain.suspicion[cand.id] ?? 0) + 1.65;
          }
        }
      }
      for (const sight of brain.recentSightings) {
        if (clearedSet.has(sight.id)) continue;
        const d = distance2D(sight.x, sight.z, kb.x, kb.z);
        if (d <= 38 && Math.abs(sight.atMs - kb.killedAt) <= 45000) {
          const proximityBoost = d <= 20 ? 3.65 : 2.75;
          brain.suspicion[sight.id] = (brain.suspicion[sight.id] ?? 0) + proximityBoost;
        }
      }
    }
  }
}

function getPrivateTopSuspect(
  bot: PlayerState,
  brain: BotBrainState,
  players: PlayerState[],
): { player: PlayerState; score: number } | null {
  const clearedSet = new Set(brain.clearedIds);
  let topPlayer: PlayerState | null = null;
  let topScore = 0;

  for (const cand of players) {
    if (!cand.alive || cand.id === bot.id) continue;
    if (bot.role === 'vondo' && cand.role === 'vondo') continue;
    if (clearedSet.has(cand.id)) continue;
    const score = (brain.suspicion[cand.id] ?? 0) - (brain.trust[cand.id] ?? 0) * 0.45;
    if (score > topScore) {
      topScore = score;
      topPlayer = cand;
    }
  }
  return topPlayer ? { player: topPlayer, score: topScore } : null;
}

/**
 * Rule-based human-sounding Bangla fallback chat generator for each bot.
 * Called automatically when meeting begins, or seamlessly if Gemini API fails.
 */
export function generateFallbackMeetingChats(params: {
  players: PlayerState[];
  bodies: BodyMarker[];
  brains: Map<string, BotBrainState>;
  meetingReason?: 'body' | 'emergency' | null;
  meetingCallerId?: string | null;
  rng?: () => number;
}): void {
  const { players, bodies, brains, meetingReason = null, meetingCallerId = null } = params;
  const rng = params.rng ?? Math.random;
  const [minDelay, maxDelay] = BOT_AI_CONFIG.chatDelayRange;

  let cursorDelay = minDelay + rng() * 1.4;
  const aliveBots = players.filter((p) => p.isBot && p.alive);
  const shuffledBots = [...aliveBots].sort(() => rng() - 0.5);

  const reportedBody = meetingReason === 'body' ? bodies.find((b) => b.reported) ?? bodies.at(-1) : undefined;
  const bodyZoneObj = reportedBody ? ZONES.find((z) => z.name === getZoneNameAt(reportedBody.x, reportedBody.z)) : undefined;
  const bodyZone = bodyZoneObj?.banglaName ?? (reportedBody ? getZoneNameAt(reportedBody.x, reportedBody.z) : null);

  for (const p of shuffledBots) {
    const brain = brains.get(p.id);
    if (!brain) continue;
    processPrivateMeetingCluesForBot(p, brain, players, bodies, meetingReason, meetingCallerId);

    if (brain.pendingChats.length > 0) continue;

    // Quiet & chill bots often stay silent unless holding key evidence or called the meeting
    const silenceRoll =
      brain.personality === 'quiet'
        ? 0.56
        : brain.personality === 'chill'
          ? 0.34
          : brain.personality === 'chatty'
            ? 0.06
            : BOT_AI_CONFIG.silentBotChance;
    const isCaller = meetingCallerId === p.id;
    const hasHardProof = Boolean(brain.seenNearKill || brain.masterAccusedId || (p.specialRole === 'goyenda' && brain.forensicHint));

    if (!isCaller && !hasHardProof && rng() < silenceRoll) {
      brain.hasChatted = true;
      continue;
    }

    const rawMyZone = p.role === 'vondo' ? brain.fakeStoryZone : brain.zoneHistory.at(-1) ?? 'আড্ডা চক';
    const myZone = ZONES.find((z) => z.name === rawMyZone)?.banglaName ?? rawMyZone;
    const topSus = getPrivateTopSuspect(p, brain, players);
    const vondoPartner = p.role === 'vondo' ? players.find((pl) => pl.alive && pl.id !== p.id && pl.role === 'vondo') : null;
    const partnerHeat =
      vondoPartner
        ? brain.heardClaims.filter((c) => c.accusedId === vondoPartner.id).length + (brain.suspicion[vondoPartner.id] ?? 0) * 0.4
        : 0;

    let text = '';
    let accusedId: string | undefined;

    if (p.specialRole === 'pagol') {
      text = PAGOL_BANTER_LINES[Math.floor(rng() * PAGOL_BANTER_LINES.length)];
    } else if (brain.seenNearKill) {
      const target = players.find((pl) => pl.id === brain.seenNearKill && pl.alive);
      if (target) {
        const s = target.name.split(' ')[0];
        text = `ভাই ${s} কে চোখের সামনে মারতে দেখছি!! ওকে পুকুরে ফ্যালো`;
        accusedId = target.id;
      }
    } else if (p.specialRole === 'master_moshai' && brain.masterAccusedId) {
      const target = players.find((pl) => pl.id === brain.masterAccusedId && pl.alive);
      if (target) {
        text = `খাতা চেক দিছি, ${target.name} নকল টাস্ক করতেছিল! বাটপার এটা`;
        accusedId = target.id;
      }
    } else if (p.specialRole === 'goyenda' && brain.forensicHint) {
      if (topSus && topSus.score >= 1.5) {
        const s = topSus.player.name.split(' ')[0];
        text = `গোয়েন্দা ক্লু পাইছি (${brain.forensicHint}), ${s} কে অনেক সন্দেহ লাগছে`;
        accusedId = topSus.player.id;
      } else {
        text = `গোয়েন্দা ক্লু পাইছি: ${brain.forensicHint}`;
      }
    } else if (isCaller && meetingReason === 'body') {
      const vz = bodyZone ?? 'এইদিক';
      if (p.role === 'vondo') {
        text = `ভাই ${vz} এ লাশ পড়ে ছিল এইমাত্র দেখলাম, কে ছিলা ওখানে?`;
      } else {
        text = topSus && topSus.score >= 1.8
          ? `${vz} এ লাশ পাইছি! ${topSus.player.name.split(' ')[0]} পাশে ঘুরতেছিল`
          : `${vz} এ লাশ দেখলাম এইমাত্র, কে কোথায় ছিলা বলো`;
        if (topSus && topSus.score >= 1.8) accusedId = topSus.player.id;
      }
    } else if (p.role === 'vondo' && vondoPartner && partnerHeat >= 2.2 && rng() < BOT_AI_CONFIG.busPartnerChance) {
      const s = vondoPartner.name.split(' ')[0];
      text = `ভাই আসলে ${s} কে একটু সন্দেহ লাগতেছে আমারও, কোথায় ছিলা ${s}?`;
      accusedId = vondoPartner.id;
    } else if (p.role === 'parabasi' && topSus && topSus.score >= 1.8) {
      const s = topSus.player.name.split(' ')[0];
      const sight = [...brain.recentSightings].reverse().find((sg) => sg.id === topSus.player.id);
      if (sight) {
        const sz = ZONES.find((z) => z.name === sight.zoneName)?.banglaName ?? sight.zoneName;
        text = `${s} কে ${sz} এর পাশে দেখছি একটু আগে, সন্দেহ লাগছে`;
      } else {
        text = `আমার তো ${s} কে সন্দেহ লাগতেছে ভাই, কে কী বলবা?`;
      }
      accusedId = topSus.player.id;
    } else if (p.role === 'vondo') {
      const cleanFrame = players.filter((pl) => pl.alive && pl.role !== 'vondo');
      const frame = cleanFrame[Math.floor(rng() * cleanFrame.length)];
      if (frame && rng() < 0.42) {
        const s = frame.name.split(' ')[0];
        text = `আমি ${myZone} এ ছিলাম, ${s} কে একটু আগে পাশে যেতে দেখছি মনে হয়`;
        accusedId = frame.id;
      } else {
        text = `আমি ${myZone} এ টাস্ক করতেছিলাম ভাই, একদম ক্লিয়ার`;
      }
    } else if (brain.personality === 'skeptic') {
      text = `পাকা প্রমাণ ছাড়া কেউ ভোট দিও না, স্কিপ মারবো নাকি?`;
    } else if (brain.personality === 'chatty' && brain.recentSightings.length > 0) {
      const lastSight = brain.recentSightings[brain.recentSightings.length - 1];
      const s = lastSight.perceivedName.split(' ')[0];
      const lsz = ZONES.find((z) => z.name === lastSight.zoneName)?.banglaName ?? lastSight.zoneName;
      text = `আমি ${myZone} এ ছিলাম, ${s} কে দেখছি ${lsz} দিকে`;
    } else {
      const variants = [
        `আমি তো ${myZone} এ ছিলাম ভাই`,
        `কে কোথায় ছিলা বলো তো, আমি ${myZone} এ টাস্ক শেষ করলাম`,
        `ভাই ${myZone} থেকে আসলাম এইমাত্র, কিছু বুঝতেছি না`,
        BOT_BANTER_LINES[Math.floor(rng() * BOT_BANTER_LINES.length)],
      ];
      text = variants[Math.floor(rng() * variants.length)];
    }

    if (!text) continue;

    // Stagger each speaker naturally within chatDelayRange (and beyond if crowded)
    const sendAtSec = Math.min(14.5, cursorDelay);
    const [tMin, tMax] = BOT_AI_CONFIG.typingDurationRange;
    const typingDur = tMin + rng() * (tMax - tMin);
    const typingStartSec = Math.max(0.45, sendAtSec - typingDur);
    brain.pendingChats.push({
      id: `fb_${p.id}_${Math.floor(sendAtSec * 100)}`,
      typingStartSec,
      sendAtSec,
      text,
      accusedId,
    });
    brain.hasChatted = true;

    cursorDelay += 1.05 + rng() * Math.max(0.8, (maxDelay - minDelay) * 0.22);
  }
}

/**
 * Builds the single batched payload sent to /api/bot-meeting-chat ONCE per meeting round.
 * Strictly strips global hidden truth: each bot receives ONLY its own private memory,
 * personality, own role, and public chat so far. Zero isBot/isHuman flags exposed.
 */
export function buildBatchedGeminiMeetingPayload(params: {
  roomCode: string;
  players: PlayerState[];
  bodies: BodyMarker[];
  brains: Map<string, BotBrainState>;
  chat: ChatMessage[];
  meetingReason: 'body' | 'emergency' | null;
  meetingCallerId: string | null;
  phase?: 'opening' | 'reaction';
}): BatchedGeminiMeetingPayload {
  const { roomCode, players, bodies, brains, chat, meetingReason, meetingCallerId, phase = 'opening' } = params;
  const caller = players.find((p) => p.id === meetingCallerId) ?? null;
  const reportedBody = meetingReason === 'body' ? bodies.find((b) => b.reported) ?? bodies.at(-1) : undefined;
  const bodyZone = reportedBody ? getZoneNameAt(reportedBody.x, reportedBody.z) : null;

  const aliveNames = players.filter((p) => p.alive).map((p) => p.name);
  const recentChat = chat
    .filter((m) => !m.ghostOnly && !m.system)
    .slice(-10)
    .map((m) => ({ senderName: m.senderName, text: m.text }));

  const botContexts: BotGeminiMeetingBotContext[] = [];
  for (const p of players) {
    if (!p.isBot || !p.alive) continue;
    const brain = brains.get(p.id);
    if (!brain) continue;

    processPrivateMeetingCluesForBot(p, brain, players, bodies, meetingReason, meetingCallerId);

    const partner =
      p.role === 'vondo'
        ? players.find((o) => o.alive && o.id !== p.id && o.role === 'vondo')
        : undefined;

    const mem: string[] = [];
    if (brain.seenNearKill) {
      const killerSus = players.find((o) => o.id === brain.seenNearKill);
      if (killerSus) mem.push(`Saw ${killerSus.name} do a kill right in front of me!`);
    }
    if (p.specialRole === 'master_moshai' && brain.masterAccusedId) {
      const fakePl = players.find((o) => o.id === brain.masterAccusedId);
      if (fakePl) mem.push(`Checked ${fakePl.name}'s task register and they had fake tasks!`);
    }
    if (p.specialRole === 'goyenda' && brain.forensicHint) {
      mem.push(`Forensic body scan clue: ${brain.forensicHint}`);
    }
    if (brain.clearedIds.length > 0) {
      const clrNames = brain.clearedIds
        .map((id) => players.find((o) => o.id === id)?.name)
        .filter((n): n is string => Boolean(n));
      if (clrNames.length > 0) mem.push(`Cleared by visual task / khata: ${clrNames.join(', ')}`);
    }
    const lastSights = brain.recentSightings.slice(-4).map((s) => `${s.perceivedName} near ${s.zoneName}`);
    if (lastSights.length > 0) {
      mem.push(`Recently saw: ${Array.from(new Set(lastSights)).join('; ')}`);
    }
    if (brain.knownBodies.length > 0) {
      const kb = brain.knownBodies[brain.knownBodies.length - 1];
      mem.push(`Saw fallen body of ${kb.victimName} in ${kb.zoneName}`);
    }

    const topSus = getPrivateTopSuspect(p, brain, players);
    botContexts.push({
      id: p.id,
      name: p.name,
      color: p.color,
      personality: brain.personality,
      role: p.role,
      specialRole: p.specialRole,
      partnerName: partner?.name,
      ownRecentZones: brain.zoneHistory.slice(-3),
      fakeAlibiZone: p.role === 'vondo' ? brain.fakeStoryZone : undefined,
      privateMemory: mem,
      topSuspectName: topSus && topSus.score >= 1.5 ? topSus.player.name : undefined,
      shouldBeSilent: brain.personality === 'quiet' && !brain.seenNearKill && meetingCallerId !== p.id,
    });
  }

  return {
    roomCode,
    phase,
    reason: meetingReason,
    callerName: caller?.name ?? null,
    victimName: reportedBody?.victimName ?? null,
    bodyZone,
    aliveNames,
    chatHistory: recentChat,
    bots: botContexts,
  };
}

function resolveGeminiSuspect(
  suspectName: string | undefined,
  players: PlayerState[],
  excludeBotId: string,
): PlayerState | null {
  if (typeof suspectName !== 'string') return null;
  const clean = suspectName.trim().toLowerCase();
  if (clean.length < 2) return null;
  const first = clean.split(/\s+/)[0] ?? '';
  return (
    players.find(
      (pl) =>
        pl.alive &&
        pl.id !== excludeBotId &&
        (pl.name.toLowerCase() === clean ||
          (first.length >= 2 && pl.name.toLowerCase().split(/\s+/)[0] === first)),
    ) ?? null
  );
}

/**
 * Applies Gemini batched chat replies into unsent bot queues, staggering timings
 * cleanly and keeping any already-sent messages intact.
 */
export function applyBatchedGeminiChats(params: {
  replies: BatchedGeminiChatReply[];
  players: PlayerState[];
  brains: Map<string, BotBrainState>;
  rng?: () => number;
}): void {
  const { replies, players, brains } = params;
  const rng = params.rng ?? Math.random;
  if (!Array.isArray(replies) || replies.length === 0) return;

  const usedSlots: number[] = [];
  for (const r of replies) {
    if (!r || typeof r.botId !== 'string' || typeof r.text !== 'string') continue;
    const cleanText = r.text.trim().replace(/\s+/g, ' ').slice(0, 130);
    if (!cleanText) continue;

    const bot = players.find((p) => p.id === r.botId && p.isBot && p.alive);
    const brain = brains.get(r.botId);
    if (!bot || !brain || brain.geminiApplied) continue;
    // If bot already spoke in chat, don't overwrite; still allow if quiet/not spoken yet
    const alreadySpoke = brain.pendingChats.some((c) => c.sent);
    if (alreadySpoke) continue;

    let sendAtSec = Number.isFinite(r.delaySec) ? Math.max(2.0, Math.min(13.5, r.delaySec)) : 3.0 + rng() * 6.5;
    if (sendAtSec <= brain.meetingElapsedSec + 1.0) {
      sendAtSec = brain.meetingElapsedSec + 1.3 + rng() * 2.0;
    }
    while (usedSlots.some((t) => Math.abs(t - sendAtSec) < 1.1)) {
      sendAtSec += 1.15;
    }
    usedSlots.push(sendAtSec);

    const [tMin, tMax] = BOT_AI_CONFIG.typingDurationRange;
    const typingDur = tMin + rng() * (tMax - tMin);
    const typingStartSec = Math.max(brain.meetingElapsedSec + 0.2, sendAtSec - typingDur);
    const mentioned = findMentionedPlayer(cleanText, players, bot.id);
    const suspectPl = resolveGeminiSuspect(r.suspectName, players, bot.id);
    if (suspectPl && !brain.clearedIds.includes(suspectPl.id)) {
      brain.suspicion[suspectPl.id] = (brain.suspicion[suspectPl.id] ?? 0) + 1.15;
    }

    brain.pendingChats = [
      {
        id: `gem_${bot.id}_${Math.floor(sendAtSec * 100)}`,
        typingStartSec,
        sendAtSec,
        text: cleanText,
        accusedId:
          mentioned && isAccusationText(cleanText)
            ? mentioned.id
            : suspectPl?.id,
      },
    ];
    brain.geminiApplied = true;
    brain.hasChatted = true;
  }
}

/**
 * Schedules 1-3 live Gemini reactive replies after a human sends a meeting message,
 * without overwriting already-sent lines or interrupting bots currently typing.
 */
export function applyBatchedGeminiReactionChats(params: {
  replies: BatchedGeminiChatReply[];
  players: PlayerState[];
  brains: Map<string, BotBrainState>;
  rng?: () => number;
}): void {
  const { replies, players, brains } = params;
  const rng = params.rng ?? Math.random;
  if (!Array.isArray(replies) || replies.length === 0) return;

  let scheduledCount = 0;
  for (const r of replies) {
    if (scheduledCount >= 3) break;
    if (!r || typeof r.botId !== 'string' || typeof r.text !== 'string') continue;
    const cleanText = r.text.trim().replace(/\s+/g, ' ').slice(0, 130);
    if (!cleanText) continue;

    const bot = players.find((p) => p.id === r.botId && p.isBot && p.alive);
    const brain = brains.get(r.botId);
    if (!bot || !brain) continue;
    if (brain.isTypingInMeeting) continue;
    const hasImminentUnsent = brain.pendingChats.some(
      (c) => !c.sent && c.sendAtSec <= brain.meetingElapsedSec + 1.5,
    );
    if (hasImminentUnsent) continue;

    const delay = Math.min(4.5, Math.max(1.6, 1.6 + scheduledCount * 1.1 + rng() * 0.85));
    const sendAtSec = brain.meetingElapsedSec + delay;
    const typingDur = 0.85 + rng() * 0.9;
    const typingStartSec = Math.max(brain.meetingElapsedSec + 0.15, sendAtSec - typingDur);
    const mentioned = findMentionedPlayer(cleanText, players, bot.id);
    const suspectPl = resolveGeminiSuspect(r.suspectName, players, bot.id);
    if (suspectPl && !brain.clearedIds.includes(suspectPl.id)) {
      brain.suspicion[suspectPl.id] = (brain.suspicion[suspectPl.id] ?? 0) + 1.15;
    }

    brain.pendingChats.push({
      id: `gem_react_${bot.id}_${Math.floor(sendAtSec * 100)}_${scheduledCount}`,
      typingStartSec,
      sendAtSec,
      text: cleanText,
      accusedId:
        mentioned && isAccusationText(cleanText)
          ? mentioned.id
          : suspectPl?.id,
    });
    brain.hasChatted = true;
    scheduledCount++;
  }
}

export function getMeetingTypingBotIds(
  players: PlayerState[],
  brains: Map<string, BotBrainState>,
): string[] {
  const typing: string[] = [];
  for (const p of players) {
    if (!p.isBot || !p.alive) continue;
    const brain = brains.get(p.id);
    if (brain?.isTypingInMeeting) typing.push(p.id);
  }
  return typing;
}

/**
 * Decides an individual bot's vote using strictly private evidence, personality,
 * corroborated accusation count, randomness, and natural splits/skips (no hive-mind pile-on!).
 */
export function decideBotVote(params: {
  bot: PlayerState;
  brain: BotBrainState;
  players: PlayerState[];
  bodies: BodyMarker[];
  rng?: () => number;
}): string | 'skip' {
  const { bot, brain, players, bodies } = params;
  const rng = params.rng ?? Math.random;

  const aliveOthers = players.filter((pl) => pl.alive && pl.id !== bot.id);
  if (aliveOthers.length === 0) return 'skip';

  const clearedSet = new Set(brain.clearedIds);
  const nonTeammates = aliveOthers.filter((pl) => (bot.role === 'vondo' ? pl.role !== 'vondo' : true));

  // 1. Direct indisputable witness / Master Khata evidence from Parabasi
  if (bot.role === 'parabasi' && (brain.seenNearKill || brain.masterAccusedId)) {
    const suspectId = brain.seenNearKill ?? brain.masterAccusedId;
    const target = aliveOthers.find((pl) => pl.id === suspectId);
    if (target && rng() < 0.93) {
      return target.id;
    }
  }

  // 2. Early emergency bell with no bodies: smart humans usually skip
  const anyCasualties = players.some((pl) => !pl.alive) || bodies.length > 0;
  if (!anyCasualties && rng() < 0.9) {
    return 'skip';
  }

  // Gather unique independent accusers per suspect so 1 loud voice doesn't create fake consensus
  const uniqueAccusersByTarget = new Map<string, Set<string>>();
  for (const claim of brain.heardClaims) {
    if (claim.accusedId && claim.accusedId !== bot.id) {
      const set = uniqueAccusersByTarget.get(claim.accusedId) ?? new Set<string>();
      set.add(claim.speakerId);
      uniqueAccusersByTarget.set(claim.accusedId, set);
    }
  }

  // 3. Impostor strategy: bus heavily accused partner occasionally, otherwise split votes or skip naturally
  if (bot.role === 'vondo') {
    const partner = aliveOthers.find((pl) => pl.role === 'vondo');
    if (partner) {
      const partnerAccusers = uniqueAccusersByTarget.get(partner.id)?.size ?? 0;
      if (partnerAccusers >= 2 && rng() < BOT_AI_CONFIG.busPartnerChance) {
        return partner.id;
      }
    }

    const crowdSorted = Array.from(uniqueAccusersByTarget.entries())
      .filter(([cid]) => nonTeammates.some((pl) => pl.id === cid))
      .sort((a, b) => b[1].size - a[1].size);
    const topTarget = crowdSorted[0];
    const secondTarget = crowdSorted[1];

    // Only pile on bandwagon strongly when >=2 independent voices agree; single rumors split/skip!
    if (topTarget && topTarget[1].size >= 2) {
      if (rng() < 0.72) return topTarget[0];
    } else if (topTarget && topTarget[1].size === 1) {
      const roll = rng();
      if (roll < 0.28) return topTarget[0];
      if (secondTarget && roll < 0.48) return secondTarget[0];
      if (roll < 0.78) return 'skip';
    }

    if (nonTeammates.length > 0 && rng() < 0.22) {
      return nonTeammates[Math.floor(rng() * nonTeammates.length)].id;
    }
    return 'skip';
  }

  // 4. Crew / Neutral individual voting: separate hard first-hand observation from single chat rumors
  const scored: Array<{ id: string; score: number; priv: number; accusers: number }> = [];
  for (const cand of aliveOthers) {
    if (clearedSet.has(cand.id)) continue;
    const priv = brain.suspicion[cand.id] ?? 0;
    const accuserSet = uniqueAccusersByTarget.get(cand.id);
    const accuserCount = accuserSet?.size ?? 0;

    // Count weighted trust across unique accusers, capping single uncorroborated claims
    let chatHeat = 0;
    if (accuserSet) {
      for (const spId of accuserSet) {
        const speakerTrust = (brain.trust[spId] ?? 0) > 1.5 ? 1.25 : 0.85;
        chatHeat += speakerTrust;
      }
    }
    const cappedHeat = accuserCount <= 1 ? Math.min(0.62, chatHeat * BOT_AI_CONFIG.bandwagonStrength) : chatHeat * BOT_AI_CONFIG.bandwagonStrength * 0.92;
    const trustPenalty = (brain.trust[cand.id] ?? 0) * 0.55;
    const personalJitter = (rng() - 0.5) * (0.45 + BOT_AI_CONFIG.voteRandomness * 1.4);
    const total = priv + cappedHeat - trustPenalty + personalJitter;
    if (total > 0.35) {
      scored.push({ id: cand.id, score: total, priv, accusers: accuserCount });
    }
  }
  scored.sort((a, b) => b.score - a.score);

  const threshold =
    brain.personality === 'skeptic'
      ? 1.72
      : brain.personality === 'chill' || brain.personality === 'quiet'
        ? 1.48
        : brain.personality === 'paranoid'
          ? 1.08
          : 1.25;

  if (scored.length > 0 && scored[0].score >= threshold) {
    const top = scored[0];
    const runner = scored[1];
    const onlyWeakRumor = top.priv < 0.9 && top.accusers < 2;

    // Skeptic / chill bots avoid piling on an uncorroborated single rumor
    if (onlyWeakRumor && (brain.personality === 'skeptic' || brain.personality === 'chill')) {
      if (rng() < 0.72) return 'skip';
    }

    // Genuine uncertainty when evidence isn't overwhelming (< 2.35) -> split between #1, #2, and skip
    if (top.score < 2.35) {
      if (runner && runner.score >= threshold * 0.85 && top.score - runner.score < 0.9 && rng() < 0.38) {
        return runner.id;
      }
      const skipBias = onlyWeakRumor ? 0.42 : BOT_AI_CONFIG.voteRandomness * 0.9;
      if (rng() < skipBias) {
        return 'skip';
      }
    }
    return top.id;
  }

  // Spread minor intuitive guesses occasionally when multiple suspects feel shady, else skip
  if (scored.length >= 2 && rng() < BOT_AI_CONFIG.voteRandomness * 0.65) {
    const pickIdx = rng() < 0.55 ? 0 : 1;
    return scored[pickIdx].id;
  }
  const unCleared = aliveOthers.filter((c) => !clearedSet.has(c.id));
  if (unCleared.length > 0 && rng() < BOT_AI_CONFIG.voteRandomness * 0.22) {
    return unCleared[Math.floor(rng() * unCleared.length)].id;
  }
  return 'skip';
}

export function stepBotsMeeting(params: {
  players: PlayerState[];
  bodies: BodyMarker[];
  discussionTimer: number;
  brains: Map<string, BotBrainState>;
  dt: number;
  meetingReason?: 'body' | 'emergency' | null;
  meetingCallerId?: string | null;
  rng?: () => number;
  onChat?: (p: PlayerState, text: string) => void;
}): void {
  const {
    players,
    bodies,
    discussionTimer,
    brains,
    dt,
    meetingReason = null,
    meetingCallerId = null,
    onChat,
  } = params;
  const rng = params.rng ?? Math.random;
  const canCastVote = discussionTimer <= 0;

  // Ensure every alive bot has initialized fallback schedule on first meeting tick
  const needsInit = players.some((p) => {
    if (!p.isBot || !p.alive) return false;
    const b = brains.get(p.id);
    return !b || !b.processedMeetingClues;
  });
  if (needsInit) {
    for (const p of players) {
      if (p.isBot && p.alive && !brains.has(p.id)) {
        brains.set(p.id, createBotBrainState(rng));
      }
    }
    generateFallbackMeetingChats({
      players,
      bodies,
      brains,
      meetingReason,
      meetingCallerId,
      rng,
    });
  }

  for (const p of players) {
    if (!p.isBot || !p.alive) continue;
    const brain = brains.get(p.id);
    if (!brain) continue;

    brain.meetingElapsedSec += dt;

    // Step staggered typing indicator + scheduled chat turns
    let activeTyping = false;
    for (const turn of brain.pendingChats) {
      if (turn.sent) continue;
      if (brain.meetingElapsedSec >= turn.sendAtSec) {
        turn.sent = true;
        onChat?.(p, turn.text);
        processChatMessageForBots({
          msg: {
            id: turn.id,
            senderId: p.id,
            senderName: p.name,
            senderColor: p.color,
            text: turn.text,
            timestamp: Math.floor(brain.meetingElapsedSec * 1000),
          },
          players,
          brains,
          rng,
        });
      } else if (brain.meetingElapsedSec >= turn.typingStartSec) {
        activeTyping = true;
      }
    }
    brain.isTypingInMeeting = activeTyping;

    if (!canCastVote || p.hasVoted) continue;
    brain.voteTimer -= dt;
    if (brain.voteTimer <= 0) {
      p.votedFor = decideBotVote({
        bot: p,
        brain,
        players,
        bodies,
        rng,
      });
      p.hasVoted = true;
    }
  }
}
