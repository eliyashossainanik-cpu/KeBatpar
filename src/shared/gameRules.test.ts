import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHANDABAZ_COOLDOWN_SEC,
  DAROGA_ARREST_RANGE,
  GOYENDA_SCANS_LIMIT,
  JHARUDAR_CLEAN_CHANNEL_SEC,
  JHARUDAR_CLEAN_RANGE,
  JHARUDAR_CLEAN_USES,
  MISTRI_VENT_AUDIBLE_RANGE,
  advanceSabotageState,
  applyDalalBrokerJam,
  assignMatchTasks,
  assignRoles,
  assignSpecialRoles,
  canCompleteTasks,
  canExecuteKill,
  canUseVent,
  collectChandaFromTarget,
  computeTaskProgress,
  createEmptySabotageState,
  createPlayerTasks,
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
  findNearestHaturTarget,
  findNearestInspectableBody,
  findNearestMasterTarget,
  findNearestReportableBody,
  findNearestRevivableBody,
  findNearestShieldTarget,
  getChandabazGoal,
  getColorShadeHint,
  getConnectedVents,
  getDirectionCompass,
  getPlayerVoteWeight,
  inspectBodyClue,
  inspectPlayerTaskAuthenticity,
  isCriticalSabotage,
  isMistriVentAudibleTo,
  isPlayerShieldedNow,
  isTaskLockedBySabotage,
  makeDefaultPlayerState,
  pickSupariContractTarget,
  recordTiktokReelInZone,
  redactSnapshotForPlayer,
  resolveDarogaShot,
  resolveVentHopTarget,
  sanitizeSoloConfig,
  stepJharudarChannel,
  tallyVotes,
} from './gameRules';
import {
  BOT_WAYPOINTS,
  PLAYER_RADIUS,
  ROOFTOPS,
  SPAWN_RING,
  STAIR_RAMPS,
  TASK_STATIONS,
  VEHICLE_SPECS,
  VENTS,
  WALLS,
  createInitialVehicles,
  findNearestAvailableVehicle,
  getWalkableFloorY,
  resolveCircleWallCollision,
  resolvePlayerMoveWithElevation,
  resolveVehicleCollision,
} from './mapData';
import {
  PLAYER_COLORS,
  type BodyMarker,
  type DoorLockState,
  type PlayerState,
} from './types';

function makePlayer(overrides: Partial<PlayerState>): PlayerState {
  return makeDefaultPlayerState({
    id: 'p1',
    name: 'Player',
    color: 'lal',
    ...overrides,
  });
}

test('all spawn ring positions are clear of walls', () => {
  for (const sp of SPAWN_RING) {
    const resolved = resolveCircleWallCollision(sp.x, sp.z, PLAYER_RADIUS);
    assert.ok(
      Math.abs(resolved.x - sp.x) < 0.01 && Math.abs(resolved.z - sp.z) < 0.01,
      `Spawn (${sp.x}, ${sp.z}) overlapped wall`,
    );
  }
});

test('all task stations, vents, and bot waypoints are reachable outside wall AABBs', () => {
  for (const st of TASK_STATIONS) {
    const resolved = resolveCircleWallCollision(st.x, st.z, PLAYER_RADIUS);
    assert.ok(
      Math.abs(resolved.x - st.x) < 0.5 && Math.abs(resolved.z - st.z) < 0.5,
      `Task station ${st.id} at (${st.x}, ${st.z}) is inside a wall`,
    );
  }
  for (const v of VENTS) {
    const resolved = resolveCircleWallCollision(v.x, v.z, PLAYER_RADIUS);
    assert.ok(
      Math.abs(resolved.x - v.x) < 0.25 && Math.abs(resolved.z - v.z) < 0.25,
      `Vent ${v.id} at (${v.x}, ${v.z}) overlapped a wall`,
    );
  }
  for (const wp of BOT_WAYPOINTS) {
    const resolved = resolveCircleWallCollision(wp.x, wp.z, PLAYER_RADIUS);
    assert.ok(
      Math.abs(resolved.x - wp.x) < 0.25 && Math.abs(resolved.z - wp.z) < 0.25,
      `Bot waypoint (${wp.x}, ${wp.z}) overlapped a wall`,
    );
  }
});

test('door lock blocks doorway traversal when locked and allows passage when unlocked', () => {
  const unlocked: DoorLockState = {
    cha_dokan: 0,
    rickshaw_garage: 0,
    desco_power: 0,
    dish_roof: 0,
    cooldownRemaining: 0,
  };
  const locked: DoorLockState = { ...unlocked, cha_dokan: 8 };

  const openStep = resolveCircleWallCollision(-31.2, -22.95, PLAYER_RADIUS, WALLS, unlocked);
  assert.ok(Math.abs(openStep.z - -22.95) < 0.01);

  const blockedStep = resolveCircleWallCollision(-31.2, -22.95, PLAYER_RADIUS, WALLS, locked);
  assert.ok(Math.abs(blockedStep.z - -22.95) > 0.4, 'Locked shutter should push player out of doorway');
});

test('assignRoles assigns exact requested Vondo count within player bounds', () => {
  const roster: Array<Pick<PlayerState, 'id' | 'role'>> = Array.from({ length: 7 }, (_, i) => ({
    id: `p${i}`,
    role: 'parabasi',
  }));
  const assigned = assignRoles(roster, 2, () => 0.42);
  const vondos = assigned.filter((p) => p.role === 'vondo');
  assert.equal(vondos.length, 2);
});

test('assignSpecialRoles respects balanced distribution, 0 neutrals at 5P, and >=2 plain Parabasi', () => {
  const roster5 = Array.from({ length: 5 }, (_, i) =>
    makePlayer({ id: `p5_${i}`, role: i === 0 ? 'vondo' : 'parabasi' }),
  );
  const assigned5 = assignSpecialRoles(roster5, true, undefined, undefined, () => 0.2, true);
  assert.equal(assigned5.filter((p) => p.specialRole === 'pagol').length, 0);
  assert.equal(assigned5.filter((p) => p.role === 'parabasi' && p.specialRole === 'none').length, 3);

  const roster7 = Array.from({ length: 7 }, (_, i) =>
    makePlayer({
      id: `p${i}`,
      role: i === 0 ? 'vondo' : 'parabasi',
    }),
  );
  const withSpecials = assignSpecialRoles(roster7, true, undefined, undefined, () => 0.2, true);
  const plainCrew7 = withSpecials.filter((p) => p.role === 'parabasi' && p.specialRole === 'none').length;
  assert.ok(plainCrew7 >= 2, `Expected >=2 plain Parabasi in 7P, got ${plainCrew7}`);
  assert.ok(withSpecials.filter((p) => p.role === 'vondo' && p.specialRole !== 'none').length <= 1);

  const disabled = assignSpecialRoles(roster7, false);
  assert.ok(disabled.every((p) => p.specialRole === 'none'));
});

test('canExecuteKill enforces role, cooldown, vent, and distance', () => {
  const killer = makePlayer({ id: 'k', role: 'vondo', x: 0, z: 4, killCooldownRemaining: 0 });
  const victim = makePlayer({ id: 'v', role: 'parabasi', x: 1.5, z: 4 });
  assert.equal(canExecuteKill(killer, victim).allowed, true);

  const farVictim = makePlayer({ id: 'v2', role: 'parabasi', x: 10, z: 4 });
  assert.equal(canExecuteKill(killer, farVictim).allowed, false);

  const coolingKiller = makePlayer({ ...killer, killCooldownRemaining: 5 });
  assert.equal(canExecuteKill(coolingKiller, victim).allowed, false);

  const crew = makePlayer({ id: 'c', role: 'parabasi', x: 0, z: 4 });
  assert.equal(canExecuteKill(crew, victim).allowed, false);
});

test('computeTaskProgress counts only non-Pagol parabasi tasks', () => {
  const tasks = createPlayerTasks(4, () => 0.5);
  tasks[0].completed = true;
  tasks[1].completed = true;

  const players = [
    makePlayer({ id: 'p1', role: 'parabasi', tasks }),
    makePlayer({ id: 'p2', role: 'vondo', tasks: createPlayerTasks(4, () => 0.5) }),
    makePlayer({ id: 'p3', role: 'parabasi', specialRole: 'pagol', tasks: createPlayerTasks(4, () => 0.5) }),
  ];
  const res = computeTaskProgress(players);
  assert.equal(res.completedTasks, 2);
  assert.equal(res.totalTasks, 4);
  assert.equal(res.progress, 0.5);
});

test('Goyenda clue inspection, Kobiraj shield targeting, and Mistri vent permissions work accurately', () => {
  const goyenda = makePlayer({ id: 'g', role: 'parabasi', specialRole: 'goyenda', x: 5, z: 5 });
  const body: BodyMarker = {
    id: 'b1',
    victimId: 'v1',
    victimName: 'Neel Babu',
    color: 'neel',
    x: 6.2,
    z: 5.4,
    reported: false,
    killedAt: 10000,
    killerColorHint: getColorShadeHint('lal'),
    killerZoneHint: 'Cha Dokan',
  };
  assert.equal(findNearestInspectableBody(goyenda, [body])?.id, 'b1');
  const clue = inspectBodyClue(body, 25000);
  assert.ok(clue.detail.includes('15 সেকেন্ড আগে'));
  assert.ok(clue.detail.includes('Cha Dokan'));

  const kobiraj = makePlayer({ id: 'k', role: 'parabasi', specialRole: 'kobiraj', x: 0, z: 0 });
  const ally = makePlayer({ id: 'a', role: 'parabasi', x: 2.2, z: 0, shielded: false });
  const shieldedAlly = makePlayer({ id: 'a2', role: 'parabasi', x: 1.0, z: 0, shielded: true });
  assert.equal(findNearestShieldTarget(kobiraj, [kobiraj, ally, shieldedAlly])?.id, 'a');

  const mistriReady = makePlayer({ id: 'm', role: 'parabasi', specialRole: 'mistri', abilityCooldown: 0 });
  const mistriCooldown = makePlayer({ id: 'm2', role: 'parabasi', specialRole: 'mistri', abilityCooldown: 8 });
  assert.equal(canUseVent(mistriReady), true);
  assert.equal(canUseVent(mistriCooldown), false);
});

test('tallyVotes handles majority ejection, ties, skips, and confirmEjects flag', () => {
  const players = [
    makePlayer({ id: 'p1', name: 'Lal', role: 'vondo', hasVoted: true, votedFor: 'p2' }),
    makePlayer({ id: 'p2', name: 'Neel', role: 'parabasi', hasVoted: true, votedFor: 'p1' }),
    makePlayer({ id: 'p3', name: 'Shobuj', role: 'parabasi', hasVoted: true, votedFor: 'p1' }),
    makePlayer({ id: 'p4', name: 'Holud', role: 'parabasi', hasVoted: true, votedFor: 'skip' }),
  ];

  const ejected = tallyVotes(players, false);
  assert.equal(ejected.reason, 'voted');
  assert.equal(ejected.ejectedId, 'p1');
  assert.equal(ejected.wasVondo, true);
  assert.equal(ejected.confirmEjects, false);

  players[2].votedFor = 'p2';
  players[3].votedFor = 'p1';
  const tied = tallyVotes(players);
  assert.equal(tied.reason, 'tie');
  assert.equal(tied.ejectedId, null);

  players[0].votedFor = 'skip';
  players[1].votedFor = 'skip';
  const skipped = tallyVotes(players);
  assert.equal(skipped.reason, 'skipped');
  assert.equal(skipped.ejectedId, null);
});

test('evaluateMatchOutcome detects Pagol ejection victory, neutrals in parity, and exact priority', () => {
  const pagol = makePlayer({ id: 'j1', name: 'Pagol Bhai', role: 'parabasi', specialRole: 'pagol', alive: false });
  assert.deepEqual(evaluateMatchOutcome([pagol], 0.2, false, pagol), {
    winner: 'pagol',
    reason: 'pagol_ejected',
    winnerPlayerId: 'j1',
    winnerPlayerName: 'Pagol Bhai',
  });

  const allVondosDead = [
    makePlayer({ id: 'p1', role: 'vondo', alive: false }),
    makePlayer({ id: 'p2', role: 'parabasi', alive: true }),
    makePlayer({ id: 'p3', role: 'parabasi', alive: true }),
  ];
  assert.deepEqual(evaluateMatchOutcome(allVondosDead, 0.2), {
    winner: 'parabasi',
    reason: 'batpars_out',
  });

  const tasksDone = [
    makePlayer({ id: 'p1', role: 'vondo', alive: true }),
    makePlayer({ id: 'p2', role: 'parabasi', alive: true }),
    makePlayer({ id: 'p3', role: 'parabasi', alive: true }),
  ];
  assert.deepEqual(evaluateMatchOutcome(tasksDone, 1), {
    winner: 'parabasi',
    reason: 'tasks_completed',
  });

  // Parity MUST count alive neutrals (1 Batpar vs 1 Parabasi + 1 Pagol = 1 vs 2 -> match continues!)
  const parityWithPagol = [
    makePlayer({ id: 'p1', role: 'vondo', alive: true }),
    makePlayer({ id: 'p2', role: 'parabasi', alive: true }),
    makePlayer({ id: 'p3', role: 'parabasi', specialRole: 'pagol', alive: true }),
  ];
  assert.equal(evaluateMatchOutcome(parityWithPagol, 0.5), null);

  const vondoEqual = [
    makePlayer({ id: 'p1', role: 'vondo', alive: true }),
    makePlayer({ id: 'p2', role: 'parabasi', alive: true }),
  ];
  assert.deepEqual(evaluateMatchOutcome(vondoEqual, 0.5), {
    winner: 'vondo',
    reason: 'batpars_outnumber',
  });

  assert.deepEqual(evaluateMatchOutcome(tasksDone, 0.5, true), {
    winner: 'vondo',
    reason: 'critical_sabotage_timeout',
  });
});

test('all 13 drain vents form a symmetric connected graph and resolveVentHopTarget enforces edges', () => {
  const ventIds = new Set(VENTS.map((v) => v.id));
  for (const v of VENTS) {
    assert.ok(v.targetIds.length >= 2, `Vent ${v.id} should connect to at least 2 neighbors`);
    for (const targetId of v.targetIds) {
      assert.ok(ventIds.has(targetId), `Vent ${v.id} references unknown target ${targetId}`);
      const neighbor = VENTS.find((other) => other.id === targetId)!;
      assert.ok(
        neighbor.targetIds.includes(v.id),
        `Vent connection ${v.id} -> ${targetId} should be symmetric`,
      );
    }
  }

  const chaVent = VENTS.find((v) => v.id === 'vent_cha')!;
  const graph = getConnectedVents(chaVent.x, chaVent.z);
  assert.equal(graph.currentVent?.id, 'vent_cha');
  assert.equal(graph.targets.length, chaVent.targetIds.length);
  assert.equal(resolveVentHopTarget(chaVent.x, chaVent.z, 'vent_pukur')?.id, 'vent_pukur');
  assert.equal(resolveVentHopTarget(chaVent.x, chaVent.z, 'vent_pandal'), null);
});

test('ghost para-basi can still complete tasks and count toward win progress', () => {
  const ghostCrew = makePlayer({ id: 'g1', role: 'parabasi', specialRole: 'none', alive: false });
  const ghostPagol = makePlayer({ id: 'g2', role: 'parabasi', specialRole: 'pagol', alive: false });
  const vondo = makePlayer({ id: 'v1', role: 'vondo', alive: true });
  assert.equal(canCompleteTasks(ghostCrew), true);
  assert.equal(canCompleteTasks(ghostPagol), false);
  assert.equal(canCompleteTasks(vondo), false);
});

test('getDirectionCompass computes cardinal arrows and sanitizeSoloConfig clamps bounds', () => {
  assert.equal(getDirectionCompass(0, 0, 0, -30).cardinal, 'N');
  assert.equal(getDirectionCompass(0, 0, 25, -25).cardinal, 'NE');
  assert.equal(getDirectionCompass(0, 0, -20, 0).cardinal, 'W');
  assert.equal(getDirectionCompass(0, 0, 0.5, 0.5).cardinal, 'HERE');

  const fivePlayer = sanitizeSoloConfig(5, { vondoCount: 2, tasksPerPlayer: 8 });
  assert.equal(fivePlayer.playerCount, 5);
  assert.equal(fivePlayer.settings.vondoCount, 1);
  assert.equal(fivePlayer.settings.tasksPerPlayer, 8);

  const twelvePlayer = sanitizeSoloConfig(12, { vondoCount: 3, killCooldownSec: 5 });
  assert.equal(twelvePlayer.playerCount, 12);
  assert.equal(twelvePlayer.settings.vondoCount, 3);
  assert.equal(twelvePlayer.settings.killCooldownSec, 10);

  const clampedMax = sanitizeSoloConfig(25, { vondoCount: 5, tasksPerPlayer: 15, moveSpeed: 18 });
  assert.equal(clampedMax.playerCount, 20);
  assert.equal(clampedMax.settings.vondoCount, 5);
  assert.equal(clampedMax.settings.tasksPerPlayer, 15);
  assert.equal(clampedMax.settings.moveSpeed, 18);

  assert.equal(sanitizeSoloConfig(10, { vondoCount: 5 }).settings.vondoCount, 3);
  assert.equal(sanitizeSoloConfig(14, { vondoCount: 5 }).settings.vondoCount, 4);
  assert.equal(sanitizeSoloConfig(17, { vondoCount: 5 }).settings.vondoCount, 5);
});

test('Daroga Sheriff shot hits Batpar cleanly and backfires on innocent Para-basi', () => {
  const daroga = makePlayer({ id: 'd1', role: 'parabasi', specialRole: 'daroga', x: 0, z: 0 });
  const vondo = makePlayer({ id: 'v1', role: 'vondo', x: 2.0, z: 0 });
  const innocent = makePlayer({ id: 'c1', role: 'parabasi', x: 2.5, z: 0 });
  const farVondo = makePlayer({ id: 'v2', role: 'vondo', x: 10.0, z: 0 });

  assert.equal(findNearestDarogaTarget(daroga, [daroga, vondo, farVondo])?.id, 'v1');
  assert.deepEqual(resolveDarogaShot(daroga, vondo), {
    allowed: true,
    hitVondo: true,
    backfired: false,
  });
  assert.deepEqual(resolveDarogaShot(daroga, innocent), {
    allowed: true,
    hitVondo: false,
    backfired: true,
  });
  assert.equal(resolveDarogaShot(daroga, farVondo).allowed, false);
});

test('Neta Mayor vote counts as 2x weight in tallyVotes', () => {
  const neta = makePlayer({ id: 'n1', name: 'Neta', specialRole: 'neta', hasVoted: true, votedFor: 'v1' });
  const p2 = makePlayer({ id: 'v1', name: 'Batpar', role: 'vondo', hasVoted: true, votedFor: 'n1' });
  const p3 = makePlayer({ id: 'p3', name: 'Bhai', hasVoted: true, votedFor: 'n1' });
  const p4 = makePlayer({ id: 'p4', name: 'Apa', hasVoted: true, votedFor: 'skip' });

  assert.equal(getPlayerVoteWeight(neta), 2);
  assert.equal(getPlayerVoteWeight(p2), 1);

  // Neta gives 2 votes to v1 vs 2 votes (p2 + p3) to n1 -> tie!
  const tiedByMayor = tallyVotes([neta, p2, p3, p4]);
  assert.equal(tiedByMayor.reason, 'tie');

  // If p3 joins Neta on v1 -> 3 votes vs 1 vote -> v1 ejected!
  p3.votedFor = 'v1';
  const ejectedByMayor = tallyVotes([neta, p2, p3, p4]);
  assert.equal(ejectedByMayor.reason, 'voted');
  assert.equal(ejectedByMayor.ejectedId, 'v1');
});

test('Jharudar body clean & Daktar Saline revive body range and limits', () => {
  const body: BodyMarker = {
    id: 'b_clean',
    victimId: 'v1',
    victimName: 'Lal',
    color: 'lal',
    x: 2,
    z: 2,
    reported: false,
    killedAt: 1000,
    killerColorHint: 'Light',
    killerZoneHint: 'Adda',
  };
  const reportedBody: BodyMarker = { ...body, id: 'b_rep', reported: true };

  const jharudar = makePlayer({ id: 'j1', role: 'vondo', specialRole: 'jharudar', x: 3.5, z: 2 });
  assert.equal(findNearestCleanableBody(jharudar, [reportedBody, body])?.id, 'b_clean');

  const daktarReady = makePlayer({ id: 'doc1', role: 'parabasi', specialRole: 'daktar', x: 2.5, z: 2, revivesLeft: 1 });
  const daktarEmpty = makePlayer({ ...daktarReady, revivesLeft: 0 });
  assert.equal(findNearestRevivableBody(daktarReady, [body])?.id, 'b_clean');
  assert.equal(findNearestRevivableBody(daktarEmpty, [body]), null);

  // 8-player 2-vondo leaves >=2 plain Parabasi & assigns specials from pool
  const roster8 = Array.from({ length: 8 }, (_, i) =>
    makePlayer({ id: `r${i}`, role: i < 2 ? 'vondo' : 'parabasi' }),
  );
  const assigned8 = assignSpecialRoles(roster8, true, undefined, undefined, () => 0.25, true);
  assert.ok(assigned8.filter((p) => p.role === 'parabasi' && p.specialRole === 'none').length >= 2);
});

test('Phase 1 sabotage rules: non-critical auto-expires harmlessly, gas_leak requires 2 holders or triggers critical expiry', () => {
  assert.equal(isCriticalSabotage('loadshedding'), false);
  assert.equal(isCriticalSabotage('wifi_down'), false);
  assert.equal(isCriticalSabotage('gas_leak'), true);

  // Loadshedding 90s auto-expiry never sets expiredCritical
  const load = createSabotageState('loadshedding');
  const p1 = makePlayer({ id: 'p1', x: -35, z: 33 });
  const loadRes = advanceSabotageState(load, [p1], 91, new Map());
  assert.equal(loadRes.expiredCritical, false);
  assert.equal(loadRes.expiredNonCriticalType, 'loadshedding');
  assert.equal(load.active, null);

  // Wi-Fi down locks digital tasks only
  const wifi = createSabotageState('wifi_down');
  assert.equal(isTaskLockedBySabotage('task_dish', wifi), true);
  assert.equal(isTaskLockedBySabotage('task_cha', wifi), false);

  // Gas leak requires 2 DIFFERENT players at the 2 valves held simultaneously for 2s
  const gas = createSabotageState('gas_leak');
  const c1 = makePlayer({ id: 'c1', x: gas.valves[0].x, z: gas.valves[0].z });
  const c2 = makePlayer({ id: 'c2', x: gas.valves[1].x, z: gas.valves[1].z });
  const singleHold = new Map<string, { valveId?: 'valve_cha' | 'valve_rickshaw' }>([
    ['c1', { valveId: 'valve_cha' }],
  ]);
  advanceSabotageState(gas, [c1, c2], 3.0, singleHold);
  assert.equal(gas.active, 'gas_leak');

  const dualHold = new Map<string, { valveId?: 'valve_cha' | 'valve_rickshaw' }>([
    ['c1', { valveId: 'valve_cha' }],
    ['c2', { valveId: 'valve_rickshaw' }],
  ]);
  const fixedRes = advanceSabotageState(gas, [c1, c2], 2.1, dualHold);
  assert.equal(fixedRes.fixed, true);
  assert.equal(gas.active, null);

  // Gas leak 75s timeout ends match
  const gasTimeout = createSabotageState('gas_leak');
  const expRes = advanceSabotageState(gasTimeout, [c1, c2], 76, new Map());
  assert.equal(expRes.expiredCritical, true);
});

test('Phase 1 tasks & LOS: common tasks shared across crew, Batpar gets fake tasks, DAROGA range is 6m, walls block body reports', () => {
  assert.equal(DAROGA_ARREST_RANGE, 6.0);
  const roster = [
    makePlayer({ id: 'v1', role: 'vondo' }),
    makePlayer({ id: 'c1', role: 'parabasi' }),
    makePlayer({ id: 'c2', role: 'parabasi' }),
    makePlayer({ id: 'pag', role: 'parabasi', specialRole: 'pagol' }),
  ];
  assignMatchTasks(roster, 5, () => 0.4);
  assert.equal(roster[0].tasks.length, 5);
  assert.equal(roster[0].tasks.every((t) => t.isFake === true), true);
  assert.equal(roster[3].tasks.length, 0);
  assert.equal(roster[1].tasks.length, 5);
  assert.equal(roster[2].tasks.length, 5);
  // Both crew share the first 2 common tasks
  assert.deepEqual(
    roster[1].tasks.slice(0, 2).map((t) => t.taskId),
    roster[2].tasks.slice(0, 2).map((t) => t.taskId),
  );

  // Solid wall cha_s_stub (-45..-36.5, z -23.4..-22.5) blocks body report LOS from z -21.5 to z -24.5
  const finder = makePlayer({ id: 'f1', x: -40.0, z: -21.5 });
  const hiddenBody: BodyMarker = {
    id: 'b_wall',
    victimId: 'vx',
    victimName: 'Hidden',
    color: 'neel',
    x: -40.0,
    z: -24.5,
    reported: false,
    killedAt: 1000,
    killerColorHint: 'Light',
    killerZoneHint: 'Cha Dokan',
  };
  assert.equal(findNearestReportableBody(finder, [hiddenBody]), null);

  // Clear LOS inside same doorway/yard allows report
  const clearBody: BodyMarker = { ...hiddenBody, id: 'b_clear', x: -39.0, z: -21.5 };
  assert.equal(findNearestReportableBody(finder, [clearBody])?.id, 'b_clear');
});

test('Phase 1 privacy redaction hides roles, enemy tasks, and ghostOnly chat from alive crewmates', () => {
  const baseSnap = {
    roomCode: 'PRIV1',
    phase: 'meeting' as const,
    players: [
      makePlayer({
        id: 'crew1',
        name: 'Crew One',
        role: 'parabasi',
        specialRole: 'goyenda',
        alive: true,
        tasks: createPlayerTasks(4, () => 0.3),
      }),
      makePlayer({
        id: 'bat1',
        name: 'Batpar One',
        role: 'vondo',
        specialRole: 'bohurupi',
        alive: true,
        tasks: createPlayerTasks(4, () => 0.3, undefined, true),
      }),
      makePlayer({
        id: 'bat2',
        name: 'Batpar Two',
        role: 'vondo',
        specialRole: 'jharudar',
        alive: true,
        tasks: createPlayerTasks(4, () => 0.3, undefined, true),
      }),
      makePlayer({
        id: 'ghost1',
        name: 'Ghost Crew',
        role: 'parabasi',
        specialRole: 'none',
        alive: false,
      }),
    ],
    bodies: [],
    footprints: [],
    sabotage: createEmptySabotageState(),
    doorLocks: {
      cha_dokan: 0,
      rickshaw_garage: 0,
      desco_power: 0,
      dish_roof: 0,
      cooldownRemaining: 0,
    },
    chat: [
      {
        id: 'c1',
        senderId: 'crew1',
        senderName: 'Crew One',
        senderColor: 'lal' as const,
        text: 'Public message',
        timestamp: 1,
      },
      {
        id: 'c2',
        senderId: 'ghost1',
        senderName: 'Ghost Crew (Ghost)',
        senderColor: 'neel' as const,
        text: 'Ghost secret!',
        timestamp: 2,
        ghostOnly: true,
      },
    ],
    meetingCallerId: 'crew1',
    meetingReason: 'emergency' as const,
    meetingTimer: 20,
    emergencyCooldownRemaining: 0,
    ejection: null,
    outcome: null,
    settings: sanitizeSoloConfig(7).settings,
    taskProgress: 0,
    totalTasks: 4,
    completedTasks: 0,
  };

  // Alive crew sees own role & tasks, sees public chat, CANNOT see Batpar roles or ghost chat
  const forCrew = redactSnapshotForPlayer(baseSnap, 'crew1');
  assert.equal(forCrew.players.find((p) => p.id === 'crew1')?.specialRole, 'goyenda');
  assert.equal(forCrew.players.find((p) => p.id === 'crew1')?.tasks.length, 4);
  assert.equal(forCrew.players.find((p) => p.id === 'bat1')?.role, 'parabasi');
  assert.equal(forCrew.players.find((p) => p.id === 'bat1')?.specialRole, 'none');
  assert.equal(forCrew.players.find((p) => p.id === 'bat1')?.tasks.length, 0);
  assert.equal(forCrew.chat.length, 1);

  // Dead ghost CAN see ghostOnly chat, still cannot see secret Batpar roles
  const forGhost = redactSnapshotForPlayer(baseSnap, 'ghost1');
  assert.equal(forGhost.chat.length, 2);
  assert.equal(forGhost.players.find((p) => p.id === 'bat1')?.role, 'parabasi');

  // Batpar sees partner Batpar role/specialRole, does NOT see other Batpar tasks or ghost chat
  const forBat = redactSnapshotForPlayer(baseSnap, 'bat1');
  assert.equal(forBat.players.find((p) => p.id === 'bat2')?.role, 'vondo');
  assert.equal(forBat.players.find((p) => p.id === 'bat2')?.specialRole, 'jharudar');
  assert.equal(forBat.players.find((p) => p.id === 'crew1')?.specialRole, 'none');
  assert.equal(forBat.chat.length, 1);

  // Gameover reveals everything cleanly
  const overSnap = { ...baseSnap, phase: 'gameover' as const };
  const forOver = redactSnapshotForPlayer(overSnap, 'crew1');
  assert.equal(forOver.players.find((p) => p.id === 'bat1')?.role, 'vondo');
});

test('Phase 3: Goyenda 2-scan limit, Daroga 1-shot limit, Jharudar 2s channel & cancel, Mistri 8m vent audio, Neta reveal', () => {
  const body: BodyMarker = {
    id: 'b_p3',
    victimId: 'vx',
    victimName: 'Vikram',
    color: 'lal',
    x: 2,
    z: 2,
    reported: false,
    killedAt: 1000,
    killerColorHint: 'Dark',
    killerZoneHint: 'Cha Dokan',
  };

  // Goyenda 2-scan limit
  const goyenda = makePlayer({
    id: 'g1',
    role: 'parabasi',
    specialRole: 'goyenda',
    x: 2.5,
    z: 2.2,
    scansLeft: GOYENDA_SCANS_LIMIT,
  });
  const s1 = executeGoyendaScan(goyenda, [body], 10_000);
  assert.equal(s1.ok, true);
  assert.equal(s1.scansRemaining, 1);
  const s2 = executeGoyendaScan(goyenda, [body], 12_000);
  assert.equal(s2.ok, true);
  assert.equal(s2.scansRemaining, 0);
  const s3 = executeGoyendaScan(goyenda, [body], 14_000);
  assert.equal(s3.ok, false);
  assert.equal(s3.reason, 'no_scans_left');

  // Daroga 1-shot limit
  const daroga = makePlayer({ id: 'd1', role: 'parabasi', specialRole: 'daroga', x: 0, z: 0, shotsLeft: 1 });
  const vondo = makePlayer({ id: 'v1', role: 'vondo', x: 2, z: 0 });
  assert.equal(resolveDarogaShot(daroga, vondo).allowed, true);
  daroga.shotsLeft = 0;
  assert.equal(resolveDarogaShot(daroga, vondo).allowed, false);

  // Jharudar 2s channel completes clean and enforces 3 cleans; walking away cancels
  const jharudar = makePlayer({
    id: 'j1',
    role: 'vondo',
    specialRole: 'jharudar',
    x: 2.5,
    z: 2,
    cleansLeft: JHARUDAR_CLEAN_USES,
    jharuTargetBodyId: body.id,
    jharuTimer: JHARUDAR_CLEAN_CHANNEL_SEC,
  });
  const half = stepJharudarChannel(jharudar, [body], 1.0);
  assert.equal(half.completedBody, null);
  assert.equal(half.cancelled, false);
  const done = stepJharudarChannel(jharudar, [body], 1.1);
  assert.equal(done.completedBody?.id, body.id);
  assert.equal(jharudar.cleansLeft, 2);

  // Walking out of range cancels clean without consuming cleansLeft
  jharudar.jharuTargetBodyId = body.id;
  jharudar.jharuTimer = JHARUDAR_CLEAN_CHANNEL_SEC;
  jharudar.x = body.x + JHARUDAR_CLEAN_RANGE + 1.5;
  const cancelled = stepJharudarChannel(jharudar, [body], 0.1);
  assert.equal(cancelled.cancelled, true);
  assert.equal(jharudar.cleansLeft, 2);

  // 0 cleansLeft prevents findNearestCleanableBody
  jharudar.x = body.x;
  jharudar.cleansLeft = 0;
  assert.equal(findNearestCleanableBody(jharudar, [body]), null);

  // Mistri vent audible only within 8m
  const mistri = makePlayer({ id: 'm1', specialRole: 'mistri', x: 0, z: 0 });
  const nearListener = makePlayer({ id: 'l1', x: MISTRI_VENT_AUDIBLE_RANGE - 0.5, z: 0 });
  const farListener = makePlayer({ id: 'l2', x: MISTRI_VENT_AUDIBLE_RANGE + 1.0, z: 0 });
  assert.equal(isMistriVentAudibleTo(mistri, nearListener), true);
  assert.equal(isMistriVentAudibleTo(mistri, farListener), false);

  // Neta reveal preserved across redaction when netaRevealedId matches
  const netaSnap = {
    roomCode: 'NETA1',
    phase: 'meeting' as const,
    players: [
      makePlayer({ id: 'crew1', role: 'parabasi', specialRole: 'none', alive: true }),
      makePlayer({ id: 'neta1', role: 'parabasi', specialRole: 'neta', alive: true }),
    ],
    bodies: [],
    footprints: [],
    sabotage: createEmptySabotageState(),
    doorLocks: {
      cha_dokan: 0,
      rickshaw_garage: 0,
      desco_power: 0,
      dish_roof: 0,
      cooldownRemaining: 0,
    },
    chat: [],
    meetingCallerId: 'crew1',
    meetingReason: 'emergency' as const,
    meetingTimer: 25,
    emergencyCooldownRemaining: 0,
    ejection: null,
    outcome: null,
    netaRevealedId: 'neta1',
    settings: sanitizeSoloConfig(5).settings,
    taskProgress: 0,
    totalTasks: 5,
    completedTasks: 0,
  };
  const redacted = redactSnapshotForPlayer(netaSnap, 'crew1');
  assert.equal(redacted.players.find((p) => p.id === 'neta1')?.specialRole, 'neta');
});

test('Phase 6: 20P capacity, 20 unique colors, 5 Batpars at 17P+, 15 tasks across all zones, and all extended special roles', () => {
  assert.equal(PLAYER_COLORS.length, 20);
  assert.equal(SPAWN_RING.length, 20);

  const roster20 = Array.from({ length: 20 }, (_, i) =>
    makePlayer({ id: `p20_${i}`, name: `Player ${i}`, color: PLAYER_COLORS[i].id, role: 'parabasi' }),
  );
  const with5Vondos = assignRoles(roster20, 5, () => 0.37);
  assert.equal(with5Vondos.filter((p) => p.role === 'vondo').length, 5);
  const assigned20 = assignSpecialRoles(with5Vondos, true, undefined, undefined, () => 0.25, true);
  const plainCrew20 = assigned20.filter((p) => p.role === 'parabasi' && p.specialRole === 'none').length;
  assert.ok(plainCrew20 >= 5, `Expected >=5 plain Parabasi in 20P, got ${plainCrew20}`);

  let seed = 42;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  assignMatchTasks(assigned20, 15, rng);
  assert.equal(assigned20[0].tasks.length, 15);
  const assignedTaskIds = new Set(assigned20.flatMap((p) => p.tasks.map((t) => t.taskId)));
  const outerShortLongStations = ['task_kaka_bari', 'task_kacchi', 'task_dorji', 'task_nana', 'task_fufu'];
  assert.ok(
    outerShortLongStations.every((id) => assignedTaskIds.has(id)),
    'Expected 15-task assignment across 20 players to distribute tasks across all outer-zone houses',
  );

  // Ghotok Khala pairing & death detection
  const ghotok = makePlayer({ id: 'gk', role: 'parabasi', specialRole: 'ghotok_khala', x: 0, z: 0 });
  const a1 = makePlayer({ id: 'a1', name: 'A1', x: 2, z: 0 });
  const a2 = makePlayer({ id: 'a2', name: 'A2', x: 4, z: 0 });
  const pair = findGhotokPairCandidates(ghotok, [ghotok, a1, a2]);
  assert.ok(pair && pair[0].id === 'a1' && pair[1].id === 'a2');
  const deathNotice = findGhotokPartnerOnDeath('a1', ['a1', 'a2'], [ghotok, a1, a2]);
  assert.equal(deathNotice.partner?.id, 'a2');
  assert.equal(deathNotice.ghotok?.id, 'gk');

  // Master Moshai Khata check
  const master = makePlayer({ id: 'mm', role: 'parabasi', specialRole: 'master_moshai', x: 0, z: 0 });
  const bat = makePlayer({ id: 'b1', name: 'Sus', role: 'vondo', x: 1.5, z: 0 });
  assert.equal(findNearestMasterTarget(master, [master, bat])?.id, 'b1');
  assert.equal(inspectPlayerTaskAuthenticity(bat).isSus, true);
  assert.equal(inspectPlayerTaskAuthenticity(a1).isSus, false);

  // Hatur Daktar Jhajhro temporary shield
  const hatur = makePlayer({ id: 'hd', role: 'parabasi', specialRole: 'hatur_daktar', x: 0, z: 0 });
  const patient = makePlayer({ id: 'pat', x: 2, z: 0, haturProtectedUntil: 5000 });
  assert.equal(isPlayerShieldedNow(patient, 4000), true);
  assert.equal(isPlayerShieldedNow(patient, 6000), false);
  assert.equal(findNearestHaturTarget(hatur, [hatur, patient], 4000), null);
  assert.equal(findNearestHaturTarget(hatur, [hatur, patient], 6000)?.id, 'pat');

  // Supari Killer target & Dalal broker jam
  const supari = makePlayer({ id: 'sk', role: 'vondo', specialRole: 'supari_killer' });
  const firstTarget = pickSupariContractTarget(supari, [supari, a1, a2], null);
  assert.equal(firstTarget?.id, 'a1');
  assert.equal(pickSupariContractTarget(supari, [supari, a1, a2], 'a1')?.id, 'a2');

  const doors: DoorLockState = {
    cha_dokan: 5,
    rickshaw_garage: 0,
    desco_power: 0,
    dish_roof: 0,
    cooldownRemaining: 0,
  };
  const jamRes = applyDalalBrokerJam(doors, () => 0);
  assert.ok(doors.cha_dokan > 5);
  assert.ok(jamRes.newlyLockedZone !== null);

  // Chamcha co-win attachment
  const chamcha = makePlayer({ id: 'ch', role: 'parabasi', specialRole: 'chamcha', alive: true, chamchaPatronId: 'b1', x: 0, z: 0 });
  assert.equal(findNearestChamchaPatron(chamcha, [chamcha, bat])?.id, 'b1');
  const batWin = evaluateMatchOutcome([chamcha, bat], 0.2);
  assert.equal(batWin?.winner, 'vondo');
  assert.deepEqual(batWin?.coWinnerIds, ['ch']);

  // Chandabaz 30s cooldown & dynamic goal: must collect from EVERY other living player in the match
  assert.equal(CHANDABAZ_COOLDOWN_SEC, 30);
  const chandabaz = makePlayer({ id: 'cb', name: 'Chanda', role: 'parabasi', specialRole: 'chandabaz', alive: true, x: 0, z: 0 });
  const n1 = makePlayer({ id: 'n1', x: 1, z: 0 });
  const n2 = makePlayer({ id: 'n2', x: 1, z: 0 });
  const n3 = makePlayer({ id: 'n3', x: 1, z: 0 });
  const n4 = makePlayer({ id: 'n4', x: 1, z: 0 });
  const n5 = makePlayer({ id: 'n5', x: 1, z: 0 });
  const roster = [chandabaz, bat, n1, n2, n3, n4, n5];
  assert.equal(getChandabazGoal(chandabaz, roster), 6);
  assert.equal(findNearestChandabazTarget(chandabaz, [chandabaz, n1])?.id, 'n1');
  assert.equal(collectChandaFromTarget(chandabaz, n1, roster).count, 1);
  assert.equal(collectChandaFromTarget(chandabaz, n1, roster).ok, false);
  assert.equal(collectChandaFromTarget(chandabaz, n2, roster).count, 2);
  assert.equal(collectChandaFromTarget(chandabaz, n3, roster).count, 3);
  assert.equal(collectChandaFromTarget(chandabaz, n4, roster).count, 4);
  assert.equal(collectChandaFromTarget(chandabaz, n5, roster).reachedGoal, false);
  assert.equal(evaluateMatchOutcome(roster, 0.2), null);
  // Collecting from bat finishes 6/6 living neighbors -> Chandabaz wins!
  assert.equal(collectChandaFromTarget(chandabaz, bat, roster).reachedGoal, true);
  assert.equal(evaluateMatchOutcome(roster, 0.2)?.winner, 'chandabaz');
  // If bat wasn't collected yet and n1 dies, bat is still alive -> 4/5 -> does not win until all living neighbors paid
  chandabaz.chandabazTargets = ['n1', 'n2', 'n3', 'n4', 'n5'];
  n1.alive = false;
  assert.equal(getChandabazGoal(chandabaz, roster), 5);
  assert.equal(evaluateMatchOutcome(roster, 0.2), null);
  n1.alive = true;

  // TikTok Star 3 distinct zones + <= 4 alive
  const tiktok = makePlayer({ id: 'tt', name: 'Reeler', role: 'parabasi', specialRole: 'tiktok_star', alive: true });
  assert.equal(recordTiktokReelInZone(tiktok, null).reason, 'outside_zone');
  assert.equal(recordTiktokReelInZone(tiktok, 'cha_dokan').zoneCount, 1);
  assert.equal(recordTiktokReelInZone(tiktok, 'cha_dokan').reason, 'already_filmed');
  assert.equal(recordTiktokReelInZone(tiktok, 'pukur_ghat').zoneCount, 2);
  assert.equal(recordTiktokReelInZone(tiktok, 'bazar_stall').zoneCount, 3);
  // 5 alive -> continues; 4 alive -> wins!
  assert.equal(evaluateMatchOutcome([tiktok, bat, n1, n2, n3], 0.2), null);
  n3.alive = false;
  assert.equal(evaluateMatchOutcome([tiktok, bat, n1, n2, n3], 0.2)?.winner, 'tiktok_star');
});

test('Phase 4: Exterior staircases climb smoothly onto all 22 walkable Chhad rooftops & Rail Overbridge', () => {
  assert.equal(ROOFTOPS.length, 22);
  assert.equal(STAIR_RAMPS.length, 23);

  const chaStair = STAIR_RAMPS.find((r) => r.id === 'cha_stair')!;
  const chaRoof = ROOFTOPS.find((d) => d.id === 'cha_roof')!;

  // 1. Climb Cha-er Dokan stairs (y = 0 -> top) and step inward onto roof deck
  let pos = { x: -46.0, z: -26.5, y: 0 };
  for (let z = -26.5; z >= -34.6; z -= 0.6) {
    pos = resolvePlayerMoveWithElevation(pos.x, pos.z, pos.y, -46.0, z, PLAYER_RADIUS, WALLS);
  }
  assert.ok(pos.y >= chaRoof.elevationY - 0.5, `Expected near top of cha_stair, got y=${pos.y}`);
  const onRoof = resolvePlayerMoveWithElevation(pos.x, pos.z, pos.y, -42.5, -35.2, PLAYER_RADIUS, WALLS);
  assert.equal(onRoof.y, chaRoof.elevationY);
  assert.equal(getWalkableFloorY(onRoof.x, onRoof.z, onRoof.y), chaRoof.elevationY);

  // Parapet edge containment on Cha roof
  const clampedNorth = resolvePlayerMoveWithElevation(onRoof.x, onRoof.z, onRoof.y, -35.0, -43.0, PLAYER_RADIUS, WALLS);
  assert.ok(clampedNorth.z >= chaRoof.minZ + PLAYER_RADIUS - 0.01);
  assert.equal(clampedNorth.y, chaRoof.elevationY);
  assert.ok(chaStair.steps === 14);

  // 2. Climb Dish Hub stairs & walk onto roof (previously blocked by upper ground-wall collision bug)
  const dishRoof = ROOFTOPS.find((d) => d.id === 'dish_deck')!;
  let dishPos = { x: 46.5, z: 26.2, y: 0 };
  for (let z = 26.2; z <= 35.0; z += 0.6) {
    dishPos = resolvePlayerMoveWithElevation(dishPos.x, dishPos.z, dishPos.y, 46.5, z, PLAYER_RADIUS, WALLS);
  }
  assert.ok(dishPos.y >= dishRoof.elevationY - 0.5, `Expected near top of dish_stair, got y=${dishPos.y}`);
  const onDish = resolvePlayerMoveWithElevation(dishPos.x, dishPos.z, dishPos.y, 41.0, 35.0, PLAYER_RADIUS, WALLS);
  assert.equal(onDish.y, dishRoof.elevationY);

  // 3. Climb Kaka-r Bari Para House stairs & enter rooftop
  const kakaRoof = ROOFTOPS.find((d) => d.id === 'kaka_roof')!;
  let kakaPos = { x: -64.5, z: -80.0, y: 0 };
  for (let z = -80.0; z >= -88.2; z -= 0.6) {
    kakaPos = resolvePlayerMoveWithElevation(kakaPos.x, kakaPos.z, kakaPos.y, -64.5, z, PLAYER_RADIUS, WALLS);
  }
  assert.ok(kakaPos.y >= kakaRoof.elevationY - 0.5, `Expected near top of kaka_stair, got y=${kakaPos.y}`);
  const onKaka = resolvePlayerMoveWithElevation(kakaPos.x, kakaPos.z, kakaPos.y, -70.0, -88.0, PLAYER_RADIUS, WALLS);
  assert.equal(onKaka.y, kakaRoof.elevationY);

  // 4. Climb Rail Overbridge from North & walk across tracks onto South stairs
  const overbridge = ROOFTOPS.find((d) => d.id === 'rail_overbridge')!;
  let bridgePos = { x: 16.0, z: 71.8, y: 0 };
  for (let z = 71.8; z <= 80.0; z += 0.6) {
    bridgePos = resolvePlayerMoveWithElevation(bridgePos.x, bridgePos.z, bridgePos.y, 16.0, z, PLAYER_RADIUS, WALLS);
  }
  assert.ok(bridgePos.y >= overbridge.elevationY - 0.5, `Expected near top of rail_bridge_stair_n, got y=${bridgePos.y}`);
  const onBridge = resolvePlayerMoveWithElevation(bridgePos.x, bridgePos.z, bridgePos.y, 16.0, 86.5, PLAYER_RADIUS, WALLS);
  assert.equal(onBridge.y, overbridge.elevationY);

  // 5. Climb Nana-r Bari (North-West Corner), Kacchi House (West), Dorji Bari (East), Fufu-r Bari (Opar Para)
  const nanaRoof = ROOFTOPS.find((d) => d.id === 'nana_roof')!;
  let nanaPos = { x: -127.5, z: -127.0, y: 0 };
  for (let z = -127.0; z >= -136.0; z -= 0.6) {
    nanaPos = resolvePlayerMoveWithElevation(nanaPos.x, nanaPos.z, nanaPos.y, -127.5, z, PLAYER_RADIUS, WALLS);
  }
  assert.ok(nanaPos.y >= nanaRoof.elevationY - 0.5, `Expected near top of nana_stair, got y=${nanaPos.y}`);
  const onNana = resolvePlayerMoveWithElevation(nanaPos.x, nanaPos.z, nanaPos.y, -133.0, -135.8, PLAYER_RADIUS, WALLS);
  assert.equal(onNana.y, nanaRoof.elevationY);

  const kacchiRoof = ROOFTOPS.find((d) => d.id === 'kacchi_roof')!;
  let kacchiPos = { x: -130.5, z: -16.5, y: 0 };
  for (let x = -130.5; x >= -139.5; x -= 0.6) {
    kacchiPos = resolvePlayerMoveWithElevation(kacchiPos.x, kacchiPos.z, kacchiPos.y, x, -16.5, PLAYER_RADIUS, WALLS);
  }
  assert.ok(kacchiPos.y >= kacchiRoof.elevationY - 0.5, `Expected near top of kacchi_stair, got y=${kacchiPos.y}`);
  const onKacchi = resolvePlayerMoveWithElevation(kacchiPos.x, kacchiPos.z, kacchiPos.y, -139.5, -21.0, PLAYER_RADIUS, WALLS);
  assert.equal(onKacchi.y, kacchiRoof.elevationY);

  const dorjiRoof = ROOFTOPS.find((d) => d.id === 'dorji_roof')!;
  let dorjiPos = { x: 130.5, z: -16.5, y: 0 };
  for (let x = 130.5; x <= 139.5; x += 0.6) {
    dorjiPos = resolvePlayerMoveWithElevation(dorjiPos.x, dorjiPos.z, dorjiPos.y, x, -16.5, PLAYER_RADIUS, WALLS);
  }
  assert.ok(dorjiPos.y >= dorjiRoof.elevationY - 0.5, `Expected near top of dorji_stair, got y=${dorjiPos.y}`);
  const onDorji = resolvePlayerMoveWithElevation(dorjiPos.x, dorjiPos.z, dorjiPos.y, 139.5, -21.0, PLAYER_RADIUS, WALLS);
  assert.equal(onDorji.y, dorjiRoof.elevationY);

  const fufuRoof = ROOFTOPS.find((d) => d.id === 'fufu_roof')!;
  let fufuPos = { x: 79.5, z: 121.5, y: 0 };
  for (let z = 121.5; z <= 130.8; z += 0.6) {
    fufuPos = resolvePlayerMoveWithElevation(fufuPos.x, fufuPos.z, fufuPos.y, 79.5, z, PLAYER_RADIUS, WALLS);
  }
  assert.ok(fufuPos.y >= fufuRoof.elevationY - 0.5, `Expected near top of fufu_stair, got y=${fufuPos.y}`);
  const onFufu = resolvePlayerMoveWithElevation(fufuPos.x, fufuPos.z, fufuPos.y, 74.0, 130.8, PLAYER_RADIUS, WALLS);
  assert.equal(onFufu.y, fufuRoof.elevationY);
});

test('Phase 7: 27 drivable vehicles spawn clear, detect proximity, collide cleanly, and dismount safely', () => {
  const vehicles = createInitialVehicles();
  assert.equal(vehicles.length, 27);

  for (const v of vehicles) {
    const spec = VEHICLE_SPECS[v.kind];
    const resolved = resolveVehicleCollision(v.x, v.z, spec.collisionRadius, vehicles, v.id);
    assert.ok(
      Math.abs(resolved.x - v.x) < 0.75 && Math.abs(resolved.z - v.z) < 0.75,
      `Vehicle ${v.id} (${v.kind}) overlapped wall/vehicle at (${v.x}, ${v.z}) -> (${resolved.x}, ${resolved.z})`,
    );
  }

  // Minibus larger collisionRadius extends proximity nicely
  const minibus = vehicles.find((v) => v.kind === 'minibus')!;
  assert.equal(
    findNearestAvailableVehicle(minibus.x + 4.3, minibus.z, vehicles)?.id,
    minibus.id,
  );

  // Occupied vehicle is skipped by findNearestAvailableVehicle
  const cng = vehicles.find((v) => v.kind === 'cng')!;
  cng.driverId = 'other_driver';
  const driver = makePlayer({ id: 'drv', role: 'vondo', x: cng.x, z: cng.z, vehicleId: null });
  assert.notEqual(findNearestAvailableVehicle(cng.x, cng.z, [cng])?.id, cng.id);

  // Cannot kill or vent while driving
  cng.driverId = driver.id;
  driver.vehicleId = cng.id;
  const victim = makePlayer({ id: 'vic', role: 'parabasi', x: cng.x + 1, z: cng.z });
  assert.equal(canExecuteKill(driver, victim).allowed, false);
  assert.equal(canUseVent(driver), false);

  // Dismount frees vehicle & places driver safely outside vehicle radius
  const exited = dismountPlayerFromVehicle(driver, vehicles, undefined, true);
  assert.equal(exited?.id, cng.id);
  assert.equal(cng.driverId, null);
  assert.equal(driver.vehicleId, null);
  assert.ok(Math.hypot(driver.x - cng.x, driver.z - cng.z) >= 1.2);
});
