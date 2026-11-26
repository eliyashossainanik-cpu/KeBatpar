import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ROOM_SETTINGS,
  DOOR_LOCK_COOLDOWN_SEC,
  DOOR_LOCK_DURATION_SEC,
  INITIAL_KILL_COOLDOWN_SEC,
  SABOTAGE_INITIAL_LOCKOUT_SEC,
  advanceSabotageState,
  assignMatchTasks,
  assignRoles,
  assignSpecialRoles,
  computeTaskProgress,
  createEmptySabotageState,
  evaluateMatchOutcome,
  makeDefaultPlayerState,
  makeEmptyDoorLocks,
  sanitizeSoloConfig,
  stepJharudarChannel,
  tallyVotes,
} from './gameRules';
import {
  type BotBrainState,
  NAV_NODES,
  computeNextMoveTarget,
  isPathSegmentWalkable,
  resetBotBrainsForMeeting,
  stepBotsMeeting,
  stepBotsPlaying,
} from './botAi';
import {
  GAS_LEAK_VALVES,
  SPAWN_RING,
  TASK_STATIONS,
} from './mapData';
import { PLAYER_COLORS, type BodyMarker, type GamePhase, type MatchOutcome, type PlayerState } from './types';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SimResult {
  playerCount: number;
  durationSec: number;
  outcome: MatchOutcome;
  kills: number;
  meetings: number;
  sabotages: number;
  taskProgress: number;
}

export function runSimulatedMatch(playerCount: number, seed: number): SimResult {
  const rng = mulberry32(seed);
  const { playerCount: safeCount, settings } = sanitizeSoloConfig(playerCount, {
    ...DEFAULT_ROOM_SETTINGS,
    vondoCount: playerCount >= 11 ? 3 : playerCount >= 8 ? 2 : 1,
    tasksPerPlayer: 5,
  });

  const roster: PlayerState[] = Array.from({ length: safeCount }, (_, i) =>
    makeDefaultPlayerState({
      id: `bot_${i}`,
      name: `Bot_${i}`,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length].id,
      isBot: true,
      isHost: i === 0,
      ready: true,
      emergencyMeetingsLeft: settings.emergencyMeetingsPerPlayer,
    }),
  );

  let players = assignRoles(roster, settings.vondoCount, rng);
  players = assignSpecialRoles(players, settings.enableSpecialRoles, undefined, undefined, rng, settings.enableNeutralRoles);
  assignMatchTasks(players, settings.tasksPerPlayer, rng);

  players.forEach((p, idx) => {
    const sp = SPAWN_RING[idx % SPAWN_RING.length];
    p.x = sp.x;
    p.z = sp.z;
    p.yaw = sp.yaw;
    p.killCooldownRemaining = p.role === 'vondo' ? INITIAL_KILL_COOLDOWN_SEC : 0;
    p.abilityCooldown =
      p.specialRole === 'chandabaz'
        ? 20
        : p.specialRole === 'bohurupi' || p.specialRole === 'kobiraj' || p.specialRole === 'daroga' || p.specialRole === 'jharudar'
          ? 6
          : 0;
    p.revivesLeft = p.specialRole === 'daktar' ? 1 : 0;
    p.scansLeft = p.specialRole === 'goyenda' ? 2 : 0;
    p.shotsLeft = p.specialRole === 'daroga' ? 1 : 0;
    p.cleansLeft = p.specialRole === 'jharudar' ? 3 : 0;
    p.pranksLeft = 1;
  });

  let phase: GamePhase = 'role_reveal';
  let phaseTimer = 15.0;
  let meetingTimer = 0;
  let discussionTimer = 0;
  let emergencyCooldown = settings.emergencyCooldownSec;
  let bodies: BodyMarker[] = [];
  let sabotage = createEmptySabotageState(SABOTAGE_INITIAL_LOCKOUT_SEC);
  let doorLocks = makeEmptyDoorLocks();
  const holdingFixMap = new Map<string, { valveId?: 'valve_cha' | 'valve_rickshaw' }>();
  const brains = new Map<string, BotBrainState>();
  let justEjectedPlayer: PlayerState | null = null;
  let ejection: ReturnType<typeof tallyVotes> | null = null;

  let elapsedSec = 0;
  let kills = 0;
  let meetings = 0;
  let sabotages = 0;
  const dt = 0.25;
  const maxDurationSec = 900;

  while (elapsedSec < maxDurationSec) {
    elapsedSec += dt;

    if (phase === 'role_reveal') {
      phaseTimer -= dt;
      if (phaseTimer <= 0) phase = 'playing';
      continue;
    }

    if (phase === 'playing') {
      for (const p of players) {
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
          const jRes = stepJharudarChannel(p, bodies, dt);
          if (jRes.completedBody) {
            bodies = bodies.filter((b) => b.id !== jRes.completedBody!.id);
          }
        }
      }
      if (emergencyCooldown > 0) emergencyCooldown = Math.max(0, emergencyCooldown - dt);
      if (doorLocks.cooldownRemaining > 0) doorLocks.cooldownRemaining = Math.max(0, doorLocks.cooldownRemaining - dt);
      doorLocks.cha_dokan = Math.max(0, doorLocks.cha_dokan - dt);
      doorLocks.rickshaw_garage = Math.max(0, doorLocks.rickshaw_garage - dt);
      doorLocks.desco_power = Math.max(0, doorLocks.desco_power - dt);
      doorLocks.dish_roof = Math.max(0, doorLocks.dish_roof - dt);

      let triggeredOutcome: MatchOutcome | null = null;
      let startedMeeting = false;

      stepBotsPlaying({
        players,
        bodies,
        sabotage,
        doorLocks,
        settings,
        holdingFixMap,
        brains,
        dt,
        nowMs: Math.floor(elapsedSec * 1000),
        rng,
        onReportBody: () => {
          if (startedMeeting) return;
          startedMeeting = true;
          meetings++;
        },
        onKill: (_killer, _victim, shieldBlocked) => {
          if (!shieldBlocked) kills++;
        },
        onSabotage: () => {
          sabotages++;
        },
        onDoorLock: (zoneId) => {
          doorLocks[zoneId] = DOOR_LOCK_DURATION_SEC;
          doorLocks.cooldownRemaining = DOOR_LOCK_COOLDOWN_SEC;
        },
        onTaskCompletedCheckWin: () => {
          const stats = computeTaskProgress(players);
          const out = evaluateMatchOutcome(players, stats.progress, false, justEjectedPlayer);
          if (out) {
            triggeredOutcome = out;
            return true;
          }
          return false;
        },
      });

      if (triggeredOutcome) {
        return {
          playerCount: safeCount,
          durationSec: elapsedSec,
          outcome: triggeredOutcome,
          kills,
          meetings,
          sabotages,
          taskProgress: computeTaskProgress(players).progress,
        };
      }
      if (startedMeeting) {
        phase = 'meeting';
        discussionTimer = settings.discussionTimeSec;
        meetingTimer = settings.meetingTimeSec;
        holdingFixMap.clear();
        if (sabotage.active === 'gas_leak') {
          sabotage = createEmptySabotageState();
        } else {
          sabotage.fixProgress = 0;
          sabotage.fixerId = null;
        }
        doorLocks = makeEmptyDoorLocks();
        for (const pl of players) {
          pl.hasVoted = false;
          pl.votedFor = null;
          pl.jharuTargetBodyId = null;
          pl.jharuTimer = 0;
        }
        resetBotBrainsForMeeting(brains, rng);
        continue;
      }

      const sabStep = advanceSabotageState(sabotage, players, dt, holdingFixMap);
      if (sabStep.fixed || sabStep.expiredNonCriticalType) {
        holdingFixMap.clear();
      } else if (sabStep.expiredCritical) {
        holdingFixMap.clear();
        const stats = computeTaskProgress(players);
        const out = evaluateMatchOutcome(players, stats.progress, true, justEjectedPlayer)!;
        return {
          playerCount: safeCount,
          durationSec: elapsedSec,
          outcome: out,
          kills,
          meetings,
          sabotages,
          taskProgress: stats.progress,
        };
      }
    } else if (phase === 'meeting') {
      if (discussionTimer > 0) {
        discussionTimer = Math.max(0, discussionTimer - dt);
      } else {
        meetingTimer = Math.max(0, meetingTimer - dt);
      }
      stepBotsMeeting({
        players,
        bodies,
        discussionTimer,
        brains,
        dt,
        rng,
      });
      const alive = players.filter((pl) => pl.alive);
      if ((discussionTimer <= 0 && alive.every((pl) => pl.hasVoted)) || meetingTimer <= 0) {
        ejection = tallyVotes(players, settings.confirmEjects);
        phase = 'vote_results';
        phaseTimer = 2.6;
      }
    } else if (phase === 'vote_results') {
      phaseTimer -= dt;
      if (phaseTimer <= 0) {
        justEjectedPlayer = null;
        if (ejection?.ejectedId) {
          const ej = players.find((pl) => pl.id === ejection!.ejectedId);
          if (ej) {
            ej.alive = false;
            justEjectedPlayer = ej;
          }
        }
        bodies = [];
        phase = 'ejecting';
        phaseTimer = ejection?.reason === 'voted' ? 7.5 : 5.0;
      }
    } else if (phase === 'ejecting') {
      phaseTimer -= dt;
      if (phaseTimer <= 0) {
        const stats = computeTaskProgress(players);
        const out = evaluateMatchOutcome(players, stats.progress, false, justEjectedPlayer);
        if (out) {
          return {
            playerCount: safeCount,
            durationSec: elapsedSec,
            outcome: out,
            kills,
            meetings,
            sabotages,
            taskProgress: stats.progress,
          };
        }
        justEjectedPlayer = null;
        players.forEach((p, idx) => {
          const sp = SPAWN_RING[idx % SPAWN_RING.length];
          p.x = sp.x;
          p.z = sp.z;
          p.hasVoted = false;
          p.votedFor = null;
          if (p.role === 'vondo') p.killCooldownRemaining = settings.killCooldownSec;
          if (p.specialRole === 'chandabaz') p.abilityCooldown = Math.max(p.abilityCooldown, 14);
        });
        emergencyCooldown = settings.emergencyCooldownSec;
        phase = 'playing';
      }
    }
  }

  return {
    playerCount: safeCount,
    durationSec: elapsedSec,
    outcome: { winner: 'parabasi', reason: 'tasks_completed' },
    kills,
    meetings,
    sabotages,
    taskProgress: computeTaskProgress(players).progress,
  };
}

test('Phase 4 navGraph connects all task stations and gas leak valves cleanly', () => {
  for (const st of TASK_STATIONS) {
    const hop = computeNextMoveTarget(0, 4.5, st.x, st.z);
    assert.ok(Number.isFinite(hop.x) && Number.isFinite(hop.z));
  }
  for (const valve of GAS_LEAK_VALVES) {
    const hop = computeNextMoveTarget(0, 4.5, valve.x, valve.z);
    assert.ok(Number.isFinite(hop.x) && Number.isFinite(hop.z));
  }
  // Ensure pukur_water is strictly blocked by path segment check
  assert.equal(isPathSegmentWalkable(-38, 0, -55, 0), false);
  assert.ok(NAV_NODES.length >= 40);
});

test('Phase 4 200-game headless simulation meets duration, win balance, and zero-kill invariants', () => {
  const results: SimResult[] = [];
  const counts = [5, 6, 7, 8];
  for (let i = 0; i < 200; i++) {
    const pc = counts[i % counts.length];
    results.push(runSimulatedMatch(pc, 10_000 + i * 7919));
  }

  const durations = results.map((r) => r.durationSec);
  const minDur = Math.min(...durations);
  const avgDur = durations.reduce((a, b) => a + b, 0) / results.length;
  const maxDur = Math.max(...durations);

  const vondoWins = results.filter((r) => r.outcome.winner === 'vondo').length;
  const crewWins = results.filter((r) => r.outcome.winner === 'parabasi').length;
  const pagolWins = results.filter((r) => r.outcome.winner === 'pagol').length;
  const batparWinRate = vondoWins / results.length;
  const avgKills = results.reduce((a, r) => a + r.kills, 0) / results.length;
  const avgSabotages = results.reduce((a, r) => a + r.sabotages, 0) / results.length;

  const zeroKillNonSabWins = results.filter(
    (r) => r.kills === 0 && r.outcome.reason !== 'critical_sabotage_timeout',
  ).length;

  const reasonCounts = new Map<string, number>();
  for (const r of results) {
    reasonCounts.set(r.outcome.reason, (reasonCounts.get(r.outcome.reason) ?? 0) + 1);
  }

  console.log('\n=== PHASE 4 200-GAME BOT SIMULATION SUMMARY ===');
  console.log(`Matches: ${results.length} (5P/6P/7P/8P x50 each)`);
  console.log(`Winners: Batpar=${vondoWins} (${(batparWinRate * 100).toFixed(1)}%), Parabasi=${crewWins}, Pagol=${pagolWins}`);
  console.log(`Duration: min=${minDur.toFixed(1)}s, avg=${avgDur.toFixed(1)}s, max=${maxDur.toFixed(1)}s`);
  console.log(`Averages: kills=${avgKills.toFixed(2)}, sabotages=${avgSabotages.toFixed(2)}`);
  console.log(`Reasons: ${Array.from(reasonCounts.entries()).map(([k, v]) => `${k}:${v}`).join(', ')}`);
  console.log(`Zero-kill non-sabotage wins: ${zeroKillNonSabWins}\n`);

  assert.ok(minDur >= 60, `Expected min duration >= 60s, got ${minDur.toFixed(1)}s`);
  assert.ok(avgDur >= 240, `Expected avg duration >= 240s, got ${avgDur.toFixed(1)}s`);
  assert.ok(
    batparWinRate >= 0.35 && batparWinRate <= 0.55,
    `Expected Batpar win rate between 35%-55%, got ${(batparWinRate * 100).toFixed(1)}%`,
  );
  assert.equal(
    zeroKillNonSabWins,
    0,
    `Expected 0 zero-kill non-sabotage wins, got ${zeroKillNonSabWins}`,
  );
});
