import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DoorZoneId,
  GamePhase,
  PlayerColorId,
  RoomSettings,
  RoomSnapshot,
  SabotageType,
  SpecialRole,
} from './shared/types';
import {
  ADMIN_TABLE_POS,
  EMERGENCY_BELL_POS,
  SECURITY_CAMS_POS,
  TASK_STATIONS,
  VITALS_POS,
  distance2D,
  findNearestAvailableVehicle,
} from './shared/mapData';
import {
  DEFAULT_ROOM_SETTINGS,
  MISTRI_FIX_RANGE,
  SABOTAGE_FIX_RANGE,
  canCompleteTasks,
  canUseVent,
  findNearestGasValve,
  findNearestKillTarget,
  findNearestReportableBody,
  isCriticalSabotage,
  isTaskLockedBySabotage,
  sanitizeSoloConfig,
} from './shared/gameRules';
import { WorldScene } from './three/WorldScene';
import { SoloMatchEngine } from './game/soloEngine';
import { useMultiplayerClient } from './game/useMultiplayerClient';
import { incrementCareerTasksCompleted, recordCareerMatchOutcome } from './game/statsStore';
import { MEME_SOUNDS, soundEngine, type MemeSoundId } from './audio/soundEngine';
import { TitleOverlay } from './components/TitleOverlay';
import { LobbyOverlay } from './components/LobbyOverlay';
import { GameHud } from './components/GameHud';
import { TaskModal } from './components/TaskModal';
import { MeetingModal } from './components/MeetingModal';
import {
  EjectionModal,
  MatchLoadingOverlay,
  OutcomeModal,
  PauseModal,
  RoleRevealModal,
} from './components/MatchModals';
import { MobileControls } from './components/MobileControls';
import { StationModal, type StationModalKind } from './components/StationModals';
import { MemePackModal } from './components/MemePackModal';
import { TacticalMapModal } from './components/TacticalMapModal';
import { GuideModal } from './components/GuideModal';
import {
  enterMobileFullscreenAndLandscape,
  isTouchOrMobileDevice,
} from './utils/mobileFullscreen';

function getLobbyUiSignature(snap: RoomSnapshot, localId: string): string {
  const lp = snap.players.find((p) => p.id === localId);
  const nearVeh =
    lp && lp.alive && !lp.inVent && !lp.vehicleId && (lp.y ?? 0) <= 1.2
      ? findNearestAvailableVehicle(lp.x, lp.z, snap.vehicles)?.id ?? ''
      : '';
  const playersKey = snap.players
    .map((p) => `${p.id}:${p.name}:${p.color}:${p.ready ? 1 : 0}:${p.isHost ? 1 : 0}:${p.isBot ? 1 : 0}`)
    .join(',');
  const s = snap.settings;
  const settingsKey = `${s.vondoCount}|${s.killCooldownSec}|${s.tasksPerPlayer}|${s.meetingTimeSec}|${s.moveSpeed}|${s.emergencyMeetingsPerPlayer}|${s.emergencyCooldownSec}|${s.confirmEjects ? 1 : 0}|${s.anonymousVotes ? 1 : 0}|${s.visualTasks ? 1 : 0}|${s.enableSpecialRoles ? 1 : 0}|${s.enableNeutralRoles ? 1 : 0}|${s.autoFillBots ? 1 : 0}`;
  return `${snap.phase}|${snap.roomCode}|${snap.lobbyCountdownSec ?? ''}|${snap.lobbyChat?.length ?? 0}|${lp?.vehicleId ?? ''}|${nearVeh}|${settingsKey}|${playersKey}`;
}

export default function App() {
  const [playerName, setPlayerName] = useState('Lal Mia');
  const [playerColor, setPlayerColor] = useState<PlayerColorId>('lal');
  const [mode, setMode] = useState<'title' | 'solo' | 'multi'>('title');
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeStationModal, setActiveStationModal] = useState<StationModalKind | null>(null);
  const [soloSnapshot, setSoloSnapshot] = useState<RoomSnapshot | null>(null);
  const [soloPlayerCount, setSoloPlayerCount] = useState(7);
  const [soloSettings, setSoloSettings] = useState<RoomSettings>(() => ({ ...DEFAULT_ROOM_SETTINGS }));
  const [pointerLookEnabled, setPointerLookEnabled] = useState(false);
  const [clueNotice, setClueNotice] = useState<{ title: string; detail: string } | null>(null);
  const [showMemePack, setShowMemePack] = useState(false);
  const [showTacticalMap, setShowTacticalMap] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [killFlash, setKillFlash] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [loadingSubtitle, setLoadingSubtitle] = useState<string | null>(null);
  const compassYawRef = useRef(0);
  const compassListenersRef = useRef(new Set<(yaw: number) => void>());
  const [driveSpeedMs, setDriveSpeedMs] = useState(0);
  const touchOverrideRef = useRef(false);
  const recordedOutcomeRef = useRef(false);
  const loadingTimerRef = useRef<number | null>(null);

  const handleCompassYawChange = useCallback((yaw: number) => {
    compassYawRef.current = yaw;
    for (const cb of compassListenersRef.current) cb(yaw);
  }, []);

  const subscribeCompassYaw = useCallback((cb: (yaw: number) => void) => {
    compassListenersRef.current.add(cb);
    cb(compassYawRef.current);
    return () => {
      compassListenersRef.current.delete(cb);
    };
  }, []);
  const [touchControlsEnabled, setTouchControlsEnabled] = useState<boolean>(() =>
    isTouchOrMobileDevice(),
  );
  const [isAdminMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const param = params.get('admin');
    if (param === '1' || param === 'true') {
      try {
        window.localStorage.setItem('kb_admin_mode', '1');
      } catch {
        // ignore storage errors
      }
      return true;
    }
    if (param === '0' || param === 'false') {
      try {
        window.localStorage.removeItem('kb_admin_mode');
      } catch {
        // ignore storage errors
      }
      return false;
    }
    try {
      return window.localStorage.getItem('kb_admin_mode') === '1';
    } catch {
      return false;
    }
  });
  const [initialJoinCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const code = new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase();
    return code && code.length >= 3 ? code.slice(0, 6) : null;
  });

  useEffect(() => {
    const onResize = () => {
      if (!touchOverrideRef.current) {
        setTouchControlsEnabled(isTouchOrMobileDevice());
      }
    };
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  const soloEngineRef = useRef<SoloMatchEngine | null>(null);
  const shakeTriggerRef = useRef<((amount: number) => void) | null>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);
  const jumpTriggerRef = useRef<(() => void) | null>(null);
  const joystickInputRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const handbrakeRef = useRef(false);
  const boostRef = useRef(false);
  const holdingFixKeyRef = useRef(false);
  const clueTimerRef = useRef<number | null>(null);

  const showClueNotice = useCallback((title: string, detail: string) => {
    setClueNotice({ title, detail });
    if (clueTimerRef.current !== null) {
      window.clearTimeout(clueTimerRef.current);
    }
    clueTimerRef.current = window.setTimeout(() => {
      setClueNotice(null);
      clueTimerRef.current = null;
    }, 6000);
  }, []);

  useEffect(() => {
    return () => {
      if (clueTimerRef.current !== null) window.clearTimeout(clueTimerRef.current);
      if (loadingTimerRef.current !== null) window.clearTimeout(loadingTimerRef.current);
    };
  }, []);

  const mp = useMultiplayerClient(
    (amount) => {
      shakeTriggerRef.current?.(amount);
    },
    showClueNotice,
  );

  const [lobbySheetExpanded, setLobbySheetExpanded] = useState(false);
  const soloLiveSnapshotRef = useRef<RoomSnapshot | null>(null);
  const liveSceneSnapshotRef = useRef<RoomSnapshot | null>(null);
  const lastLobbySigRef = useRef('');
  const syncSoloSnapshotNow = useCallback(() => {
    const engine = soloEngineRef.current;
    if (!engine) return;
    const snap = engine.getSnapshot();
    soloLiveSnapshotRef.current = snap;
    liveSceneSnapshotRef.current = snap;
    if (snap.phase === 'lobby') {
      lastLobbySigRef.current = getLobbyUiSignature(snap, engine.localPlayerId);
    }
    setSoloSnapshot(snap);
  }, []);
  const isMulti = mode === 'multi';
  const activeSnapshot = isMulti ? mp.snapshot : soloSnapshot;
  const activePlayerId = isMulti ? mp.localPlayerId : soloEngineRef.current?.localPlayerId ?? null;
  const activeSnapshotRef = useRef(activeSnapshot);
  const activePlayerIdRef = useRef(activePlayerId);
  activeSnapshotRef.current = activeSnapshot;
  activePlayerIdRef.current = activePlayerId;
  liveSceneSnapshotRef.current = isMulti ? mp.snapshot : (soloLiveSnapshotRef.current ?? soloSnapshot);

  const derivedPhase: GamePhase = (() => {
    if (mode === 'title' || !activeSnapshot) return 'title';
    if (paused && activeSnapshot.phase === 'playing') return 'paused';
    return activeSnapshot.phase;
  })();

  // Sync document.body.dataset.state & soften BGM during Shalish/cutscene phases
  useEffect(() => {
    const bodyState =
      derivedPhase === 'role_reveal' ||
      derivedPhase === 'meeting' ||
      derivedPhase === 'vote_results' ||
      derivedPhase === 'ejecting'
        ? 'playing'
        : derivedPhase;
    document.body.dataset.state = bodyState;
    soundEngine.setBgmDucked(
      derivedPhase === 'meeting' ||
        derivedPhase === 'vote_results' ||
        derivedPhase === 'ejecting' ||
        derivedPhase === 'paused',
    );
  }, [derivedPhase]);

  // Clear open station/task/map/pause modals whenever gameplay is interrupted (meeting, ejection, gameover)
  useEffect(() => {
    if (activeSnapshot && activeSnapshot.phase !== 'playing' && paused) {
      setPaused(false);
    }
    if (derivedPhase !== 'playing') {
      setActiveTaskId(null);
      setActiveStationModal(null);
      setShowTacticalMap(false);
    }
  }, [derivedPhase, activeSnapshot, paused]);

  // Persist Career Stats once per match when entering gameover + 3s dramatic finale hold beat
  useEffect(() => {
    if (derivedPhase === 'gameover' && activeSnapshot?.outcome && activePlayerId) {
      if (!recordedOutcomeRef.current) {
        recordedOutcomeRef.current = true;
        recordCareerMatchOutcome(activeSnapshot, activePlayerId, activeSnapshot.outcome);
      }
      setShowOutcomeModal(false);
      const timer = window.setTimeout(() => setShowOutcomeModal(true), 3000);
      return () => window.clearTimeout(timer);
    }
    setShowOutcomeModal(false);
    if (derivedPhase === 'playing' || derivedPhase === 'role_reveal' || derivedPhase === 'title') {
      recordedOutcomeRef.current = false;
    }
  }, [derivedPhase, activeSnapshot, activePlayerId]);

  const handleChangeSoloPlayerCount = useCallback((count: number) => {
    setSoloSettings((prev) => {
      const sanitized = sanitizeSoloConfig(count, prev);
      setSoloPlayerCount(sanitized.playerCount);
      return sanitized.settings;
    });
  }, []);

  const handleUpdateSoloSettings = useCallback(
    (partial: Partial<RoomSettings>) => {
      setSoloSettings((prev) => sanitizeSoloConfig(soloPlayerCount, { ...prev, ...partial }).settings);
    },
    [soloPlayerCount],
  );

  const startSoloMatch = useCallback(
    (
      forceRole?: 'parabasi' | 'vondo',
      forceSpecialRole?: SpecialRole,
      skipRoleReveal = false,
    ) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const launch = () => {
        const engine = new SoloMatchEngine(
          playerName,
          playerColor,
          forceRole,
          skipRoleReveal,
          forceSpecialRole,
          showClueNotice,
          soloSettings,
          soloPlayerCount,
        );
        soloEngineRef.current = engine;
        recordedOutcomeRef.current = false;
        const initSnap = engine.getSnapshot();
        soloLiveSnapshotRef.current = initSnap;
        liveSceneSnapshotRef.current = initSnap;
        lastLobbySigRef.current = getLobbyUiSignature(initSnap, engine.localPlayerId);
        setSoloSnapshot(initSnap);
        setMode('solo');
        setPaused(false);
        setActiveTaskId(null);
        setActiveStationModal(null);
        setShowTacticalMap(false);
        setShowGuide(false);
        setClueNotice(null);
      };

      if (skipRoleReveal) {
        setLoadingSubtitle(null);
        launch();
        return;
      }

      if (loadingTimerRef.current !== null) {
        window.clearTimeout(loadingTimerRef.current);
      }
      setLoadingSubtitle(`${soloPlayerCount} জনের মহল্লা লবি তৈরি হচ্ছে...`);
      loadingTimerRef.current = window.setTimeout(() => {
        loadingTimerRef.current = null;
        setLoadingSubtitle(null);
        launch();
      }, 650);
    },
    [playerName, playerColor, showClueNotice, soloSettings, soloPlayerCount],
  );

  // Support ?autostart=1 to jump straight into active 3D gameplay
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startSoloMatch(undefined, undefined, true);
    }
  }, [startSoloMatch]);

  // Solo 15Hz simulation step (3D scene reads liveSceneSnapshotRef at 60fps; Lobby React skips pure position ticks)
  useEffect(() => {
    if (mode !== 'solo') return;
    let lastTick = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.5, Math.max(0.016, (now - lastTick) / 1000));
      lastTick = now;
      const engine = soloEngineRef.current;
      if (!engine) return;
      const cur = engine.getSnapshot();
      // Never pause meeting/voting/ejection/role_reveal phases so Shalish can never freeze
      if (paused && cur.phase === 'playing') return;
      engine.step(dt);
      const nextSnap = engine.getSnapshot();
      soloLiveSnapshotRef.current = nextSnap;
      liveSceneSnapshotRef.current = nextSnap;
      if (nextSnap.phase === 'lobby') {
        const nextSig = getLobbyUiSignature(nextSnap, engine.localPlayerId);
        if (nextSig !== lastLobbySigRef.current) {
          lastLobbySigRef.current = nextSig;
          setSoloSnapshot(nextSnap);
        }
      } else {
        lastLobbySigRef.current = '';
        setSoloSnapshot(nextSnap);
      }
    }, 66);
    return () => clearInterval(timer);
  }, [mode, paused]);

  const handleLocalMove = useCallback(
    (x: number, z: number, vx: number, vz: number, yaw: number, y?: number) => {
      if (mode === 'solo') {
        soloEngineRef.current?.moveLocal(x, z, vx, vz, yaw, y);
      } else if (mode === 'multi') {
        mp.send({ type: 'player:move', x, z, y, vx, vz, yaw });
      }
    },
    [mode, mp],
  );

  const handleLocalVehicleDrive = useCallback(
    (
      vehicleId: string,
      x: number,
      z: number,
      yaw: number,
      vx: number,
      vz: number,
      speed: number,
      steer: number,
    ) => {
      if (mode === 'solo') {
        soloEngineRef.current?.driveLocalVehicle(x, z, yaw, vx, vz, speed, steer);
      } else if (mode === 'multi') {
        mp.send({ type: 'player:vehicle_drive', vehicleId, x, z, yaw, vx, vz, speed, steer });
      }
    },
    [mode, mp],
  );

  const handleToggleVehicle = useCallback(
    (vehicleId?: string) => {
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.toggleLocalVehicle(vehicleId);
        syncSoloSnapshotNow();
      } else if (mode === 'multi') {
        mp.send({ type: 'player:vehicle_toggle', vehicleId });
      }
    },
    [mode, mp, syncSoloSnapshotNow],
  );

  const handleVehicleHorn = useCallback(() => {
    if (mode === 'solo') {
      soloEngineRef.current?.honkLocalVehicle();
    } else if (mode === 'multi') {
      mp.send({ type: 'player:vehicle_horn' });
    }
  }, [mode, mp]);

  const handleOpenStation = useCallback(
    (kind: StationModalKind) => {
      setActiveStationModal(kind);
      if (kind === 'cams') {
        if (mode === 'solo' && soloEngineRef.current) {
          soloEngineRef.current.setWatchingCams(true);
          setSoloSnapshot(soloEngineRef.current.getSnapshot());
        } else if (mode === 'multi') {
          mp.send({ type: 'player:watch_cams', watching: true });
        }
      }
    },
    [mode, mp],
  );

  const handleCloseStation = useCallback(() => {
    setActiveStationModal((prev) => {
      if (prev === 'cams') {
        if (mode === 'solo' && soloEngineRef.current) {
          soloEngineRef.current.setWatchingCams(false);
          setSoloSnapshot(soloEngineRef.current.getSnapshot());
        } else if (mode === 'multi') {
          mp.send({ type: 'player:watch_cams', watching: false });
        }
      }
      return null;
    });
  }, [mode, mp]);

  const handleCompleteTask = useCallback(
    (taskId: string) => {
      const lp = activeSnapshot?.players.find((p) => p.id === activePlayerId) ?? null;
      if (mode === 'solo' && soloEngineRef.current) {
        if (soloEngineRef.current.completeLocalTask(taskId) && lp && canCompleteTasks(lp)) {
          incrementCareerTasksCompleted(1);
        }
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:task_complete', taskId });
        if (lp && canCompleteTasks(lp)) {
          incrementCareerTasksCompleted(1);
        }
      }
      setActiveTaskId(null);
    },
    [mode, mp, activeSnapshot, activePlayerId],
  );

  const handleReportBody = useCallback(
    (bodyId: string) => {
      setActiveTaskId(null);
      setShowTacticalMap(false);
      handleCloseStation();
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.reportBody(bodyId);
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:report_body', bodyId });
      }
    },
    [mode, mp, handleCloseStation],
  );

  const handleEmergencyMeeting = useCallback(() => {
    setActiveTaskId(null);
    setShowTacticalMap(false);
    handleCloseStation();
    if (mode === 'solo' && soloEngineRef.current) {
      soloEngineRef.current.callEmergencyMeeting();
      setSoloSnapshot(soloEngineRef.current.getSnapshot());
    } else if (mode === 'multi') {
      mp.send({ type: 'player:emergency_meeting' });
    }
  }, [mode, mp, handleCloseStation]);

  const handleKill = useCallback(
    (targetId: string) => {
      shakeTriggerRef.current?.(0.75);
      setKillFlash(true);
      window.setTimeout(() => setKillFlash(false), 380);
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.triggerKill(targetId);
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:kill', targetId });
      }
    },
    [mode, mp],
  );

  const handleSabotage = useCallback(
    (sabotageType: SabotageType) => {
      shakeTriggerRef.current?.(0.45);
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.triggerSabotage(sabotageType);
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:sabotage', sabotageType });
      }
    },
    [mode, mp],
  );

  const handleLockDoors = useCallback(
    (zoneId: DoorZoneId) => {
      shakeTriggerRef.current?.(0.35);
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.lockDoors(zoneId);
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:lock_doors', zoneId });
      }
    },
    [mode, mp],
  );

  const handleFixSabotageHold = useCallback(
    (holding: boolean, valveId?: 'valve_cha' | 'valve_rickshaw') => {
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.fixSabotage(holding, valveId);
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:fix_sabotage', holding, valveId });
      }
    },
    [mode, mp],
  );

  const handleVentToggle = useCallback(
    (destVentId?: string) => {
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.toggleVent(destVentId);
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:vent_toggle', destinationVentId: destVentId });
      }
    },
    [mode, mp],
  );

  const handleUseAbility = useCallback(
    (targetId?: string) => {
      if (mode === 'solo' && soloEngineRef.current) {
        soloEngineRef.current.useSpecialAbility(targetId);
        setSoloSnapshot(soloEngineRef.current.getSnapshot());
      } else if (mode === 'multi') {
        mp.send({ type: 'player:use_ability', targetId });
      }
    },
    [mode, mp],
  );

  const handleTogglePointerLook = useCallback(() => {
    setPointerLookEnabled((prev) => {
      const next = !prev;
      if (!next && document.pointerLockElement) {
        try {
          document.exitPointerLock?.();
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  const handleResetCamera = useCallback(() => {
    resetCameraRef.current?.();
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handlePlayMeme = useCallback(
    (memeId: MemeSoundId) => {
      if (mode === 'multi') {
        mp.send({ type: 'player:meme_sfx', memeId });
      } else {
        soundEngine.playMeme(memeId);
      }
    },
    [mode, mp],
  );

  const handleToggleTouchControls = useCallback(() => {
    touchOverrideRef.current = true;
    setTouchControlsEnabled((v) => !v);
  }, []);

  const handlePause = useCallback(() => {
    setPaused(true);
  }, []);

  const handleOpenTacticalMap = useCallback(() => {
    setShowTacticalMap(true);
  }, []);

  const handleOpenGuide = useCallback(() => {
    setShowGuide(true);
  }, []);

  const handleOpenMemePack = useCallback(() => {
    setShowMemePack(true);
  }, []);

  const handleOpenTask = useCallback(
    (id: string) => {
      const snap = activeSnapshotRef.current;
      const pid = activePlayerIdRef.current;
      const lp = snap?.players.find((p) => p.id === pid);
      if (snap && lp && isTaskLockedBySabotage(id, snap.sabotage) && lp.role !== 'vondo') {
        showClueNotice('ওয়াই-ফাই নেই!', 'ডিশ হাবে গিয়ে ওয়াই-ফাই ঠিক করো — ডিজিটাল কাজ এখন বন্ধ!');
        return;
      }
      setActiveTaskId(id);
    },
    [showClueNotice],
  );

  const handleJump = useCallback(() => {
    jumpTriggerRef.current?.();
  }, []);

  const handleHandbrakeChange = useCallback((active: boolean) => {
    handbrakeRef.current = active;
  }, []);

  const handleBoostChange = useCallback((active: boolean) => {
    boostRef.current = active;
  }, []);

  const handleDriveSpeedChange = useCallback((speedMs: number) => {
    const nextKmh = Math.round(speedMs * 3.6);
    setDriveSpeedMs((prev) => (Math.round(prev * 3.6) === nextKmh ? prev : speedMs));
  }, []);

  const handleReturnToTitle = useCallback(() => {
    if (isMulti) mp.disconnectRoom();
    soloEngineRef.current = null;
    soloLiveSnapshotRef.current = null;
    liveSceneSnapshotRef.current = null;
    lastLobbySigRef.current = '';
    setLobbySheetExpanded(false);
    setSoloSnapshot(null);
    setPaused(false);
    setActiveTaskId(null);
    setActiveStationModal(null);
    setClueNotice(null);
    setShowMemePack(false);
    setShowTacticalMap(false);
    setShowGuide(false);
    setPointerLookEnabled(false);
    setMode('title');
  }, [isMulti, mp]);

  // Global keyboard bindings for Title Start, Pause, Mute, Map, Guide, and Gameplay Actions
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';

      if (derivedPhase === 'title' && !inInput && !showMemePack && !showGuide && (e.code === 'Enter' || e.code === 'Space')) {
        if (target?.tagName === 'BUTTON') return;
        e.preventDefault();
        startSoloMatch();
        return;
      }

      if (inInput) return;

      if (e.code === 'KeyM') {
        handleToggleMute();
        return;
      }

      if (e.code === 'KeyH') {
        setShowGuide((v) => !v);
        return;
      }

      if (e.code === 'Tab' && derivedPhase === 'playing') {
        e.preventDefault();
        setShowTacticalMap((v) => !v);
        return;
      }

      if (e.code === 'KeyC' && (derivedPhase === 'playing' || derivedPhase === 'lobby')) {
        handleTogglePointerLook();
        return;
      }

      if (e.code === 'KeyY' && (derivedPhase === 'playing' || derivedPhase === 'lobby')) {
        handleResetCamera();
        return;
      }

      if (derivedPhase === 'playing' || derivedPhase === 'lobby') {
        const memeList = MEME_SOUNDS;
        let idx = -1;
        if (e.code.startsWith('Digit')) {
          const digit = Number(e.code.replace('Digit', ''));
          idx = digit === 0 ? 9 : digit - 1;
        } else if (e.code === 'Minus') {
          idx = 10;
        }
        if (idx >= 0 && idx < memeList.length) {
          handlePlayMeme(memeList[idx].id);
          return;
        }
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (showGuide) {
          setShowGuide(false);
          return;
        }
        if (showTacticalMap) {
          setShowTacticalMap(false);
          return;
        }
        if (showMemePack) {
          setShowMemePack(false);
          return;
        }
        if (activeTaskId) {
          setActiveTaskId(null);
          return;
        }
        if (activeStationModal) {
          handleCloseStation();
          return;
        }
        if (derivedPhase === 'playing') {
          setPaused(true);
        } else if (derivedPhase === 'paused') {
          setPaused(false);
        }
        return;
      }

      if (derivedPhase === 'lobby' && !showMemePack && !showGuide && activeSnapshot && activePlayerId) {
        const lpLobby = activeSnapshot.players.find((p) => p.id === activePlayerId);
        if (lpLobby) {
          if (e.code === 'KeyF' && !e.repeat) {
            handleToggleVehicle();
            return;
          }
          if (e.code === 'KeyK' && lpLobby.vehicleId && !e.repeat) {
            handleVehicleHorn();
            return;
          }
        }
      }

      if (
        derivedPhase !== 'playing' ||
        showMemePack ||
        showTacticalMap ||
        showGuide ||
        activeTaskId ||
        activeStationModal ||
        !activeSnapshot ||
        !activePlayerId
      ) {
        return;
      }
      const lp = activeSnapshot.players.find((p) => p.id === activePlayerId);
      if (!lp) return;

      const fixRange = lp.specialRole === 'mistri' ? MISTRI_FIX_RANGE : SABOTAGE_FIX_RANGE;
      if (e.code === 'KeyE') {
        if (activeSnapshot.sabotage.active && lp.alive) {
          const nearValve =
            activeSnapshot.sabotage.active === 'gas_leak'
              ? findNearestGasValve(lp.x, lp.z, activeSnapshot.sabotage, fixRange)
              : null;
          const nearStation =
            activeSnapshot.sabotage.active !== 'gas_leak' &&
            distance2D(lp.x, lp.z, activeSnapshot.sabotage.fixStationX, activeSnapshot.sabotage.fixStationZ) <=
              fixRange;
          if (nearValve || nearStation) {
            if (!e.repeat && !holdingFixKeyRef.current) {
              holdingFixKeyRef.current = true;
              handleFixSabotageHold(true, nearValve?.id);
            }
            return;
          }
        }
        // Alive or Ghost Para-basi (non-Pagol) open real tasks; Batpar can open fake tasks for cover
        if (canCompleteTasks(lp) || lp.role === 'vondo') {
          const st = TASK_STATIONS.find((s) => {
            const undone = lp.tasks.some((t) => t.taskId === s.id && !t.completed);
            return undone && distance2D(lp.x, lp.z, s.x, s.z) <= s.radius;
          });
          if (st) {
            if (isTaskLockedBySabotage(st.id, activeSnapshot.sabotage) && lp.role !== 'vondo') {
              showClueNotice('ওয়াই-ফাই নেই!', 'ডিশ হাবে গিয়ে ওয়াই-ফাই ঠিক করো — ডিজিটাল কাজ এখন বন্ধ!');
            } else {
              setActiveTaskId(st.id);
            }
            return;
          }
        }
        if (lp.alive) {
          if (distance2D(lp.x, lp.z, SECURITY_CAMS_POS.x, SECURITY_CAMS_POS.z) <= SECURITY_CAMS_POS.radius) {
            handleOpenStation('cams');
            return;
          }
          if (distance2D(lp.x, lp.z, ADMIN_TABLE_POS.x, ADMIN_TABLE_POS.z) <= ADMIN_TABLE_POS.radius) {
            handleOpenStation('admin');
            return;
          }
          if (distance2D(lp.x, lp.z, VITALS_POS.x, VITALS_POS.z) <= VITALS_POS.radius) {
            handleOpenStation('vitals');
            return;
          }
        }
      } else if (e.code === 'KeyR') {
        const body = findNearestReportableBody(lp, activeSnapshot.bodies, activeSnapshot.doorLocks);
        if (body) handleReportBody(body.id);
      } else if (e.code === 'KeyF') {
        if (lp.vehicleId) {
          if (!e.repeat) handleToggleVehicle();
          return;
        }
        if (
          lp.alive &&
          !isCriticalSabotage(activeSnapshot.sabotage.active) &&
          activeSnapshot.emergencyCooldownRemaining <= 0 &&
          lp.emergencyMeetingsLeft > 0 &&
          distance2D(lp.x, lp.z, EMERGENCY_BELL_POS.x, EMERGENCY_BELL_POS.z) <=
            EMERGENCY_BELL_POS.interactRadius
        ) {
          handleEmergencyMeeting();
        } else if (!e.repeat) {
          handleToggleVehicle();
        }
      } else if (e.code === 'KeyK') {
        if (lp.vehicleId && !e.repeat) {
          handleVehicleHorn();
        }
      } else if (e.code === 'KeyG') {
        if (!lp.alive) {
          handleUseAbility();
          return;
        }
        if (lp.specialRole === 'cctv_kaku' && lp.abilityCooldown <= 0.05 && !lp.inVent) {
          handleUseAbility();
          handleOpenStation('cams');
          return;
        }
        if (lp.specialRole === 'bohurupi' && !lp.disguiseColor) {
          const firstTarget = activeSnapshot.players.find(
            (p) => p.alive && p.id !== lp.id && p.role !== 'vondo',
          );
          if (firstTarget) handleUseAbility(firstTarget.id);
        } else {
          handleUseAbility();
        }
      } else if (e.code === 'KeyQ' && lp.role === 'vondo') {
        const targetPlayer = findNearestKillTarget(lp, activeSnapshot.players);
        if (targetPlayer) handleKill(targetPlayer.id);
      } else if (e.code === 'KeyV' && canUseVent(lp)) {
        handleVentToggle();
      } else if (e.code === 'KeyX' && lp.role === 'vondo') {
        handleSabotage('loadshedding');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && holdingFixKeyRef.current) {
        holdingFixKeyRef.current = false;
        handleFixSabotageHold(false);
      }
    };

    const onBlur = () => {
      if (holdingFixKeyRef.current) {
        holdingFixKeyRef.current = false;
        handleFixSabotageHold(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    derivedPhase,
    showMemePack,
    showTacticalMap,
    showGuide,
    activeTaskId,
    activeStationModal,
    activeSnapshot,
    activePlayerId,
    startSoloMatch,
    handleToggleMute,
    handleTogglePointerLook,
    handleResetCamera,
    handleFixSabotageHold,
    handleOpenStation,
    handleCloseStation,
    handleReportBody,
    handleEmergencyMeeting,
    handleUseAbility,
    handleKill,
    handleVentToggle,
    handleSabotage,
    handlePlayMeme,
    handleToggleVehicle,
    handleVehicleHorn,
    showClueNotice,
  ]);

  const activeTaskStation = activeTaskId ? TASK_STATIONS.find((s) => s.id === activeTaskId) ?? null : null;
  const localActivePlayer =
    activeSnapshot && activePlayerId
      ? activeSnapshot.players.find((p) => p.id === activePlayerId) ?? null
      : null;
  const drivingVehicle =
    localActivePlayer?.vehicleId && activeSnapshot?.vehicles
      ? activeSnapshot.vehicles.find((v) => v.id === localActivePlayer.vehicleId) ?? null
      : null;
  const nearbyVehicle =
    localActivePlayer &&
    localActivePlayer.alive &&
    !localActivePlayer.inVent &&
    !localActivePlayer.vehicleId &&
    (localActivePlayer.y ?? 0) <= 1.2
      ? findNearestAvailableVehicle(localActivePlayer.x, localActivePlayer.z, activeSnapshot?.vehicles)
      : null;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Persistent 3D WebGL Moholla World */}
      <WorldScene
        phase={derivedPhase}
        snapshot={activeSnapshot}
        liveSnapshotRef={liveSceneSnapshotRef}
        localPlayerId={activePlayerId}
        moveSpeed={activeSnapshot?.settings.moveSpeed ?? 9.0}
        isModalOpen={
          showMemePack ||
          showTacticalMap ||
          showGuide ||
          Boolean(activeTaskId) ||
          Boolean(activeStationModal) ||
          derivedPhase === 'role_reveal' ||
          derivedPhase === 'meeting' ||
          derivedPhase === 'vote_results' ||
          derivedPhase === 'paused' ||
          derivedPhase === 'gameover'
        }
        joystickInputRef={joystickInputRef}
        onLocalMove={handleLocalMove}
        onLocalVehicleDrive={handleLocalVehicleDrive}
        onDriveSpeedChange={handleDriveSpeedChange}
        handbrakeRef={handbrakeRef}
        boostRef={boostRef}
        onShakeTriggerRef={shakeTriggerRef}
        pointerLookEnabled={pointerLookEnabled}
        onPointerLookChange={setPointerLookEnabled}
        resetCameraRef={resetCameraRef}
        jumpTriggerRef={jumpTriggerRef}
        onCompassYawChange={handleCompassYawChange}
      />

      {/* Title Screen */}
      {derivedPhase === 'title' && (
        <TitleOverlay
          playerName={playerName}
          playerColor={playerColor}
          publicRooms={mp.publicRooms}
          errorMsg={mp.errorMsg}
          connecting={mp.connecting}
          soloPlayerCount={soloPlayerCount}
          soloSettings={soloSettings}
          onChangeName={setPlayerName}
          onChangeColor={setPlayerColor}
          onChangeSoloPlayerCount={handleChangeSoloPlayerCount}
          onUpdateSoloSettings={handleUpdateSoloSettings}
          onStartSolo={(forceRole, forceSpecial) => {
            soundEngine.startBgm();
            if (isTouchOrMobileDevice()) {
              void enterMobileFullscreenAndLandscape();
            }
            startSoloMatch(forceRole, forceSpecial);
          }}
          onCreateRoom={() => {
            soundEngine.startBgm();
            if (isTouchOrMobileDevice()) {
              void enterMobileFullscreenAndLandscape();
            }
            setMode('multi');
            mp.createRoom(playerName, playerColor);
          }}
          onJoinRoom={(code) => {
            soundEngine.startBgm();
            if (isTouchOrMobileDevice()) {
              void enterMobileFullscreenAndLandscape();
            }
            setMode('multi');
            mp.joinRoom(code, playerName, playerColor);
          }}
          onRefreshRooms={mp.refreshRooms}
          onOpenMemePack={isAdminMode ? () => setShowMemePack(true) : undefined}
          onOpenGuide={() => setShowGuide(true)}
          initialJoinCode={initialJoinCode}
        />
      )}

      {/* Waiting Lobby (Unified for Solo Room & Multiplayer) */}
      {derivedPhase === 'lobby' && activeSnapshot && activePlayerId && (
        <>
          <LobbyOverlay
            snapshot={activeSnapshot}
            localPlayerId={activePlayerId}
            errorMsg={isMulti ? mp.errorMsg : null}
            onMobileSheetExpandedChange={setLobbySheetExpanded}
            onUpdateSettings={(s: Partial<RoomSettings>) => {
              if (isMulti) {
                mp.send({ type: 'lobby:settings', settings: s });
              } else if (soloEngineRef.current) {
                soloEngineRef.current.updateLobbySettings(s);
                syncSoloSnapshotNow();
              }
            }}
            onCustomize={(name, color) => {
              if (typeof name === 'string') setPlayerName(name);
              if (color) setPlayerColor(color);
              if (isMulti) {
                mp.send({ type: 'lobby:customize', name, color });
              } else if (soloEngineRef.current) {
                soloEngineRef.current.customizeLocal(name, color);
                syncSoloSnapshotNow();
              }
            }}
            onReadyToggle={
              isMulti ? (ready) => mp.send({ type: 'lobby:ready', ready }) : undefined
            }
            onKickPlayer={
              isMulti ? (targetPlayerId) => mp.send({ type: 'lobby:kick', targetPlayerId }) : undefined
            }
            onAddBot={() => {
              if (isMulti) {
                mp.send({ type: 'lobby:add_bot' });
              } else if (soloEngineRef.current) {
                soloEngineRef.current.addBot();
                syncSoloSnapshotNow();
              }
            }}
            onRemoveBot={(targetPlayerId) => {
              if (isMulti) {
                mp.send({ type: 'lobby:remove_bot', targetPlayerId });
              } else if (soloEngineRef.current) {
                soloEngineRef.current.removeBot(targetPlayerId);
                syncSoloSnapshotNow();
              }
            }}
            onRemoveBots={() => {
              if (isMulti) {
                mp.send({ type: 'lobby:remove_bots' });
              } else if (soloEngineRef.current) {
                soloEngineRef.current.removeBots();
                syncSoloSnapshotNow();
              }
            }}
            onSendLobbyChat={(text) => {
              if (isMulti) {
                mp.send({ type: 'lobby:chat', text });
              } else if (soloEngineRef.current) {
                soloEngineRef.current.sendLobbyChat(text);
                syncSoloSnapshotNow();
              }
            }}
            onStartMatch={() => {
              if (isMulti) {
                mp.send({ type: 'lobby:start' });
              } else if (soloEngineRef.current) {
                soloEngineRef.current.startCountdown();
                syncSoloSnapshotNow();
              }
            }}
            onCancelStart={() => {
              if (isMulti) {
                mp.send({ type: 'lobby:cancel_start' });
              } else if (soloEngineRef.current) {
                soloEngineRef.current.cancelCountdown();
                syncSoloSnapshotNow();
              }
            }}
            onOpenGuide={() => setShowGuide(true)}
            onLeaveRoom={handleReturnToTitle}
            drivingVehicle={drivingVehicle}
            nearbyVehicle={nearbyVehicle}
            driveSpeedMs={driveSpeedMs}
            onToggleVehicle={handleToggleVehicle}
            onVehicleHorn={handleVehicleHorn}
          />
          <MobileControls
            visible={
              touchControlsEnabled &&
              !lobbySheetExpanded &&
              !showMemePack &&
              !showGuide
            }
            joystickInputRef={joystickInputRef}
            onJump={handleJump}
            isDriving={Boolean(drivingVehicle)}
            onHorn={handleVehicleHorn}
            onHandbrakeChange={handleHandbrakeChange}
            onBoostChange={handleBoostChange}
          />
        </>
      )}

      {/* Role Reveal Intro Banner */}
      {derivedPhase === 'role_reveal' && activeSnapshot && activePlayerId && (
        <RoleRevealModal
          snapshot={activeSnapshot}
          localPlayerId={activePlayerId}
          onContinue={
            mode === 'solo'
              ? () => {
                  soloEngineRef.current?.dismissRoleReveal();
                  if (soloEngineRef.current) setSoloSnapshot(soloEngineRef.current.getSnapshot());
                }
              : undefined
          }
        />
      )}

      {/* Active Gameplay HUD & Mobile Virtual Thumbstick */}
      {derivedPhase === 'playing' && activeSnapshot && activePlayerId && (
        <>
          <GameHud
            snapshot={activeSnapshot}
            localPlayerId={activePlayerId}
            muted={muted}
            touchControlsEnabled={touchControlsEnabled}
            pointerLookEnabled={pointerLookEnabled}
            clueNotice={clueNotice}
            killFlash={killFlash}
            subscribeCompassYaw={subscribeCompassYaw}
            onToggleTouchControls={handleToggleTouchControls}
            onTogglePointerLook={handleTogglePointerLook}
            onResetCamera={handleResetCamera}
            onToggleMute={handleToggleMute}
            onPause={handlePause}
            onOpenTacticalMap={handleOpenTacticalMap}
            onOpenGuide={handleOpenGuide}
            onOpenTask={handleOpenTask}
            onOpenStation={handleOpenStation}
            onReportBody={handleReportBody}
            onEmergencyMeeting={handleEmergencyMeeting}
            onKill={handleKill}
            onSabotage={handleSabotage}
            onLockDoors={handleLockDoors}
            onFixSabotageHold={handleFixSabotageHold}
            onVentToggle={handleVentToggle}
            onUseAbility={handleUseAbility}
            onPlayMeme={handlePlayMeme}
            onOpenMemePack={isAdminMode ? handleOpenMemePack : undefined}
            drivingVehicle={drivingVehicle}
            nearbyVehicle={nearbyVehicle}
            driveSpeedMs={driveSpeedMs}
            onToggleVehicle={handleToggleVehicle}
            onVehicleHorn={handleVehicleHorn}
          />
          <MobileControls
            visible={
              touchControlsEnabled &&
              !activeTaskId &&
              !activeStationModal &&
              !showMemePack &&
              !showTacticalMap &&
              !showGuide
            }
            joystickInputRef={joystickInputRef}
            onJump={handleJump}
            isDriving={Boolean(drivingVehicle)}
            onHorn={handleVehicleHorn}
            onHandbrakeChange={handleHandbrakeChange}
            onBoostChange={handleBoostChange}
          />
        </>
      )}

      {/* Interactive Mini-Task Modal */}
      {derivedPhase === 'playing' && activeTaskStation && (
        <TaskModal
          station={activeTaskStation}
          onComplete={handleCompleteTask}
          onClose={() => setActiveTaskId(null)}
        />
      )}

      {/* Security Cams / Admin Radar / Vitals ECG Modal */}
      {derivedPhase === 'playing' && activeStationModal && activeSnapshot && (
        <StationModal
          kind={activeStationModal}
          snapshot={activeSnapshot}
          onClose={handleCloseStation}
        />
      )}

      {/* Full-Screen Moholla Tactical & Sabotage Map Modal */}
      {derivedPhase === 'playing' && showTacticalMap && activeSnapshot && activePlayerId && (
        <TacticalMapModal
          snapshot={activeSnapshot}
          localPlayerId={activePlayerId}
          onClose={() => setShowTacticalMap(false)}
          onSabotage={handleSabotage}
          onLockDoors={handleLockDoors}
        />
      )}

      {/* Emergency Adda Voting, Vote Tally & Chat Modal */}
      {(derivedPhase === 'meeting' || derivedPhase === 'vote_results') &&
        activeSnapshot &&
        activePlayerId && (
          <MeetingModal
            snapshot={activeSnapshot}
            localPlayerId={activePlayerId}
            onSendChat={(text) => {
              if (isMulti) mp.send({ type: 'meeting:chat', text });
              else soloEngineRef.current?.sendChat(text);
            }}
            onTypingChange={(typing) => {
              if (isMulti) mp.send({ type: 'meeting:typing', typing });
              else soloEngineRef.current?.setMeetingTyping(typing);
            }}
            onCastVote={(targetId) => {
              if (isMulti) mp.send({ type: 'meeting:vote', targetId });
              else {
                soloEngineRef.current?.castVote(targetId);
                if (soloEngineRef.current) setSoloSnapshot(soloEngineRef.current.getSnapshot());
              }
            }}
            onPlayMeme={handlePlayMeme}
          />
        )}

      {/* Ejection Transition Banner */}
      {derivedPhase === 'ejecting' && activeSnapshot?.ejection && (
        <EjectionModal
          ejection={activeSnapshot.ejection}
          onContinue={
            mode === 'solo'
              ? () => {
                  soloEngineRef.current?.dismissEjection();
                  if (soloEngineRef.current) setSoloSnapshot(soloEngineRef.current.getSnapshot());
                }
              : undefined
          }
        />
      )}

      {/* Pause Modal */}
      {derivedPhase === 'paused' && (
        <PauseModal
          onResume={() => setPaused(false)}
          onRestart={() => {
            if (isMulti) {
              setPaused(false);
            } else {
              startSoloMatch();
            }
          }}
          onTitle={handleReturnToTitle}
          onOpenMemePack={isAdminMode ? () => setShowMemePack(true) : undefined}
        />
      )}

      {/* 3-Second Dramatic Finale Hold Banner -> Full Outcome Modal */}
      {derivedPhase === 'gameover' && activeSnapshot?.outcome && activePlayerId && !showOutcomeModal && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-30 flex flex-col items-center justify-center p-4 text-center animate-fade-in"
          style={{
            background:
              activeSnapshot.outcome.winner === 'pagol' ||
              activeSnapshot.outcome.winner === 'chandabaz' ||
              activeSnapshot.outcome.winner === 'tiktok_star'
                ? 'radial-gradient(circle at center, rgba(88,28,135,0.92), rgba(5,9,17,0.97))'
                : activeSnapshot.outcome.winner === 'parabasi'
                  ? 'radial-gradient(circle at center, rgba(6,78,59,0.92), rgba(5,9,17,0.97))'
                  : 'radial-gradient(circle at center, rgba(136,19,55,0.92), rgba(5,9,17,0.97))',
          }}
        >
          <span className="text-xs font-extrabold uppercase tracking-[0.28em] text-amber-300 mb-2">
            খেলা শেষ · মহল্লার রায়
          </span>
          <h1
            className={`font-display text-4xl sm:text-6xl font-black tracking-tight drop-shadow-lg ${
              activeSnapshot.outcome.winner === 'pagol' ||
              activeSnapshot.outcome.winner === 'chandabaz' ||
              activeSnapshot.outcome.winner === 'tiktok_star'
                ? 'text-purple-300'
                : activeSnapshot.outcome.winner === 'parabasi'
                  ? 'text-emerald-300'
                  : 'text-rose-400'
            }`}
          >
            {activeSnapshot.outcome.winner === 'pagol'
              ? 'পাগলা বাবা বিজয়ী!'
              : activeSnapshot.outcome.winner === 'chandabaz'
                ? 'চাঁদাবাজ বিজয়ী!'
                : activeSnapshot.outcome.winner === 'tiktok_star'
                  ? 'টিকটক স্টার বিজয়ী!'
                  : activeSnapshot.outcome.winner === 'parabasi'
                    ? 'পাড়াবাসী বিজয়ী!'
                    : 'বাটপার বিজয়ী!'}
          </h1>
          <p className="mt-3 max-w-lg text-sm sm:text-base font-semibold text-slate-100">
            {activeSnapshot.outcome.reason === 'tasks_completed'
              ? 'মহল্লার সব কাজ শেষ — আজকে সবার জন্য বিরিয়ানি পার্টি!'
              : activeSnapshot.outcome.reason === 'batpars_out'
                ? 'সব বাটপার ধরা খেয়ে পুকুরে চুবানি খেয়েছে!'
                : activeSnapshot.outcome.reason === 'batpars_outnumber'
                  ? 'বাটপাররা পুরো মহল্লা দখল করে নিয়েছে!'
                  : activeSnapshot.outcome.reason === 'critical_sabotage_timeout'
                    ? 'গ্যাস ফেটে পুরো পাড়া উড়ে গেছে!'
                    : activeSnapshot.outcome.reason === 'chandabaz_extorted'
                      ? `${activeSnapshot.outcome.winnerPlayerName ?? 'চাঁদাবাজ'} জীবিত সব প্রতিবেশীর কাছ থেকে চাঁদা তুলে জিতে গেছে!`
                      : activeSnapshot.outcome.reason === 'tiktok_viral'
                        ? `${activeSnapshot.outcome.winnerPlayerName ?? 'টিকটক স্টার'} ৩টা ভাইরাল রিল ছেড়ে কাপ নিয়ে নিল!`
                        : `${activeSnapshot.outcome.winnerPlayerName ?? 'পাগলা বাবা'} সবাইকে উল্লু বানিয়ে কাপ নিয়ে গেল!`}
          </p>
          {activeSnapshot.outcome.coWinnerNames && activeSnapshot.outcome.coWinnerNames.length > 0 && (
            <p className="mt-2 text-xs font-bold text-purple-200">
              + চামচা সহ-বিজয়ী: {activeSnapshot.outcome.coWinnerNames.join(', ')}
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowOutcomeModal(true)}
            className="mt-6 px-4 py-2 rounded-xl bg-slate-900/75 hover:bg-slate-800 border border-white/15 text-xs font-semibold text-slate-300"
          >
            ম্যাচের বিস্তারিত দেখো
          </button>
        </div>
      )}

      {derivedPhase === 'gameover' && activeSnapshot?.outcome && activePlayerId && showOutcomeModal && (
        <OutcomeModal
          snapshot={activeSnapshot}
          localPlayerId={activePlayerId}
          outcome={activeSnapshot.outcome}
          isMultiplayer={isMulti}
          onPlayAgain={() => {
            if (isMulti) {
              mp.send({ type: 'room:play_again' });
            } else if (soloEngineRef.current) {
              soloEngineRef.current.playAgainToLobby();
              setSoloSnapshot(soloEngineRef.current.getSnapshot());
            }
          }}
          onTitle={handleReturnToTitle}
        />
      )}

      {/* Original Bangla Meme Pack Manager Modal (Admin Only) */}
      {isAdminMode && showMemePack && <MemePackModal onClose={() => setShowMemePack(false)} />}

      {/* Rules, Roles & Controls Guide Modal */}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      {/* Among Us Style Moholla Loading Overlay */}
      {(loadingSubtitle || (mode === 'multi' && mp.connecting && !activeSnapshot)) && (
        <MatchLoadingOverlay
          subtitle={loadingSubtitle ?? 'মহল্লা রুমে যুক্ত হচ্ছে...'}
        />
      )}
    </div>
  );
}
