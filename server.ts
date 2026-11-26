import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  PLAYER_COLORS,
  type BodyMarker,
  type ChatMessage,
  type ClientMessage,
  type DoorLockState,
  type FootprintDot,
  type PlayerColorId,
  type PlayerState,
  type PublicRoomSummary,
  type RoomSettings,
  type RoomSnapshot,
  type ServerMessage,
  type VehicleState,
} from './src/shared/types.ts';
import {
  BOT_WAYPOINTS,
  EMERGENCY_BELL_POS,
  GAS_LEAK_VALVES,
  PLAYER_RADIUS,
  SPAWN_RING,
  TASK_STATIONS,
  VEHICLE_SPECS,
  VENTS,
  WALLS,
  createInitialVehicles,
  distance2D,
  findNearestAvailableVehicle,
  getBanglaZoneNameAt,
  getZoneIdAt,
  hasLineOfSight,
  resolveCircleWallCollision,
  resolvePedestrianVehicleCollision,
  resolvePlayerMoveWithElevation,
  resolveVehicleCollision,
} from './src/shared/mapData.ts';
import {
  BOHURUPI_COOLDOWN_SEC,
  BOHURUPI_DISGUISE_DURATION_SEC,
  CCTV_KAKU_COOLDOWN_SEC,
  CHAMCHA_COOLDOWN_SEC,
  CHANDABAZ_COOLDOWN_SEC,
  CHANDABAZ_INITIAL_COOLDOWN_SEC,
  CHANDABAZ_WITNESS_RANGE,
  DALAL_COOLDOWN_SEC,
  DALAL_JAM_DURATION_MS,
  HATUR_COOLDOWN_SEC,
  HATUR_DURATION_MS,
  MASTER_COOLDOWN_SEC,
  SUPARI_COOLDOWN_SEC,
  TIKTOK_COOLDOWN_SEC,
  TIKTOK_ZONE_GOAL,
  applyDalalBrokerJam,
  collectChandaFromTarget,
  countAliveChandabazTargets,
  findGhotokPairCandidates,
  findGhotokPartnerOnDeath,
  findNearestChamchaPatron,
  findNearestChandabazTarget,
  findNearestHaturTarget,
  findNearestMasterTarget,
  inspectPlayerTaskAuthenticity,
  isNeutralRole,
  isPlayerShieldedNow,
  pickSupariContractTarget,
  recordTiktokReelInZone,
  DAROGA_COOLDOWN_SEC,
  DEFAULT_ROOM_SETTINGS,
  DOOR_LOCK_COOLDOWN_SEC,
  DOOR_LOCK_DURATION_SEC,
  INITIAL_KILL_COOLDOWN_SEC,
  JHARUDAR_CLEAN_CHANNEL_SEC,
  JHARUDAR_CLEAN_COOLDOWN_SEC,
  JHARUDAR_CLEAN_USES,
  KOBIRAJ_COOLDOWN_SEC,
  LOBBY_CHAT_MAX_CHARS,
  MAX_MATCH_PLAYERS,
  MIN_MATCH_PLAYERS,
  MISTRI_FIX_RANGE,
  MISTRI_VENT_COOLDOWN_SEC,
  REPORT_RANGE,
  SABOTAGE_COOLDOWN_SEC,
  SABOTAGE_FIX_RANGE,
  SABOTAGE_INITIAL_LOCKOUT_SEC,
  VENT_RANGE,
  advanceSabotageState,
  assignMatchTasks,
  assignRoles,
  assignSpecialRoles,
  canCompleteTasks,
  canExecuteKill,
  canStartLobbyMatch,
  canUseVent,
  computeTaskProgress,
  createEmptySabotageState,
  createSabotageState,
  dismountPlayerFromVehicle,
  evaluateMatchOutcome,
  executeGoyendaScan,
  findNearestCleanableBody,
  findNearestDarogaTarget,
  findNearestGasValve,
  findNearestInspectableBody,
  findNearestKillTarget,
  findNearestReportableBody,
  findNearestRevivableBody,
  findNearestShieldTarget,
  getChandabazGoal,
  getColorShadeHint,
  inspectBodyClue,
  isCriticalSabotage,
  isMistriVentAudibleTo,
  isTaskLockedBySabotage,
  makeDefaultPlayerState,
  makeEmptyDoorLocks,
  redactSnapshotForPlayer,
  resolveDarogaShot,
  resolveVentHopTarget,
  sanitizePlayerName,
  sanitizeSoloConfig,
  stepJharudarChannel,
  tallyVotes,
} from './src/shared/gameRules.ts';
import {
  type BatchedGeminiChatReply,
  type BatchedGeminiMeetingPayload,
  type BotBrainState,
  applyBatchedGeminiChats,
  applyBatchedGeminiReactionChats,
  buildBatchedGeminiMeetingPayload,
  createBotBrainState,
  generateFallbackMeetingChats,
  getMeetingTypingBotIds,
  notifyBotsOfChandabazExtort,
  processChatMessageForBots,
  recordKillWitnesses,
  resetBotBrainsForMeeting,
  stepBotsMeeting,
  stepBotsPlaying,
} from './src/shared/botAi.ts';
import { resolveUniqueMultiplayerIdentity } from './src/shared/banglaComedy.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const TICK_RATE_MS = 50; // 20Hz authoritative server tick
const MAX_PLAYERS = MAX_MATCH_PLAYERS;
const RECONNECT_GRACE_MS = 20_000;

let cachedGeminiClient: GoogleGenAI | null | undefined;
function getGeminiClient(): GoogleGenAI | null {
  if (cachedGeminiClient !== undefined) return cachedGeminiClient;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    cachedGeminiClient = null;
    return null;
  }
  cachedGeminiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  return cachedGeminiClient;
}

let geminiQuotaCooldownUntil = 0;
let geminiCooldownLoggedUntil = 0;

function classifyGeminiError(err: unknown): {
  isQuotaOrRateLimit: boolean;
  isZeroQuota: boolean;
  isTransient: boolean;
  summary: string;
} {
  const raw =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : typeof err === 'string'
        ? err
        : JSON.stringify(err ?? {});
  const lower = raw.toLowerCase();
  const isZeroQuota =
    lower.includes('"quota_limit_value":"0"') ||
    lower.includes('"quota_limit_value": "0"');
  const isQuotaOrRateLimit =
    isZeroQuota ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate_limit_exceeded') ||
    lower.includes('quota exceeded') ||
    lower.includes('"code":429') ||
    lower.includes(' 429 ');
  const isTransient =
    !isZeroQuota &&
    (isQuotaOrRateLimit ||
      lower.includes('503') ||
      lower.includes('unavailable') ||
      lower.includes('timeout'));
  const summary = isZeroQuota
    ? 'Gemini regional API quota is 0 RPM (429 RESOURCE_EXHAUSTED)'
    : isQuotaOrRateLimit
      ? 'Gemini API rate limit reached (429 RESOURCE_EXHAUSTED)'
      : 'Gemini API request failed';
  return { isQuotaOrRateLimit, isZeroQuota, isTransient, summary };
}

async function generateGeminiBotMeetingChats(
  payload: BatchedGeminiMeetingPayload,
): Promise<{
  messages: BatchedGeminiChatReply[];
  fallback: boolean;
  quotaExceeded?: boolean;
  retryAfterSec?: number;
}> {
  const ai = getGeminiClient();
  if (!ai || payload.bots.length === 0) {
    return { messages: [], fallback: true };
  }

  const now = Date.now();
  if (now < geminiQuotaCooldownUntil) {
    return {
      messages: [],
      fallback: true,
      quotaExceeded: true,
      retryAfterSec: Math.max(1, Math.ceil((geminiQuotaCooldownUntil - now) / 1000)),
    };
  }

  const isReaction = payload.phase === 'reaction';
  const promptPayload = {
    phase: payload.phase ?? 'opening',
    meetingReason: payload.reason,
    callerName: payload.callerName,
    victimName: payload.victimName,
    bodyZone: payload.bodyZone,
    alivePlayers: payload.aliveNames,
    recentChat: payload.chatHistory.slice(-10),
    bots: payload.bots.map((b) => ({
      botId: b.id,
      name: b.name,
      personality: b.personality,
      role: b.role,
      specialRole: b.specialRole,
      partnerName: b.partnerName ?? null,
      ownRecentZones: b.ownRecentZones,
      fakeAlibiZone: b.fakeAlibiZone ?? null,
      privateMemory: b.privateMemory,
      topSuspectName: b.topSuspectName ?? null,
      shouldBeSilent: b.shouldBeSilent,
    })),
  };

  const userPrompt = isReaction
    ? `A player just spoke in the meeting chat. Pick 1-3 relevant non-silent bots to react naturally right now in Bangla.\nContext JSON:\n${JSON.stringify(promptPayload)}`
    : `Generate one natural meeting round of short, casual chat lines for the non-silent bots below.\nContext JSON:\n${JSON.stringify(promptPayload)}`;

  const systemInstruction =
    'You write realistic human player chat messages in an Among Us-style Dhaka neighborhood game ("কে বাটপার?"). ' +
    'Each bot MUST ONLY know its own privateMemory, ownRecentZones, personality, role, partnerName (if vondo), and recentChat. ' +
    'Never leak hidden roles or cheat. Never treat any player specially. ' +
    'Write short, natural 4-14 word lines in pure natural casual Bangla script (বাংলা অক্ষরে, যেমন: "ভাই", "মামা", "কসম", "সন্দেহ লাগতেছে", "কেন", "আরেহ", "পুকুরে ফ্যালো") with realistic casual phrasing, mild conversational quirks, and personality fit. ' +
    'Skip bots where shouldBeSilent is true (or output fewer messages so some stay quiet). ' +
    'Vondo bots lie using fakeAlibiZone, deflect naturally, or bus a heavily suspected partner. ' +
    'Parabasi bots share honest (slightly uncertain) observations, ask sharp questions, or call out contradictions. ' +
    'If phase is "reaction", only output 1 to 3 short replies from bots reacting to the latest message in recentChat, with delaySec between 1.6 and 4.2. ' +
    'Otherwise set delaySec staggered between 2.2 and 12.5 seconds (never 0 or instant). ' +
    'If a bot points suspicion at a specific alive player, optionally include suspectName matching that player name in alivePlayers.';

  const callModel = () =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: userPrompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            messages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  botId: { type: Type.STRING },
                  text: { type: Type.STRING },
                  delaySec: { type: Type.NUMBER },
                  suspectName: { type: Type.STRING },
                },
                required: ['botId', 'text', 'delaySec'],
              },
            },
          },
          required: ['messages'],
        },
      },
    });

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await callModel();
      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        messages?: Array<{ botId?: unknown; text?: unknown; delaySec?: unknown; suspectName?: unknown }>;
      };
      const messages: BatchedGeminiChatReply[] = Array.isArray(parsed.messages)
        ? parsed.messages
            .filter(
              (m): m is { botId: string; text: string; delaySec: number; suspectName?: unknown } =>
                typeof m?.botId === 'string' &&
                typeof m?.text === 'string' &&
                typeof m?.delaySec === 'number',
            )
            .map((m) => ({
              botId: m.botId,
              text: m.text,
              delaySec: m.delaySec,
              ...(typeof m.suspectName === 'string' && m.suspectName.trim()
                ? { suspectName: m.suspectName.trim() }
                : {}),
            }))
            .slice(0, payload.bots.length)
        : [];

      return { messages, fallback: messages.length === 0 };
    } catch (err) {
      lastErr = err;
      const info = classifyGeminiError(err);
      if (attempt === 0 && info.isTransient && !info.isZeroQuota) {
        await new Promise((resolve) => setTimeout(resolve, 850));
        continue;
      }
      break;
    }
  }

  const info = classifyGeminiError(lastErr);
  const cooldownMs = info.isZeroQuota ? 5 * 60_000 : info.isQuotaOrRateLimit ? 60_000 : 30_000;
  geminiQuotaCooldownUntil = Date.now() + cooldownMs;
  if (Date.now() >= geminiCooldownLoggedUntil) {
    geminiCooldownLoggedUntil = geminiQuotaCooldownUntil;
    console.info(
      `[bot-chat] ${info.summary}; using built-in Bangla bot chat fallback for ${Math.round(cooldownMs / 1000)}s.`,
    );
  }
  return {
    messages: [],
    fallback: true,
    quotaExceeded: info.isQuotaOrRateLimit,
    retryAfterSec: Math.round(cooldownMs / 1000),
  };
}

const BOT_NAMES = [
  'চাচা মিয়া',
  'বাবু ভাই',
  'পিন্টু দা',
  'টুকটুকি আপা',
  'রাজু রিকশা',
  'কাল্লু ওস্তাদ',
  'মিতু মণি',
  'গোলাপী রানী',
  'আকাশী তারা',
  'বাদামী মামা',
  'টুটু চাচা',
  'জাম কাকা',
  'পাতা ভাই',
  'সোনা বাবু',
  'লাল মিয়া',
  'হাবু ডন',
  'ফিরোজা ভাবি',
  'সিঁদুর ভাই',
  'মেহেদী মামা',
  'চন্দন দাদা',
];

interface RoomInternal {
  code: string;
  phase: 'lobby' | 'role_reveal' | 'playing' | 'meeting' | 'vote_results' | 'ejecting' | 'gameover';
  players: Map<string, PlayerState>;
  clients: Map<string, WebSocket>;
  botMemories: Map<string, BotBrainState>;
  footprintAccum: Map<string, number>;
  holdingFixMap: Map<string, { valveId?: 'valve_cha' | 'valve_rickshaw' }>;
  bodies: BodyMarker[];
  footprints: FootprintDot[];
  sabotage: RoomSnapshot['sabotage'];
  doorLocks: DoorLockState;
  chat: ChatMessage[];
  lobbyChat: ChatMessage[];
  lobbyCountdownSec: number | null;
  lobbyCountdownTimer: number;
  lastLobbyChatAt: Map<string, number>;
  playerReconnectTokens: Map<string, string>;
  disconnectedSlots: Map<string, { player: PlayerState; expiresAt: number }>;
  meetingCallerId: string | null;
  meetingReason: 'body' | 'emergency' | null;
  meetingTimer: number;
  discussionTimer: number;
  phaseTimer: number;
  emergencyCooldownRemaining: number;
  ejection: RoomSnapshot['ejection'];
  justEjectedPlayer: PlayerState | null;
  outcome: RoomSnapshot['outcome'];
  netaRevealedId: string | null;
  prankedLampUntil: number;
  commsJammedUntil: number;
  ghotokLinkedIds: [string, string] | null;
  settings: RoomSettings;
  meetingEpoch: number;
  lastGeminiReactionAt: number;
  typingPlayers: Set<string>;
  vehicles: VehicleState[];
}

const rooms = new Map<string, RoomInternal>();
const socketToPlayer = new Map<WebSocket, { roomCode: string; playerId: string }>();

function generateRoomCode(): string {
  const words = ['ADDA', 'CHAI', 'MAMA', 'PARA', 'DESH', 'KELA', 'PUKR'];
  for (let i = 0; i < 10; i++) {
    const candidate =
      i < 4
        ? `${words[Math.floor(Math.random() * words.length)]}`
        : Math.random().toString(36).substring(2, 6).toUpperCase();
    if (!rooms.has(candidate)) return candidate;
  }
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function pickAvailableColor(room: RoomInternal, preferred?: PlayerColorId): PlayerColorId {
  const used = new Set(Array.from(room.players.values()).map((p) => p.color));
  if (preferred && !used.has(preferred)) return preferred;
  for (const spec of PLAYER_COLORS) {
    if (!used.has(spec.id)) return spec.id;
  }
  return PLAYER_COLORS[room.players.size % PLAYER_COLORS.length].id;
}

function buildSnapshot(room: RoomInternal): RoomSnapshot {
  const players = Array.from(room.players.values());
  const taskStats = computeTaskProgress(players);
  const botTypers =
    room.phase === 'meeting' ? getMeetingTypingBotIds(players, room.botMemories) : [];
  const typingPlayerIds =
    room.phase === 'meeting'
      ? Array.from(new Set([...room.typingPlayers, ...botTypers]))
      : [];
  return {
    roomCode: room.code,
    isSolo: false,
    phase: room.phase,
    players: players.map((p) => ({ ...p, tasks: p.tasks.map((t) => ({ ...t })) })),
    bodies: room.bodies.map((b) => ({ ...b })),
    footprints: room.footprints.map((f) => ({ ...f })),
    sabotage: {
      ...room.sabotage,
      valves: room.sabotage.valves.map((v) => ({ ...v })),
    },
    doorLocks: { ...room.doorLocks },
    chat: room.chat.slice(-40),
    lobbyChat: room.lobbyChat.slice(-40),
    lobbyCountdownSec: room.lobbyCountdownSec,
    netaRevealedId: room.netaRevealedId,
    prankedLampUntil: room.prankedLampUntil,
    commsJammedUntil: room.commsJammedUntil,
    ghotokLinkedIds: room.ghotokLinkedIds,
    meetingCallerId: room.meetingCallerId,
    meetingReason: room.meetingReason,
    meetingTimer: Math.max(0, Math.ceil(room.meetingTimer)),
    discussionTimer: Math.max(0, Math.ceil(room.discussionTimer)),
    emergencyCooldownRemaining: Math.max(0, Math.ceil(room.emergencyCooldownRemaining)),
    ejection: room.ejection,
    outcome: room.outcome,
    settings: { ...room.settings },
    taskProgress: taskStats.progress,
    totalTasks: taskStats.totalTasks,
    completedTasks: taskStats.completedTasks,
    typingPlayerIds,
    vehicles: room.vehicles.map((v) => ({ ...v })),
  };
}

function recordFootprint(room: RoomInternal, p: PlayerState, distMoved: number): void {
  if (!p.alive || p.inVent || p.vehicleId || distMoved < 0.05) return;
  const prev = (room.footprintAccum.get(p.id) ?? 0) + distMoved;
  if (prev >= 2.2) {
    room.footprintAccum.set(p.id, 0);
    room.footprints.push({
      id: `fp_${Date.now()}_${p.id}_${Math.random().toString(36).slice(2, 5)}`,
      x: p.x,
      z: p.z,
      color: p.disguiseColor ?? p.color,
      expiresAt: Date.now() + 7500,
    });
    if (room.footprints.length > 36) {
      room.footprints.shift();
    }
  } else {
    room.footprintAccum.set(p.id, prev);
  }
}

function sendToSocket(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function sendToPlayer(room: RoomInternal, playerId: string, msg: ServerMessage): void {
  const ws = room.clients.get(playerId);
  if (ws) sendToSocket(ws, msg);
}

function broadcastRoom(room: RoomInternal, msg?: ServerMessage): void {
  if (msg) {
    const payload = JSON.stringify(msg);
    for (const ws of room.clients.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
    return;
  }

  const baseSnap = buildSnapshot(room);
  for (const [playerId, ws] of room.clients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'room:state',
          snapshot: redactSnapshotForPlayer(baseSnap, playerId),
        } satisfies ServerMessage),
      );
    }
  }
}

function pushSystemChat(room: RoomInternal, text: string): void {
  room.chat.push({
    id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    senderId: 'system',
    senderName: 'মহল্লা ঘোষণা',
    senderColor: 'holud',
    text,
    timestamp: Date.now(),
    system: true,
  });
}

function createEmptyRoom(code: string): RoomInternal {
  return {
    code,
    phase: 'lobby',
    players: new Map(),
    clients: new Map(),
    botMemories: new Map(),
    footprintAccum: new Map(),
    holdingFixMap: new Map(),
    bodies: [],
    footprints: [],
    sabotage: createEmptySabotageState(SABOTAGE_INITIAL_LOCKOUT_SEC),
    doorLocks: makeEmptyDoorLocks(),
    chat: [],
    lobbyChat: [],
    lobbyCountdownSec: null,
    lobbyCountdownTimer: 0,
    lastLobbyChatAt: new Map(),
    playerReconnectTokens: new Map(),
    disconnectedSlots: new Map(),
    meetingCallerId: null,
    meetingReason: null,
    meetingTimer: 0,
    discussionTimer: 0,
    phaseTimer: 0,
    emergencyCooldownRemaining: 0,
    ejection: null,
    justEjectedPlayer: null,
    outcome: null,
    netaRevealedId: null,
    prankedLampUntil: 0,
    commsJammedUntil: 0,
    ghotokLinkedIds: null,
    settings: { ...DEFAULT_ROOM_SETTINGS },
    meetingEpoch: 0,
    lastGeminiReactionAt: 0,
    typingPlayers: new Set(),
    vehicles: createInitialVehicles(),
  };
}

function pruneExpiredReconnectSlots(room: RoomInternal): void {
  const now = Date.now();
  for (const [token, entry] of room.disconnectedSlots.entries()) {
    if (entry.expiresAt <= now) {
      room.disconnectedSlots.delete(token);
    }
  }
}

function cancelRoomLobbyCountdown(room: RoomInternal): void {
  if (room.lobbyCountdownSec !== null || room.lobbyCountdownTimer > 0) {
    room.lobbyCountdownSec = null;
    room.lobbyCountdownTimer = 0;
  }
}

function spawnRoomBot(room: RoomInternal): boolean {
  if (room.players.size >= MAX_PLAYERS) return false;
  const botId = `bot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
  const sp = SPAWN_RING[room.players.size % SPAWN_RING.length];
  const botCandidate = BOT_NAMES[room.players.size % BOT_NAMES.length];
  const botIdentity = resolveUniqueMultiplayerIdentity(
    botCandidate,
    undefined,
    Array.from(room.players.values()),
  );
  const existingNames = Array.from(room.players.values()).map((p) => p.name);
  room.players.set(
    botId,
    makeDefaultPlayerState({
      id: botId,
      name: sanitizePlayerName(botIdentity.name, existingNames),
      color: pickAvailableColor(room, botIdentity.color),
      x: sp.x,
      z: sp.z,
      yaw: sp.yaw,
      isBot: true,
      isHost: false,
      ready: true,
      emergencyMeetingsLeft: room.settings.emergencyMeetingsPerPlayer,
    }),
  );
  return true;
}

function removeRoomPlayer(room: RoomInternal, playerId: string, intentional: boolean): void {
  const oldPlayer = room.players.get(playerId);
  const wasHost = oldPlayer?.isHost ?? false;
  const token = room.playerReconnectTokens.get(playerId);

  room.clients.delete(playerId);
  room.holdingFixMap.delete(playerId);
  if (oldPlayer?.vehicleId) {
    dismountPlayerFromVehicle(oldPlayer, room.vehicles, room.doorLocks, false);
  }
  room.players.delete(playerId);

  if (room.clients.size === 0) {
    room.disconnectedSlots.clear();
    rooms.delete(room.code);
    return;
  }

  if (!intentional && oldPlayer && token) {
    room.disconnectedSlots.set(token, {
      player: {
        ...oldPlayer,
        isHost: false,
        ready: false,
        tasks: oldPlayer.tasks.map((t) => ({ ...t })),
      },
      expiresAt: Date.now() + RECONNECT_GRACE_MS,
    });
  } else {
    room.playerReconnectTokens.delete(playerId);
  }

  if (wasHost) {
    const nextHuman = Array.from(room.players.values()).find((p) => !p.isBot);
    if (nextHuman) {
      nextHuman.isHost = true;
      nextHuman.ready = true;
    }
  }

  if (room.phase === 'lobby') {
    if (intentional && room.settings.autoFillBots && room.players.size < MAX_PLAYERS) {
      spawnRoomBot(room);
    }
    if (!canStartLobbyMatch(Array.from(room.players.values())).ok) {
      cancelRoomLobbyCountdown(room);
    }
  }

  broadcastRoom(room);
}

function startMatch(room: RoomInternal): void {
  const playerList = Array.from(room.players.values());
  if (!canStartLobbyMatch(playerList).ok) return;
  cancelRoomLobbyCountdown(room);
  room.disconnectedSlots.clear();
  room.settings = sanitizeSoloConfig(playerList.length, room.settings).settings;

  let assigned = assignRoles(playerList, room.settings.vondoCount);
  assigned = assignSpecialRoles(
    assigned,
    room.settings.enableSpecialRoles,
    undefined,
    undefined,
    Math.random,
    room.settings.enableNeutralRoles,
  );
  assignMatchTasks(assigned, room.settings.tasksPerPlayer);
  room.bodies = [];
  room.footprints = [];
  room.footprintAccum.clear();
  room.holdingFixMap.clear();
  room.chat = [];
  room.ejection = null;
  room.justEjectedPlayer = null;
  room.outcome = null;
  room.meetingCallerId = null;
  room.meetingReason = null;
  room.netaRevealedId = null;
  room.prankedLampUntil = 0;
  room.commsJammedUntil = 0;
  room.ghotokLinkedIds = null;
  room.lobbyCountdownSec = null;
  room.discussionTimer = 0;
  room.doorLocks = makeEmptyDoorLocks();
  room.emergencyCooldownRemaining = room.settings.emergencyCooldownSec;
  room.vehicles = createInitialVehicles();
  room.sabotage = createEmptySabotageState(SABOTAGE_INITIAL_LOCKOUT_SEC);

  assigned.forEach((p, idx) => {
    const sp = SPAWN_RING[idx % SPAWN_RING.length];
    p.x = sp.x;
    p.z = sp.z;
    p.vx = 0;
    p.vz = 0;
    p.yaw = sp.yaw;
    p.alive = true;
    p.inVent = false;
    p.vehicleId = null;
    p.watchingCams = false;
    p.visualTaskTimer = 0;
    p.abilityCooldown =
      p.specialRole === 'chandabaz'
        ? CHANDABAZ_INITIAL_COOLDOWN_SEC
        : p.specialRole === 'bohurupi' ||
            p.specialRole === 'kobiraj' ||
            p.specialRole === 'daroga' ||
            p.specialRole === 'jharudar' ||
            p.specialRole === 'hatur_daktar' ||
            p.specialRole === 'dalal'
          ? 6
          : 0;
    p.revivesLeft = p.specialRole === 'daktar' ? 1 : 0;
    p.scansLeft = p.specialRole === 'goyenda' ? 2 : 0;
    p.shotsLeft = p.specialRole === 'daroga' ? 1 : 0;
    p.cleansLeft = p.specialRole === 'jharudar' ? 3 : 0;
    p.pranksLeft = 1;
    p.shielded = false;
    p.disguiseColor = null;
    p.disguiseName = null;
    p.disguiseTimer = 0;
    p.haturProtectedUntil = 0;
    p.supariTargetId =
      p.specialRole === 'supari_killer' ? pickSupariContractTarget(p, assigned)?.id ?? null : null;
    p.chamchaPatronId = null;
    p.chandabazTargets = [];
    p.tiktokZones = [];
    p.ghotokPartnerId = null;
    p.hasVoted = false;
    p.votedFor = null;
    p.emergencyMeetingsLeft =
      p.specialRole === 'neta'
        ? room.settings.emergencyMeetingsPerPlayer + 1
        : room.settings.emergencyMeetingsPerPlayer;
    p.killCooldownRemaining = p.role === 'vondo' ? INITIAL_KILL_COOLDOWN_SEC : 0;
    room.players.set(p.id, p);
  });

  room.phase = 'role_reveal';
  room.phaseTimer = 8.0;
  pushSystemChat(room, 'খেলা শুরু! পাড়ার সব কাজ শেষ করো অথবা বাটপারকে পুকুরে ফেলো!');
  broadcastRoom(room);
}

function handleRoomDeathSideEffects(room: RoomInternal, victim: PlayerState): void {
  const allPlayers = Array.from(room.players.values());
  const ghotokInfo = findGhotokPartnerOnDeath(victim.id, room.ghotokLinkedIds, allPlayers);
  if (ghotokInfo.partner) {
    const pWs = room.clients.get(ghotokInfo.partner.id);
    if (pWs) {
      sendToSocket(pWs, {
        type: 'clue:result',
        title: 'ঘটকের জুটি সতর্কবার্তা!',
        detail: `তোমার ঘটক-জুটি সঙ্গী ${victim.name} এই মুহূর্তে মারা গেছে!`,
      });
    }
  }
  if (ghotokInfo.ghotok && ghotokInfo.ghotok.id !== ghotokInfo.partner?.id) {
    const gWs = room.clients.get(ghotokInfo.ghotok.id);
    if (gWs) {
      sendToSocket(gWs, {
        type: 'clue:result',
        title: 'ঘটকের জুটি সতর্কবার্তা!',
        detail: `জুটি বাঁধা প্রতিবেশী ${victim.name} এইমাত্র মারা গেছে!`,
      });
    }
  }
  for (const pl of allPlayers) {
    if (pl.alive && pl.specialRole === 'supari_killer' && pl.supariTargetId === victim.id) {
      pl.supariTargetId = pickSupariContractTarget(pl, allPlayers, victim.id)?.id ?? null;
    }
  }
}

function startMeeting(room: RoomInternal, caller: PlayerState, reason: 'body' | 'emergency', victimName?: string): void {
  if (room.phase !== 'playing') return;
  room.phase = 'meeting';
  room.meetingCallerId = caller.id;
  room.meetingReason = reason;
  room.discussionTimer = room.settings.discussionTimeSec;
  room.meetingTimer = room.settings.meetingTimeSec;
  room.ejection = null;
  room.justEjectedPlayer = null;
  room.footprints = [];
  room.commsJammedUntil = 0;
  room.holdingFixMap.clear();
  if (isCriticalSabotage(room.sabotage.active)) {
    room.sabotage = createEmptySabotageState(SABOTAGE_COOLDOWN_SEC);
  } else {
    room.sabotage.fixProgress = 0;
    room.sabotage.fixerId = null;
  }
  room.doorLocks = makeEmptyDoorLocks();

  for (const p of room.players.values()) {
    dismountPlayerFromVehicle(p, room.vehicles, room.doorLocks, false);
    p.inVent = false;
    p.watchingCams = false;
    p.disguiseColor = null;
    p.disguiseName = null;
    p.disguiseTimer = 0;
    p.jharuTargetBodyId = null;
    p.jharuTimer = 0;
    p.pranksLeft = 1;
    p.vx = 0;
    p.vz = 0;
    p.hasVoted = false;
    p.votedFor = null;
  }
  for (const v of room.vehicles) {
    v.driverId = null;
    v.speed = 0;
    v.vx = 0;
    v.vz = 0;
    v.steer = 0;
  }

  if (!room.netaRevealedId) {
    const aliveNeta = Array.from(room.players.values()).find(
      (p) => p.alive && p.specialRole === 'neta',
    );
    if (aliveNeta) {
      room.netaRevealedId = aliveNeta.id;
      pushSystemChat(
        room,
        `${aliveNeta.name} মহল্লার নেতা — তার সালিশের ভোট ২ গুণ হিসেবে গণনা হবে!`,
      );
    }
  }

  resetBotBrainsForMeeting(room.botMemories);
  room.meetingEpoch += 1;
  room.lastGeminiReactionAt = 0;
  room.typingPlayers.clear();

  if (reason === 'body') {
    pushSystemChat(room, `${caller.name} ${victimName ?? 'এক প্রতিবেশীর'} লাশ পেয়েছে! জরুরি সালিশ ডাকা হয়েছে!`);
  } else {
    pushSystemChat(room, `${caller.name} আড্ডার ঘণ্টা বাজিয়েছে! জরুরি মহল্লা সালিশ!`);
  }

  const allPlayers = Array.from(room.players.values());
  generateFallbackMeetingChats({
    players: allPlayers,
    bodies: room.bodies,
    brains: room.botMemories,
    meetingReason: reason,
    meetingCallerId: caller.id,
  });

  const epoch = room.meetingEpoch;
  const geminiPayload = buildBatchedGeminiMeetingPayload({
    roomCode: room.code,
    players: allPlayers,
    bodies: room.bodies,
    brains: room.botMemories,
    chat: room.chat,
    meetingReason: reason,
    meetingCallerId: caller.id,
  });
  if (geminiPayload.bots.length > 0) {
    void generateGeminiBotMeetingChats(geminiPayload).then((res) => {
      if (room.phase !== 'meeting' || room.meetingEpoch !== epoch) return;
      if (res.messages.length > 0) {
        applyBatchedGeminiChats({
          replies: res.messages,
          players: Array.from(room.players.values()),
          brains: room.botMemories,
        });
      }
    });
  }

  broadcastRoom(room, { type: 'sfx:event', kind: reason === 'body' ? 'report' : 'meeting' });
  broadcastRoom(room);
}

function resolveMeetingVotes(room: RoomInternal): void {
  const players = Array.from(room.players.values());
  room.typingPlayers.clear();
  const ejection = tallyVotes(players, room.settings.confirmEjects);
  room.ejection = ejection;

  // Transition to Vote Results tally screen for 2.6s first (official Among Us flow!)
  room.phase = 'vote_results';
  room.phaseTimer = 2.6;
  broadcastRoom(room);
}

function checkAndApplyWinCondition(room: RoomInternal, sabotageExpired = false): boolean {
  const players = Array.from(room.players.values());
  const stats = computeTaskProgress(players);
  const outcome = evaluateMatchOutcome(
    players,
    stats.progress,
    sabotageExpired,
    room.justEjectedPlayer,
  );
  if (outcome) {
    room.outcome = outcome;
    room.phase = 'gameover';
    broadcastRoom(room);
    return true;
  }
  return false;
}

function updateRoomBots(room: RoomInternal, dt: number): void {
  const players = Array.from(room.players.values());
  if (room.phase === 'playing') {
    stepBotsPlaying({
      players,
      bodies: room.bodies,
      sabotage: room.sabotage,
      doorLocks: room.doorLocks,
      settings: room.settings,
      holdingFixMap: room.holdingFixMap,
      brains: room.botMemories,
      dt,
      nowMs: Date.now(),
      onFootprint: (p, distMoved) => recordFootprint(room, p, distMoved),
      onReportBody: (reporter, body) => startMeeting(room, reporter, 'body', body.victimName),
      onKill: (killer, victim, shieldBlocked) => {
        if (shieldBlocked) {
          broadcastRoom(room, { type: 'sfx:event', kind: 'shield' });
          const targetWs = room.clients.get(victim.id);
          if (targetWs) {
            sendToSocket(targetWs, {
              type: 'clue:result',
              title: 'সুরক্ষা তোমাকে বাঁচিয়েছে!',
              detail: 'একজন বাটপার হামলা করেছিল, কিন্তু তাবিজ বা ইনজেকশন বাঁচিয়ে দিয়েছে!',
            });
          }
        } else {
          sendToPlayer(room, killer.id, { type: 'sfx:event', kind: 'kill' });
          if (victim.id !== killer.id) {
            sendToPlayer(room, victim.id, { type: 'sfx:event', kind: 'kill' });
          }
          dismountPlayerFromVehicle(victim, room.vehicles, room.doorLocks, false);
          handleRoomDeathSideEffects(room, victim);
        }
      },
      onSabotage: () => broadcastRoom(room, { type: 'sfx:event', kind: 'sabotage' }),
      onDoorLock: (zoneId) => {
        room.doorLocks[zoneId] = DOOR_LOCK_DURATION_SEC;
        room.doorLocks.cooldownRemaining = DOOR_LOCK_COOLDOWN_SEC;
        broadcastRoom(room, { type: 'sfx:event', kind: 'door' });
      },
      onRevive: () => broadcastRoom(room, { type: 'sfx:event', kind: 'revive' }),
      onTaskCompletedCheckWin: () => checkAndApplyWinCondition(room),
    });
  } else if (room.phase === 'meeting') {
    stepBotsMeeting({
      players,
      bodies: room.bodies,
      discussionTimer: room.discussionTimer,
      brains: room.botMemories,
      dt,
      meetingReason: room.meetingReason,
      meetingCallerId: room.meetingCallerId,
      onChat: (p, text) => {
        room.chat.push({
          id: `chat_${Date.now()}_${p.id}`,
          senderId: p.id,
          senderName: p.name,
          senderColor: p.color,
          text,
          timestamp: Date.now(),
        });
      },
    });
  }
}

let lastServerTickMs = Date.now();
setInterval(() => {
  const nowTickMs = Date.now();
  const dt = Math.min(0.5, Math.max(0.016, (nowTickMs - lastServerTickMs) / 1000));
  lastServerTickMs = nowTickMs;
  for (const room of rooms.values()) {
    if (room.clients.size === 0) continue;

    if (room.phase === 'lobby') {
      pruneExpiredReconnectSlots(room);
      if (room.lobbyCountdownSec !== null) {
        room.lobbyCountdownTimer -= dt;
        const nextSec = Math.max(0, Math.ceil(room.lobbyCountdownTimer));
        if (nextSec > 0 && nextSec !== room.lobbyCountdownSec) {
          room.lobbyCountdownSec = nextSec;
          broadcastRoom(room, { type: 'sfx:event', kind: 'lobby_tick' });
          broadcastRoom(room);
        }
        if (room.lobbyCountdownTimer <= 0) {
          room.lobbyCountdownSec = null;
          room.lobbyCountdownTimer = 0;
          broadcastRoom(room, { type: 'sfx:event', kind: 'lobby_start' });
          startMatch(room);
        }
      }
    } else if (room.phase === 'role_reveal') {
      room.phaseTimer -= dt;
      if (room.phaseTimer <= 0) {
        room.phase = 'playing';
        broadcastRoom(room);
      }
    } else if (room.phase === 'playing') {
      const nowMs = Date.now();
      room.footprints = room.footprints.filter((f) => f.expiresAt > nowMs);
      for (const p of room.players.values()) {
        if (p.killCooldownRemaining > 0) p.killCooldownRemaining = Math.max(0, p.killCooldownRemaining - dt);
        if (p.visualTaskTimer > 0) p.visualTaskTimer = Math.max(0, p.visualTaskTimer - dt);
        if (p.abilityCooldown > 0) p.abilityCooldown = Math.max(0, p.abilityCooldown - dt);
        if (p.disguiseTimer > 0) {
          p.disguiseTimer = Math.max(0, p.disguiseTimer - dt);
          if (p.disguiseTimer === 0) {
            p.disguiseColor = null;
            p.disguiseName = null;
          }
        }
        if (p.jharuTargetBodyId) {
          const jRes = stepJharudarChannel(p, room.bodies, dt);
          if (jRes.completedBody) {
            room.bodies = room.bodies.filter((b) => b.id !== jRes.completedBody!.id);
            const pWs = room.clients.get(p.id);
            if (pWs) {
              sendToSocket(pWs, { type: 'sfx:event', kind: 'clean' });
              sendToSocket(pWs, {
                type: 'clue:result',
                title: 'লাশ গায়েব!',
                detail: `${jRes.completedBody.victimName}-এর লাশ সরানো হয়েছে — এখন কেউ রিপোর্ট করতে পারবে না!`,
              });
            }
          } else if (jRes.cancelled) {
            const pWs = room.clients.get(p.id);
            if (pWs) {
              sendToSocket(pWs, {
                type: 'clue:result',
                title: 'সাফাই বাতিল',
                detail: 'তুমি সরে গেছো অথবা লাশ আগেই রিপোর্ট হয়ে গেছে!',
              });
            }
          }
        }
      }
      if (room.emergencyCooldownRemaining > 0) {
        room.emergencyCooldownRemaining = Math.max(0, room.emergencyCooldownRemaining - dt);
      }
      if (room.doorLocks.cooldownRemaining > 0) {
        room.doorLocks.cooldownRemaining = Math.max(0, room.doorLocks.cooldownRemaining - dt);
      }
      room.doorLocks.cha_dokan = Math.max(0, room.doorLocks.cha_dokan - dt);
      room.doorLocks.rickshaw_garage = Math.max(0, room.doorLocks.rickshaw_garage - dt);
      room.doorLocks.desco_power = Math.max(0, room.doorLocks.desco_power - dt);
      room.doorLocks.dish_roof = Math.max(0, room.doorLocks.dish_roof - dt);
      for (const hid of Array.from(room.holdingFixMap.keys())) {
        const hp = room.players.get(hid);
        if (!hp || !hp.alive || hp.isBot) {
          room.holdingFixMap.delete(hid);
        }
      }

      updateRoomBots(room, dt);
      if (room.phase !== 'playing') continue;

      for (const bp of room.players.values()) {
        if (bp.isBot && bp.alive && !bp.inVent && !bp.vehicleId && (bp.y ?? 0) < 0.8) {
          const pv = resolvePedestrianVehicleCollision(bp.x, bp.z, PLAYER_RADIUS, room.vehicles);
          bp.x = pv.x;
          bp.z = pv.z;
        }
      }

      const sabStep = advanceSabotageState(
        room.sabotage,
        Array.from(room.players.values()),
        dt,
        room.holdingFixMap,
      );
      if (sabStep.fixed) {
        room.holdingFixMap.clear();
        broadcastRoom(room, { type: 'sfx:event', kind: 'task' });
      } else if (sabStep.expiredCritical) {
        room.holdingFixMap.clear();
        checkAndApplyWinCondition(room, true);
        continue;
      } else if (sabStep.expiredNonCriticalType) {
        room.holdingFixMap.clear();
        pushSystemChat(
          room,
          sabStep.expiredNonCriticalType === 'loadshedding'
            ? 'কারেন্ট এসেছে! বিদ্যুৎ সংযোগ নিজেই ঠিক হয়ে গেছে!'
            : 'ওয়াই-ফাই এসেছে! ডিশ সংযোগ আবার চালু হয়েছে!',
        );
      }
      broadcastRoom(room);
    } else if (room.phase === 'meeting') {
      updateRoomBots(room, dt);
      if (room.discussionTimer > 0) {
        room.discussionTimer = Math.max(0, room.discussionTimer - dt);
        broadcastRoom(room);
      } else {
        room.meetingTimer -= dt;
        const alivePlayers = Array.from(room.players.values()).filter((p) => p.alive);
        if (room.meetingTimer <= 1.2) {
          for (const p of alivePlayers) {
            if (p.isBot && !p.hasVoted) {
              p.hasVoted = true;
              p.votedFor = 'skip';
            }
          }
        }
        const allVoted = alivePlayers.length === 0 || alivePlayers.every((p) => p.hasVoted);
        if (allVoted || room.meetingTimer <= 0) {
          resolveMeetingVotes(room);
        } else {
          broadcastRoom(room);
        }
      }
    } else if (room.phase === 'vote_results') {
      room.phaseTimer -= dt;
      if (room.phaseTimer <= 0) {
        room.justEjectedPlayer = null;
        if (room.ejection?.ejectedId) {
          const ejected = room.players.get(room.ejection.ejectedId);
          if (ejected) {
            dismountPlayerFromVehicle(ejected, room.vehicles, room.doorLocks, false);
            ejected.alive = false;
            room.justEjectedPlayer = ejected;
            handleRoomDeathSideEffects(room, ejected);
          }
        }
        room.bodies = [];
        room.phase = 'ejecting';
        room.phaseTimer = room.ejection?.reason === 'voted' ? 7.5 : 5.0;
        if (room.ejection?.reason === 'voted' && room.ejection.ejectedId) {
          broadcastRoom(room, { type: 'sfx:event', kind: 'eject' });
        }
        broadcastRoom(room);
      }
    } else if (room.phase === 'ejecting') {
      room.phaseTimer -= dt;
      if (room.phaseTimer <= 0) {
        if (!checkAndApplyWinCondition(room)) {
          room.justEjectedPlayer = null;
          let idx = 0;
          for (const p of room.players.values()) {
            const sp = SPAWN_RING[idx % SPAWN_RING.length];
            p.x = sp.x;
            p.z = sp.z;
            p.y = 0;
            p.yaw = sp.yaw;
            p.hasVoted = false;
            p.votedFor = null;
            if (p.role === 'vondo') {
              p.killCooldownRemaining = room.settings.killCooldownSec;
            }
            if (p.specialRole === 'chandabaz') {
              p.abilityCooldown = Math.max(p.abilityCooldown, 14);
            }
            idx++;
          }
          room.emergencyCooldownRemaining = room.settings.emergencyCooldownSec;
          room.phase = 'playing';
          broadcastRoom(room);
        }
      }
    }
  }
}, TICK_RATE_MS);

function handleSocketMessage(ws: WebSocket, raw: string): void {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw) as ClientMessage;
  } catch {
    return;
  }

  if (msg.type === 'room:list') {
    const list: PublicRoomSummary[] = [];
    for (const r of rooms.values()) {
      if (r.clients.size === 0) continue;
      const host = Array.from(r.players.values()).find((p) => p.isHost);
      list.push({
        roomCode: r.code,
        playerCount: r.players.size,
        maxPlayers: MAX_PLAYERS,
        phase: r.phase,
        hostName: host?.name ?? 'হোস্ট',
      });
    }
    sendToSocket(ws, { type: 'room:list_result', rooms: list });
    return;
  }

  if (msg.type === 'room:create' || msg.type === 'room:join') {
    const prev = socketToPlayer.get(ws);
    if (prev) {
      socketToPlayer.delete(ws);
      const oldRoom = rooms.get(prev.roomCode);
      if (oldRoom) {
        removeRoomPlayer(oldRoom, prev.playerId, true);
      }
    }

    let room: RoomInternal | undefined;
    if (msg.type === 'room:create') {
      const code = generateRoomCode();
      room = createEmptyRoom(code);
      rooms.set(code, room);
    } else {
      const code = msg.roomCode.trim().toUpperCase();
      room = rooms.get(code);
      if (!room) {
        sendToSocket(ws, { type: 'room:error', message: `এই কোডে কোনো রুম পাওয়া যায়নি (${code})।` });
        return;
      }
      pruneExpiredReconnectSlots(room);
      const token = msg.reconnectToken;
      if (token && room.disconnectedSlots.has(token)) {
        const reserved = room.disconnectedSlots.get(token)!;
        room.disconnectedSlots.delete(token);
        const existingNames = Array.from(room.players.values()).map((p) => p.name);
        const restored: PlayerState = {
          ...reserved.player,
          isHost: false,
          ready: room.phase === 'lobby' ? false : reserved.player.ready,
          name: sanitizePlayerName(reserved.player.name, existingNames),
          color: pickAvailableColor(room, reserved.player.color),
          tasks: reserved.player.tasks.map((t) => ({ ...t })),
        };
        room.players.set(restored.id, restored);
        room.clients.set(restored.id, ws);
        room.playerReconnectTokens.set(restored.id, token);
        socketToPlayer.set(ws, { roomCode: room.code, playerId: restored.id });
        sendToSocket(ws, {
          type: 'room:joined',
          playerId: restored.id,
          snapshot: redactSnapshotForPlayer(buildSnapshot(room), restored.id),
          reconnectToken: token,
        });
        broadcastRoom(room, { type: 'sfx:event', kind: 'lobby_join' });
        broadcastRoom(room);
        return;
      }
      if (room.phase !== 'lobby' || room.lobbyCountdownSec !== null) {
        sendToSocket(ws, { type: 'room:error', message: 'খেলা শুরু হয়ে গেছে! ম্যাচ এখন চলছে।' });
        return;
      }
      if (room.players.size + room.disconnectedSlots.size >= MAX_PLAYERS) {
        sendToSocket(ws, { type: 'room:error', message: `রুম ভর্তি! সর্বোচ্চ ${MAX_PLAYERS} জন খেলতে পারবে।` });
        return;
      }
    }

    const playerId = `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const issuedToken = `rc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const sp = SPAWN_RING[room.players.size % SPAWN_RING.length];
    const resolvedIdentity = resolveUniqueMultiplayerIdentity(
      msg.name,
      msg.color,
      Array.from(room.players.values()),
    );
    const existingNames = Array.from(room.players.values()).map((p) => p.name);
    const uniqueName = sanitizePlayerName(resolvedIdentity.name, existingNames);
    const isHost = room.players.size === 0;

    const player: PlayerState = makeDefaultPlayerState({
      id: playerId,
      name: uniqueName,
      color: pickAvailableColor(room, resolvedIdentity.color),
      x: sp.x,
      z: sp.z,
      yaw: sp.yaw,
      isBot: false,
      isHost,
      ready: isHost,
      emergencyMeetingsLeft: room.settings.emergencyMeetingsPerPlayer,
    });

    room.players.set(playerId, player);
    room.clients.set(playerId, ws);
    room.playerReconnectTokens.set(playerId, issuedToken);
    socketToPlayer.set(ws, { roomCode: room.code, playerId });

    sendToSocket(ws, {
      type: 'room:joined',
      playerId,
      snapshot: redactSnapshotForPlayer(buildSnapshot(room), playerId),
      reconnectToken: issuedToken,
    });
    if (!isHost) {
      broadcastRoom(room, { type: 'sfx:event', kind: 'lobby_join' });
    }
    broadcastRoom(room);
    return;
  }

  const ref = socketToPlayer.get(ws);
  if (!ref) return;
  const room = rooms.get(ref.roomCode);
  if (!room) return;
  const player = room.players.get(ref.playerId);
  if (!player) return;

  if (msg.type === 'room:leave') {
    socketToPlayer.delete(ws);
    removeRoomPlayer(room, ref.playerId, true);
    return;
  }

  switch (msg.type) {
    case 'lobby:settings': {
      if (!player.isHost || room.phase !== 'lobby') return;
      const sanitized = sanitizeSoloConfig(
        Math.max(MIN_MATCH_PLAYERS, room.players.size),
        { ...room.settings, ...msg.settings },
      );
      room.settings = sanitized.settings;
      broadcastRoom(room);
      break;
    }
    case 'lobby:customize': {
      if (room.phase !== 'lobby') return;
      if (typeof msg.name === 'string') {
        const otherNames = Array.from(room.players.values())
          .filter((p) => p.id !== player.id)
          .map((p) => p.name);
        player.name = sanitizePlayerName(msg.name, otherNames);
      }
      if (
        msg.color &&
        !Array.from(room.players.values()).some((p) => p.id !== player.id && p.color === msg.color)
      ) {
        player.color = msg.color;
      }
      broadcastRoom(room);
      break;
    }
    case 'lobby:ready': {
      if (room.phase !== 'lobby' || player.isHost || player.isBot) return;
      player.ready = Boolean(msg.ready);
      if (!player.ready) {
        cancelRoomLobbyCountdown(room);
      }
      broadcastRoom(room, { type: 'sfx:event', kind: 'lobby_ready' });
      broadcastRoom(room);
      break;
    }
    case 'lobby:kick': {
      if (!player.isHost || room.phase !== 'lobby') return;
      const target = room.players.get(msg.targetPlayerId);
      if (!target || target.id === player.id) return;
      if (target.isBot) {
        room.players.delete(target.id);
      } else {
        const targetWs = room.clients.get(target.id);
        if (targetWs) {
          sendToSocket(targetWs, {
            type: 'room:kicked',
            message: 'হোস্ট তোমাকে রুম থেকে বের করে দিয়েছে।',
          });
          socketToPlayer.delete(targetWs);
        }
        room.clients.delete(target.id);
        room.playerReconnectTokens.delete(target.id);
        room.players.delete(target.id);
      }
      if (!canStartLobbyMatch(Array.from(room.players.values())).ok) {
        cancelRoomLobbyCountdown(room);
      }
      broadcastRoom(room);
      break;
    }
    case 'lobby:chat': {
      if (room.phase !== 'lobby') return;
      const now = Date.now();
      const prevAt = room.lastLobbyChatAt.get(player.id) ?? 0;
      if (now - prevAt < 500) return;
      const clean = msg.text.trim().slice(0, LOBBY_CHAT_MAX_CHARS);
      if (!clean) return;
      room.lastLobbyChatAt.set(player.id, now);
      room.lobbyChat.push({
        id: `lchat_${now}_${Math.random().toString(36).slice(2, 5)}`,
        senderId: player.id,
        senderName: player.name,
        senderColor: player.color,
        text: clean,
        timestamp: now,
      });
      if (room.lobbyChat.length > 40) {
        room.lobbyChat = room.lobbyChat.slice(-40);
      }
      broadcastRoom(room);
      break;
    }
    case 'lobby:add_bot': {
      if (!player.isHost || room.phase !== 'lobby' || room.players.size >= MAX_PLAYERS) return;
      if (spawnRoomBot(room)) {
        broadcastRoom(room, { type: 'sfx:event', kind: 'lobby_join' });
        broadcastRoom(room);
      }
      break;
    }
    case 'lobby:remove_bot': {
      if (!player.isHost || room.phase !== 'lobby') return;
      let removed = false;
      if (msg.targetPlayerId) {
        const target = room.players.get(msg.targetPlayerId);
        if (target?.isBot) {
          room.players.delete(target.id);
          removed = true;
        }
      } else {
        const bots = Array.from(room.players.values()).filter((p) => p.isBot);
        const last = bots.at(-1);
        if (last) {
          room.players.delete(last.id);
          removed = true;
        }
      }
      if (removed) {
        if (!canStartLobbyMatch(Array.from(room.players.values())).ok) {
          cancelRoomLobbyCountdown(room);
        }
        broadcastRoom(room);
      }
      break;
    }
    case 'lobby:remove_bots': {
      if (!player.isHost || room.phase !== 'lobby') return;
      for (const [id, pl] of room.players.entries()) {
        if (pl.isBot) room.players.delete(id);
      }
      cancelRoomLobbyCountdown(room);
      broadcastRoom(room);
      break;
    }
    case 'lobby:start': {
      if (!player.isHost || room.phase !== 'lobby') return;
      const check = canStartLobbyMatch(Array.from(room.players.values()));
      if (!check.ok) {
        sendToSocket(ws, {
          type: 'room:error',
          message: check.reason ?? `আরও খেলোয়াড় লাগবে (কমপক্ষে ${MIN_MATCH_PLAYERS} জন)!`,
        });
        return;
      }
      if (room.lobbyCountdownSec === null) {
        room.lobbyCountdownSec = 5;
        room.lobbyCountdownTimer = 5.0;
        broadcastRoom(room, { type: 'sfx:event', kind: 'lobby_tick' });
        broadcastRoom(room);
      }
      break;
    }
    case 'lobby:cancel_start': {
      if (!player.isHost || room.phase !== 'lobby') return;
      cancelRoomLobbyCountdown(room);
      broadcastRoom(room);
      break;
    }
    case 'player:move': {
      if (room.phase !== 'playing' && room.phase !== 'lobby') return;
      if (player.inVent || player.vehicleId) return;
      const prevY = player.y ?? 0;
      let resolved = player.alive
        ? resolvePlayerMoveWithElevation(
            player.x,
            player.z,
            msg.y ?? prevY,
            msg.x,
            msg.z,
            PLAYER_RADIUS,
            WALLS,
            room.doorLocks,
          )
        : { x: msg.x, z: msg.z, y: msg.y ?? prevY };
      if (player.alive && (resolved.y ?? 0) < 0.8) {
        const pv = resolvePedestrianVehicleCollision(resolved.x, resolved.z, PLAYER_RADIUS, room.vehicles);
        resolved = { ...resolved, x: pv.x, z: pv.z };
      }
      const moved = Math.hypot(resolved.x - player.x, resolved.z - player.z);
      player.x = resolved.x;
      player.z = resolved.z;
      player.y = resolved.y;
      player.vx = msg.vx;
      player.vz = msg.vz;
      player.yaw = msg.yaw;
      if (room.phase === 'playing') {
        recordFootprint(room, player, moved);
      } else if (room.phase === 'lobby') {
        broadcastRoom(room);
      }
      break;
    }
    case 'player:vehicle_toggle': {
      if ((room.phase !== 'playing' && room.phase !== 'lobby') || !player.alive || player.inVent) return;
      if (player.vehicleId) {
        dismountPlayerFromVehicle(player, room.vehicles, room.doorLocks, true);
        broadcastRoom(room);
        return;
      }
      if ((player.y ?? 0) > 1.2) return;
      const target = msg.vehicleId
        ? room.vehicles.find(
            (v) => v.id === msg.vehicleId && !v.driverId && distance2D(player.x, player.z, v.x, v.z) <= 5.5,
          )
        : findNearestAvailableVehicle(player.x, player.z, room.vehicles);
      if (!target) return;
      player.vehicleId = target.id;
      player.watchingCams = false;
      player.jharuTargetBodyId = null;
      player.jharuTimer = 0;
      room.holdingFixMap.delete(player.id);
      target.driverId = player.id;
      target.speed = 0;
      target.vx = 0;
      target.vz = 0;
      target.steer = 0;
      player.x = target.x;
      player.z = target.z;
      player.y = 0;
      player.vx = 0;
      player.vz = 0;
      player.yaw = target.yaw;
      broadcastRoom(room);
      break;
    }
    case 'player:vehicle_drive': {
      if ((room.phase !== 'playing' && room.phase !== 'lobby') || !player.alive || !player.vehicleId) return;
      if (msg.vehicleId !== player.vehicleId) return;
      const v = room.vehicles.find((item) => item.id === player.vehicleId && item.driverId === player.id);
      if (!v) return;
      const spec = VEHICLE_SPECS[v.kind];
      const resolved = resolveVehicleCollision(
        msg.x,
        msg.z,
        spec.collisionRadius,
        room.vehicles,
        v.id,
        room.doorLocks,
      );
      v.x = resolved.x;
      v.z = resolved.z;
      v.yaw = msg.yaw;
      const maxAllowed = spec.maxSpeed * 1.35;
      v.speed = Math.max(-spec.reverseSpeed * 1.2, Math.min(maxAllowed, msg.speed));
      v.vx = msg.vx;
      v.vz = msg.vz;
      v.steer = Math.max(-1, Math.min(1, msg.steer));
      player.x = v.x;
      player.z = v.z;
      player.y = 0;
      player.yaw = msg.yaw;
      player.vx = msg.vx;
      player.vz = msg.vz;
      if (room.phase === 'lobby') {
        broadcastRoom(room);
      }
      break;
    }
    case 'player:vehicle_horn': {
      if ((room.phase !== 'playing' && room.phase !== 'lobby') || !player.alive || !player.vehicleId) return;
      const v = room.vehicles.find((item) => item.id === player.vehicleId);
      if (v) {
        broadcastRoom(room, { type: 'sfx:event', kind: 'vehicle_horn', vehicleKind: v.kind });
      }
      break;
    }
    case 'player:visual_task_start': {
      if (
        room.phase !== 'playing' ||
        !room.settings.visualTasks ||
        player.role !== 'parabasi' ||
        isNeutralRole(player.specialRole)
      ) {
        return;
      }
      player.visualTaskTimer = 3.0;
      broadcastRoom(room);
      break;
    }
    case 'player:task_complete': {
      if (room.phase !== 'playing') return;
      if (isTaskLockedBySabotage(msg.taskId, room.sabotage)) return;
      const station = TASK_STATIONS.find((s) => s.id === msg.taskId);
      if (!station || distance2D(player.x, player.z, station.x, station.z) > station.radius + 1.5) return;
      const taskItem = player.tasks.find((t) => t.taskId === msg.taskId);
      if (taskItem && !taskItem.completed) {
        taskItem.completed = true;
        if (canCompleteTasks(player) && !taskItem.isFake && station.isVisual && room.settings.visualTasks) {
          player.visualTaskTimer = 2.6;
        }
        sendToSocket(ws, { type: 'sfx:event', kind: 'task' });
        if (!checkAndApplyWinCondition(room)) {
          broadcastRoom(room);
        }
      }
      break;
    }
    case 'player:use_ability': {
      if (room.phase !== 'playing') return;
      if (!player.alive) {
        if ((player.pranksLeft ?? 0) <= 0) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'ল্যাম্প প্র্যাঙ্ক শেষ',
            detail: 'এই রাউন্ডে ল্যাম্প প্র্যাঙ্ক শেষ — পরের সালিশের পর আবার পারবে!',
          });
          return;
        }
        player.pranksLeft = 0;
        room.prankedLampUntil = Date.now() + 3500;
        broadcastRoom(room, { type: 'sfx:event', kind: 'prank' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'মহল্লার বাতি ঝিকমিক!',
          detail: 'ভূতের মজার প্র্যাঙ্ক — রাস্তার বাতি ৩.৫ সেকেন্ড ঝিকমিক করছে!',
        });
        broadcastRoom(room);
        return;
      }
      if (player.inVent) return;
      if (player.specialRole === 'goyenda') {
        const scan = executeGoyendaScan(player, room.bodies, Date.now());
        if (!scan.ok) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'গোয়েন্দা স্ক্যানার',
            detail:
              scan.reason === 'no_scans_left'
                ? 'সব ফরেনসিক স্ক্যান (২/২) শেষ হয়ে গেছে!'
                : 'ফরেনসিক সূত্র স্ক্যান করতে পড়ে থাকা প্রতিবেশীর লাশের কাছে যাও।',
          });
          return;
        }
        sendToSocket(ws, { type: 'sfx:event', kind: 'clue' });
        sendToSocket(ws, { type: 'clue:result', title: scan.clue!.title, detail: scan.clue!.detail });
        broadcastRoom(room);
        return;
      }
      if (player.specialRole === 'kobiraj') {
        if (player.abilityCooldown > 0.05) return;
        const nearby = msg.targetId
          ? room.players.get(msg.targetId)
          : findNearestShieldTarget(player, Array.from(room.players.values()));
        const receiver =
          nearby && nearby.alive && !nearby.inVent ? nearby : !player.shielded ? player : null;
        if (!receiver) return;
        receiver.shielded = true;
        player.abilityCooldown = KOBIRAJ_COOLDOWN_SEC;
        sendToSocket(ws, { type: 'sfx:event', kind: 'shield' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'তাবিজের সুরক্ষা চালু',
          detail:
            receiver.id === player.id
              ? 'নিজের গায়ে সুরক্ষার তাবিজ পরে নিয়েছ!'
              : `${receiver.name}-কে কবিরাজের তাবিজ দিয়ে সুরক্ষা দিয়েছ!`,
        });
        broadcastRoom(room);
        return;
      }
      if (player.specialRole === 'bohurupi') {
        if (player.disguiseTimer > 0 && (!msg.targetId || msg.targetId === player.id)) {
          player.disguiseColor = null;
          player.disguiseName = null;
          player.disguiseTimer = 0;
          broadcastRoom(room, { type: 'sfx:event', kind: 'disguise' });
          broadcastRoom(room);
          return;
        }
        if (player.abilityCooldown > 0.05) return;
        const candidates = Array.from(room.players.values()).filter(
          (p) => p.alive && p.id !== player.id && p.role !== 'vondo',
        );
        const chosen =
          (msg.targetId ? candidates.find((c) => c.id === msg.targetId) : candidates[0]) ?? candidates[0];
        if (!chosen) return;
        player.disguiseColor = chosen.color;
        player.disguiseName = chosen.name;
        player.disguiseTimer = BOHURUPI_DISGUISE_DURATION_SEC;
        player.abilityCooldown = BOHURUPI_COOLDOWN_SEC;
        broadcastRoom(room, { type: 'sfx:event', kind: 'disguise' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'বহুরূপী ছদ্মবেশ',
          detail: `${BOHURUPI_DISGUISE_DURATION_SEC} সেকেন্ডের জন্য ${chosen.name}-এর বেশ ধরেছ!`,
        });
        broadcastRoom(room);
        return;
      }
      if (player.specialRole === 'daroga') {
        if ((player.shotsLeft ?? 1) <= 0) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'পাড়ার দারোগা',
            detail: 'তোমার ১টি দারোগার গুলি আগেই ব্যবহার হয়ে গেছে!',
          });
          return;
        }
        if (player.abilityCooldown > 0.05) return;
        const target = msg.targetId
          ? room.players.get(msg.targetId)
          : findNearestDarogaTarget(player, Array.from(room.players.values()));
        if (!target) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'পাড়ার দারোগা',
            detail: 'গুলি চালাতে সন্দেহভাজনের একদম কাছে যাও!',
          });
          return;
        }
        const res = resolveDarogaShot(player, target);
        if (!res.allowed) return;
        player.shotsLeft = Math.max(0, (player.shotsLeft ?? 1) - 1);
        broadcastRoom(room, { type: 'sfx:event', kind: 'daroga' });
        if (res.hitVondo) {
          dismountPlayerFromVehicle(target, room.vehicles, room.doorLocks, false);
          target.alive = false;
          target.watchingCams = false;
          player.abilityCooldown = DAROGA_COOLDOWN_SEC;
          room.bodies.push({
            id: `body_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            victimId: target.id,
            victimName: target.name,
            color: target.color,
            x: target.x,
            z: target.z,
            reported: false,
            killedAt: Date.now(),
            killerColorHint: getColorShadeHint(player.color),
            killerZoneHint: getBanglaZoneNameAt(target.x, target.z),
          });
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'দারোগার নিখুঁত নিশানা!',
            detail: `${target.name} ছিল আসল বাটপার! একেবারে সাইজ করে দিয়েছ!`,
          });
        } else {
          dismountPlayerFromVehicle(player, room.vehicles, room.doorLocks, false);
          player.alive = false;
          player.watchingCams = false;
          room.bodies.push({
            id: `body_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            victimId: player.id,
            victimName: player.name,
            color: player.color,
            x: player.x,
            z: player.z,
            reported: false,
            killedAt: Date.now(),
            killerColorHint: getColorShadeHint(player.color),
            killerZoneHint: getBanglaZoneNameAt(player.x, player.z),
          });
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'দারোগার ভুল গুলি!',
            detail: `${target.name} নিরপরাধ পাড়াবাসী ছিল! উল্টো তোমার চাকরি চলে গেল!`,
          });
        }
        handleRoomDeathSideEffects(room, res.hitVondo ? target : player);
        if (!checkAndApplyWinCondition(room)) {
          broadcastRoom(room);
        }
        return;
      }
      if (player.specialRole === 'daktar') {
        if ((player.revivesLeft ?? 0) <= 0) return;
        const body = findNearestRevivableBody(player, room.bodies);
        if (!body) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'পাড়ার ডাক্তার',
            detail: 'স্যালাইন দিতে রিপোর্ট না হওয়া লাশের কাছে যাও!',
          });
          return;
        }
        const victim = room.players.get(body.victimId);
        if (!victim) return;
        room.bodies = room.bodies.filter((b) => b.id !== body.id);
        victim.alive = true;
        victim.x = body.x;
        victim.z = body.z;
        player.revivesLeft = Math.max(0, (player.revivesLeft ?? 1) - 1);
        player.abilityCooldown = 10;
        broadcastRoom(room, { type: 'sfx:event', kind: 'revive' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'স্যালাইনে জীবন বাঁচলো!',
          detail: `পাড়ার ডাক্তার ${victim.name}-কে বাঁচিয়ে তুলেছেন!`,
        });
        broadcastRoom(room);
        return;
      }
      if (player.specialRole === 'jharudar') {
        if ((player.cleansLeft ?? JHARUDAR_CLEAN_USES) <= 0) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'সাফাই বাটপার',
            detail: 'সব সাফাই (৩/৩) ব্যবহার হয়ে গেছে!',
          });
          return;
        }
        if (player.abilityCooldown > 0.05) return;
        const body = findNearestCleanableBody(player, room.bodies);
        if (!body) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'সাফাই বাটপার',
            detail: 'সাফ করতে রিপোর্ট না হওয়া লাশের কাছে যাও!',
          });
          return;
        }
        player.jharuTargetBodyId = body.id;
        player.jharuTimer = JHARUDAR_CLEAN_CHANNEL_SEC;
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'ঝাড়ু দেওয়া হচ্ছে...',
          detail: `লাশ সরাতে ${body.victimName}-এর পাশে ২ সেকেন্ড স্থির হয়ে দাঁড়াও!`,
        });
        broadcastRoom(room);
        return;
      }
      if (player.specialRole === 'ghotok_khala') {
        if (room.ghotokLinkedIds) {
          const [aId, bId] = room.ghotokLinkedIds;
          const aName = room.players.get(aId)?.name ?? 'প্রথম জন';
          const bName = room.players.get(bId)?.name ?? 'দ্বিতীয় জন';
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'ঘটকের জুটি চালু',
            detail: `${aName} ও ${bName} আগে থেকেই জুটি বাঁধা!`,
          });
          return;
        }
        const pair = findGhotokPairCandidates(player, Array.from(room.players.values()));
        if (!pair) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'ঘটক খালা',
            detail: 'জুটি বাঁধতে ২ জন প্রতিবেশীর কাছে যাও!',
          });
          return;
        }
        room.ghotokLinkedIds = [pair[0].id, pair[1].id];
        pair[0].ghotokPartnerId = pair[1].id;
        pair[1].ghotokPartnerId = pair[0].id;
        sendToSocket(ws, { type: 'sfx:event', kind: 'clue' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'মহল্লা জুটি বাঁধা হয়েছে!',
          detail: `${pair[0].name} ও ${pair[1].name} জুটি হয়েছে — একজন মরলে আরেকজন খবর পাবে!`,
        });
        const p0Ws = room.clients.get(pair[0].id);
        if (p0Ws) {
          sendToSocket(p0Ws, {
            type: 'clue:result',
            title: 'ঘটক জুটি!',
            detail: `ঘটক খালা তোমাকে ${pair[1].name}-এর সাথে জুটি করে দিয়েছে!`,
          });
        }
        if (pair[1].id !== player.id) {
          const p1Ws = room.clients.get(pair[1].id);
          if (p1Ws) {
            sendToSocket(p1Ws, {
              type: 'clue:result',
              title: 'ঘটক জুটি!',
              detail: `ঘটক খালা তোমাকে ${pair[0].name}-এর সাথে জুটি করে দিয়েছে!`,
            });
          }
        }
        broadcastRoom(room);
        return;
      }
      if (player.specialRole === 'master_moshai') {
        if (player.abilityCooldown > 0.05) return;
        const target = msg.targetId
          ? room.players.get(msg.targetId)
          : findNearestMasterTarget(player, Array.from(room.players.values()));
        if (!target) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'মাস্টার মশাই',
            detail: 'খাতা পরীক্ষা করতে প্রতিবেশীর কাছে যাও!',
          });
          return;
        }
        const res = inspectPlayerTaskAuthenticity(target);
        player.abilityCooldown = MASTER_COOLDOWN_SEC;
        sendToSocket(ws, { type: 'sfx:event', kind: 'clue' });
        sendToSocket(ws, { type: 'clue:result', title: res.title, detail: res.detail });
        broadcastRoom(room);
        return;
      }
      if (player.specialRole === 'cctv_kaku') {
        if (player.abilityCooldown > 0.05) return;
        player.watchingCams = true;
        player.abilityCooldown = CCTV_KAKU_COOLDOWN_SEC;
        sendToSocket(ws, { type: 'sfx:event', kind: 'clue' });
        broadcastRoom(room);
        return;
      }
      if (player.specialRole === 'hatur_daktar') {
        if (player.abilityCooldown > 0.05) return;
        const nowMs = Date.now();
        const allPlayers = Array.from(room.players.values());
        const nearby = msg.targetId
          ? room.players.get(msg.targetId)
          : findNearestHaturTarget(player, allPlayers, nowMs);
        const receiver =
          nearby && nearby.alive && !nearby.inVent
            ? nearby
            : (player.haturProtectedUntil ?? 0) <= nowMs
              ? player
              : null;
        if (!receiver) return;
        receiver.haturProtectedUntil = nowMs + HATUR_DURATION_MS;
        player.abilityCooldown = HATUR_COOLDOWN_SEC;
        sendToSocket(ws, { type: 'sfx:event', kind: 'shield' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'ঝাঁঝালো ইনজেকশন চালু!',
          detail:
            receiver.id === player.id
              ? 'নিজেকে ইনজেকশন দিয়েছ! ১২ সেকেন্ড বাটপারের আঘাত থেকে নিরাপদ!'
              : `${receiver.name}-কে ইনজেকশন দিয়েছ — ১২ সেকেন্ড মৃত্যুর হাত থেকে সুরক্ষা চালু!`,
        });
        broadcastRoom(room);
        return;
      }
      if (player.specialRole === 'supari_killer') {
        if (player.abilityCooldown > 0.05) return;
        const nextTarget = pickSupariContractTarget(
          player,
          Array.from(room.players.values()),
          player.supariTargetId,
        );
        if (!nextTarget) return;
        player.supariTargetId = nextTarget.id;
        player.abilityCooldown = SUPARI_COOLDOWN_SEC;
        sendToSocket(ws, { type: 'sfx:event', kind: 'clue' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'নতুন সুপারি কন্ট্রাক্ট!',
          detail: `টার্গেট: ${nextTarget.name} — ৫০% কিল কুলডাউন কমবে!`,
        });
        broadcastRoom(room);
        return;
      }
      if (player.specialRole === 'dalal') {
        if (player.abilityCooldown > 0.05) return;
        const res = applyDalalBrokerJam(room.doorLocks);
        room.commsJammedUntil = Date.now() + DALAL_JAM_DURATION_MS;
        player.abilityCooldown = DALAL_COOLDOWN_SEC;
        broadcastRoom(room, { type: 'sfx:event', kind: 'door' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'দালালের জ্যাম চালু!',
          detail: `যোগাযোগ ১০ সেকেন্ড জ্যাম! ${res.newlyLockedZone ? `${res.newlyLockedZone} শাটার বন্ধ করা হয়েছে!` : 'শাটার +৮ সেকেন্ড বাড়ানো হয়েছে!'}`,
        });
        broadcastRoom(room);
        return;
      }
      if (player.specialRole === 'chamcha') {
        if (player.abilityCooldown > 0.05) return;
        const patron = findNearestChamchaPatron(player, Array.from(room.players.values()));
        if (!patron) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'চামচা সাগরেদ',
            detail: 'বস ঠিক করতে কারো একদম কাছে যাও!',
          });
          return;
        }
        player.chamchaPatronId = patron.id;
        player.abilityCooldown = CHAMCHA_COOLDOWN_SEC;
        sendToSocket(ws, { type: 'sfx:event', kind: 'clue' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'বস ঠিক হয়েছে!',
          detail: `${patron.name} এখন তোমার বস!`,
        });
        broadcastRoom(room);
        return;
      }
      if (player.specialRole === 'chandabaz') {
        if (player.abilityCooldown > 0.05) return;
        if (isCriticalSabotage(room.sabotage.active)) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'গ্যাস লিক চলছে!',
            detail: 'জরুরি নাশকতার সময় চাঁদা তোলা যাবে না — আগে গ্যাস সামলাও!',
          });
          return;
        }
        const allPlayers = Array.from(room.players.values());
        const target = findNearestChandabazTarget(player, allPlayers);
        if (!target) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'চাঁদাবাজ',
            detail: 'চাঁদা তুলতে নতুন কোনো প্রতিবেশীর একদম কাছে যাও!',
          });
          return;
        }
        const res = collectChandaFromTarget(player, target, allPlayers);
        if (!res.ok) return;
        player.abilityCooldown = CHANDABAZ_COOLDOWN_SEC;
        notifyBotsOfChandabazExtort(player, target, allPlayers, room.botMemories, room.doorLocks);
        if (!target.isBot) {
          sendToPlayer(room, target.id, {
            type: 'clue:result',
            title: 'চাঁদাবাজ হানা!',
            detail: `${player.name} তোমাকে ভয় দেখিয়ে চাঁদা নিয়েছে — সালিশে সবাইকে জানাও!`,
          });
        }
        for (const pl of allPlayers) {
          if (
            !pl.isBot &&
            pl.alive &&
            pl.id !== player.id &&
            pl.id !== target.id &&
            distance2D(pl.x, pl.z, player.x, player.z) <= CHANDABAZ_WITNESS_RANGE &&
            hasLineOfSight(pl.x, pl.z, player.x, player.z, WALLS, room.doorLocks)
          ) {
            sendToPlayer(room, pl.id, {
              type: 'clue:result',
              title: 'চাঁদাবাজির সাক্ষী!',
              detail: `${player.name} এইমাত্র ${target.name}-এর কাছ থেকে চাঁদা নিচ্ছে!`,
            });
          }
        }
        sendToSocket(ws, { type: 'sfx:event', kind: 'task' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: `চাঁদা উসুল (${countAliveChandabazTargets(player, allPlayers)}/${getChandabazGoal(player, allPlayers)})!`,
          detail: `${target.name}-এর কাছ থেকে চাঁদা আদায় করা হয়েছে — বাকি সবাই বেঁচে থাকা অবস্থায় শেষ করো!`,
        });
        if (!checkAndApplyWinCondition(room)) {
          broadcastRoom(room);
        }
        return;
      }
      if (player.specialRole === 'tiktok_star') {
        if (player.abilityCooldown > 0.05) return;
        const zoneId = getZoneIdAt(player.x, player.z);
        const res = recordTiktokReelInZone(player, zoneId);
        if (!res.ok) {
          sendToSocket(ws, {
            type: 'clue:result',
            title: 'টিকটক স্টার',
            detail:
              res.reason === 'already_filmed'
                ? 'এই এলাকায় আগেই রিল বানানো হয়ে গেছে! অন্য এলাকায় যাও!'
                : 'ভাইরাল রিল বানাতে মহল্লার কোনো পরিচিত এলাকা বা দোকানের ভেতর যাও!',
          });
          return;
        }
        player.abilityCooldown = TIKTOK_COOLDOWN_SEC;
        sendToSocket(ws, { type: 'sfx:event', kind: 'disguise' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: `ভাইরাল রিল (${res.zoneCount}/${TIKTOK_ZONE_GOAL})!`,
          detail: `${getBanglaZoneNameAt(player.x, player.z)} এলাকায় শুটিং শেষ! জিততে শেষ ৪ জনে টিকে থাকো!`,
        });
        if (!checkAndApplyWinCondition(room)) {
          broadcastRoom(room);
        }
      }
      break;
    }
    case 'player:kill': {
      if (room.phase !== 'playing') return;
      const target = room.players.get(msg.targetId);
      if (!target) return;
      const check = canExecuteKill(player, target);
      if (!check.allowed) return;
      const nowMs = Date.now();
      if (isPlayerShieldedNow(target, nowMs)) {
        target.shielded = false;
        target.haturProtectedUntil = 0;
        player.killCooldownRemaining = 6;
        broadcastRoom(room, { type: 'sfx:event', kind: 'shield' });
        sendToSocket(ws, {
          type: 'clue:result',
          title: 'সুরক্ষা ভেঙে গেছে!',
          detail: `${target.name} তাবিজ বা ঝাঁঝালো ইনজেকশনে সুরক্ষিত ছিল!`,
        });
        const targetWs = room.clients.get(target.id);
        if (targetWs) {
          sendToSocket(targetWs, {
            type: 'clue:result',
            title: 'সুরক্ষা তোমাকে বাঁচিয়েছে!',
            detail: 'একজন বাটপার হামলা করেছিল, কিন্তু তোমার তাবিজ বা ইনজেকশন বাঁচিয়ে দিয়েছে!',
          });
        }
        broadcastRoom(room);
        return;
      }
      dismountPlayerFromVehicle(target, room.vehicles, room.doorLocks, false);
      target.alive = false;
      target.watchingCams = false;
      const hitSupari = player.specialRole === 'supari_killer' && target.id === player.supariTargetId;
      player.killCooldownRemaining = hitSupari
        ? room.settings.killCooldownSec * 0.5
        : room.settings.killCooldownSec;
      if (player.specialRole === 'supari_killer') {
        player.supariTargetId =
          pickSupariContractTarget(
            player,
            Array.from(room.players.values()),
            player.supariTargetId,
          )?.id ?? null;
      }
      player.x = target.x;
      player.z = target.z;
      room.bodies.push({
        id: `body_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        victimId: target.id,
        victimName: target.name,
        color: target.color,
        x: target.x,
        z: target.z,
        reported: false,
        killedAt: nowMs,
        killerColorHint: getColorShadeHint(player.color),
        killerZoneHint: getBanglaZoneNameAt(target.x, target.z),
      });
      sendToSocket(ws, { type: 'sfx:event', kind: 'kill' });
      if (target.id !== player.id) {
        sendToPlayer(room, target.id, { type: 'sfx:event', kind: 'kill' });
      }
      handleRoomDeathSideEffects(room, target);
      recordKillWitnesses(
        room.botMemories,
        Array.from(room.players.values()),
        player,
        target,
        room.sabotage.active,
        room.doorLocks,
      );
      if (!checkAndApplyWinCondition(room)) {
        broadcastRoom(room);
      }
      break;
    }
    case 'player:vent_toggle': {
      if (room.phase !== 'playing' || !canUseVent(player)) return;
      const emitVentSfx = () => {
        if (player.specialRole === 'mistri') {
          for (const listener of room.players.values()) {
            if (!listener.isBot && isMistriVentAudibleTo(player, listener)) {
              const lWs = room.clients.get(listener.id);
              if (lWs) sendToSocket(lWs, { type: 'sfx:event', kind: 'vent' });
            }
          }
        } else {
          broadcastRoom(room, { type: 'sfx:event', kind: 'vent' });
        }
      };
      if (!player.inVent) {
        const nearVent = VENTS.find((v) => distance2D(player.x, player.z, v.x, v.z) <= VENT_RANGE);
        if (!nearVent) return;
        player.inVent = true;
        player.x = nearVent.x;
        player.z = nearVent.z;
        emitVentSfx();
      } else if (msg.destinationVentId) {
        const dest = resolveVentHopTarget(player.x, player.z, msg.destinationVentId);
        if (!dest) return;
        player.x = dest.x;
        player.z = dest.z;
        emitVentSfx();
      } else {
        player.inVent = false;
        if (player.specialRole === 'mistri') {
          player.abilityCooldown = MISTRI_VENT_COOLDOWN_SEC;
        }
        emitVentSfx();
      }
      broadcastRoom(room);
      break;
    }
    case 'player:sabotage': {
      if (room.phase !== 'playing' || !player.alive || player.role !== 'vondo') return;
      if (room.sabotage.active || room.sabotage.cooldownRemaining > 0) return;
      room.sabotage = createSabotageState(msg.sabotageType, SABOTAGE_COOLDOWN_SEC);
      room.holdingFixMap.clear();
      broadcastRoom(room, { type: 'sfx:event', kind: 'sabotage' });
      broadcastRoom(room);
      break;
    }
    case 'player:lock_doors': {
      if (room.phase !== 'playing' || !player.alive || player.role !== 'vondo') return;
      if (room.doorLocks.cooldownRemaining > 0) return;
      room.doorLocks[msg.zoneId] = DOOR_LOCK_DURATION_SEC;
      room.doorLocks.cooldownRemaining = DOOR_LOCK_COOLDOWN_SEC;
      broadcastRoom(room, { type: 'sfx:event', kind: 'door' });
      broadcastRoom(room);
      break;
    }
    case 'player:watch_cams': {
      if (room.phase !== 'playing') return;
      player.watchingCams = msg.watching;
      broadcastRoom(room);
      break;
    }
    case 'player:fix_sabotage': {
      if (room.phase !== 'playing' || !player.alive || !room.sabotage.active) {
        room.holdingFixMap.delete(player.id);
        return;
      }
      if (msg.holding === false) {
        room.holdingFixMap.delete(player.id);
        return;
      }
      const range = player.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
      if (room.sabotage.active === 'gas_leak') {
        const nearValve = msg.valveId
          ? GAS_LEAK_VALVES.find((v) => v.id === msg.valveId && distance2D(player.x, player.z, v.x, v.z) <= range)
          : findNearestGasValve(player.x, player.z, room.sabotage, range);
        if (nearValve) {
          room.holdingFixMap.set(player.id, { valveId: nearValve.id });
        } else {
          room.holdingFixMap.delete(player.id);
        }
        break;
      }
      if (distance2D(player.x, player.z, room.sabotage.fixStationX, room.sabotage.fixStationZ) <= range) {
        room.holdingFixMap.set(player.id, {});
      } else {
        room.holdingFixMap.delete(player.id);
      }
      break;
    }
    case 'player:report_body': {
      if (room.phase !== 'playing' || !player.alive) return;
      const body = room.bodies.find((b) => b.id === msg.bodyId && !b.reported);
      if (!body) return;
      if (distance2D(player.x, player.z, body.x, body.z) > REPORT_RANGE + 1.0) return;
      if (!hasLineOfSight(player.x, player.z, body.x, body.z, WALLS, room.doorLocks)) return;
      body.reported = true;
      startMeeting(room, player, 'body', body.victimName);
      break;
    }
    case 'player:emergency_meeting': {
      if (
        room.phase !== 'playing' ||
        !player.alive ||
        isCriticalSabotage(room.sabotage.active) ||
        room.emergencyCooldownRemaining > 0 ||
        player.emergencyMeetingsLeft <= 0
      ) {
        return;
      }
      if (distance2D(player.x, player.z, EMERGENCY_BELL_POS.x, EMERGENCY_BELL_POS.z) <= EMERGENCY_BELL_POS.interactRadius) {
        player.emergencyMeetingsLeft--;
        startMeeting(room, player, 'emergency');
      }
      break;
    }
    case 'meeting:chat': {
      if (room.phase !== 'meeting') return;
      const text = msg.text.trim().slice(0, 140);
      if (!text) return;
      room.typingPlayers.delete(player.id);
      const chatMsg: ChatMessage = {
        id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        senderId: player.id,
        senderName: player.alive ? player.name : `${player.name} (ভূত)`,
        senderColor: player.color,
        text,
        timestamp: Date.now(),
        ghostOnly: !player.alive,
      };
      room.chat.push(chatMsg);
      const allPlayers = Array.from(room.players.values());
      processChatMessageForBots({
        msg: chatMsg,
        players: allPlayers,
        brains: room.botMemories,
      });
      if (
        !player.isBot &&
        player.alive &&
        Date.now() - room.lastGeminiReactionAt >= 4000 &&
        allPlayers.some((pl) => pl.isBot && pl.alive)
      ) {
        room.lastGeminiReactionAt = Date.now();
        const epoch = room.meetingEpoch;
        const reactPayload = buildBatchedGeminiMeetingPayload({
          roomCode: room.code,
          players: allPlayers,
          bodies: room.bodies,
          brains: room.botMemories,
          chat: room.chat,
          meetingReason: room.meetingReason,
          meetingCallerId: room.meetingCallerId,
          phase: 'reaction',
        });
        if (reactPayload.bots.length > 0) {
          void generateGeminiBotMeetingChats(reactPayload).then((res) => {
            if (room.phase !== 'meeting' || room.meetingEpoch !== epoch) return;
            if (res.messages.length > 0) {
              applyBatchedGeminiReactionChats({
                replies: res.messages,
                players: Array.from(room.players.values()),
                brains: room.botMemories,
              });
            }
          });
        }
      }
      broadcastRoom(room);
      break;
    }
    case 'meeting:typing': {
      if (room.phase !== 'meeting' || !player.alive) return;
      if (msg.typing) room.typingPlayers.add(player.id);
      else room.typingPlayers.delete(player.id);
      broadcastRoom(room);
      break;
    }
    case 'meeting:vote': {
      if (room.phase !== 'meeting' || room.discussionTimer > 0 || !player.alive || player.hasVoted) {
        return;
      }
      player.votedFor = msg.targetId;
      player.hasVoted = true;
      const alivePlayers = Array.from(room.players.values()).filter((p) => p.alive);
      if (alivePlayers.length === 0 || alivePlayers.every((p) => p.hasVoted)) {
        resolveMeetingVotes(room);
      } else {
        broadcastRoom(room);
      }
      break;
    }
    case 'player:meme_sfx': {
      const allowed = new Set([
        'vine_boom',
        'bonk',
        'sad_trombone',
        'airhorn',
        'dun_dun',
        'chubani',
        'aaho_bhatija',
        'helicopter_milon',
        'gacher_pata',
        'prank_call',
      ]);
      if (allowed.has(msg.memeId)) {
        broadcastRoom(room, { type: 'meme:play', memeId: msg.memeId });
      }
      break;
    }
    case 'room:play_again': {
      if (!player.isHost) return;
      room.phase = 'lobby';
      room.bodies = [];
      room.footprints = [];
      room.footprintAccum.clear();
      room.holdingFixMap.clear();
      room.chat = [];
      room.outcome = null;
      room.ejection = null;
      room.justEjectedPlayer = null;
      room.meetingCallerId = null;
      room.meetingReason = null;
      room.meetingTimer = 0;
      room.discussionTimer = 0;
      room.lobbyCountdownSec = null;
      room.netaRevealedId = null;
      room.prankedLampUntil = 0;
      room.commsJammedUntil = 0;
      room.ghotokLinkedIds = null;
      room.emergencyCooldownRemaining = 0;
      room.vehicles = createInitialVehicles();
      room.sabotage = createEmptySabotageState(SABOTAGE_INITIAL_LOCKOUT_SEC);
      room.doorLocks = makeEmptyDoorLocks();
      let idx = 0;
      for (const p of room.players.values()) {
        const sp = SPAWN_RING[idx % SPAWN_RING.length];
        p.x = sp.x;
        p.z = sp.z;
        p.y = 0;
        p.vx = 0;
        p.vz = 0;
        p.yaw = sp.yaw;
        p.alive = true;
        p.inVent = false;
        p.vehicleId = null;
        p.watchingCams = false;
        p.visualTaskTimer = 0;
        p.abilityCooldown = 0;
        p.shielded = false;
        p.disguiseColor = null;
        p.disguiseName = null;
        p.disguiseTimer = 0;
        p.role = 'parabasi';
        p.specialRole = 'none';
        p.tasks = [];
        p.scansLeft = 0;
        p.shotsLeft = 0;
        p.cleansLeft = 0;
        p.revivesLeft = 0;
        p.pranksLeft = 1;
        p.jharuTargetBodyId = null;
        p.jharuTimer = 0;
        p.haturProtectedUntil = 0;
        p.supariTargetId = null;
        p.chamchaPatronId = null;
        p.chandabazTargets = [];
        p.tiktokZones = [];
        p.ghotokPartnerId = null;
        p.killCooldownRemaining = 0;
        p.emergencyMeetingsLeft = room.settings.emergencyMeetingsPerPlayer;
        p.ready = p.isHost || p.isBot;
        p.hasVoted = false;
        p.votedFor = null;
        idx++;
      }
      broadcastRoom(room);
      break;
    }
  }
}

const MEME_STORAGE_DIR = path.resolve(__dirname, 'server_memes');
const MEME_MANIFEST_PATH = path.join(MEME_STORAGE_DIR, 'manifest.json');

interface ServerMemeRecord {
  slotId: string;
  fileName: string;
  mimeType: string;
  customLabel?: string;
  updatedAt: number;
  hasFile: boolean;
  storedFile?: string;
}

const VALID_MEME_SLOTS = new Set([
  'vine_boom',
  'bonk',
  'sad_trombone',
  'airhorn',
  'dun_dun',
  'chubani',
  'aaho_bhatija',
  'helicopter_milon',
  'gacher_pata',
  'prank_call',
  'event_kill',
  'event_report',
  'event_meeting',
  'event_eject',
  'event_eject_vondo',
  'event_sabotage',
  'event_shield',
  'event_daroga',
  'event_clean',
  'event_revive',
  'event_task',
  'event_vent',
  'event_jump',
  'event_win',
  'event_loss',
]);

function ensureMemeStorageDir(): void {
  if (!fs.existsSync(MEME_STORAGE_DIR)) {
    fs.mkdirSync(MEME_STORAGE_DIR, { recursive: true });
  }
}

function readMemeManifest(): Record<string, ServerMemeRecord> {
  ensureMemeStorageDir();
  if (!fs.existsSync(MEME_MANIFEST_PATH)) return {};
  try {
    const raw = fs.readFileSync(MEME_MANIFEST_PATH, 'utf-8');
    return JSON.parse(raw) as Record<string, ServerMemeRecord>;
  } catch {
    return {};
  }
}

function writeMemeManifest(manifest: Record<string, ServerMemeRecord>): void {
  ensureMemeStorageDir();
  fs.writeFileSync(MEME_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
}

function sanitizeSlotId(raw: string): string | null {
  const clean = raw.trim();
  return VALID_MEME_SLOTS.has(clean) ? clean : null;
}

function checkAdminPin(req: express.Request): boolean {
  const expected = process.env.ADMIN_PASSCODE?.trim();
  if (!expected) return true;
  const provided = String(req.headers['x-admin-passcode'] ?? '').trim();
  return provided === expected;
}

async function bootstrap(): Promise<void> {
  ensureMemeStorageDir();
  const app = express();
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-passcode');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: '8mb' }));
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  const broadcastAllSockets = (msg: ServerMessage) => {
    const raw = JSON.stringify(msg);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  };

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      handleSocketMessage(ws, String(data));
    });
    ws.on('close', () => {
      const ref = socketToPlayer.get(ws);
      socketToPlayer.delete(ws);
      if (!ref) return;
      const room = rooms.get(ref.roomCode);
      if (!room) return;
      removeRoomPlayer(room, ref.playerId, false);
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, mode: 'express', activeRooms: rooms.size });
  });

  app.post('/api/bot-meeting-chat', async (req, res) => {
    const body = (req.body ?? {}) as Partial<BatchedGeminiMeetingPayload>;
    if (!body || !Array.isArray(body.bots)) {
      res.status(400).json({ error: 'Invalid bot meeting payload', messages: [], fallback: true });
      return;
    }
    const payload: BatchedGeminiMeetingPayload = {
      roomCode: typeof body.roomCode === 'string' ? body.roomCode.slice(0, 16) : 'ROOM',
      phase: body.phase === 'reaction' ? 'reaction' : 'opening',
      reason: body.reason === 'body' ? 'body' : body.reason === 'emergency' ? 'emergency' : null,
      callerName: typeof body.callerName === 'string' ? body.callerName.slice(0, 24) : null,
      victimName: typeof body.victimName === 'string' ? body.victimName.slice(0, 24) : null,
      bodyZone: typeof body.bodyZone === 'string' ? body.bodyZone.slice(0, 32) : null,
      aliveNames: Array.isArray(body.aliveNames)
        ? body.aliveNames.slice(0, 20).map((n) => String(n).slice(0, 24))
        : [],
      chatHistory: Array.isArray(body.chatHistory) ? body.chatHistory : [],
      bots: body.bots,
    };
    const out = await generateGeminiBotMeetingChats(payload);
    res.json(out);
  });

  // Server-Side Viral Bangla Meme Audio Endpoints
  app.get('/api/memes', (_req, res) => {
    const manifest = readMemeManifest();
    const publicClips: Record<string, Omit<ServerMemeRecord, 'storedFile'>> = {};
    for (const [k, v] of Object.entries(manifest)) {
      publicClips[k] = {
        slotId: v.slotId,
        fileName: v.fileName,
        mimeType: v.mimeType,
        customLabel: v.customLabel,
        updatedAt: v.updatedAt,
        hasFile: Boolean(v.hasFile && v.storedFile && fs.existsSync(path.join(MEME_STORAGE_DIR, v.storedFile))),
      };
    }
    res.json({
      requiresPin: Boolean(process.env.ADMIN_PASSCODE?.trim()),
      clips: publicClips,
    });
  });

  app.get('/api/memes/file/:slotId', (req, res) => {
    const slotId = sanitizeSlotId(req.params.slotId);
    if (!slotId) {
      res.status(404).json({ error: 'Unknown meme slot' });
      return;
    }
    const manifest = readMemeManifest();
    const entry = manifest[slotId];
    if (!entry?.storedFile) {
      res.status(404).json({ error: 'No audio uploaded for this slot' });
      return;
    }
    const filePath = path.join(MEME_STORAGE_DIR, path.basename(entry.storedFile));
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Audio file missing' });
      return;
    }
    res.setHeader('Content-Type', entry.mimeType || 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(filePath);
  });

  app.post('/api/admin/memes/clear', (req, res) => {
    if (!checkAdminPin(req)) {
      res.status(401).json({ error: 'Invalid Admin Passcode PIN.' });
      return;
    }
    const manifest = readMemeManifest();
    for (const entry of Object.values(manifest)) {
      if (entry.storedFile) {
        const p = path.join(MEME_STORAGE_DIR, path.basename(entry.storedFile));
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      }
    }
    writeMemeManifest({});
    broadcastAllSockets({ type: 'memes:updated', updatedAt: Date.now() });
    res.json({ ok: true });
  });

  app.post('/api/admin/memes/:slotId', (req, res) => {
    if (!checkAdminPin(req)) {
      res.status(401).json({ error: 'Invalid Admin Passcode PIN.' });
      return;
    }
    const slotId = sanitizeSlotId(req.params.slotId);
    if (!slotId) {
      res.status(400).json({ error: 'Invalid meme slot ID.' });
      return;
    }
    const body = (req.body ?? {}) as {
      fileName?: string;
      mimeType?: string;
      customLabel?: string;
      dataBase64?: string;
      labelOnly?: boolean;
    };

    const manifest = readMemeManifest();
    const prev = manifest[slotId];
    const now = Date.now();

    if (body.labelOnly) {
      if (prev) {
        prev.customLabel = body.customLabel ? String(body.customLabel).trim().slice(0, 24) : undefined;
        prev.updatedAt = now;
      } else {
        manifest[slotId] = {
          slotId,
          fileName: '',
          mimeType: '',
          customLabel: body.customLabel ? String(body.customLabel).trim().slice(0, 24) : undefined,
          updatedAt: now,
          hasFile: false,
        };
      }
      writeMemeManifest(manifest);
      broadcastAllSockets({ type: 'memes:updated', updatedAt: now });
      res.json({ ok: true });
      return;
    }

    if (!body.dataBase64 || typeof body.dataBase64 !== 'string') {
      res.status(400).json({ error: 'Missing audio payload.' });
      return;
    }
    const audioBuf = Buffer.from(body.dataBase64, 'base64');
    if (audioBuf.length === 0 || audioBuf.length > 6 * 1024 * 1024) {
      res.status(400).json({ error: 'Audio file must be under 6 MB.' });
      return;
    }

    const storedFile = `${slotId}.bin`;
    fs.writeFileSync(path.join(MEME_STORAGE_DIR, storedFile), audioBuf);
    manifest[slotId] = {
      slotId,
      fileName: String(body.fileName || `${slotId}.mp3`).slice(0, 80),
      mimeType: String(body.mimeType || 'audio/mpeg').slice(0, 60),
      customLabel: body.customLabel
        ? String(body.customLabel).trim().slice(0, 24)
        : prev?.customLabel,
      updatedAt: now,
      hasFile: true,
      storedFile,
    };
    writeMemeManifest(manifest);
    broadcastAllSockets({ type: 'memes:updated', updatedAt: now });
    res.json({ ok: true, updatedAt: now });
  });

  app.delete('/api/admin/memes/:slotId', (req, res) => {
    if (!checkAdminPin(req)) {
      res.status(401).json({ error: 'Invalid Admin Passcode PIN.' });
      return;
    }
    const slotId = sanitizeSlotId(req.params.slotId);
    if (!slotId) {
      res.status(400).json({ error: 'Invalid meme slot ID.' });
      return;
    }
    const manifest = readMemeManifest();
    const prev = manifest[slotId];
    if (prev?.storedFile) {
      const p = path.join(MEME_STORAGE_DIR, path.basename(prev.storedFile));
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }
    delete manifest[slotId];
    writeMemeManifest(manifest);
    broadcastAllSockets({ type: 'memes:updated', updatedAt: Date.now() });
    res.json({ ok: true });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const publicPath = path.resolve(__dirname, 'public');
    if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath));
    }
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ke Batpar server listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
