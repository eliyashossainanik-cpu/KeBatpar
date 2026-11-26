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
} from '../shared/types';
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
} from '../shared/mapData';
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
  DAROGA_COOLDOWN_SEC,
  DEFAULT_ROOM_SETTINGS,
  DOOR_LOCK_COOLDOWN_SEC,
  DOOR_LOCK_DURATION_SEC,
  HATUR_COOLDOWN_SEC,
  HATUR_DURATION_MS,
  INITIAL_KILL_COOLDOWN_SEC,
  JHARUDAR_CLEAN_CHANNEL_SEC,
  JHARUDAR_CLEAN_COOLDOWN_SEC,
  JHARUDAR_CLEAN_USES,
  KOBIRAJ_COOLDOWN_SEC,
  LOBBY_CHAT_MAX_CHARS,
  MASTER_COOLDOWN_SEC,
  MAX_MATCH_PLAYERS,
  MIN_MATCH_PLAYERS,
  MISTRI_FIX_RANGE,
  MISTRI_VENT_COOLDOWN_SEC,
  REPORT_RANGE,
  SABOTAGE_COOLDOWN_SEC,
  SABOTAGE_FIX_RANGE,
  SABOTAGE_INITIAL_LOCKOUT_SEC,
  SUPARI_COOLDOWN_SEC,
  TIKTOK_COOLDOWN_SEC,
  TIKTOK_ZONE_GOAL,
  VENT_RANGE,
  advanceSabotageState,
  applyDalalBrokerJam,
  assignMatchTasks,
  assignRoles,
  assignSpecialRoles,
  canCompleteTasks,
  canExecuteKill,
  canStartLobbyMatch,
  canUseVent,
  collectChandaFromTarget,
  computeTaskProgress,
  countAliveChandabazTargets,
  createEmptySabotageState,
  createSabotageState,
  dismountPlayerFromVehicle,
  evaluateMatchOutcome,
  executeGoyendaScan,
  findGhotokPairCandidates,
  findGhotokPartnerOnDeath,
  findNearestChamchaPatron,
  findNearestChandabazTarget,
  findNearestCleanableBody,
  findNearestDarogaTarget,
  findNearestGasValve,
  findNearestHaturTarget,
  findNearestInspectableBody,
  findNearestKillTarget,
  findNearestMasterTarget,
  findNearestReportableBody,
  findNearestRevivableBody,
  findNearestShieldTarget,
  getChandabazGoal,
  getColorShadeHint,
  inspectBodyClue,
  inspectPlayerTaskAuthenticity,
  isCriticalSabotage,
  isMistriVentAudibleTo,
  isNeutralRole,
  isPlayerShieldedNow,
  isTaskLockedBySabotage,
  makeDefaultPlayerState,
  makeEmptyDoorLocks,
  pickSupariContractTarget,
  recordTiktokReelInZone,
  redactSnapshotForPlayer,
  resolveDarogaShot,
  resolveVentHopTarget,
  sanitizePlayerName,
  sanitizeSoloConfig,
  stepJharudarChannel,
  tallyVotes,
} from '../shared/gameRules';
import {
  type BotBrainState,
  type BatchedGeminiChatReply,
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
} from '../shared/botAi';
import { getApiUrl } from '../config/serverUrl';
import { resolveUniqueMultiplayerIdentity } from '../shared/banglaComedy';

const MAX_PLAYERS = MAX_MATCH_PLAYERS;
const RECONNECT_GRACE_MS = 20_000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const BOT_NAMES = [
  'Chacha Miah',
  'Babu Bhai',
  'Pintu Da',
  'Tuktuki Apa',
  'Raju Rickshaw',
  'Kallu Ustad',
  'Mitu Moni',
  'Golapi Rani',
  'Akashi Tara',
  'Badami Mama',
  'Tutu Chacha',
  'Jam Kaka',
  'Pata Bhai',
  'Sona Babu',
  'Lal Mia',
  'Habu Don',
  'Firoza Vabi',
  'Sindur Bhai',
  'Mehedi Mama',
  'Chandan Dada',
];

export function generateP2PRoomCode(length = 5): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function buildPeerIdForRoomCode(code: string): string {
  return `kebatpar-v1-${normalizeRoomCode(code)}`;
}

export interface P2PHostTransport {
  sendToClient: (clientId: string, msg: ServerMessage) => void;
  broadcast: (msg: ServerMessage) => void;
}

/**
 * Host-authoritative multiplayer room engine for zero-backend Room Code play
 * (used automatically on static hosting like Cloudflare Pages when no `/ws` server exists).
 */
export class P2PHostRoomEngine {
  public readonly roomCode: string;
  private phase: RoomSnapshot['phase'] = 'lobby';
  private players = new Map<string, PlayerState>();
  private clientToPlayer = new Map<string, string>();
  private playerToClient = new Map<string, string>();
  private botMemories = new Map<string, BotBrainState>();
  private footprintAccum = new Map<string, number>();
  private holdingFixMap = new Map<string, { valveId?: 'valve_cha' | 'valve_rickshaw' }>();
  private bodies: BodyMarker[] = [];
  private footprints: FootprintDot[] = [];
  private sabotage: RoomSnapshot['sabotage'] = createEmptySabotageState(SABOTAGE_INITIAL_LOCKOUT_SEC);
  private doorLocks: DoorLockState = makeEmptyDoorLocks();
  private chat: ChatMessage[] = [];
  private lobbyChat: ChatMessage[] = [];
  private lobbyCountdownSec: number | null = null;
  private lobbyCountdownTimer = 0;
  private lastLobbyChatAt = new Map<string, number>();
  private playerReconnectTokens = new Map<string, string>();
  private disconnectedSlots = new Map<string, { player: PlayerState; expiresAt: number }>();
  private meetingCallerId: string | null = null;
  private meetingReason: 'body' | 'emergency' | null = null;
  private meetingTimer = 0;
  private discussionTimer = 0;
  private phaseTimer = 0;
  private emergencyCooldownRemaining = 0;
  private ejection: RoomSnapshot['ejection'] = null;
  private justEjectedPlayer: PlayerState | null = null;
  private outcome: RoomSnapshot['outcome'] = null;
  private netaRevealedId: string | null = null;
  private prankedLampUntil = 0;
  private commsJammedUntil = 0;
  private ghotokLinkedIds: [string, string] | null = null;
  private settings: RoomSettings = { ...DEFAULT_ROOM_SETTINGS };
  private transport: P2PHostTransport;
  private meetingEpoch = 0;
  private lastGeminiReactionAt = 0;
  private geminiCooldownUntil = 0;
  private typingPlayers = new Set<string>();
  private vehicles: VehicleState[] = createInitialVehicles();

  constructor(roomCode: string, transport: P2PHostTransport) {
    this.roomCode = normalizeRoomCode(roomCode) || generateP2PRoomCode();
    this.transport = transport;
  }

  public getSnapshot(): RoomSnapshot {
    const players = Array.from(this.players.values());
    const taskStats = computeTaskProgress(players);
    const botTypers =
      this.phase === 'meeting' ? getMeetingTypingBotIds(players, this.botMemories) : [];
    const typingPlayerIds =
      this.phase === 'meeting'
        ? Array.from(new Set([...this.typingPlayers, ...botTypers]))
        : [];
    return {
      roomCode: this.roomCode,
      isSolo: false,
      phase: this.phase,
      players: players.map((p) => ({ ...p, tasks: p.tasks.map((t) => ({ ...t })) })),
      bodies: this.bodies.map((b) => ({ ...b })),
      footprints: this.footprints.map((f) => ({ ...f })),
      sabotage: {
        ...this.sabotage,
        valves: this.sabotage.valves.map((v) => ({ ...v })),
      },
      doorLocks: { ...this.doorLocks },
      chat: this.chat.slice(-40),
      lobbyChat: this.lobbyChat.slice(-40),
      lobbyCountdownSec: this.lobbyCountdownSec,
      meetingCallerId: this.meetingCallerId,
      meetingReason: this.meetingReason,
      meetingTimer: Math.max(0, Math.ceil(this.meetingTimer)),
      discussionTimer: Math.max(0, Math.ceil(this.discussionTimer)),
      emergencyCooldownRemaining: Math.max(0, Math.ceil(this.emergencyCooldownRemaining)),
      ejection: this.ejection,
      outcome: this.outcome,
      settings: { ...this.settings },
      taskProgress: taskStats.progress,
      totalTasks: taskStats.totalTasks,
      completedTasks: taskStats.completedTasks,
      typingPlayerIds,
      netaRevealedId: this.netaRevealedId,
      prankedLampUntil: this.prankedLampUntil,
      commsJammedUntil: this.commsJammedUntil,
      ghotokLinkedIds: this.ghotokLinkedIds,
      vehicles: this.vehicles.map((v) => ({ ...v })),
    };
  }

  public hasHumanClients(): boolean {
    return this.clientToPlayer.size > 0;
  }

  public getRoomSummary(): PublicRoomSummary {
    const players = Array.from(this.players.values());
    const host = players.find((p) => p.isHost) ?? players.find((p) => !p.isBot) ?? players[0];
    return {
      roomCode: this.roomCode,
      hostName: host?.name ?? 'হোস্ট',
      playerCount: players.length,
      maxPlayers: MAX_PLAYERS,
      phase: this.phase,
    };
  }

  private pickAvailableColor(preferred?: PlayerColorId): PlayerColorId {
    const used = new Set(Array.from(this.players.values()).map((p) => p.color));
    if (preferred && !used.has(preferred)) return preferred;
    for (const spec of PLAYER_COLORS) {
      if (!used.has(spec.id)) return spec.id;
    }
    return PLAYER_COLORS[this.players.size % PLAYER_COLORS.length].id;
  }

  private broadcastState(msg?: ServerMessage): void {
    if (msg) {
      this.transport.broadcast(msg);
      return;
    }
    const baseSnap = this.getSnapshot();
    for (const [playerId, clientId] of this.playerToClient.entries()) {
      this.transport.sendToClient(clientId, {
        type: 'room:state',
        snapshot: redactSnapshotForPlayer(baseSnap, playerId),
      });
    }
  }

  private sendToPlayer(playerId: string, msg: ServerMessage): void {
    const cid = this.playerToClient.get(playerId);
    if (cid) {
      this.transport.sendToClient(cid, msg);
    }
  }

  private pushSystemChat(text: string): void {
    this.chat.push({
      id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: 'system',
      senderName: 'মহল্লা ঘোষণা',
      senderColor: 'holud',
      text,
      timestamp: Date.now(),
      system: true,
    });
  }

  private recordFootprint(p: PlayerState, distMoved: number): void {
    if (!p.alive || p.inVent || p.vehicleId || distMoved < 0.05) return;
    const prev = (this.footprintAccum.get(p.id) ?? 0) + distMoved;
    if (prev >= 2.2) {
      this.footprintAccum.set(p.id, 0);
      this.footprints.push({
        id: `fp_${Date.now()}_${p.id}_${Math.random().toString(36).slice(2, 5)}`,
        x: p.x,
        z: p.z,
        color: p.disguiseColor ?? p.color,
        expiresAt: Date.now() + 7500,
      });
      if (this.footprints.length > 36) {
        this.footprints.shift();
      }
    } else {
      this.footprintAccum.set(p.id, prev);
    }
  }

  private pruneExpiredReconnectSlots(): void {
    const now = Date.now();
    for (const [token, entry] of this.disconnectedSlots.entries()) {
      if (entry.expiresAt <= now) {
        this.disconnectedSlots.delete(token);
      }
    }
  }

  private cancelLobbyCountdown(): void {
    if (this.lobbyCountdownSec !== null || this.lobbyCountdownTimer > 0) {
      this.lobbyCountdownSec = null;
      this.lobbyCountdownTimer = 0;
    }
  }

  private spawnBotPlayer(): boolean {
    if (this.players.size >= MAX_PLAYERS) return false;
    const botId = `bot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const sp = SPAWN_RING[this.players.size % SPAWN_RING.length];
    const botCandidate = BOT_NAMES[this.players.size % BOT_NAMES.length];
    const botIdentity = resolveUniqueMultiplayerIdentity(
      botCandidate,
      undefined,
      Array.from(this.players.values()),
    );
    const existingNames = Array.from(this.players.values()).map((p) => p.name);
    this.players.set(
      botId,
      makeDefaultPlayerState({
        id: botId,
        name: sanitizePlayerName(botIdentity.name, existingNames),
        color: this.pickAvailableColor(botIdentity.color),
        x: sp.x,
        z: sp.z,
        yaw: sp.yaw,
        isBot: true,
        isHost: false,
        ready: true,
        emergencyMeetingsLeft: this.settings.emergencyMeetingsPerPlayer,
      }),
    );
    return true;
  }

  public addClient(
    clientId: string,
    name: string,
    color: PlayerColorId,
    isHost = false,
    reconnectToken?: string,
  ): boolean {
    this.pruneExpiredReconnectSlots();

    if (!isHost && reconnectToken && this.disconnectedSlots.has(reconnectToken)) {
      const reserved = this.disconnectedSlots.get(reconnectToken)!;
      this.disconnectedSlots.delete(reconnectToken);
      const existingNames = Array.from(this.players.values()).map((p) => p.name);
      const restored: PlayerState = {
        ...reserved.player,
        isHost: false,
        ready: this.phase === 'lobby' ? false : reserved.player.ready,
        name: sanitizePlayerName(reserved.player.name, existingNames),
        color: this.pickAvailableColor(reserved.player.color),
        tasks: reserved.player.tasks.map((t) => ({ ...t })),
      };
      this.players.set(restored.id, restored);
      this.clientToPlayer.set(clientId, restored.id);
      this.playerToClient.set(restored.id, clientId);
      this.playerReconnectTokens.set(restored.id, reconnectToken);

      const snapshot = this.getSnapshot();
      this.transport.sendToClient(clientId, {
        type: 'room:joined',
        playerId: restored.id,
        snapshot: redactSnapshotForPlayer(snapshot, restored.id),
        reconnectToken,
      });
      this.broadcastState({ type: 'sfx:event', kind: 'lobby_join' });
      this.broadcastState();
      return true;
    }

    if (!isHost) {
      if (this.phase !== 'lobby' || this.lobbyCountdownSec !== null) {
        this.transport.sendToClient(clientId, {
          type: 'room:error',
          message: 'খেলা শুরু হয়ে গেছে! ম্যাচ এখন চলছে।',
        });
        return false;
      }
      if (this.players.size + this.disconnectedSlots.size >= MAX_PLAYERS) {
        this.transport.sendToClient(clientId, {
          type: 'room:error',
          message: `রুম ভর্তি! সর্বোচ্চ ${MAX_PLAYERS} জন খেলতে পারবে।`,
        });
        return false;
      }
    }

    const playerId = isHost
      ? 'pl_host'
      : `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const issuedToken = `rc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const sp = SPAWN_RING[this.players.size % SPAWN_RING.length];
    const resolvedIdentity = resolveUniqueMultiplayerIdentity(
      name,
      color,
      Array.from(this.players.values()),
    );
    const existingNames = Array.from(this.players.values()).map((p) => p.name);
    const uniqueName = sanitizePlayerName(resolvedIdentity.name, existingNames);

    const player: PlayerState = makeDefaultPlayerState({
      id: playerId,
      name: uniqueName,
      color: this.pickAvailableColor(resolvedIdentity.color),
      x: sp.x,
      z: sp.z,
      yaw: sp.yaw,
      isBot: false,
      isHost,
      ready: isHost,
      emergencyMeetingsLeft: this.settings.emergencyMeetingsPerPlayer,
    });

    this.players.set(playerId, player);
    this.clientToPlayer.set(clientId, playerId);
    this.playerToClient.set(playerId, clientId);
    this.playerReconnectTokens.set(playerId, issuedToken);

    const snapshot = this.getSnapshot();
    this.transport.sendToClient(clientId, {
      type: 'room:joined',
      playerId,
      snapshot: redactSnapshotForPlayer(snapshot, playerId),
      reconnectToken: issuedToken,
    });
    if (!isHost) {
      this.broadcastState({ type: 'sfx:event', kind: 'lobby_join' });
    }
    this.broadcastState();
    return true;
  }

  public removeClient(clientId: string, intentional = false): void {
    const playerId = this.clientToPlayer.get(clientId);
    if (!playerId) return;
    const oldPlayer = this.players.get(playerId);
    const wasHost = oldPlayer?.isHost ?? false;
    const token = this.playerReconnectTokens.get(playerId);

    this.clientToPlayer.delete(clientId);
    this.playerToClient.delete(playerId);
    this.holdingFixMap.delete(playerId);
    if (oldPlayer?.vehicleId) {
      dismountPlayerFromVehicle(oldPlayer, this.vehicles, this.doorLocks, false);
    }
    this.players.delete(playerId);

    if (this.clientToPlayer.size === 0) {
      this.disconnectedSlots.clear();
      return;
    }

    if (!intentional && oldPlayer && token) {
      this.disconnectedSlots.set(token, {
        player: {
          ...oldPlayer,
          isHost: false,
          ready: false,
          tasks: oldPlayer.tasks.map((t) => ({ ...t })),
        },
        expiresAt: Date.now() + RECONNECT_GRACE_MS,
      });
    } else {
      this.playerReconnectTokens.delete(playerId);
    }

    if (wasHost) {
      const nextHuman = Array.from(this.players.values()).find((p) => !p.isBot);
      if (nextHuman) {
        nextHuman.isHost = true;
        nextHuman.ready = true;
      }
    }

    if (this.phase === 'lobby') {
      if (intentional && this.settings.autoFillBots && this.players.size < MAX_PLAYERS) {
        this.spawnBotPlayer();
      }
      if (!canStartLobbyMatch(Array.from(this.players.values())).ok) {
        this.cancelLobbyCountdown();
      }
    }

    this.broadcastState();
  }

  private checkWin(sabotageExpired = false): boolean {
    const players = Array.from(this.players.values());
    const stats = computeTaskProgress(players);
    const outcome = evaluateMatchOutcome(
      players,
      stats.progress,
      sabotageExpired,
      this.justEjectedPlayer,
    );
    if (outcome) {
      this.outcome = outcome;
      this.phase = 'gameover';
      this.broadcastState();
      return true;
    }
    return false;
  }

  private startMatch(): void {
    const playerList = Array.from(this.players.values());
    if (!canStartLobbyMatch(playerList).ok) return;
    this.cancelLobbyCountdown();
    this.disconnectedSlots.clear();
    this.settings = sanitizeSoloConfig(playerList.length, this.settings).settings;

    let assigned = assignRoles(playerList, this.settings.vondoCount);
    assigned = assignSpecialRoles(
      assigned,
      this.settings.enableSpecialRoles,
      undefined,
      undefined,
      Math.random,
      this.settings.enableNeutralRoles,
    );
    assignMatchTasks(assigned, this.settings.tasksPerPlayer);
    this.bodies = [];
    this.footprints = [];
    this.footprintAccum.clear();
    this.holdingFixMap.clear();
    this.chat = [];
    this.ejection = null;
    this.justEjectedPlayer = null;
    this.outcome = null;
    this.meetingCallerId = null;
    this.meetingReason = null;
    this.netaRevealedId = null;
    this.prankedLampUntil = 0;
    this.commsJammedUntil = 0;
    this.ghotokLinkedIds = null;
    this.doorLocks = makeEmptyDoorLocks();
    this.emergencyCooldownRemaining = this.settings.emergencyCooldownSec;
    this.vehicles = createInitialVehicles();
    this.sabotage = createEmptySabotageState(SABOTAGE_INITIAL_LOCKOUT_SEC);

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
          ? this.settings.emergencyMeetingsPerPlayer + 1
          : this.settings.emergencyMeetingsPerPlayer;
      p.killCooldownRemaining = p.role === 'vondo' ? INITIAL_KILL_COOLDOWN_SEC : 0;
      this.players.set(p.id, p);
    });

    this.phase = 'role_reveal';
    this.phaseTimer = 8.0;
    this.pushSystemChat('খেলা শুরু! পাড়ার সব কাজ শেষ করো অথবা বাটপারকে পুকুরে ফেলো!');
    this.broadcastState();
  }

  private handleDeathSideEffects(victim: PlayerState): void {
    const allPlayers = Array.from(this.players.values());
    const ghotokInfo = findGhotokPartnerOnDeath(victim.id, this.ghotokLinkedIds, allPlayers);
    if (ghotokInfo.partner && !ghotokInfo.partner.isBot) {
      this.sendToPlayer(ghotokInfo.partner.id, {
        type: 'clue:result',
        title: 'ঘটকের জুটি সতর্কবার্তা!',
        detail: `তোমার ঘটক-জুটি সঙ্গী ${victim.name} এই মুহূর্তে মারা গেছে!`,
      });
    }
    if (ghotokInfo.ghotok && !ghotokInfo.ghotok.isBot && ghotokInfo.ghotok.id !== ghotokInfo.partner?.id) {
      this.sendToPlayer(ghotokInfo.ghotok.id, {
        type: 'clue:result',
        title: 'ঘটকের জুটি সতর্কবার্তা!',
        detail: `জুটি বাঁধা প্রতিবেশী ${victim.name} এইমাত্র মারা গেছে!`,
      });
    }
    for (const pl of allPlayers) {
      if (pl.alive && pl.specialRole === 'supari_killer' && pl.supariTargetId === victim.id) {
        pl.supariTargetId = pickSupariContractTarget(pl, allPlayers, victim.id)?.id ?? null;
      }
    }
  }

  private startMeeting(caller: PlayerState, reason: 'body' | 'emergency', victimName?: string): void {
    if (this.phase !== 'playing') return;
    this.phase = 'meeting';
    this.meetingCallerId = caller.id;
    this.meetingReason = reason;
    this.discussionTimer = this.settings.discussionTimeSec;
    this.meetingTimer = this.settings.meetingTimeSec;
    this.ejection = null;
    this.justEjectedPlayer = null;
    this.footprints = [];
    this.commsJammedUntil = 0;
    this.holdingFixMap.clear();
    if (isCriticalSabotage(this.sabotage.active)) {
      this.sabotage = createEmptySabotageState(SABOTAGE_COOLDOWN_SEC);
    } else {
      this.sabotage.fixProgress = 0;
      this.sabotage.fixerId = null;
    }
    this.doorLocks = makeEmptyDoorLocks();

    for (const p of this.players.values()) {
      dismountPlayerFromVehicle(p, this.vehicles, this.doorLocks, false);
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
    for (const v of this.vehicles) {
      v.driverId = null;
      v.speed = 0;
      v.vx = 0;
      v.vz = 0;
      v.steer = 0;
    }

    if (!this.netaRevealedId) {
      const aliveNeta = Array.from(this.players.values()).find(
        (p) => p.alive && p.specialRole === 'neta',
      );
      if (aliveNeta) {
        this.netaRevealedId = aliveNeta.id;
        this.pushSystemChat(
          `${aliveNeta.name} মহল্লার নেতা — তার সালিশের ভোট ২ গুণ হিসেবে গণনা হবে!`,
        );
      }
    }

    resetBotBrainsForMeeting(this.botMemories);
    this.meetingEpoch += 1;
    this.lastGeminiReactionAt = 0;
    this.typingPlayers.clear();

    if (reason === 'body') {
      this.pushSystemChat(`${caller.name} ${victimName ?? 'এক প্রতিবেশীর'} লাশ পেয়েছে! জরুরি সালিশ ডাকা হয়েছে!`);
    } else {
      this.pushSystemChat(`${caller.name} আড্ডার ঘণ্টা বাজিয়েছে! জরুরি মহল্লা সালিশ!`);
    }

    const allPlayers = Array.from(this.players.values());
    generateFallbackMeetingChats({
      players: allPlayers,
      bodies: this.bodies,
      brains: this.botMemories,
      meetingReason: reason,
      meetingCallerId: caller.id,
    });
    void this.fetchGeminiMeetingChats(this.meetingEpoch, reason, caller.id, 'opening');

    this.broadcastState({ type: 'sfx:event', kind: reason === 'body' ? 'report' : 'meeting' });
    this.broadcastState();
  }

  private async fetchGeminiMeetingChats(
    epoch: number,
    reason: 'body' | 'emergency',
    callerId: string,
    phase: 'opening' | 'reaction' = 'opening',
  ): Promise<void> {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return;
    if (Date.now() < this.geminiCooldownUntil) return;
    const players = Array.from(this.players.values());
    const payload = buildBatchedGeminiMeetingPayload({
      roomCode: this.roomCode,
      players,
      bodies: this.bodies,
      brains: this.botMemories,
      chat: this.chat,
      meetingReason: reason,
      meetingCallerId: callerId,
      phase,
    });
    if (payload.bots.length === 0) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5500);
    try {
      const res = await fetch(getApiUrl('/api/bot-meeting-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        messages?: BatchedGeminiChatReply[];
        quotaExceeded?: boolean;
        retryAfterSec?: number;
      };
      if (data?.quotaExceeded || (typeof data?.retryAfterSec === 'number' && data.retryAfterSec > 0)) {
        const sec = Math.max(15, data.retryAfterSec ?? 60);
        this.geminiCooldownUntil = Date.now() + sec * 1000;
      }
      if (this.phase !== 'meeting' || this.meetingEpoch !== epoch) return;
      if (Array.isArray(data?.messages) && data.messages.length > 0) {
        const applyFn = phase === 'reaction' ? applyBatchedGeminiReactionChats : applyBatchedGeminiChats;
        applyFn({
          replies: data.messages,
          players: Array.from(this.players.values()),
          brains: this.botMemories,
        });
      }
    } catch {
      // Seamless fallback: rule-based schedule is already active
    } finally {
      window.clearTimeout(timer);
    }
  }

  private resolveMeetingVotes(): void {
    const players = Array.from(this.players.values());
    this.typingPlayers.clear();
    this.ejection = tallyVotes(players, this.settings.confirmEjects);
    this.phase = 'vote_results';
    this.phaseTimer = 2.6;
    this.broadcastState();
  }

  private updateBots(dt: number): void {
    const players = Array.from(this.players.values());
    if (this.phase === 'playing') {
      stepBotsPlaying({
        players,
        bodies: this.bodies,
        sabotage: this.sabotage,
        doorLocks: this.doorLocks,
        settings: this.settings,
        holdingFixMap: this.holdingFixMap,
        brains: this.botMemories,
        dt,
        nowMs: Date.now(),
        onFootprint: (p, distMoved) => this.recordFootprint(p, distMoved),
        onReportBody: (reporter, body) => this.startMeeting(reporter, 'body', body.victimName),
        onKill: (killer, victim, shieldBlocked) => {
          if (shieldBlocked) {
            this.broadcastState({ type: 'sfx:event', kind: 'shield' });
            this.sendToPlayer(victim.id, {
              type: 'clue:result',
              title: 'সুরক্ষা তোমাকে বাঁচিয়েছে!',
              detail: 'একজন বাটপার হামলা করেছিল, কিন্তু তাবিজ বা ইনজেকশন বাঁচিয়ে দিয়েছে!',
            });
          } else {
            if (!killer.isBot) {
              this.sendToPlayer(killer.id, { type: 'sfx:event', kind: 'kill' });
            }
            if (!victim.isBot && victim.id !== killer.id) {
              this.sendToPlayer(victim.id, { type: 'sfx:event', kind: 'kill' });
            }
            dismountPlayerFromVehicle(victim, this.vehicles, this.doorLocks, false);
            this.handleDeathSideEffects(victim);
          }
        },
        onSabotage: () => this.broadcastState({ type: 'sfx:event', kind: 'sabotage' }),
        onDoorLock: (zoneId) => {
          this.doorLocks[zoneId] = DOOR_LOCK_DURATION_SEC;
          this.doorLocks.cooldownRemaining = DOOR_LOCK_COOLDOWN_SEC;
          this.broadcastState({ type: 'sfx:event', kind: 'door' });
        },
        onRevive: () => this.broadcastState({ type: 'sfx:event', kind: 'revive' }),
        onTaskCompletedCheckWin: () => this.checkWin(),
      });
    } else if (this.phase === 'meeting') {
      stepBotsMeeting({
        players,
        bodies: this.bodies,
        discussionTimer: this.discussionTimer,
        brains: this.botMemories,
        dt,
        meetingReason: this.meetingReason,
        meetingCallerId: this.meetingCallerId,
        onChat: (p, text) => {
          this.chat.push({
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

  public step(dt: number): void {
    if (this.phase === 'lobby') {
      this.pruneExpiredReconnectSlots();
      if (this.lobbyCountdownSec !== null) {
        this.lobbyCountdownTimer -= dt;
        const nextSec = Math.max(0, Math.ceil(this.lobbyCountdownTimer));
        if (nextSec > 0 && nextSec !== this.lobbyCountdownSec) {
          this.lobbyCountdownSec = nextSec;
          this.broadcastState({ type: 'sfx:event', kind: 'lobby_tick' });
          this.broadcastState();
        }
        if (this.lobbyCountdownTimer <= 0) {
          this.lobbyCountdownSec = null;
          this.lobbyCountdownTimer = 0;
          this.broadcastState({ type: 'sfx:event', kind: 'lobby_start' });
          this.startMatch();
        }
      }
    } else if (this.phase === 'role_reveal') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.phase = 'playing';
        this.broadcastState();
      }
    } else if (this.phase === 'playing') {
      const nowMs = Date.now();
      this.footprints = this.footprints.filter((f) => f.expiresAt > nowMs);
      for (const p of this.players.values()) {
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
          const jRes = stepJharudarChannel(p, this.bodies, dt);
          if (jRes.completedBody) {
            this.bodies = this.bodies.filter((b) => b.id !== jRes.completedBody!.id);
            this.sendToPlayer(p.id, { type: 'sfx:event', kind: 'clean' });
            this.sendToPlayer(p.id, {
              type: 'clue:result',
              title: 'লাশ গায়েব!',
              detail: `${jRes.completedBody.victimName}-এর লাশ সরানো হয়েছে — এখন কেউ রিপোর্ট করতে পারবে না!`,
            });
          } else if (jRes.cancelled) {
            this.sendToPlayer(p.id, {
              type: 'clue:result',
              title: 'সাফাই বাতিল',
              detail: 'তুমি সরে গেছো অথবা লাশ আগেই রিপোর্ট হয়ে গেছে!',
            });
          }
        }
      }
      if (this.emergencyCooldownRemaining > 0) {
        this.emergencyCooldownRemaining = Math.max(0, this.emergencyCooldownRemaining - dt);
      }
      if (this.doorLocks.cooldownRemaining > 0) {
        this.doorLocks.cooldownRemaining = Math.max(0, this.doorLocks.cooldownRemaining - dt);
      }
      this.doorLocks.cha_dokan = Math.max(0, this.doorLocks.cha_dokan - dt);
      this.doorLocks.rickshaw_garage = Math.max(0, this.doorLocks.rickshaw_garage - dt);
      this.doorLocks.desco_power = Math.max(0, this.doorLocks.desco_power - dt);
      this.doorLocks.dish_roof = Math.max(0, this.doorLocks.dish_roof - dt);

      for (const hid of Array.from(this.holdingFixMap.keys())) {
        const hp = this.players.get(hid);
        if (!hp || !hp.alive || hp.isBot) {
          this.holdingFixMap.delete(hid);
        }
      }

      this.updateBots(dt);
      if (this.phase !== 'playing') return;

      for (const bp of this.players.values()) {
        if (bp.isBot && bp.alive && !bp.inVent && !bp.vehicleId && (bp.y ?? 0) < 0.8) {
          const pv = resolvePedestrianVehicleCollision(bp.x, bp.z, PLAYER_RADIUS, this.vehicles);
          bp.x = pv.x;
          bp.z = pv.z;
        }
      }

      const sabStep = advanceSabotageState(
        this.sabotage,
        Array.from(this.players.values()),
        dt,
        this.holdingFixMap,
      );
      if (sabStep.fixed) {
        this.holdingFixMap.clear();
        this.broadcastState({ type: 'sfx:event', kind: 'task' });
      } else if (sabStep.expiredCritical) {
        this.holdingFixMap.clear();
        this.checkWin(true);
        return;
      } else if (sabStep.expiredNonCriticalType) {
        this.holdingFixMap.clear();
        this.pushSystemChat(
          sabStep.expiredNonCriticalType === 'loadshedding'
            ? 'কারেন্ট এসেছে! বিদ্যুৎ সংযোগ নিজেই ঠিক হয়ে গেছে!'
            : 'ওয়াই-ফাই এসেছে! ডিশ সংযোগ আবার চালু হয়েছে!',
        );
      }
      this.broadcastState();
    } else if (this.phase === 'meeting') {
      this.updateBots(dt);
      if (this.discussionTimer > 0) {
        this.discussionTimer = Math.max(0, this.discussionTimer - dt);
        this.broadcastState();
      } else {
        this.meetingTimer -= dt;
        const alivePlayers = Array.from(this.players.values()).filter((p) => p.alive);
        if (this.meetingTimer <= 1.2) {
          for (const p of alivePlayers) {
            if (p.isBot && !p.hasVoted) {
              p.hasVoted = true;
              p.votedFor = 'skip';
            }
          }
        }
        const allVoted = alivePlayers.length === 0 || alivePlayers.every((p) => p.hasVoted);
        if (allVoted || this.meetingTimer <= 0) {
          this.resolveMeetingVotes();
        } else {
          this.broadcastState();
        }
      }
    } else if (this.phase === 'vote_results') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.justEjectedPlayer = null;
        if (this.ejection?.ejectedId) {
          const ejected = this.players.get(this.ejection.ejectedId);
          if (ejected) {
            dismountPlayerFromVehicle(ejected, this.vehicles, this.doorLocks, false);
            ejected.alive = false;
            this.justEjectedPlayer = ejected;
            this.handleDeathSideEffects(ejected);
          }
        }
        this.bodies = [];
        this.phase = 'ejecting';
        this.phaseTimer = this.ejection?.reason === 'voted' ? 7.5 : 5.0;
        if (this.ejection?.reason === 'voted' && this.ejection.ejectedId) {
          this.broadcastState({ type: 'sfx:event', kind: 'eject' });
        }
        this.broadcastState();
      }
    } else if (this.phase === 'ejecting') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (!this.checkWin()) {
          this.justEjectedPlayer = null;
          let idx = 0;
          for (const p of this.players.values()) {
            const sp = SPAWN_RING[idx % SPAWN_RING.length];
            p.x = sp.x;
            p.z = sp.z;
            p.y = 0;
            p.yaw = sp.yaw;
            p.hasVoted = false;
            p.votedFor = null;
            if (p.role === 'vondo') {
              p.killCooldownRemaining = this.settings.killCooldownSec;
            }
            if (p.specialRole === 'chandabaz') {
              p.abilityCooldown = Math.max(p.abilityCooldown, 14);
            }
            idx++;
          }
          this.emergencyCooldownRemaining = this.settings.emergencyCooldownSec;
          this.phase = 'playing';
          this.broadcastState();
        }
      }
    }
  }

  public handleMessage(clientId: string, msg: ClientMessage): void {
    if (msg.type === 'room:join') {
      const targetCode = normalizeRoomCode(msg.roomCode);
      if (targetCode !== this.roomCode) {
        this.transport.sendToClient(clientId, {
          type: 'room:error',
          message: `এই কোডে কোনো রুম পাওয়া যায়নি (${targetCode})।`,
        });
        return;
      }
      this.addClient(clientId, msg.name, msg.color, false, msg.reconnectToken);
      return;
    }

    if (msg.type === 'room:leave') {
      this.removeClient(clientId, true);
      return;
    }

    const playerId = this.clientToPlayer.get(clientId);
    if (!playerId) return;
    const player = this.players.get(playerId);
    if (!player) return;

    switch (msg.type) {
      case 'lobby:settings': {
        if (!player.isHost || this.phase !== 'lobby') return;
        const sanitized = sanitizeSoloConfig(
          Math.max(MIN_MATCH_PLAYERS, this.players.size),
          { ...this.settings, ...msg.settings },
        );
        this.settings = sanitized.settings;
        this.broadcastState();
        break;
      }
      case 'lobby:customize': {
        if (this.phase !== 'lobby') return;
        if (typeof msg.name === 'string') {
          const otherNames = Array.from(this.players.values())
            .filter((p) => p.id !== player.id)
            .map((p) => p.name);
          player.name = sanitizePlayerName(msg.name, otherNames);
        }
        if (
          msg.color &&
          !Array.from(this.players.values()).some((p) => p.id !== player.id && p.color === msg.color)
        ) {
          player.color = msg.color;
        }
        this.broadcastState();
        break;
      }
      case 'lobby:ready': {
        if (this.phase !== 'lobby' || player.isHost || player.isBot) return;
        player.ready = Boolean(msg.ready);
        if (!player.ready) {
          this.cancelLobbyCountdown();
        }
        this.broadcastState({ type: 'sfx:event', kind: 'lobby_ready' });
        this.broadcastState();
        break;
      }
      case 'lobby:kick': {
        if (!player.isHost || this.phase !== 'lobby') return;
        const target = this.players.get(msg.targetPlayerId);
        if (!target || target.id === player.id) return;
        if (target.isBot) {
          this.players.delete(target.id);
        } else {
          const targetCid = this.playerToClient.get(target.id);
          if (targetCid) {
            this.transport.sendToClient(targetCid, {
              type: 'room:kicked',
              message: 'হোস্ট তোমাকে রুম থেকে বের করে দিয়েছে।',
            });
            this.clientToPlayer.delete(targetCid);
          }
          this.playerToClient.delete(target.id);
          this.playerReconnectTokens.delete(target.id);
          this.players.delete(target.id);
        }
        if (!canStartLobbyMatch(Array.from(this.players.values())).ok) {
          this.cancelLobbyCountdown();
        }
        this.broadcastState();
        break;
      }
      case 'lobby:chat': {
        if (this.phase !== 'lobby') return;
        const now = Date.now();
        const prevAt = this.lastLobbyChatAt.get(player.id) ?? 0;
        if (now - prevAt < 500) return;
        const clean = msg.text.trim().slice(0, LOBBY_CHAT_MAX_CHARS);
        if (!clean) return;
        this.lastLobbyChatAt.set(player.id, now);
        this.lobbyChat.push({
          id: `lchat_${now}_${Math.random().toString(36).slice(2, 5)}`,
          senderId: player.id,
          senderName: player.name,
          senderColor: player.color,
          text: clean,
          timestamp: now,
        });
        if (this.lobbyChat.length > 40) {
          this.lobbyChat = this.lobbyChat.slice(-40);
        }
        this.broadcastState();
        break;
      }
      case 'lobby:add_bot': {
        if (!player.isHost || this.phase !== 'lobby' || this.players.size >= MAX_PLAYERS) return;
        if (this.spawnBotPlayer()) {
          this.broadcastState({ type: 'sfx:event', kind: 'lobby_join' });
          this.broadcastState();
        }
        break;
      }
      case 'lobby:remove_bot': {
        if (!player.isHost || this.phase !== 'lobby') return;
        let removed = false;
        if (msg.targetPlayerId) {
          const target = this.players.get(msg.targetPlayerId);
          if (target?.isBot) {
            this.players.delete(target.id);
            removed = true;
          }
        } else {
          const bots = Array.from(this.players.values()).filter((p) => p.isBot);
          const last = bots.at(-1);
          if (last) {
            this.players.delete(last.id);
            removed = true;
          }
        }
        if (removed) {
          if (!canStartLobbyMatch(Array.from(this.players.values())).ok) {
            this.cancelLobbyCountdown();
          }
          this.broadcastState();
        }
        break;
      }
      case 'lobby:remove_bots': {
        if (!player.isHost || this.phase !== 'lobby') return;
        for (const [id, pl] of this.players.entries()) {
          if (pl.isBot) this.players.delete(id);
        }
        this.cancelLobbyCountdown();
        this.broadcastState();
        break;
      }
      case 'lobby:start': {
        if (!player.isHost || this.phase !== 'lobby') return;
        const check = canStartLobbyMatch(Array.from(this.players.values()));
        if (!check.ok) {
          this.transport.sendToClient(clientId, {
            type: 'room:error',
            message: check.reason ?? `আরও খেলোয়াড় লাগবে (কমপক্ষে ${MIN_MATCH_PLAYERS} জন)!`,
          });
          return;
        }
        if (this.lobbyCountdownSec === null) {
          this.lobbyCountdownSec = 5;
          this.lobbyCountdownTimer = 5.0;
          this.broadcastState({ type: 'sfx:event', kind: 'lobby_tick' });
          this.broadcastState();
        }
        break;
      }
      case 'lobby:cancel_start': {
        if (!player.isHost || this.phase !== 'lobby') return;
        this.cancelLobbyCountdown();
        this.broadcastState();
        break;
      }
      case 'player:move': {
        if (this.phase !== 'playing' && this.phase !== 'lobby') return;
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
              this.doorLocks,
            )
          : { x: msg.x, z: msg.z, y: msg.y ?? prevY };
        if (player.alive && (resolved.y ?? 0) < 0.8) {
          const pv = resolvePedestrianVehicleCollision(resolved.x, resolved.z, PLAYER_RADIUS, this.vehicles);
          resolved = { ...resolved, x: pv.x, z: pv.z };
        }
        const moved = Math.hypot(resolved.x - player.x, resolved.z - player.z);
        player.x = resolved.x;
        player.z = resolved.z;
        player.y = resolved.y;
        player.vx = msg.vx;
        player.vz = msg.vz;
        player.yaw = msg.yaw;
        if (this.phase === 'playing') {
          this.recordFootprint(player, moved);
        } else if (this.phase === 'lobby') {
          this.broadcastState();
        }
        break;
      }
      case 'player:vehicle_toggle': {
        if ((this.phase !== 'playing' && this.phase !== 'lobby') || !player.alive || player.inVent) return;
        if (player.vehicleId) {
          dismountPlayerFromVehicle(player, this.vehicles, this.doorLocks, true);
          this.broadcastState();
          return;
        }
        if ((player.y ?? 0) > 1.2) return;
        const target = msg.vehicleId
          ? this.vehicles.find(
              (v) => v.id === msg.vehicleId && !v.driverId && distance2D(player.x, player.z, v.x, v.z) <= 5.5,
            )
          : findNearestAvailableVehicle(player.x, player.z, this.vehicles);
        if (!target) return;
        player.vehicleId = target.id;
        player.watchingCams = false;
        player.jharuTargetBodyId = null;
        player.jharuTimer = 0;
        this.holdingFixMap.delete(player.id);
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
        this.broadcastState();
        break;
      }
      case 'player:vehicle_drive': {
        if ((this.phase !== 'playing' && this.phase !== 'lobby') || !player.alive || !player.vehicleId) return;
        if (msg.vehicleId !== player.vehicleId) return;
        const v = this.vehicles.find((item) => item.id === player.vehicleId && item.driverId === player.id);
        if (!v) return;
        const spec = VEHICLE_SPECS[v.kind];
        const resolved = resolveVehicleCollision(
          msg.x,
          msg.z,
          spec.collisionRadius,
          this.vehicles,
          v.id,
          this.doorLocks,
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
        if (this.phase === 'lobby') {
          this.broadcastState();
        }
        break;
      }
      case 'player:vehicle_horn': {
        if ((this.phase !== 'playing' && this.phase !== 'lobby') || !player.alive || !player.vehicleId) return;
        const v = this.vehicles.find((item) => item.id === player.vehicleId);
        if (v) {
          this.broadcastState({ type: 'sfx:event', kind: 'vehicle_horn', vehicleKind: v.kind });
        }
        break;
      }
      case 'player:visual_task_start': {
        if (
          this.phase !== 'playing' ||
          !this.settings.visualTasks ||
          player.role !== 'parabasi' ||
          isNeutralRole(player.specialRole)
        ) {
          return;
        }
        player.visualTaskTimer = 3.0;
        this.broadcastState();
        break;
      }
      case 'player:task_complete': {
        if (this.phase !== 'playing') return;
        if (isTaskLockedBySabotage(msg.taskId, this.sabotage)) return;
        const station = TASK_STATIONS.find((s) => s.id === msg.taskId);
        if (!station || distance2D(player.x, player.z, station.x, station.z) > station.radius + 1.5) return;
        const taskItem = player.tasks.find((t) => t.taskId === msg.taskId);
        if (taskItem && !taskItem.completed) {
          taskItem.completed = true;
          if (canCompleteTasks(player) && !taskItem.isFake && station.isVisual && this.settings.visualTasks) {
            player.visualTaskTimer = 2.6;
          }
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'task' });
          if (!this.checkWin()) {
            this.broadcastState();
          }
        }
        break;
      }
      case 'player:use_ability': {
        if (this.phase !== 'playing') return;
        if (!player.alive) {
          if ((player.pranksLeft ?? 0) <= 0) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'ল্যাম্প প্র্যাঙ্ক শেষ',
              detail: 'এই রাউন্ডে ল্যাম্প প্র্যাঙ্ক শেষ — পরের সালিশের পর আবার পারবে!',
            });
            return;
          }
          player.pranksLeft = 0;
          this.prankedLampUntil = Date.now() + 3500;
          this.broadcastState({ type: 'sfx:event', kind: 'prank' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'মহল্লার বাতি ঝিকমিক!',
            detail: 'ভূতের মজার প্র্যাঙ্ক — রাস্তার বাতি ৩.৫ সেকেন্ড ঝিকমিক করছে!',
          });
          this.broadcastState();
          return;
        }
        if (player.inVent) return;
        if (player.specialRole === 'goyenda') {
          const scan = executeGoyendaScan(player, this.bodies, Date.now());
          if (!scan.ok) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'গোয়েন্দা স্ক্যানার',
              detail:
                scan.reason === 'no_scans_left'
                  ? 'সব ফরেনসিক স্ক্যান (২/২) শেষ হয়ে গেছে!'
                  : 'ফরেনসিক সূত্র স্ক্যান করতে পড়ে থাকা প্রতিবেশীর লাশের কাছে যাও।',
            });
            return;
          }
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'clue' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: scan.clue!.title,
            detail: scan.clue!.detail,
          });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'kobiraj') {
          if (player.abilityCooldown > 0.05) return;
          const nearby = msg.targetId
            ? this.players.get(msg.targetId)
            : findNearestShieldTarget(player, Array.from(this.players.values()));
          const receiver =
            nearby && nearby.alive && !nearby.inVent ? nearby : !player.shielded ? player : null;
          if (!receiver) return;
          receiver.shielded = true;
          player.abilityCooldown = KOBIRAJ_COOLDOWN_SEC;
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'shield' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'তাবিজের সুরক্ষা চালু',
            detail:
              receiver.id === player.id
                ? 'নিজের গায়ে সুরক্ষার তাবিজ পরে নিয়েছ!'
                : `${receiver.name}-কে কবিরাজের তাবিজ দিয়ে সুরক্ষা দিয়েছ!`,
          });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'bohurupi') {
          if (player.disguiseTimer > 0 && (!msg.targetId || msg.targetId === player.id)) {
            player.disguiseColor = null;
            player.disguiseName = null;
            player.disguiseTimer = 0;
            this.broadcastState({ type: 'sfx:event', kind: 'disguise' });
            this.broadcastState();
            return;
          }
          if (player.abilityCooldown > 0.05) return;
          const candidates = Array.from(this.players.values()).filter(
            (p) => p.alive && p.id !== player.id && p.role !== 'vondo',
          );
          const chosen =
            (msg.targetId ? candidates.find((c) => c.id === msg.targetId) : candidates[0]) ?? candidates[0];
          if (!chosen) return;
          player.disguiseColor = chosen.color;
          player.disguiseName = chosen.name;
          player.disguiseTimer = BOHURUPI_DISGUISE_DURATION_SEC;
          player.abilityCooldown = BOHURUPI_COOLDOWN_SEC;
          this.broadcastState({ type: 'sfx:event', kind: 'disguise' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'বহুরূপী ছদ্মবেশ',
            detail: `${BOHURUPI_DISGUISE_DURATION_SEC} সেকেন্ডের জন্য ${chosen.name}-এর বেশ ধরেছ!`,
          });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'daroga') {
          if ((player.shotsLeft ?? 1) <= 0) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'পাড়ার দারোগা',
              detail: 'তোমার ১টি দারোগার গুলি আগেই ব্যবহার হয়ে গেছে!',
            });
            return;
          }
          if (player.abilityCooldown > 0.05) return;
          const target = msg.targetId
            ? this.players.get(msg.targetId)
            : findNearestDarogaTarget(player, Array.from(this.players.values()));
          if (!target) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'পাড়ার দারোগা',
              detail: 'গুলি চালাতে সন্দেহভাজনের একদম কাছে যাও!',
            });
            return;
          }
          const res = resolveDarogaShot(player, target);
          if (!res.allowed) return;
          player.shotsLeft = Math.max(0, (player.shotsLeft ?? 1) - 1);
          this.broadcastState({ type: 'sfx:event', kind: 'daroga' });
          if (res.hitVondo) {
            dismountPlayerFromVehicle(target, this.vehicles, this.doorLocks, false);
            target.alive = false;
            target.watchingCams = false;
            player.abilityCooldown = DAROGA_COOLDOWN_SEC;
            this.bodies.push({
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
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'দারোগার নিখুঁত নিশানা!',
              detail: `${target.name} ছিল আসল বাটপার! একেবারে সাইজ করে দিয়েছ!`,
            });
          } else {
            dismountPlayerFromVehicle(player, this.vehicles, this.doorLocks, false);
            player.alive = false;
            player.watchingCams = false;
            this.bodies.push({
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
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'দারোগার ভুল গুলি!',
              detail: `${target.name} নিরপরাধ পাড়াবাসী ছিল! উল্টো তোমার চাকরি চলে গেল!`,
            });
          }
          this.handleDeathSideEffects(res.hitVondo ? target : player);
          if (!this.checkWin()) {
            this.broadcastState();
          }
          return;
        }
        if (player.specialRole === 'daktar') {
          if ((player.revivesLeft ?? 0) <= 0) return;
          const body = findNearestRevivableBody(player, this.bodies);
          if (!body) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'পাড়ার ডাক্তার',
              detail: 'স্যালাইন দিতে রিপোর্ট না হওয়া লাশের কাছে যাও!',
            });
            return;
          }
          const victim = this.players.get(body.victimId);
          if (!victim) return;
          this.bodies = this.bodies.filter((b) => b.id !== body.id);
          victim.alive = true;
          victim.x = body.x;
          victim.z = body.z;
          player.revivesLeft = Math.max(0, (player.revivesLeft ?? 1) - 1);
          player.abilityCooldown = 10;
          this.broadcastState({ type: 'sfx:event', kind: 'revive' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'স্যালাইনে জীবন বাঁচলো!',
            detail: `পাড়ার ডাক্তার ${victim.name}-কে বাঁচিয়ে তুলেছেন!`,
          });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'jharudar') {
          if ((player.cleansLeft ?? JHARUDAR_CLEAN_USES) <= 0) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'সাফাই বাটপার',
              detail: 'সব সাফাই (৩/৩) ব্যবহার হয়ে গেছে!',
            });
            return;
          }
          if (player.abilityCooldown > 0.05) return;
          const body = findNearestCleanableBody(player, this.bodies);
          if (!body) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'সাফাই বাটপার',
              detail: 'সাফ করতে রিপোর্ট না হওয়া লাশের কাছে যাও!',
            });
            return;
          }
          player.jharuTargetBodyId = body.id;
          player.jharuTimer = JHARUDAR_CLEAN_CHANNEL_SEC;
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'ঝাড়ু দেওয়া হচ্ছে...',
            detail: `লাশ সরাতে ${body.victimName}-এর পাশে ২ সেকেন্ড স্থির হয়ে দাঁড়াও!`,
          });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'ghotok_khala') {
          if (this.ghotokLinkedIds) {
            const [aId, bId] = this.ghotokLinkedIds;
            const aName = this.players.get(aId)?.name ?? 'প্রথম জন';
            const bName = this.players.get(bId)?.name ?? 'দ্বিতীয় জন';
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'ঘটকের জুটি চালু',
              detail: `${aName} ও ${bName} আগে থেকেই জুটি বাঁধা!`,
            });
            return;
          }
          const pair = findGhotokPairCandidates(player, Array.from(this.players.values()));
          if (!pair) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'ঘটক খালা',
              detail: 'জুটি বাঁধতে ২ জন প্রতিবেশীর কাছে যাও!',
            });
            return;
          }
          this.ghotokLinkedIds = [pair[0].id, pair[1].id];
          pair[0].ghotokPartnerId = pair[1].id;
          pair[1].ghotokPartnerId = pair[0].id;
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'clue' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'মহল্লা জুটি বাঁধা হয়েছে!',
            detail: `${pair[0].name} ও ${pair[1].name} জুটি হয়েছে — একজন মরলে আরেকজন খবর পাবে!`,
          });
          this.sendToPlayer(pair[0].id, {
            type: 'clue:result',
            title: 'ঘটক জুটি!',
            detail: `ঘটক খালা তোমাকে ${pair[1].name}-এর সাথে জুটি করে দিয়েছে!`,
          });
          if (pair[1].id !== player.id) {
            this.sendToPlayer(pair[1].id, {
              type: 'clue:result',
              title: 'ঘটক জুটি!',
              detail: `ঘটক খালা তোমাকে ${pair[0].name}-এর সাথে জুটি করে দিয়েছে!`,
            });
          }
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'master_moshai') {
          if (player.abilityCooldown > 0.05) return;
          const target = msg.targetId
            ? this.players.get(msg.targetId)
            : findNearestMasterTarget(player, Array.from(this.players.values()));
          if (!target) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'মাস্টার মশাই',
              detail: 'খাতা পরীক্ষা করতে প্রতিবেশীর কাছে যাও!',
            });
            return;
          }
          const res = inspectPlayerTaskAuthenticity(target);
          player.abilityCooldown = MASTER_COOLDOWN_SEC;
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'clue' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: res.title,
            detail: res.detail,
          });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'cctv_kaku') {
          if (player.abilityCooldown > 0.05) return;
          player.watchingCams = true;
          player.abilityCooldown = CCTV_KAKU_COOLDOWN_SEC;
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'clue' });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'hatur_daktar') {
          if (player.abilityCooldown > 0.05) return;
          const nowMs = Date.now();
          const allPlayers = Array.from(this.players.values());
          const nearby = msg.targetId
            ? this.players.get(msg.targetId)
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
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'shield' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'ঝাঁঝালো ইনজেকশন চালু!',
            detail:
              receiver.id === player.id
                ? 'নিজেকে ইনজেকশন দিয়েছ! ১২ সেকেন্ড বাটপারের আঘাত থেকে নিরাপদ!'
                : `${receiver.name}-কে ইনজেকশন দিয়েছ — ১২ সেকেন্ড মৃত্যুর হাত থেকে সুরক্ষা চালু!`,
          });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'supari_killer') {
          if (player.abilityCooldown > 0.05) return;
          const nextTarget = pickSupariContractTarget(
            player,
            Array.from(this.players.values()),
            player.supariTargetId,
          );
          if (!nextTarget) return;
          player.supariTargetId = nextTarget.id;
          player.abilityCooldown = SUPARI_COOLDOWN_SEC;
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'clue' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'নতুন সুপারি কন্ট্রাক্ট!',
            detail: `টার্গেট: ${nextTarget.name} — ৫০% কিল কুলডাউন কমবে!`,
          });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'dalal') {
          if (player.abilityCooldown > 0.05) return;
          const res = applyDalalBrokerJam(this.doorLocks);
          this.commsJammedUntil = Date.now() + DALAL_JAM_DURATION_MS;
          player.abilityCooldown = DALAL_COOLDOWN_SEC;
          this.broadcastState({ type: 'sfx:event', kind: 'door' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'দালালের জ্যাম চালু!',
            detail: `যোগাযোগ ১০ সেকেন্ড জ্যাম! ${res.newlyLockedZone ? `${res.newlyLockedZone} শাটার বন্ধ করা হয়েছে!` : 'শাটার +৮ সেকেন্ড বাড়ানো হয়েছে!'}`,
          });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'chamcha') {
          if (player.abilityCooldown > 0.05) return;
          const patron = findNearestChamchaPatron(player, Array.from(this.players.values()));
          if (!patron) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'চামচা সাগরেদ',
              detail: 'বস ঠিক করতে কারো একদম কাছে যাও!',
            });
            return;
          }
          player.chamchaPatronId = patron.id;
          player.abilityCooldown = CHAMCHA_COOLDOWN_SEC;
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'clue' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'বস ঠিক হয়েছে!',
            detail: `${patron.name} এখন তোমার বস!`,
          });
          this.broadcastState();
          return;
        }
        if (player.specialRole === 'chandabaz') {
          if (player.abilityCooldown > 0.05) return;
          if (isCriticalSabotage(this.sabotage.active)) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'গ্যাস লিক চলছে!',
              detail: 'জরুরি নাশকতার সময় চাঁদা তোলা যাবে না — আগে গ্যাস সামলাও!',
            });
            return;
          }
          const allPlayers = Array.from(this.players.values());
          const target = findNearestChandabazTarget(player, allPlayers);
          if (!target) {
            this.transport.sendToClient(clientId, {
              type: 'clue:result',
              title: 'চাঁদাবাজ',
              detail: 'চাঁদা তুলতে নতুন কোনো প্রতিবেশীর একদম কাছে যাও!',
            });
            return;
          }
          const res = collectChandaFromTarget(player, target, allPlayers);
          if (!res.ok) return;
          player.abilityCooldown = CHANDABAZ_COOLDOWN_SEC;
          notifyBotsOfChandabazExtort(player, target, allPlayers, this.botMemories, this.doorLocks);
          if (!target.isBot) {
            this.sendToPlayer(target.id, {
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
              hasLineOfSight(pl.x, pl.z, player.x, player.z, WALLS, this.doorLocks)
            ) {
              this.sendToPlayer(pl.id, {
                type: 'clue:result',
                title: 'চাঁদাবাজির সাক্ষী!',
                detail: `${player.name} এইমাত্র ${target.name}-এর কাছ থেকে চাঁদা নিচ্ছে!`,
              });
            }
          }
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'task' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: `চাঁদা উসুল (${countAliveChandabazTargets(player, allPlayers)}/${getChandabazGoal(player, allPlayers)})!`,
            detail: `${target.name}-এর কাছ থেকে চাঁদা আদায় করা হয়েছে — বাকি সবাই বেঁচে থাকা অবস্থায় শেষ করো!`,
          });
          if (!this.checkWin()) {
            this.broadcastState();
          }
          return;
        }
        if (player.specialRole === 'tiktok_star') {
          if (player.abilityCooldown > 0.05) return;
          const zoneId = getZoneIdAt(player.x, player.z);
          const res = recordTiktokReelInZone(player, zoneId);
          if (!res.ok) {
            this.transport.sendToClient(clientId, {
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
          this.transport.sendToClient(clientId, { type: 'sfx:event', kind: 'disguise' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: `ভাইরাল রিল (${res.zoneCount}/${TIKTOK_ZONE_GOAL})!`,
            detail: `${getBanglaZoneNameAt(player.x, player.z)} এলাকায় শুটিং শেষ! জিততে শেষ ৪ জনে টিকে থাকো!`,
          });
          if (!this.checkWin()) {
            this.broadcastState();
          }
        }
        break;
      }
      case 'player:kill': {
        if (this.phase !== 'playing') return;
        const target = this.players.get(msg.targetId);
        if (!target) return;
        const check = canExecuteKill(player, target);
        if (!check.allowed) return;
        const nowMs = Date.now();
        if (isPlayerShieldedNow(target, nowMs)) {
          target.shielded = false;
          target.haturProtectedUntil = 0;
          player.killCooldownRemaining = 6;
          this.broadcastState({ type: 'sfx:event', kind: 'shield' });
          this.transport.sendToClient(clientId, {
            type: 'clue:result',
            title: 'সুরক্ষা ভেঙে গেছে!',
            detail: `${target.name} তাবিজ বা ঝাঁঝালো ইনজেকশনে সুরক্ষিত ছিল!`,
          });
          this.sendToPlayer(target.id, {
            type: 'clue:result',
            title: 'সুরক্ষা তোমাকে বাঁচিয়েছে!',
            detail: 'একজন বাটপার হামলা করেছিল, কিন্তু তোমার তাবিজ বা ইনজেকশন বাঁচিয়ে দিয়েছে!',
          });
          this.broadcastState();
          return;
        }
        dismountPlayerFromVehicle(target, this.vehicles, this.doorLocks, false);
        target.alive = false;
        target.watchingCams = false;
        const hitSupari = player.specialRole === 'supari_killer' && target.id === player.supariTargetId;
        player.killCooldownRemaining = hitSupari
          ? this.settings.killCooldownSec * 0.5
          : this.settings.killCooldownSec;
        if (player.specialRole === 'supari_killer') {
          player.supariTargetId =
            pickSupariContractTarget(
              player,
              Array.from(this.players.values()),
              player.supariTargetId,
            )?.id ?? null;
        }
        player.x = target.x;
        player.z = target.z;
        this.bodies.push({
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
        if (!player.isBot) {
          this.sendToPlayer(player.id, { type: 'sfx:event', kind: 'kill' });
        }
        if (!target.isBot && target.id !== player.id) {
          this.sendToPlayer(target.id, { type: 'sfx:event', kind: 'kill' });
        }
        this.handleDeathSideEffects(target);
        recordKillWitnesses(
          this.botMemories,
          Array.from(this.players.values()),
          player,
          target,
          this.sabotage.active,
          this.doorLocks,
        );
        if (!this.checkWin()) {
          this.broadcastState();
        }
        break;
      }
      case 'player:vent_toggle': {
        if (this.phase !== 'playing' || !canUseVent(player)) return;
        const emitVentSfx = () => {
          if (player.specialRole === 'mistri') {
            for (const listener of this.players.values()) {
              if (!listener.isBot && isMistriVentAudibleTo(player, listener)) {
                this.sendToPlayer(listener.id, { type: 'sfx:event', kind: 'vent' });
              }
            }
          } else {
            this.broadcastState({ type: 'sfx:event', kind: 'vent' });
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
        this.broadcastState();
        break;
      }
      case 'player:sabotage': {
        if (this.phase !== 'playing' || !player.alive || player.role !== 'vondo') return;
        if (this.sabotage.active || this.sabotage.cooldownRemaining > 0) return;
        this.sabotage = createSabotageState(msg.sabotageType, SABOTAGE_COOLDOWN_SEC);
        this.holdingFixMap.clear();
        this.broadcastState({ type: 'sfx:event', kind: 'sabotage' });
        this.broadcastState();
        break;
      }
      case 'player:lock_doors': {
        if (this.phase !== 'playing' || !player.alive || player.role !== 'vondo') return;
        if (this.doorLocks.cooldownRemaining > 0) return;
        this.doorLocks[msg.zoneId] = DOOR_LOCK_DURATION_SEC;
        this.doorLocks.cooldownRemaining = DOOR_LOCK_COOLDOWN_SEC;
        this.broadcastState({ type: 'sfx:event', kind: 'door' });
        this.broadcastState();
        break;
      }
      case 'player:watch_cams': {
        if (this.phase !== 'playing') return;
        player.watchingCams = msg.watching;
        this.broadcastState();
        break;
      }
      case 'player:fix_sabotage': {
        if (this.phase !== 'playing' || !player.alive || !this.sabotage.active) {
          this.holdingFixMap.delete(player.id);
          return;
        }
        if (msg.holding === false) {
          this.holdingFixMap.delete(player.id);
          return;
        }
        const range = player.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
        if (this.sabotage.active === 'gas_leak') {
          const nearValve = msg.valveId
            ? GAS_LEAK_VALVES.find((v) => v.id === msg.valveId && distance2D(player.x, player.z, v.x, v.z) <= range)
            : findNearestGasValve(player.x, player.z, this.sabotage, range);
          if (nearValve) {
            this.holdingFixMap.set(player.id, { valveId: nearValve.id });
          } else {
            this.holdingFixMap.delete(player.id);
          }
          break;
        }
        if (distance2D(player.x, player.z, this.sabotage.fixStationX, this.sabotage.fixStationZ) <= range) {
          this.holdingFixMap.set(player.id, {});
        } else {
          this.holdingFixMap.delete(player.id);
        }
        break;
      }
      case 'player:report_body': {
        if (this.phase !== 'playing' || !player.alive) return;
        const body = this.bodies.find((b) => b.id === msg.bodyId && !b.reported);
        if (!body) return;
        if (distance2D(player.x, player.z, body.x, body.z) > REPORT_RANGE + 1.0) return;
        if (!hasLineOfSight(player.x, player.z, body.x, body.z, WALLS, this.doorLocks)) return;
        body.reported = true;
        this.startMeeting(player, 'body', body.victimName);
        break;
      }
      case 'player:emergency_meeting': {
        if (
          this.phase !== 'playing' ||
          !player.alive ||
          isCriticalSabotage(this.sabotage.active) ||
          this.emergencyCooldownRemaining > 0 ||
          player.emergencyMeetingsLeft <= 0
        ) {
          return;
        }
        if (
          distance2D(player.x, player.z, EMERGENCY_BELL_POS.x, EMERGENCY_BELL_POS.z) <=
          EMERGENCY_BELL_POS.interactRadius
        ) {
          player.emergencyMeetingsLeft--;
          this.startMeeting(player, 'emergency');
        }
        break;
      }
      case 'meeting:chat': {
        if (this.phase !== 'meeting') return;
        const text = msg.text.trim().slice(0, 140);
        if (!text) return;
        this.typingPlayers.delete(player.id);
        const chatMsg: ChatMessage = {
          id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          senderId: player.id,
          senderName: player.alive ? player.name : `${player.name} (ভূত)`,
          senderColor: player.color,
          text,
          timestamp: Date.now(),
          ghostOnly: !player.alive,
        };
        this.chat.push(chatMsg);
        const allPlayers = Array.from(this.players.values());
        processChatMessageForBots({
          msg: chatMsg,
          players: allPlayers,
          brains: this.botMemories,
        });
        if (
          !player.isBot &&
          player.alive &&
          this.meetingReason &&
          Date.now() - this.lastGeminiReactionAt >= 4000 &&
          allPlayers.some((pl) => pl.isBot && pl.alive)
        ) {
          this.lastGeminiReactionAt = Date.now();
          void this.fetchGeminiMeetingChats(
            this.meetingEpoch,
            this.meetingReason,
            this.meetingCallerId ?? player.id,
            'reaction',
          );
        }
        this.broadcastState();
        break;
      }
      case 'meeting:typing': {
        if (this.phase !== 'meeting' || !player.alive) return;
        if (msg.typing) this.typingPlayers.add(player.id);
        else this.typingPlayers.delete(player.id);
        this.broadcastState();
        break;
      }
      case 'meeting:vote': {
        if (this.phase !== 'meeting' || this.discussionTimer > 0 || !player.alive || player.hasVoted) {
          return;
        }
        player.votedFor = msg.targetId;
        player.hasVoted = true;
        const alivePlayers = Array.from(this.players.values()).filter((p) => p.alive);
        if (alivePlayers.length === 0 || alivePlayers.every((p) => p.hasVoted)) {
          this.resolveMeetingVotes();
        } else {
          this.broadcastState();
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
          this.broadcastState({ type: 'meme:play', memeId: msg.memeId });
        }
        break;
      }
      case 'room:play_again': {
        if (!player.isHost) return;
        this.phase = 'lobby';
        this.bodies = [];
        this.footprints = [];
        this.footprintAccum.clear();
        this.holdingFixMap.clear();
        this.chat = [];
        this.outcome = null;
        this.ejection = null;
        this.justEjectedPlayer = null;
        this.meetingCallerId = null;
        this.meetingReason = null;
        this.meetingTimer = 0;
        this.discussionTimer = 0;
        this.lobbyCountdownSec = null;
        this.netaRevealedId = null;
        this.prankedLampUntil = 0;
        this.commsJammedUntil = 0;
        this.ghotokLinkedIds = null;
        this.emergencyCooldownRemaining = 0;
        this.vehicles = createInitialVehicles();
        this.sabotage = createEmptySabotageState(SABOTAGE_INITIAL_LOCKOUT_SEC);
        this.doorLocks = makeEmptyDoorLocks();
        let idx = 0;
        for (const p of this.players.values()) {
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
          p.emergencyMeetingsLeft = this.settings.emergencyMeetingsPerPlayer;
          p.ready = p.isHost || p.isBot;
          p.hasVoted = false;
          p.votedFor = null;
          idx++;
        }
        this.broadcastState();
        break;
      }
    }
  }
}
