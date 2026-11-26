import {
  PLAYER_COLORS,
  type DoorZoneId,
  type PlayerColorId,
  type PlayerState,
  type RoomSettings,
  type RoomSnapshot,
  type SabotageType,
  type SpecialRole,
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
  findNearestKillTarget,
  findNearestMasterTarget,
  findNearestReportableBody,
  findNearestRevivableBody,
  findNearestShieldTarget,
  getChandabazGoal,
  getColorShadeHint,
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
import { soundEngine } from '../audio/soundEngine';

const BOT_ROSTER: Array<{ name: string; color: PlayerColorId }> = [
  { name: 'Chacha Miah', color: 'holud' },
  { name: 'Babu Bhai', color: 'neel' },
  { name: 'Tuktuki Apa', color: 'beguni' },
  { name: 'Pintu Da', color: 'shobuj' },
  { name: 'Komola Kaku', color: 'komola' },
  { name: 'Kallu Ustad', color: 'kalo' },
  { name: 'Sada Dada', color: 'sada' },
  { name: 'Golapi Rani', color: 'golapi' },
  { name: 'Akashi Tara', color: 'akashi' },
  { name: 'Badami Mama', color: 'badami' },
  { name: 'Tutu Chacha', color: 'tute' },
  { name: 'Jam Kaka', color: 'jam' },
  { name: 'Pata Bhai', color: 'olive' },
  { name: 'Sona Babu', color: 'tan' },
  { name: 'Lal Mia', color: 'lal' },
  { name: 'Habu Don', color: 'korolla' },
  { name: 'Firoza Vabi', color: 'firoza' },
  { name: 'Sindur Bhai', color: 'sindur' },
  { name: 'Mehedi Mama', color: 'mehedi' },
  { name: 'Chandan Dada', color: 'chandan' },
];

export class SoloMatchEngine {
  public localPlayerId = 'local_hero';
  private snapshot: RoomSnapshot;
  private brains = new Map<string, BotBrainState>();
  private phaseTimer = 0;
  private lobbyCountdownTimer = 0;
  private lastLobbyChatAt = 0;
  private footprintAccum = new Map<string, number>();
  private justEjectedPlayer: PlayerState | null = null;
  private holdingFixMap = new Map<string, { valveId?: 'valve_cha' | 'valve_rickshaw' }>();
  private forcedRole?: 'parabasi' | 'vondo';
  private forcedSpecialRole?: SpecialRole;
  private botCounter = 10;
  private meetingEpoch = 0;
  private lastGeminiReactionAt = 0;
  private geminiCooldownUntil = 0;
  private localTyping = false;
  public onClueNotice?: (title: string, detail: string) => void;

  constructor(
    playerName: string,
    playerColor: PlayerColorId,
    forceRole?: 'parabasi' | 'vondo',
    skipRoleReveal = false,
    forceSpecialRole?: SpecialRole,
    onClueNotice?: (title: string, detail: string) => void,
    customSettings?: Partial<RoomSettings>,
    requestedPlayerCount: number = 7,
  ) {
    this.onClueNotice = onClueNotice;
    this.forcedRole = forceRole;
    this.forcedSpecialRole = forceSpecialRole;
    const cleanName = sanitizePlayerName(playerName);
    const { playerCount, settings } = sanitizeSoloConfig(requestedPlayerCount, customSettings);
    const pickedOthers = BOT_ROSTER.filter((b) => b.color !== playerColor).slice(0, playerCount - 1);

    const rawPlayers: PlayerState[] = [
      makeDefaultPlayerState({
        id: this.localPlayerId,
        name: cleanName,
        color: playerColor,
        x: SPAWN_RING[0].x,
        z: SPAWN_RING[0].z,
        yaw: SPAWN_RING[0].yaw,
        isBot: false,
        isHost: true,
        ready: true,
        emergencyMeetingsLeft: settings.emergencyMeetingsPerPlayer,
      }),
      ...pickedOthers.map((b, i) =>
        makeDefaultPlayerState({
          id: `bot_${i + 1}`,
          name: b.name,
          color: b.color,
          x: SPAWN_RING[(i + 1) % SPAWN_RING.length].x,
          z: SPAWN_RING[(i + 1) % SPAWN_RING.length].z,
          yaw: SPAWN_RING[(i + 1) % SPAWN_RING.length].yaw,
          isBot: true,
          isHost: false,
          ready: true,
          emergencyMeetingsLeft: settings.emergencyMeetingsPerPlayer,
        }),
      ),
    ];

    this.snapshot = {
      roomCode: 'SOLO',
      isSolo: true,
      phase: 'lobby',
      players: rawPlayers,
      bodies: [],
      footprints: [],
      sabotage: createEmptySabotageState(SABOTAGE_INITIAL_LOCKOUT_SEC),
      doorLocks: makeEmptyDoorLocks(),
      chat: [],
      lobbyChat: [],
      lobbyCountdownSec: null,
      meetingCallerId: null,
      meetingReason: null,
      meetingTimer: 0,
      discussionTimer: 0,
      emergencyCooldownRemaining: 0,
      ejection: null,
      outcome: null,
      settings: { ...settings },
      taskProgress: 0,
      totalTasks: 0,
      completedTasks: 0,
      netaRevealedId: null,
      prankedLampUntil: 0,
      commsJammedUntil: 0,
      ghotokLinkedIds: null,
      vehicles: createInitialVehicles(),
    };

    if (skipRoleReveal) {
      this.startMatchInternal(true);
    }
  }

  private startMatchInternal(skipRoleReveal = false): void {
    const check = canStartLobbyMatch(this.snapshot.players);
    if (!check.ok) {
      this.onClueNotice?.('লবি', check.reason ?? 'আরও খেলোয়াড় লাগবে!');
      return;
    }

    const effectiveBaseRole =
      this.forcedSpecialRole === 'bohurupi' ||
      this.forcedSpecialRole === 'jharudar' ||
      this.forcedSpecialRole === 'supari_killer' ||
      this.forcedSpecialRole === 'dalal'
        ? 'vondo'
        : this.forcedSpecialRole && this.forcedSpecialRole !== 'none'
          ? 'parabasi'
          : this.forcedRole;

    const sanitized = sanitizeSoloConfig(this.snapshot.players.length, this.snapshot.settings);
    this.snapshot.settings = sanitized.settings;

    let assigned = assignRoles(this.snapshot.players, sanitized.settings.vondoCount);
    if (effectiveBaseRole) {
      assigned = assigned.map((p, idx) => ({
        ...p,
        role:
          effectiveBaseRole === 'vondo'
            ? idx === 0
              ? 'vondo'
              : 'parabasi'
            : idx === 1
              ? 'vondo'
              : 'parabasi',
      }));
    }

    assigned = assignSpecialRoles(
      assigned,
      sanitized.settings.enableSpecialRoles,
      this.forcedSpecialRole,
      this.localPlayerId,
      Math.random,
      sanitized.settings.enableNeutralRoles,
    );

    assignMatchTasks(assigned, sanitized.settings.tasksPerPlayer);
    this.brains.clear();
    this.footprintAccum.clear();
    this.holdingFixMap.clear();
    this.justEjectedPlayer = null;

    assigned.forEach((p, idx) => {
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
      p.shielded = false;
      p.disguiseColor = null;
      p.disguiseName = null;
      p.disguiseTimer = 0;
      p.hasVoted = false;
      p.votedFor = null;
      p.killCooldownRemaining = p.role === 'vondo' ? INITIAL_KILL_COOLDOWN_SEC : 0;
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
      p.jharuTargetBodyId = null;
      p.jharuTimer = 0;
      p.haturProtectedUntil = 0;
      p.supariTargetId =
        p.specialRole === 'supari_killer' ? pickSupariContractTarget(p, assigned)?.id ?? null : null;
      p.chamchaPatronId = null;
      p.chandabazTargets = [];
      p.tiktokZones = [];
      p.ghotokPartnerId = null;
      p.emergencyMeetingsLeft =
        p.specialRole === 'neta'
          ? sanitized.settings.emergencyMeetingsPerPlayer + 1
          : sanitized.settings.emergencyMeetingsPerPlayer;
      if (p.isBot) {
        const brain = createBotBrainState();
        brain.lastX = p.x;
        brain.lastZ = p.z;
        this.brains.set(p.id, brain);
      }
    });

    const stats = computeTaskProgress(assigned);
    this.snapshot.players = assigned;
    this.snapshot.bodies = [];
    this.snapshot.footprints = [];
    this.snapshot.vehicles = createInitialVehicles();
    this.snapshot.sabotage = createEmptySabotageState(SABOTAGE_INITIAL_LOCKOUT_SEC);
    this.snapshot.doorLocks = makeEmptyDoorLocks();
    this.snapshot.lobbyCountdownSec = null;
    this.lobbyCountdownTimer = 0;
    this.snapshot.meetingCallerId = null;
    this.snapshot.meetingReason = null;
    this.snapshot.meetingTimer = 0;
    this.snapshot.discussionTimer = 0;
    this.snapshot.emergencyCooldownRemaining = skipRoleReveal
      ? 0
      : sanitized.settings.emergencyCooldownSec;
    this.snapshot.ejection = null;
    this.snapshot.outcome = null;
    this.snapshot.netaRevealedId = null;
    this.snapshot.prankedLampUntil = 0;
    this.snapshot.commsJammedUntil = 0;
    this.snapshot.ghotokLinkedIds = null;
    this.snapshot.taskProgress = stats.progress;
    this.snapshot.totalTasks = stats.totalTasks;
    this.snapshot.completedTasks = stats.completedTasks;
    this.snapshot.chat = [
      {
        id: 'sys_start',
        senderId: 'system',
        senderName: 'মহল্লা ঘোষণা',
        senderColor: 'holud',
        text: sanitized.settings.enableSpecialRoles
          ? 'খেলা শুরু! বিশেষ মহল্লা রোল চালু আছে — বাটপারদের থেকে সাবধান!'
          : 'খেলা শুরু! পাড়ার সব কাজ শেষ করো অথবা সালিশে আসল বাটপারকে খুঁজে বের করো!',
        timestamp: Date.now(),
        system: true,
      },
    ];
    this.snapshot.phase = skipRoleReveal ? 'playing' : 'role_reveal';
    this.phaseTimer = skipRoleReveal ? 0 : 15.0;
  }

  public updateLobbySettings(partial: Partial<RoomSettings>): void {
    if (this.snapshot.phase !== 'lobby') return;
    const sanitized = sanitizeSoloConfig(
      Math.max(MIN_MATCH_PLAYERS, this.snapshot.players.length),
      { ...this.snapshot.settings, ...partial },
    );
    this.snapshot.settings = sanitized.settings;
  }

  public customizeLocal(name?: string, color?: PlayerColorId): void {
    if (this.snapshot.phase !== 'lobby') return;
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp) return;
    if (typeof name === 'string') {
      const otherNames = this.snapshot.players.filter((p) => p.id !== lp.id).map((p) => p.name);
      lp.name = sanitizePlayerName(name, otherNames);
    }
    if (color && !this.snapshot.players.some((p) => p.id !== lp.id && p.color === color)) {
      lp.color = color;
    }
  }

  public addBot(): void {
    if (this.snapshot.phase !== 'lobby' || this.snapshot.players.length >= MAX_MATCH_PLAYERS) return;
    const usedColors = new Set(this.snapshot.players.map((p) => p.color));
    const usedNames = this.snapshot.players.map((p) => p.name);
    const candidate =
      BOT_ROSTER.find((b) => !usedColors.has(b.color)) ??
      BOT_ROSTER[this.snapshot.players.length % BOT_ROSTER.length];
    const openColor = PLAYER_COLORS.find((c) => !usedColors.has(c.id))?.id ?? candidate.color;
    const idx = this.snapshot.players.length;
    const sp = SPAWN_RING[idx % SPAWN_RING.length];
    this.snapshot.players.push(
      makeDefaultPlayerState({
        id: `bot_${++this.botCounter}`,
        name: sanitizePlayerName(candidate.name, usedNames),
        color: openColor,
        x: sp.x,
        z: sp.z,
        yaw: sp.yaw,
        isBot: true,
        isHost: false,
        ready: true,
        emergencyMeetingsLeft: this.snapshot.settings.emergencyMeetingsPerPlayer,
      }),
    );
    soundEngine.playLobbyJoin(false);
  }

  public removeBot(targetPlayerId?: string): void {
    if (this.snapshot.phase !== 'lobby') return;
    const idx = targetPlayerId
      ? this.snapshot.players.findIndex((p) => p.id === targetPlayerId && p.isBot)
      : (() => {
          for (let i = this.snapshot.players.length - 1; i >= 0; i--) {
            if (this.snapshot.players[i].isBot) return i;
          }
          return -1;
        })();
    if (idx < 0) return;
    this.snapshot.players.splice(idx, 1);
    if (!canStartLobbyMatch(this.snapshot.players).ok) {
      this.cancelCountdown();
    }
    soundEngine.playLobbyJoin(true);
  }

  public removeBots(): void {
    if (this.snapshot.phase !== 'lobby') return;
    this.snapshot.players = this.snapshot.players.filter((p) => !p.isBot);
    this.cancelCountdown();
    soundEngine.playLobbyJoin(true);
  }

  public sendLobbyChat(text: string): void {
    if (this.snapshot.phase !== 'lobby') return;
    const now = Date.now();
    if (now - this.lastLobbyChatAt < 500) return;
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp) return;
    const clean = text.trim().slice(0, LOBBY_CHAT_MAX_CHARS);
    if (!clean) return;
    this.lastLobbyChatAt = now;
    const list = this.snapshot.lobbyChat ?? [];
    list.push({
      id: `lchat_${now}_${Math.random().toString(36).slice(2, 5)}`,
      senderId: lp.id,
      senderName: lp.name,
      senderColor: lp.color,
      text: clean,
      timestamp: now,
    });
    this.snapshot.lobbyChat = list.slice(-40);
  }

  public startCountdown(): boolean {
    if (this.snapshot.phase !== 'lobby') return false;
    const check = canStartLobbyMatch(this.snapshot.players);
    if (!check.ok) {
      this.onClueNotice?.('শুরু করা যাচ্ছে না', check.reason ?? 'আরও খেলোয়াড় লাগবে!');
      return false;
    }
    this.lobbyCountdownTimer = 5.0;
    this.snapshot.lobbyCountdownSec = 5;
    soundEngine.playLobbyTick();
    return true;
  }

  public cancelCountdown(): void {
    if (this.snapshot.lobbyCountdownSec !== null) {
      this.snapshot.lobbyCountdownSec = null;
      this.lobbyCountdownTimer = 0;
    }
  }

  public playAgainToLobby(): void {
    this.brains.clear();
    this.footprintAccum.clear();
    this.holdingFixMap.clear();
    this.justEjectedPlayer = null;
    this.snapshot.phase = 'lobby';
    this.snapshot.bodies = [];
    this.snapshot.footprints = [];
    this.snapshot.chat = [];
    this.snapshot.outcome = null;
    this.snapshot.ejection = null;
    this.snapshot.meetingCallerId = null;
    this.snapshot.meetingReason = null;
    this.snapshot.meetingTimer = 0;
    this.snapshot.discussionTimer = 0;
    this.snapshot.lobbyCountdownSec = null;
    this.lobbyCountdownTimer = 0;
    this.snapshot.netaRevealedId = null;
    this.snapshot.prankedLampUntil = 0;
    this.snapshot.commsJammedUntil = 0;
    this.snapshot.ghotokLinkedIds = null;
    this.snapshot.emergencyCooldownRemaining = 0;
    this.snapshot.vehicles = createInitialVehicles();
    this.snapshot.sabotage = createEmptySabotageState(SABOTAGE_INITIAL_LOCKOUT_SEC);
    this.snapshot.doorLocks = makeEmptyDoorLocks();
    this.snapshot.players.forEach((p, idx) => {
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
      p.emergencyMeetingsLeft = this.snapshot.settings.emergencyMeetingsPerPlayer;
      p.ready = true;
      p.hasVoted = false;
      p.votedFor = null;
    });
  }

  public dismissRoleReveal(): void {
    if (this.snapshot.phase === 'role_reveal') {
      this.snapshot.phase = 'playing';
      this.phaseTimer = 0;
    }
  }

  public dismissEjection(): void {
    if (this.snapshot.phase === 'ejecting') {
      this.phaseTimer = 0.01;
    }
  }

  public getSnapshot(): RoomSnapshot {
    const stats = computeTaskProgress(this.snapshot.players);
    return {
      ...this.snapshot,
      players: this.snapshot.players.map((p) => ({ ...p, tasks: p.tasks.map((t) => ({ ...t })) })),
      bodies: this.snapshot.bodies.map((b) => ({ ...b })),
      footprints: this.snapshot.footprints.map((f) => ({ ...f })),
      sabotage: {
        ...this.snapshot.sabotage,
        valves: this.snapshot.sabotage.valves.map((v) => ({ ...v })),
      },
      doorLocks: { ...this.snapshot.doorLocks },
      chat: [...this.snapshot.chat],
      lobbyChat: [...(this.snapshot.lobbyChat ?? [])],
      meetingTimer: Math.max(0, Math.ceil(this.snapshot.meetingTimer)),
      discussionTimer: Math.max(0, Math.ceil(this.snapshot.discussionTimer ?? 0)),
      emergencyCooldownRemaining: Math.max(0, Math.ceil(this.snapshot.emergencyCooldownRemaining)),
      taskProgress: stats.progress,
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      vehicles: (this.snapshot.vehicles ?? []).map((v) => ({ ...v })),
    };
  }

  private recordFootprint(p: PlayerState, distMoved: number): void {
    if (!p.alive || p.inVent || p.vehicleId || distMoved < 0.05) return;
    const prev = (this.footprintAccum.get(p.id) ?? 0) + distMoved;
    if (prev >= 2.2) {
      this.footprintAccum.set(p.id, 0);
      const shownColor = p.disguiseColor ?? p.color;
      this.snapshot.footprints.push({
        id: `fp_${Date.now()}_${p.id}_${Math.random().toString(36).slice(2, 5)}`,
        x: p.x,
        z: p.z,
        color: shownColor,
        expiresAt: Date.now() + 7500,
      });
      if (this.snapshot.footprints.length > 36) {
        this.snapshot.footprints.shift();
      }
    } else {
      this.footprintAccum.set(p.id, prev);
    }
  }

  public moveLocal(x: number, z: number, vx: number, vz: number, yaw: number, y?: number): void {
    if (this.snapshot.phase !== 'playing' && this.snapshot.phase !== 'lobby') return;
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || lp.inVent || lp.vehicleId) return;
    const prevY = lp.y ?? 0;
    let resolved = lp.alive
      ? resolvePlayerMoveWithElevation(
          lp.x,
          lp.z,
          y ?? prevY,
          x,
          z,
          PLAYER_RADIUS,
          WALLS,
          this.snapshot.doorLocks,
        )
      : { x, z, y: y ?? prevY };
    if (lp.alive && (resolved.y ?? 0) < 0.8) {
      const pv = resolvePedestrianVehicleCollision(resolved.x, resolved.z, PLAYER_RADIUS, this.snapshot.vehicles);
      resolved = { ...resolved, x: pv.x, z: pv.z };
    }
    const moved = Math.hypot(resolved.x - lp.x, resolved.z - lp.z);
    lp.x = resolved.x;
    lp.z = resolved.z;
    lp.y = resolved.y;
    lp.vx = vx;
    lp.vz = vz;
    lp.yaw = yaw;
    if (this.snapshot.phase === 'playing') {
      this.recordFootprint(lp, moved);
    }
  }

  public toggleLocalVehicle(vehicleId?: string): boolean {
    if (this.snapshot.phase !== 'playing' && this.snapshot.phase !== 'lobby') return false;
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !lp.alive || lp.inVent) return false;
    const vehicles = this.snapshot.vehicles ?? [];
    if (lp.vehicleId) {
      const exited = dismountPlayerFromVehicle(lp, vehicles, this.snapshot.doorLocks, true);
      if (exited) {
        soundEngine.playVehicleExit(exited.kind);
      }
      return true;
    }
    if ((lp.y ?? 0) > 1.2) return false;
    const target = vehicleId
      ? vehicles.find((v) => v.id === vehicleId && !v.driverId && distance2D(lp.x, lp.z, v.x, v.z) <= 5.5)
      : findNearestAvailableVehicle(lp.x, lp.z, vehicles);
    if (!target) return false;
    lp.vehicleId = target.id;
    lp.watchingCams = false;
    lp.jharuTargetBodyId = null;
    lp.jharuTimer = 0;
    this.holdingFixMap.delete(lp.id);
    target.driverId = lp.id;
    target.speed = 0;
    target.vx = 0;
    target.vz = 0;
    target.steer = 0;
    lp.x = target.x;
    lp.z = target.z;
    lp.y = 0;
    lp.vx = 0;
    lp.vz = 0;
    lp.yaw = target.yaw;
    soundEngine.playVehicleEnter(target.kind);
    return true;
  }

  public driveLocalVehicle(
    x: number,
    z: number,
    yaw: number,
    vx: number,
    vz: number,
    speed: number,
    steer: number,
  ): void {
    if (this.snapshot.phase !== 'playing' && this.snapshot.phase !== 'lobby') return;
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !lp.alive || !lp.vehicleId) return;
    const vehicles = this.snapshot.vehicles ?? [];
    const v = vehicles.find((item) => item.id === lp.vehicleId && item.driverId === lp.id);
    if (!v) return;
    const spec = VEHICLE_SPECS[v.kind];
    const resolved = resolveVehicleCollision(
      x,
      z,
      spec.collisionRadius,
      vehicles,
      v.id,
      this.snapshot.doorLocks,
    );
    v.x = resolved.x;
    v.z = resolved.z;
    v.yaw = yaw;
    const maxAllowed = spec.maxSpeed * 1.35;
    v.speed = Math.max(-spec.reverseSpeed * 1.2, Math.min(maxAllowed, speed));
    v.vx = vx;
    v.vz = vz;
    v.steer = Math.max(-1, Math.min(1, steer));
    lp.x = v.x;
    lp.z = v.z;
    lp.y = 0;
    lp.yaw = yaw;
    lp.vx = vx;
    lp.vz = vz;
  }

  public honkLocalVehicle(): void {
    if (this.snapshot.phase !== 'playing' && this.snapshot.phase !== 'lobby') return;
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !lp.alive || !lp.vehicleId) return;
    const v = this.snapshot.vehicles?.find((item) => item.id === lp.vehicleId);
    if (v) {
      soundEngine.playVehicleHorn(v.kind);
    }
  }

  public setWatchingCams(watching: boolean): void {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (lp) lp.watchingCams = watching;
  }

  public completeLocalTask(taskId: string): boolean {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp) return false;
    if (isTaskLockedBySabotage(taskId, this.snapshot.sabotage)) return false;
    const st = TASK_STATIONS.find((s) => s.id === taskId);
    if (!st || distance2D(lp.x, lp.z, st.x, st.z) > st.radius + 1.5) return false;
    const t = lp.tasks.find((item) => item.taskId === taskId);
    if (!t || t.completed) return false;

    // Batpar fake tasks mark locally on their fake checklist ONLY — NO visual effect & NO team progress
    if (!canCompleteTasks(lp) || t.isFake) {
      t.completed = true;
      soundEngine.playTaskComplete();
      return false;
    }

    t.completed = true;
    if (st.isVisual && this.snapshot.settings.visualTasks) {
      lp.visualTaskTimer = 2.8;
    }
    soundEngine.playTaskComplete();
    this.checkWin();
    return true;
  }

  public useSpecialAbility(targetId?: string): void {
    if (this.snapshot.phase !== 'playing') return;
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp) return;

    if (!lp.alive) {
      if ((lp.pranksLeft ?? 0) <= 0) {
        this.onClueNotice?.('ল্যাম্প প্র্যাঙ্ক শেষ', 'এই রাউন্ডে ল্যাম্প প্র্যাঙ্ক শেষ — পরের সালিশের পর আবার পারবে!');
        return;
      }
      lp.pranksLeft = 0;
      this.snapshot.prankedLampUntil = Date.now() + 3500;
      soundEngine.playDisguise();
      this.onClueNotice?.('মহল্লার বাতি ঝিকমিক!', 'ভূতের মজার প্র্যাঙ্ক — রাস্তার বাতি ৩.৫ সেকেন্ড ঝিকমিক করছে!');
      return;
    }

    if (lp.inVent) return;

    if (lp.specialRole === 'goyenda') {
      const scan = executeGoyendaScan(lp, this.snapshot.bodies, Date.now());
      if (!scan.ok) {
        this.onClueNotice?.(
          'গোয়েন্দা স্ক্যানার',
          scan.reason === 'no_scans_left'
            ? 'সব ফরেনসিক স্ক্যান (২/২) শেষ হয়ে গেছে!'
            : 'ফরেনসিক সূত্র স্ক্যান করতে পড়ে থাকা প্রতিবেশীর লাশের কাছে যাও।',
        );
        return;
      }
      soundEngine.playClueScan();
      this.onClueNotice?.(scan.clue!.title, scan.clue!.detail);
      this.snapshot.chat.push({
        id: `clue_${Date.now()}`,
        senderId: 'system',
        senderName: 'গোয়েন্দা নোটবুক',
        senderColor: 'neel',
        text: `[${scan.clue!.title}] ${scan.clue!.detail}`,
        timestamp: Date.now(),
        system: true,
      });
      return;
    }

    if (lp.specialRole === 'kobiraj') {
      if (lp.abilityCooldown > 0.05) return;
      const nearby = targetId
        ? this.snapshot.players.find((p) => p.id === targetId && p.alive && !p.inVent)
        : findNearestShieldTarget(lp, this.snapshot.players);
      const receiver = nearby ?? (!lp.shielded ? lp : null);
      if (!receiver) return;
      receiver.shielded = true;
      lp.abilityCooldown = KOBIRAJ_COOLDOWN_SEC;
      soundEngine.playShieldBlock();
      this.onClueNotice?.(
        'তাবিজের সুরক্ষা চালু',
        receiver.id === lp.id
          ? 'নিজের গায়ে সুরক্ষার তাবিজ পরে নিয়েছ!'
          : `${receiver.name}-কে কবিরাজের তাবিজ দিয়ে সুরক্ষা দিয়েছ!`,
      );
      return;
    }

    if (lp.specialRole === 'bohurupi') {
      if (lp.disguiseTimer > 0 && (!targetId || targetId === lp.id)) {
        lp.disguiseColor = null;
        lp.disguiseName = null;
        lp.disguiseTimer = 0;
        soundEngine.playDisguise();
        return;
      }
      if (lp.abilityCooldown > 0.05) return;
      const candidates = this.snapshot.players.filter(
        (p) => p.alive && p.id !== lp.id && p.role !== 'vondo',
      );
      const chosen =
        (targetId ? candidates.find((c) => c.id === targetId) : candidates[0]) ?? candidates[0];
      if (!chosen) return;
      lp.disguiseColor = chosen.color;
      lp.disguiseName = chosen.name;
      lp.disguiseTimer = BOHURUPI_DISGUISE_DURATION_SEC;
      lp.abilityCooldown = BOHURUPI_COOLDOWN_SEC;
      soundEngine.playDisguise();
      this.onClueNotice?.(
        'বহুরূপী ছদ্মবেশ',
        `${BOHURUPI_DISGUISE_DURATION_SEC} সেকেন্ডের জন্য ${chosen.name}-এর বেশ ধরেছ!`,
      );
      return;
    }

    if (lp.specialRole === 'daroga') {
      if ((lp.shotsLeft ?? 1) <= 0) {
        this.onClueNotice?.('পাড়ার দারোগা', 'তোমার ১টি দারোগার গুলি আগেই ব্যবহার হয়ে গেছে!');
        return;
      }
      if (lp.abilityCooldown > 0.05) return;
      const target = targetId
        ? this.snapshot.players.find((p) => p.id === targetId)
        : findNearestDarogaTarget(lp, this.snapshot.players);
      if (!target) {
        this.onClueNotice?.('পাড়ার দারোগা', 'গুলি চালাতে সন্দেহভাজনের একদম কাছে যাও!');
        return;
      }
      const res = resolveDarogaShot(lp, target);
      if (!res.allowed) return;
      lp.shotsLeft = Math.max(0, (lp.shotsLeft ?? 1) - 1);
      soundEngine.playDarogaShot();
      if (res.hitVondo) {
        dismountPlayerFromVehicle(target, this.snapshot.vehicles, this.snapshot.doorLocks, false);
        target.alive = false;
        target.watchingCams = false;
        lp.abilityCooldown = DAROGA_COOLDOWN_SEC;
        this.snapshot.bodies.push({
          id: `body_${Date.now()}_${target.id}`,
          victimId: target.id,
          victimName: target.name,
          color: target.color,
          x: target.x,
          z: target.z,
          reported: false,
          killedAt: Date.now(),
          killerColorHint: getColorShadeHint(lp.color),
          killerZoneHint: getBanglaZoneNameAt(target.x, target.z),
        });
        this.onClueNotice?.(
          'দারোগার নিখুঁত নিশানা!',
          `${target.name} ছিল আসল বাটপার! একেবারে সাইজ করে দিয়েছ!`,
        );
      } else {
        dismountPlayerFromVehicle(lp, this.snapshot.vehicles, this.snapshot.doorLocks, false);
        lp.alive = false;
        lp.watchingCams = false;
        this.snapshot.bodies.push({
          id: `body_${Date.now()}_${lp.id}`,
          victimId: lp.id,
          victimName: lp.name,
          color: lp.color,
          x: lp.x,
          z: lp.z,
          reported: false,
          killedAt: Date.now(),
          killerColorHint: getColorShadeHint(lp.color),
          killerZoneHint: getBanglaZoneNameAt(lp.x, lp.z),
        });
        this.onClueNotice?.(
          'দারোগার ভুল গুলি!',
          `${target.name} নিরপরাধ পাড়াবাসী ছিল! উল্টো তোমার চাকরি চলে গেল!`,
        );
      }
      this.handleDeathSideEffects(res.hitVondo ? target : lp);
      this.checkWin();
      return;
    }

    if (lp.specialRole === 'daktar') {
      if ((lp.revivesLeft ?? 0) <= 0) return;
      const body = findNearestRevivableBody(lp, this.snapshot.bodies);
      if (!body) {
        this.onClueNotice?.('পাড়ার ডাক্তার', 'স্যালাইন দিতে রিপোর্ট না হওয়া লাশের কাছে যাও!');
        return;
      }
      const victim = this.snapshot.players.find((p) => p.id === body.victimId);
      if (!victim) return;
      this.snapshot.bodies = this.snapshot.bodies.filter((b) => b.id !== body.id);
      victim.alive = true;
      victim.x = body.x;
      victim.z = body.z;
      lp.revivesLeft = Math.max(0, (lp.revivesLeft ?? 1) - 1);
      lp.abilityCooldown = 10;
      soundEngine.playRevive();
      this.onClueNotice?.(
        'স্যালাইনে জীবন বাঁচলো!',
        `পাড়ার ডাক্তার ${victim.name}-কে বাঁচিয়ে তুলেছেন!`,
      );
      return;
    }

      if (lp.specialRole === 'jharudar') {
      if ((lp.cleansLeft ?? JHARUDAR_CLEAN_USES) <= 0) {
        this.onClueNotice?.('সাফাই বাটপার', 'সব সাফাই (৩/৩) ব্যবহার হয়ে গেছে!');
        return;
      }
      if (lp.abilityCooldown > 0.05) return;
      const body = findNearestCleanableBody(lp, this.snapshot.bodies);
      if (!body) {
        this.onClueNotice?.('সাফাই বাটপার', 'সাফ করতে রিপোর্ট না হওয়া লাশের কাছে যাও!');
        return;
      }
      lp.jharuTargetBodyId = body.id;
      lp.jharuTimer = JHARUDAR_CLEAN_CHANNEL_SEC;
      this.onClueNotice?.(
        'ঝাড়ু দেওয়া হচ্ছে...',
        `লাশ সরাতে ${body.victimName}-এর পাশে ২ সেকেন্ড স্থির হয়ে দাঁড়াও!`,
      );
      return;
    }

    if (lp.specialRole === 'ghotok_khala') {
      if (this.snapshot.ghotokLinkedIds) {
        const [aId, bId] = this.snapshot.ghotokLinkedIds;
        const aName = this.snapshot.players.find((p) => p.id === aId)?.name ?? 'প্রথম জন';
        const bName = this.snapshot.players.find((p) => p.id === bId)?.name ?? 'দ্বিতীয় জন';
        this.onClueNotice?.('ঘটকের জুটি চালু', `${aName} ও ${bName} আগে থেকেই জুটি বাঁধা!`);
        return;
      }
      const pair = findGhotokPairCandidates(lp, this.snapshot.players);
      if (!pair) {
        this.onClueNotice?.('ঘটক খালা', 'জুটি বাঁধতে ২ জন প্রতিবেশীর কাছে যাও!');
        return;
      }
      this.snapshot.ghotokLinkedIds = [pair[0].id, pair[1].id];
      pair[0].ghotokPartnerId = pair[1].id;
      pair[1].ghotokPartnerId = pair[0].id;
      soundEngine.playClueScan();
      this.onClueNotice?.(
        'মহল্লা জুটি বাঁধা হয়েছে!',
        `${pair[0].name} ও ${pair[1].name} জুটি হয়েছে — একজন মরলে আরেকজন খবর পাবে!`,
      );
      return;
    }

    if (lp.specialRole === 'master_moshai') {
      if (lp.abilityCooldown > 0.05) return;
      const target = findNearestMasterTarget(lp, this.snapshot.players);
      if (!target) {
        this.onClueNotice?.('মাস্টার মশাই', 'খাতা পরীক্ষা করতে প্রতিবেশীর কাছে যাও!');
        return;
      }
      const res = inspectPlayerTaskAuthenticity(target);
      lp.abilityCooldown = MASTER_COOLDOWN_SEC;
      soundEngine.playClueScan();
      this.onClueNotice?.(res.title, res.detail);
      return;
    }

    if (lp.specialRole === 'cctv_kaku') {
      if (lp.abilityCooldown > 0.05) return;
      lp.watchingCams = true;
      lp.abilityCooldown = CCTV_KAKU_COOLDOWN_SEC;
      soundEngine.playClueScan();
      this.onClueNotice?.('দূরবর্তী সিসিটিভি', 'পকেট সিকিউরিটি মনিটর চালু হয়েছে!');
      return;
    }

    if (lp.specialRole === 'hatur_daktar') {
      if (lp.abilityCooldown > 0.05) return;
      const nowMs = Date.now();
      const target = findNearestHaturTarget(lp, this.snapshot.players, nowMs);
      const receiver = target ?? ((lp.haturProtectedUntil ?? 0) <= nowMs ? lp : null);
      if (!receiver) {
        this.onClueNotice?.('হাতুড়ে ডাক্তার', 'ইনি আগেই ঝাঁঝালো ইনজেকশনে সুরক্ষিত আছেন!');
        return;
      }
      receiver.haturProtectedUntil = nowMs + HATUR_DURATION_MS;
      lp.abilityCooldown = HATUR_COOLDOWN_SEC;
      soundEngine.playShieldBlock();
      this.onClueNotice?.(
        'ঝাঁঝালো ইনজেকশন চালু!',
        receiver.id === lp.id
          ? 'নিজেকে ইনজেকশন দিয়েছ! আগামী ১২ সেকেন্ড কোনো বাটপার মারতে পারবে না!'
          : `${receiver.name}-কে ইনজেকশন দিয়েছ — ১২ সেকেন্ড মৃত্যুর হাত থেকে সুরক্ষা চালু!`,
      );
      return;
    }

    if (lp.specialRole === 'supari_killer') {
      if (lp.abilityCooldown > 0.05) return;
      const nextTarget = pickSupariContractTarget(lp, this.snapshot.players, lp.supariTargetId);
      if (!nextTarget) {
        this.onClueNotice?.('সুপারি কন্ট্রাক্ট', 'কোনো জীবিত টার্গেট বাকি নেই!');
        return;
      }
      lp.supariTargetId = nextTarget.id;
      lp.abilityCooldown = SUPARI_COOLDOWN_SEC;
      soundEngine.playClueScan();
      this.onClueNotice?.(
        'নতুন সুপারি কন্ট্রাক্ট!',
        `টার্গেট: ${nextTarget.name} — তাকে সরালে ৫০% কিল কুলডাউন কমবে!`,
      );
      return;
    }

    if (lp.specialRole === 'dalal') {
      if (lp.abilityCooldown > 0.05) return;
      const res = applyDalalBrokerJam(this.snapshot.doorLocks);
      this.snapshot.commsJammedUntil = Date.now() + DALAL_JAM_DURATION_MS;
      lp.abilityCooldown = DALAL_COOLDOWN_SEC;
      soundEngine.playDoorSlam();
      this.onClueNotice?.(
        'দালালের জ্যাম চালু!',
        `যোগাযোগ ১০ সেকেন্ড জ্যাম হয়েছে! ${res.newlyLockedZone ? `${res.newlyLockedZone} শাটার বন্ধ করা হয়েছে!` : 'শাটারের তালা আরও ৮ সেকেন্ড বাড়ানো হয়েছে!'}`,
      );
      return;
    }

    if (lp.specialRole === 'chamcha') {
      if (lp.abilityCooldown > 0.05) return;
      const patron = findNearestChamchaPatron(lp, this.snapshot.players);
      if (!patron) {
        this.onClueNotice?.('চামচা সাগরেদ', 'বস ঠিক করতে কারো একদম কাছে যাও!');
        return;
      }
      lp.chamchaPatronId = patron.id;
      lp.abilityCooldown = CHAMCHA_COOLDOWN_SEC;
      soundEngine.playClueScan();
      this.onClueNotice?.(
        'বস ঠিক হয়েছে!',
        `${patron.name} এখন তোমার বস — বেঁচে থাকলে ${patron.name}-এর দল জিতলেই তুমিও জিতবে!`,
      );
      return;
    }

    if (lp.specialRole === 'chandabaz') {
      if (lp.abilityCooldown > 0.05) return;
      if (isCriticalSabotage(this.snapshot.sabotage.active)) {
        this.onClueNotice?.('গ্যাস লিক চলছে!', 'জরুরি নাশকতার সময় চাঁদা তোলা যাবে না — আগে গ্যাস সামলাও!');
        return;
      }
      const target = findNearestChandabazTarget(lp, this.snapshot.players);
      if (!target) {
        this.onClueNotice?.('চাঁদাবাজ', 'চাঁদা তুলতে নতুন কোনো প্রতিবেশীর একদম কাছে যাও!');
        return;
      }
      const res = collectChandaFromTarget(lp, target, this.snapshot.players);
      if (!res.ok) return;
      lp.abilityCooldown = CHANDABAZ_COOLDOWN_SEC;
      notifyBotsOfChandabazExtort(lp, target, this.snapshot.players, this.brains, this.snapshot.doorLocks);
      soundEngine.playTaskComplete();
      const nearWitnesses = this.snapshot.players.filter(
        (pl) =>
          pl.alive &&
          pl.id !== lp.id &&
          pl.id !== target.id &&
          distance2D(pl.x, pl.z, lp.x, lp.z) <= CHANDABAZ_WITNESS_RANGE &&
          hasLineOfSight(pl.x, pl.z, lp.x, lp.z, WALLS, this.snapshot.doorLocks),
      ).length;
      this.onClueNotice?.(
        `চাঁদা উসুল (${countAliveChandabazTargets(lp, this.snapshot.players)}/${getChandabazGoal(lp, this.snapshot.players)})!`,
        nearWitnesses > 0
          ? `${target.name} ও আশপাশের ${nearWitnesses} জন দেখে ফেলেছে! সাবধান!`
          : `${target.name}-এর কাছ থেকে চাঁদা আদায় করা হয়েছে — বাকি সবাই বেঁচে থাকা অবস্থায় শেষ করো!`,
      );
      this.checkWin();
      return;
    }

    if (lp.specialRole === 'tiktok_star') {
      if (lp.abilityCooldown > 0.05) return;
      const zoneId = getZoneIdAt(lp.x, lp.z);
      const res = recordTiktokReelInZone(lp, zoneId);
      if (!res.ok) {
        this.onClueNotice?.(
          'টিকটক স্টার',
          res.reason === 'already_filmed'
            ? 'এই এলাকায় আগেই রিল বানানো হয়ে গেছে! অন্য এলাকায় যাও!'
            : 'ভাইরাল রিল বানাতে মহল্লার কোনো পরিচিত এলাকা বা দোকানের ভেতর যাও!',
        );
        return;
      }
      lp.abilityCooldown = TIKTOK_COOLDOWN_SEC;
      soundEngine.playDisguise();
      this.onClueNotice?.(
        `ভাইরাল রিল তৈরি (${res.zoneCount}/${TIKTOK_ZONE_GOAL})!`,
        `${getBanglaZoneNameAt(lp.x, lp.z)} এলাকায় শুটিং শেষ! জিততে শেষ ৪ জনে টিকে থাকো!`,
      );
      this.checkWin();
    }
  }

  public triggerKill(targetId: string): boolean {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    const target = this.snapshot.players.find((p) => p.id === targetId);
    if (!lp || !target) return false;
    const check = canExecuteKill(lp, target);
    if (!check.allowed) return false;

    const nowMs = Date.now();
    if (isPlayerShieldedNow(target, nowMs)) {
      target.shielded = false;
      target.haturProtectedUntil = 0;
      lp.killCooldownRemaining = 6;
      soundEngine.playShieldBlock();
      this.onClueNotice?.(
        'সুরক্ষা ভেঙে গেছে!',
        `${target.name} তাবিজ বা ঝাঁঝালো ইনজেকশনে সুরক্ষিত ছিল! আঘাত আটকে গেছে!`,
      );
      return false;
    }

    dismountPlayerFromVehicle(target, this.snapshot.vehicles, this.snapshot.doorLocks, false);
    target.alive = false;
    target.watchingCams = false;
    const hitSupariContract = lp.specialRole === 'supari_killer' && target.id === lp.supariTargetId;
    lp.killCooldownRemaining = hitSupariContract
      ? this.snapshot.settings.killCooldownSec * 0.5
      : this.snapshot.settings.killCooldownSec;
    if (lp.specialRole === 'supari_killer') {
      lp.supariTargetId =
        pickSupariContractTarget(lp, this.snapshot.players, lp.supariTargetId)?.id ?? null;
    }
    lp.x = target.x;
    lp.z = target.z;
    this.snapshot.bodies.push({
      id: `body_${nowMs}`,
      victimId: target.id,
      victimName: target.name,
      color: target.color,
      x: target.x,
      z: target.z,
      reported: false,
      killedAt: nowMs,
      killerColorHint: getColorShadeHint(lp.color),
      killerZoneHint: getBanglaZoneNameAt(target.x, target.z),
    });
    soundEngine.playKill();
    const ghotokInfo = findGhotokPartnerOnDeath(
      target.id,
      this.snapshot.ghotokLinkedIds,
      this.snapshot.players,
    );
    if (
      ghotokInfo.partner?.id === this.localPlayerId ||
      ghotokInfo.ghotok?.id === this.localPlayerId
    ) {
      this.onClueNotice?.('ঘটকের জুটি সতর্কবার্তা!', `জুটি বাঁধা প্রতিবেশী ${target.name} এইমাত্র মারা গেছে!`);
    }
    recordKillWitnesses(
      this.brains,
      this.snapshot.players,
      lp,
      target,
      this.snapshot.sabotage.active,
      this.snapshot.doorLocks,
    );
    this.checkWin();
    return true;
  }

  public toggleVent(destinationVentId?: string): void {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !canUseVent(lp)) return;
    if (!lp.inVent) {
      const near = VENTS.find((v) => distance2D(lp.x, lp.z, v.x, v.z) <= VENT_RANGE);
      if (!near) return;
      lp.inVent = true;
      lp.x = near.x;
      lp.z = near.z;
      if (lp.specialRole !== 'mistri' || isMistriVentAudibleTo(lp, lp)) {
        soundEngine.playVent();
      }
    } else if (destinationVentId) {
      const dest = resolveVentHopTarget(lp.x, lp.z, destinationVentId);
      if (dest) {
        lp.x = dest.x;
        lp.z = dest.z;
        if (lp.specialRole !== 'mistri' || isMistriVentAudibleTo(lp, lp)) {
          soundEngine.playVent();
        }
      }
    } else {
      lp.inVent = false;
      if (lp.specialRole === 'mistri') {
        lp.abilityCooldown = MISTRI_VENT_COOLDOWN_SEC;
      }
      if (lp.specialRole !== 'mistri' || isMistriVentAudibleTo(lp, lp)) {
        soundEngine.playVent();
      }
    }
  }

  public triggerSabotage(type: SabotageType): void {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !lp.alive || lp.role !== 'vondo') return;
    if (this.snapshot.sabotage.active || this.snapshot.sabotage.cooldownRemaining > 0) return;
    this.snapshot.sabotage = createSabotageState(type, SABOTAGE_COOLDOWN_SEC);
    this.holdingFixMap.clear();
    soundEngine.playSabotage();
  }

  public lockDoors(zoneId: DoorZoneId): void {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !lp.alive || lp.role !== 'vondo') return;
    if (this.snapshot.doorLocks.cooldownRemaining > 0) return;
    this.snapshot.doorLocks[zoneId] = DOOR_LOCK_DURATION_SEC;
    this.snapshot.doorLocks.cooldownRemaining = DOOR_LOCK_COOLDOWN_SEC;
    soundEngine.playDoorSlam();
  }

  public fixSabotage(holding = true, valveId?: 'valve_cha' | 'valve_rickshaw'): boolean {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !lp.alive || !this.snapshot.sabotage.active) {
      this.holdingFixMap.delete(this.localPlayerId);
      return false;
    }
    if (!holding) {
      this.holdingFixMap.delete(this.localPlayerId);
      return false;
    }
    if (this.snapshot.sabotage.active === 'gas_leak') {
      const range = lp.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
      const nearValve = valveId
        ? GAS_LEAK_VALVES.find((v) => v.id === valveId && distance2D(lp.x, lp.z, v.x, v.z) <= range)
        : findNearestGasValve(lp.x, lp.z, this.snapshot.sabotage, range);
      if (!nearValve) {
        this.holdingFixMap.delete(this.localPlayerId);
        return false;
      }
      this.holdingFixMap.set(this.localPlayerId, { valveId: nearValve.id });
      return true;
    }
    const range = lp.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
    if (
      distance2D(lp.x, lp.z, this.snapshot.sabotage.fixStationX, this.snapshot.sabotage.fixStationZ) <= range
    ) {
      this.holdingFixMap.set(this.localPlayerId, {});
      return true;
    }
    this.holdingFixMap.delete(this.localPlayerId);
    return false;
  }

  public reportBody(bodyId: string): void {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    const body = this.snapshot.bodies.find((b) => b.id === bodyId && !b.reported);
    if (!lp || !lp.alive || !body) return;
    if (distance2D(lp.x, lp.z, body.x, body.z) > REPORT_RANGE + 1.0) return;
    if (!hasLineOfSight(lp.x, lp.z, body.x, body.z, WALLS, this.snapshot.doorLocks)) return;
    body.reported = true;
    this.startMeeting(lp, 'body', body.victimName);
  }

  public callEmergencyMeeting(): void {
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (
      !lp ||
      !lp.alive ||
      isCriticalSabotage(this.snapshot.sabotage.active) ||
      this.snapshot.emergencyCooldownRemaining > 0 ||
      lp.emergencyMeetingsLeft <= 0
    ) {
      return;
    }
    if (distance2D(lp.x, lp.z, EMERGENCY_BELL_POS.x, EMERGENCY_BELL_POS.z) <= EMERGENCY_BELL_POS.interactRadius) {
      lp.emergencyMeetingsLeft--;
      this.startMeeting(lp, 'emergency');
    }
  }

  public setMeetingTyping(typing: boolean): void {
    this.localTyping = typing && this.snapshot.phase === 'meeting';
    this.syncTypingPlayerIds();
  }

  private syncTypingPlayerIds(): void {
    if (this.snapshot.phase !== 'meeting') {
      this.snapshot.typingPlayerIds = [];
      return;
    }
    const botTypers = getMeetingTypingBotIds(this.snapshot.players, this.brains);
    this.snapshot.typingPlayerIds = this.localTyping
      ? [this.localPlayerId, ...botTypers]
      : botTypers;
  }

  public sendChat(text: string): void {
    if (this.snapshot.phase !== 'meeting') return;
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp) return;
    const clean = text.trim().slice(0, 140);
    if (!clean) return;
    this.localTyping = false;
    const msg = {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      senderId: lp.id,
      senderName: lp.alive ? lp.name : `${lp.name} (ভূত)`,
      senderColor: lp.color,
      text: clean,
      timestamp: Date.now(),
      ghostOnly: !lp.alive,
    };
    this.snapshot.chat.push(msg);
    processChatMessageForBots({
      msg,
      players: this.snapshot.players,
      brains: this.brains,
    });
    if (
      lp.alive &&
      this.snapshot.meetingReason &&
      Date.now() - this.lastGeminiReactionAt >= 4000 &&
      this.snapshot.players.some((pl) => pl.isBot && pl.alive)
    ) {
      this.lastGeminiReactionAt = Date.now();
      void this.fetchGeminiMeetingChats(
        this.meetingEpoch,
        this.snapshot.meetingReason,
        this.snapshot.meetingCallerId ?? lp.id,
        'reaction',
      );
    }
    this.syncTypingPlayerIds();
  }

  public castVote(targetId: string | 'skip'): void {
    if (this.snapshot.phase !== 'meeting') return;
    if ((this.snapshot.discussionTimer ?? 0) > 0) return;
    const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
    if (!lp || !lp.alive || lp.hasVoted) return;
    lp.votedFor = targetId;
    lp.hasVoted = true;
    soundEngine.playVoteClick();
    const alive = this.snapshot.players.filter((p) => p.alive);
    if (alive.length > 0 && alive.every((p) => p.hasVoted)) {
      this.resolveVotes();
    }
  }

  private startMeeting(caller: PlayerState, reason: 'body' | 'emergency', victimName?: string): void {
    if (this.snapshot.phase !== 'playing') return;
    this.snapshot.phase = 'meeting';
    this.meetingEpoch += 1;
    this.lastGeminiReactionAt = 0;
    this.localTyping = false;
    this.snapshot.typingPlayerIds = [];
    this.snapshot.meetingCallerId = caller.id;
    this.snapshot.meetingReason = reason;
    this.snapshot.discussionTimer = this.snapshot.settings.discussionTimeSec;
    this.snapshot.meetingTimer = this.snapshot.settings.meetingTimeSec;
    this.holdingFixMap.clear();
    if (isCriticalSabotage(this.snapshot.sabotage.active)) {
      this.snapshot.sabotage = createEmptySabotageState(SABOTAGE_COOLDOWN_SEC);
    } else {
      this.snapshot.sabotage.fixProgress = 0;
      this.snapshot.sabotage.fixerId = null;
    }
    this.snapshot.footprints = [];
    this.justEjectedPlayer = null;
    this.snapshot.commsJammedUntil = 0;
    this.snapshot.doorLocks = makeEmptyDoorLocks();

    for (const p of this.snapshot.players) {
      dismountPlayerFromVehicle(p, this.snapshot.vehicles, this.snapshot.doorLocks, false);
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
    if (this.snapshot.vehicles) {
      for (const v of this.snapshot.vehicles) {
        v.driverId = null;
        v.speed = 0;
        v.vx = 0;
        v.vz = 0;
        v.steer = 0;
      }
    }

    if (!this.snapshot.netaRevealedId) {
      const aliveNeta = this.snapshot.players.find((p) => p.alive && p.specialRole === 'neta');
      if (aliveNeta) {
        this.snapshot.netaRevealedId = aliveNeta.id;
        this.snapshot.chat.push({
          id: `neta_${Date.now()}`,
          senderId: 'system',
          senderName: 'মহল্লা সালিশ',
          senderColor: 'holud',
          text: `${aliveNeta.name} মহল্লার নেতা — তার সালিশের ভোট ২ গুণ হিসেবে গণনা হবে!`,
          timestamp: Date.now(),
          system: true,
        });
      }
    }

    resetBotBrainsForMeeting(this.brains);

    this.snapshot.chat.push({
      id: `sys_${Date.now()}`,
      senderId: 'system',
      senderName: 'মহল্লা সালিশ',
      senderColor: 'holud',
      text:
        reason === 'body'
          ? `হায়রে! ${caller.name} দেখলো ${victimName ?? 'একজন'} মারা গেছে! জরুরি সালিশ ডাকা হয়েছে!`
          : `${caller.name} সালিশের ঘণ্টা বাজিয়ে দিয়েছে!`,
      timestamp: Date.now(),
      system: true,
    });

    // Always pre-populate staggered rule-based fallback turns, then enhance with 1 batched Gemini call
    generateFallbackMeetingChats({
      players: this.snapshot.players,
      bodies: this.snapshot.bodies,
      brains: this.brains,
      meetingReason: reason,
      meetingCallerId: caller.id,
    });
    void this.fetchGeminiMeetingChats(this.meetingEpoch, reason, caller.id, 'opening');

    soundEngine.playMeetingBell(reason);
  }

  private async fetchGeminiMeetingChats(
    epoch: number,
    reason: 'body' | 'emergency',
    callerId: string,
    phase: 'opening' | 'reaction' = 'opening',
  ): Promise<void> {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return;
    if (Date.now() < this.geminiCooldownUntil) return;
    const payload = buildBatchedGeminiMeetingPayload({
      roomCode: this.snapshot.roomCode,
      players: this.snapshot.players,
      bodies: this.snapshot.bodies,
      brains: this.brains,
      chat: this.snapshot.chat,
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
      if (this.snapshot.phase !== 'meeting' || this.meetingEpoch !== epoch) return;
      if (Array.isArray(data?.messages) && data.messages.length > 0) {
        const applyFn = phase === 'reaction' ? applyBatchedGeminiReactionChats : applyBatchedGeminiChats;
        applyFn({
          replies: data.messages,
          players: this.snapshot.players,
          brains: this.brains,
        });
      }
    } catch {
      // Seamless fallback: rule-based schedule is already active
    } finally {
      window.clearTimeout(timer);
    }
  }

  private resolveVotes(): void {
    const ejection = tallyVotes(this.snapshot.players, this.snapshot.settings.confirmEjects);
    this.localTyping = false;
    this.snapshot.typingPlayerIds = [];
    this.snapshot.ejection = ejection;
    this.snapshot.phase = 'vote_results';
    this.phaseTimer = 2.6;
    soundEngine.playVoteClick();
  }

  private checkWin(sabotageExpired = false): boolean {
    const stats = computeTaskProgress(this.snapshot.players);
    const outcome = evaluateMatchOutcome(
      this.snapshot.players,
      stats.progress,
      sabotageExpired,
      this.justEjectedPlayer,
    );
    if (outcome) {
      this.snapshot.outcome = outcome;
      this.snapshot.phase = 'gameover';
      const lp = this.snapshot.players.find((p) => p.id === this.localPlayerId);
      const localWon =
        outcome.winner === 'pagol' || outcome.winner === 'chandabaz' || outcome.winner === 'tiktok_star'
          ? outcome.winnerPlayerId === lp?.id
          : Boolean(
              (lp && !isNeutralRole(lp.specialRole) && lp.role === outcome.winner) ||
                (lp && outcome.coWinnerIds?.includes(lp.id)),
            );
      soundEngine.playOutcome(Boolean(localWon));
      return true;
    }
    return false;
  }

  private handleDeathSideEffects(victim: PlayerState): void {
    const ghotokInfo = findGhotokPartnerOnDeath(
      victim.id,
      this.snapshot.ghotokLinkedIds,
      this.snapshot.players,
    );
    if (
      ghotokInfo.partner?.id === this.localPlayerId ||
      ghotokInfo.ghotok?.id === this.localPlayerId
    ) {
      this.onClueNotice?.('ঘটকের জুটি সতর্কবার্তা!', `জুটি বাঁধা প্রতিবেশী ${victim.name} এইমাত্র মারা গেছে!`);
    }
    for (const pl of this.snapshot.players) {
      if (pl.alive && pl.specialRole === 'supari_killer' && pl.supariTargetId === victim.id) {
        pl.supariTargetId =
          pickSupariContractTarget(pl, this.snapshot.players, victim.id)?.id ?? null;
      }
    }
  }

  public step(dt: number): void {
    if (this.snapshot.phase === 'lobby') {
      if (this.snapshot.lobbyCountdownSec !== null) {
        this.lobbyCountdownTimer -= dt;
        const nextSec = Math.max(0, Math.ceil(this.lobbyCountdownTimer));
        if (nextSec > 0 && nextSec !== this.snapshot.lobbyCountdownSec) {
          this.snapshot.lobbyCountdownSec = nextSec;
          soundEngine.playLobbyTick();
        }
        if (this.lobbyCountdownTimer <= 0) {
          soundEngine.playStartWhoosh();
          this.startMatchInternal(false);
        }
      }
      return;
    }

    if (this.snapshot.phase === 'role_reveal') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.snapshot.phase = 'playing';
      }
      return;
    }

    if (this.snapshot.phase === 'playing') {
      const now = Date.now();
      this.snapshot.footprints = this.snapshot.footprints.filter((f) => f.expiresAt > now);

      for (const p of this.snapshot.players) {
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
          const jRes = stepJharudarChannel(p, this.snapshot.bodies, dt);
          if (jRes.completedBody) {
            this.snapshot.bodies = this.snapshot.bodies.filter((b) => b.id !== jRes.completedBody!.id);
            if (p.id === this.localPlayerId) {
              soundEngine.playCleanBody();
              this.onClueNotice?.(
                'লাশ গায়েব!',
                `${jRes.completedBody.victimName}-এর লাশ সরানো হয়েছে (বাকি ${p.cleansLeft ?? 0}টি)!`,
              );
            }
          } else if (jRes.cancelled && p.id === this.localPlayerId) {
            this.onClueNotice?.('সাফাই বাতিল', 'লাশ থেকে সরে গেছো — ঝাড়ু দেওয়া বাতিল!');
          }
        }
      }
      if (this.snapshot.emergencyCooldownRemaining > 0) {
        this.snapshot.emergencyCooldownRemaining = Math.max(0, this.snapshot.emergencyCooldownRemaining - dt);
      }
      if (this.snapshot.doorLocks.cooldownRemaining > 0) {
        this.snapshot.doorLocks.cooldownRemaining = Math.max(0, this.snapshot.doorLocks.cooldownRemaining - dt);
      }
      this.snapshot.doorLocks.cha_dokan = Math.max(0, this.snapshot.doorLocks.cha_dokan - dt);
      this.snapshot.doorLocks.rickshaw_garage = Math.max(0, this.snapshot.doorLocks.rickshaw_garage - dt);
      this.snapshot.doorLocks.desco_power = Math.max(0, this.snapshot.doorLocks.desco_power - dt);
      this.snapshot.doorLocks.dish_roof = Math.max(0, this.snapshot.doorLocks.dish_roof - dt);

      // Clear stale bot entries from holdingFixMap; keep human if still in range
      for (const hid of Array.from(this.holdingFixMap.keys())) {
        const hp = this.snapshot.players.find((pl) => pl.id === hid);
        if (!hp || !hp.alive || hp.isBot) {
          this.holdingFixMap.delete(hid);
        }
      }

      const interrupted = stepBotsPlaying({
        players: this.snapshot.players,
        bodies: this.snapshot.bodies,
        sabotage: this.snapshot.sabotage,
        doorLocks: this.snapshot.doorLocks,
        settings: this.snapshot.settings,
        holdingFixMap: this.holdingFixMap,
        brains: this.brains,
        dt,
        nowMs: now,
        onFootprint: (p, distMoved) => this.recordFootprint(p, distMoved),
        onReportBody: (reporter, body) => this.startMeeting(reporter, 'body', body.victimName),
        onKill: (killer, victim, shieldBlocked) => {
          if (shieldBlocked) {
            soundEngine.playShieldBlock();
            if (victim.id === this.localPlayerId) {
              this.onClueNotice?.(
                'সুরক্ষা তোমাকে বাঁচিয়েছে!',
                'একজন বাটপার তোমাকে আঘাত করতে চেয়েছিল, কিন্তু তাবিজ বা ইনজেকশন বাঁচিয়ে দিয়েছে!',
              );
            }
          } else {
            if (killer.id === this.localPlayerId || victim.id === this.localPlayerId) {
              soundEngine.playKill();
            }
            dismountPlayerFromVehicle(victim, this.snapshot.vehicles, this.snapshot.doorLocks, false);
            this.handleDeathSideEffects(victim);
          }
        },
        onSabotage: () => soundEngine.playSabotage(),
        onDoorLock: (zoneId) => {
          this.snapshot.doorLocks[zoneId] = DOOR_LOCK_DURATION_SEC;
          this.snapshot.doorLocks.cooldownRemaining = DOOR_LOCK_COOLDOWN_SEC;
          soundEngine.playDoorSlam();
        },
        onRevive: () => soundEngine.playRevive(),
        onTaskCompletedCheckWin: () => this.checkWin(),
      });
      if (interrupted) return;

      for (const bp of this.snapshot.players) {
        if (bp.isBot && bp.alive && !bp.inVent && !bp.vehicleId && (bp.y ?? 0) < 0.8) {
          const pv = resolvePedestrianVehicleCollision(bp.x, bp.z, PLAYER_RADIUS, this.snapshot.vehicles);
          bp.x = pv.x;
          bp.z = pv.z;
        }
      }

      const sabStep = advanceSabotageState(
        this.snapshot.sabotage,
        this.snapshot.players,
        dt,
        this.holdingFixMap,
      );
      if (sabStep.fixed) {
        this.holdingFixMap.clear();
        soundEngine.playTaskComplete();
      } else if (sabStep.expiredCritical) {
        this.holdingFixMap.clear();
        this.checkWin(true);
        return;
      } else if (sabStep.expiredNonCriticalType) {
        this.holdingFixMap.clear();
        this.snapshot.chat.push({
          id: `sys_sab_${Date.now()}`,
          senderId: 'system',
          senderName: 'মহল্লা ঘোষণা',
          senderColor: 'holud',
          text:
            sabStep.expiredNonCriticalType === 'loadshedding'
              ? 'কারেন্ট এসেছে! বিদ্যুৎ সংযোগ নিজেই ঠিক হয়ে গেছে!'
              : 'ওয়াই-ফাই এসেছে! ডিশ সংযোগ আবার চালু হয়েছে!',
          timestamp: Date.now(),
          system: true,
        });
      }
    } else if (this.snapshot.phase === 'meeting') {
      if ((this.snapshot.discussionTimer ?? 0) > 0) {
        this.snapshot.discussionTimer = Math.max(0, (this.snapshot.discussionTimer ?? 0) - dt);
      } else {
        this.snapshot.meetingTimer = Math.max(0, this.snapshot.meetingTimer - dt);
      }

      stepBotsMeeting({
        players: this.snapshot.players,
        bodies: this.snapshot.bodies,
        discussionTimer: this.snapshot.discussionTimer ?? 0,
        brains: this.brains,
        dt,
        meetingReason: this.snapshot.meetingReason,
        meetingCallerId: this.snapshot.meetingCallerId,
        onChat: (p, text) => {
          this.snapshot.chat.push({
            id: `chat_${Date.now()}_${p.id}`,
            senderId: p.id,
            senderName: p.name,
            senderColor: p.color,
            text,
            timestamp: Date.now(),
          });
        },
      });
      this.syncTypingPlayerIds();

      const alive = this.snapshot.players.filter((p) => p.alive);
      if ((this.snapshot.discussionTimer ?? 0) <= 0 && this.snapshot.meetingTimer <= 1.2) {
        for (const p of alive) {
          if (p.isBot && !p.hasVoted) {
            p.hasVoted = true;
            p.votedFor = 'skip';
          }
        }
      }
      if (
        ((this.snapshot.discussionTimer ?? 0) <= 0 &&
          (alive.length === 0 || alive.every((p) => p.hasVoted))) ||
        this.snapshot.meetingTimer <= 0
      ) {
        this.resolveVotes();
      }
    } else if (this.snapshot.phase === 'vote_results') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.justEjectedPlayer = null;
        if (this.snapshot.ejection?.ejectedId) {
          const target = this.snapshot.players.find((p) => p.id === this.snapshot.ejection?.ejectedId);
          if (target) {
            dismountPlayerFromVehicle(target, this.snapshot.vehicles, this.snapshot.doorLocks, false);
            target.alive = false;
            this.justEjectedPlayer = target;
            this.handleDeathSideEffects(target);
            if (this.snapshot.ejection?.reason === 'voted') {
              soundEngine.playEjectBuildup();
            }
          }
        }
        this.snapshot.bodies = [];
        this.snapshot.phase = 'ejecting';
        this.phaseTimer = this.snapshot.ejection?.reason === 'voted' ? 7.5 : 5.0;
      }
    } else if (this.snapshot.phase === 'ejecting') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (!this.checkWin()) {
          this.justEjectedPlayer = null;
          this.snapshot.players.forEach((p, idx) => {
            const sp = SPAWN_RING[idx % SPAWN_RING.length];
            p.x = sp.x;
            p.z = sp.z;
            p.y = 0;
            p.yaw = sp.yaw;
            p.hasVoted = false;
            p.votedFor = null;
            if (p.role === 'vondo') p.killCooldownRemaining = this.snapshot.settings.killCooldownSec;
            if (p.specialRole === 'chandabaz') p.abilityCooldown = Math.max(p.abilityCooldown, 14);
          });
          this.snapshot.emergencyCooldownRemaining = this.snapshot.settings.emergencyCooldownSec;
          this.snapshot.phase = 'playing';
        }
      }
    }
  }
}

export { PLAYER_COLORS };
