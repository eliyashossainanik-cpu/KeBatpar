import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYER_COLORS, type ServerMessage } from '../shared/types';
import {
  P2PHostRoomEngine,
  buildPeerIdForRoomCode,
  generateP2PRoomCode,
  normalizeRoomCode,
} from './p2pHostEngine';

test('P2P room code helpers normalize and build deterministic peer IDs', () => {
  const code = generateP2PRoomCode();
  assert.equal(code.length, 5);
  assert.equal(normalizeRoomCode('  a d7k-2  '), 'AD7K2');
  assert.equal(buildPeerIdForRoomCode('adda'), 'kebatpar-v1-ADDA');
});

test('P2P host room allows guest join by room code, ready check, bot fill, 5s countdown, and movement sync', () => {
  const clientInbox = new Map<string, ServerMessage[]>();
  const broadcasts: ServerMessage[] = [];

  const engine = new P2PHostRoomEngine('K7M4P', {
    sendToClient: (cid, msg) => {
      const arr = clientInbox.get(cid) ?? [];
      arr.push(msg);
      clientInbox.set(cid, arr);
    },
    broadcast: (msg) => {
      broadcasts.push(msg);
    },
  });

  // Host creates room
  assert.equal(engine.addClient('host_peer', 'Lal Mia', 'lal', true), true);
  // Guest joins with matching room code
  engine.handleMessage('guest_peer', {
    type: 'room:join',
    roomCode: 'k7m4p',
    name: 'Neel Babu',
    color: 'neel',
  });

  // Rejects mismatched room code with Banglish message
  engine.handleMessage('wrong_peer', {
    type: 'room:join',
    roomCode: 'ZZZZZ',
    name: 'Wrong',
    color: 'holud',
  });
  const wrongMsgs = clientInbox.get('wrong_peer') ?? [];
  assert.equal(wrongMsgs[0]?.type, 'room:error');
  if (wrongMsgs[0]?.type === 'room:error') {
    assert.match(wrongMsgs[0].message, /এই কোডে কোনো রুম পাওয়া যায়নি/i);
  }

  // Cannot start with only 2 players
  engine.handleMessage('host_peer', { type: 'lobby:start' });
  const hostLast = clientInbox.get('host_peer')?.at(-1);
  assert.equal(hostLast?.type, 'room:error');

  // Add 3 bots -> 5 players, still blocked until guest is Ready
  engine.handleMessage('host_peer', { type: 'lobby:add_bot' });
  engine.handleMessage('host_peer', { type: 'lobby:add_bot' });
  engine.handleMessage('host_peer', { type: 'lobby:add_bot' });
  assert.equal(engine.getSnapshot().players.length, 5);

  engine.handleMessage('host_peer', { type: 'lobby:start' });
  const unreadyErr = clientInbox.get('host_peer')?.at(-1);
  assert.equal(unreadyErr?.type, 'room:error');
  if (unreadyErr?.type === 'room:error') {
    assert.match(unreadyErr.message, /রেডি না/i);
  }

  // Guest marks ready -> Host starts 5s countdown
  engine.handleMessage('guest_peer', { type: 'lobby:ready', ready: true });
  engine.handleMessage('host_peer', { type: 'lobby:start' });
  assert.equal(engine.getSnapshot().phase, 'lobby');
  assert.equal(engine.getSnapshot().lobbyCountdownSec, 5);

  // Late joiner is blocked once countdown starts
  engine.handleMessage('late_peer', {
    type: 'room:join',
    roomCode: 'K7M4P',
    name: 'Late Vai',
    color: 'shobuj',
  });
  const lateErr = clientInbox.get('late_peer')?.at(-1);
  assert.equal(lateErr?.type, 'room:error');
  if (lateErr?.type === 'room:error') {
    assert.match(lateErr.message, /খেলা শুরু হয়ে গেছে/i);
  }

  // Advance 5.05s through countdown -> role_reveal
  for (let i = 0; i < 102; i++) {
    engine.step(0.05);
  }
  assert.equal(engine.getSnapshot().phase, 'role_reveal');
  assert.equal(engine.getSnapshot().lobbyCountdownSec, null);

  // Advance past role_reveal (8.0s)
  for (let i = 0; i < 170; i++) {
    engine.step(0.05);
  }
  assert.equal(engine.getSnapshot().phase, 'playing');

  // Guest moves and state updates
  const guestMsgs = clientInbox.get('guest_peer') ?? [];
  const joinedMsg = guestMsgs.find((m) => m.type === 'room:joined');
  assert.ok(joinedMsg && joinedMsg.type === 'room:joined');
  const guestId = joinedMsg.playerId;

  engine.handleMessage('guest_peer', {
    type: 'player:move',
    x: 2,
    z: -3,
    vx: 1,
    vz: 0,
    yaw: 0.5,
  });
  const movedGuest = engine.getSnapshot().players.find((p) => p.id === guestId);
  assert.ok(movedGuest);
  assert.ok(Math.abs(movedGuest.x - 2) < 0.01);
});

test('P2P multiplayer auto-assigns unique names, distinct colors, and random roles on join/start', () => {
  const engine = new P2PHostRoomEngine('M4M4A', {
    sendToClient: () => {},
    broadcast: () => {},
  });

  // Host + 2 guests + 2 bots = 5 players
  engine.addClient('h1', 'Lal Mia', 'lal', true);
  engine.handleMessage('g1', { type: 'room:join', roomCode: 'M4M4A', name: 'Lal Mia', color: 'lal' });
  engine.handleMessage('g2', { type: 'room:join', roomCode: 'M4M4A', name: '', color: 'lal' });
  engine.handleMessage('h1', { type: 'lobby:add_bot' });
  engine.handleMessage('h1', { type: 'lobby:add_bot' });

  const players = engine.getSnapshot().players;
  assert.equal(players.length, 5);

  const uniqueNames = new Set(players.map((p) => p.name));
  const uniqueColors = new Set(players.map((p) => p.color));
  assert.equal(uniqueNames.size, 5, 'every player should have a unique auto-selected name');
  assert.equal(uniqueColors.size, 5, 'every player should have a unique auto-selected color');

  engine.handleMessage('g1', { type: 'lobby:ready', ready: true });
  engine.handleMessage('g2', { type: 'lobby:ready', ready: true });
  engine.handleMessage('h1', { type: 'lobby:start' });
  assert.equal(engine.getSnapshot().lobbyCountdownSec, 5);

  for (let i = 0; i < 102; i++) engine.step(0.05);
  const started = engine.getSnapshot();
  assert.equal(started.phase, 'role_reveal');
  assert.equal(started.players.filter((p) => p.role === 'vondo').length, 1);
});

test('P2PHostRoomEngine promotes remaining human player when host leaves', () => {
  const engine = new P2PHostRoomEngine('H0ST1', {
    sendToClient: () => {},
    broadcast: () => {},
  });

  engine.addClient('h1', 'Host Dada', 'lal', true);
  engine.handleMessage('h1', { type: 'lobby:add_bot' });
  engine.handleMessage('g1', { type: 'room:join', roomCode: 'H0ST1', name: 'Guest Mia', color: 'neel' });

  engine.removeClient('h1');
  assert.equal(engine.hasHumanClients(), true);
  const remaining = engine.getSnapshot().players;
  const newHost = remaining.find((p) => p.name === 'Guest Mia');
  const bot = remaining.find((p) => p.isBot);
  assert.equal(newHost?.isHost, true);
  assert.equal(newHost?.ready, true);
  assert.equal(bot?.isHost, false);
});

test('P2PHostRoomEngine extends voted Pukur ejection phase to 7.5s and marks victim dead as ghost', () => {
  const engine = new P2PHostRoomEngine('EJCT1', {
    sendToClient: () => {},
    broadcast: () => {},
  });

  engine.addClient('h1', 'Host Mia', 'lal', true);
  engine.addClient('g1', 'Neel Mia', 'neel', false);
  engine.addClient('g2', 'Shobuj Mia', 'shobuj', false);
  engine.addClient('g3', 'Holud Mia', 'holud', false);
  engine.addClient('g4', 'Beguni Apa', 'beguni', false);

  for (const cid of ['g1', 'g2', 'g3', 'g4']) {
    engine.handleMessage(cid, { type: 'lobby:ready', ready: true });
  }
  engine.handleMessage('h1', { type: 'lobby:start' });
  for (let i = 0; i < 102; i++) engine.step(0.05);
  assert.equal(engine.getSnapshot().phase, 'role_reveal');

  for (let i = 0; i < 170; i++) engine.step(0.05);
  assert.equal(engine.getSnapshot().phase, 'playing');

  // Advance past initial emergencyCooldownRemaining (15s) before ringing Adda Bell
  for (let i = 0; i < 320; i++) engine.step(0.05);
  engine.handleMessage('h1', { type: 'player:move', x: 0, z: 0, vx: 0, vz: 0, yaw: 0 });
  engine.handleMessage('h1', { type: 'player:emergency_meeting' });
  assert.equal(engine.getSnapshot().phase, 'meeting');
  assert.ok((engine.getSnapshot().discussionTimer ?? 0) > 0);

  const players = engine.getSnapshot().players;
  const target = players.find((p) => p.id !== 'pl_host' && p.role === 'parabasi') ?? players[1];

  // Votes must be rejected during discussionTimer lock
  engine.handleMessage('h1', { type: 'meeting:vote', targetId: target.id });
  assert.equal(engine.getSnapshot().players.find((p) => p.id === 'pl_host')?.hasVoted, false);

  // Advance past 15s discussionTimer -> votes unlock
  for (let i = 0; i < 305; i++) engine.step(0.05);
  assert.equal(engine.getSnapshot().discussionTimer, 0);

  for (const cid of ['h1', 'g1', 'g2', 'g3', 'g4']) {
    engine.handleMessage(cid, { type: 'meeting:vote', targetId: target.id });
  }
  engine.step(0.05);
  assert.equal(engine.getSnapshot().phase, 'vote_results');

  // Advance past 2.6s vote_results into ejecting
  for (let i = 0; i < 56; i++) engine.step(0.05);
  const ejectSnap = engine.getSnapshot();
  assert.equal(ejectSnap.phase, 'ejecting');
  assert.equal(ejectSnap.ejection?.reason, 'voted');
  assert.equal(ejectSnap.players.find((p) => p.id === target.id)?.alive, false);

  // At 4.5s into ejecting (still watching post-splash animation), phase must still be 'ejecting'
  for (let i = 0; i < 90; i++) engine.step(0.05);
  assert.equal(engine.getSnapshot().phase, 'ejecting');

  // Advancing past 7.5s exits ejecting (back to playing or gameover)
  for (let i = 0; i < 70; i++) engine.step(0.05);
  assert.notEqual(engine.getSnapshot().phase, 'ejecting');
});

test('Phase 2 lobby supports customize, kick, lobby chat limits, cancel countdown, reconnect grace, and auto-fill bots', () => {
  const inbox = new Map<string, ServerMessage[]>();
  const engine = new P2PHostRoomEngine('L0BBY', {
    sendToClient: (cid, msg) => {
      const arr = inbox.get(cid) ?? [];
      arr.push(msg);
      inbox.set(cid, arr);
    },
    broadcast: () => {},
  });

  engine.addClient('h1', 'Host Boss', 'lal', true);
  engine.handleMessage('g1', { type: 'room:join', roomCode: 'L0BBY', name: 'Nabil', color: 'neel' });
  engine.handleMessage('g2', { type: 'room:join', roomCode: 'L0BBY', name: 'Kabil', color: 'shobuj' });
  engine.handleMessage('h1', { type: 'lobby:add_bot' });
  engine.handleMessage('h1', { type: 'lobby:add_bot' });

  // Customize enforces 12-char name limit, unique name, and non-taken color
  engine.handleMessage('g1', {
    type: 'lobby:customize',
    name: 'Host Boss Extra Long',
    color: 'lal', // taken by host -> ignored
  });
  let snap = engine.getSnapshot();
  const g1Joined = inbox.get('g1')?.find((m) => m.type === 'room:joined');
  assert.ok(g1Joined && g1Joined.type === 'room:joined');
  const g1Player = snap.players.find((p) => p.id === g1Joined.playerId);
  assert.ok(g1Player);
  assert.ok(g1Player.name.length <= 12);
  assert.notEqual(g1Player.color, 'lal');

  // Switch to an open color works
  const usedColors = new Set(snap.players.map((p) => p.color));
  const openColor = PLAYER_COLORS.map((c) => c.id).find((c) => !usedColors.has(c));
  assert.ok(openColor);
  engine.handleMessage('g1', { type: 'lobby:customize', color: openColor });
  snap = engine.getSnapshot();
  assert.equal(snap.players.find((p) => p.id === g1Joined.playerId)?.color, openColor);

  // Lobby chat caps at 120 chars and rate-limits rapid spam
  engine.handleMessage('g1', { type: 'lobby:chat', text: 'x'.repeat(160) });
  engine.handleMessage('g1', { type: 'lobby:chat', text: 'second immediate' });
  snap = engine.getSnapshot();
  assert.equal(snap.lobbyChat?.length, 1);
  assert.equal(snap.lobbyChat?.[0].text.length, 120);

  // Ready -> Start countdown -> unready cancels countdown
  engine.handleMessage('g1', { type: 'lobby:ready', ready: true });
  engine.handleMessage('g2', { type: 'lobby:ready', ready: true });
  engine.handleMessage('h1', { type: 'lobby:start' });
  assert.equal(engine.getSnapshot().lobbyCountdownSec, 5);

  engine.handleMessage('g1', { type: 'lobby:ready', ready: false });
  assert.equal(engine.getSnapshot().lobbyCountdownSec, null);

  // Host can also cancel active countdown explicitly
  engine.handleMessage('g1', { type: 'lobby:ready', ready: true });
  engine.handleMessage('h1', { type: 'lobby:start' });
  assert.equal(engine.getSnapshot().lobbyCountdownSec, 5);
  engine.handleMessage('h1', { type: 'lobby:cancel_start' });
  assert.equal(engine.getSnapshot().lobbyCountdownSec, null);

  // Host kicks g2 -> sends room:kicked
  const g2Joined = inbox.get('g2')?.find((m) => m.type === 'room:joined');
  assert.ok(g2Joined && g2Joined.type === 'room:joined');
  engine.handleMessage('h1', { type: 'lobby:kick', targetPlayerId: g2Joined.playerId });
  assert.equal(inbox.get('g2')?.some((m) => m.type === 'room:kicked'), true);
  assert.equal(engine.getSnapshot().players.some((p) => p.id === g2Joined.playerId), false);

  // Unexpected disconnect reserves slot via reconnectToken for 20s and allows restore
  const g1Token = g1Joined.reconnectToken;
  assert.ok(g1Token);
  engine.removeClient('g1', false);
  assert.equal(engine.getSnapshot().players.some((p) => p.id === g1Joined.playerId), false);
  engine.handleMessage('g1_rejoined', {
    type: 'room:join',
    roomCode: 'L0BBY',
    name: 'Ignored',
    color: 'beguni',
    reconnectToken: g1Token,
  });
  const rejoined = inbox.get('g1_rejoined')?.find((m) => m.type === 'room:joined');
  assert.ok(rejoined && rejoined.type === 'room:joined');
  assert.equal(rejoined.playerId, g1Joined.playerId);

  // Intentional leave when autoFillBots=true spawns a replacement bot
  engine.handleMessage('h1', { type: 'lobby:settings', settings: { autoFillBots: true } });
  const beforeLeaveCount = engine.getSnapshot().players.length;
  engine.handleMessage('g1_rejoined', { type: 'room:leave' });
  const afterLeaveSnap = engine.getSnapshot();
  assert.equal(afterLeaveSnap.players.length, beforeLeaveCount);
  assert.equal(afterLeaveSnap.players.filter((p) => p.isBot).length, 3);
});

test('Phase 3 Ghost harmless lamp-flicker prank triggers once per round and resets after meeting', () => {
  const broadcasts: ServerMessage[] = [];
  const inbox = new Map<string, ServerMessage[]>();
  const engine = new P2PHostRoomEngine('PRNK1', {
    sendToClient: (cid, msg) => {
      const arr = inbox.get(cid) ?? [];
      arr.push(msg);
      inbox.set(cid, arr);
    },
    broadcast: (msg) => {
      broadcasts.push(msg);
    },
  });

  engine.addClient('h1', 'Host Mia', 'lal', true);
  engine.addClient('g1', 'Neel Mia', 'neel', false);
  engine.addClient('g2', 'Shobuj Mia', 'shobuj', false);
  engine.addClient('g3', 'Holud Mia', 'holud', false);
  engine.addClient('g4', 'Beguni Apa', 'beguni', false);

  for (const cid of ['g1', 'g2', 'g3', 'g4']) {
    engine.handleMessage(cid, { type: 'lobby:ready', ready: true });
  }
  engine.handleMessage('h1', { type: 'lobby:start' });
  for (let i = 0; i < 102; i++) engine.step(0.05);
  for (let i = 0; i < 170; i++) engine.step(0.05);
  for (let i = 0; i < 280; i++) engine.step(0.05);

  // Eject g4 (if innocent parabasi, match continues with g4 as Ghost)
  const snap0 = engine.getSnapshot();
  const g4Joined = inbox.get('g4')?.find((m) => m.type === 'room:joined');
  assert.ok(g4Joined && g4Joined.type === 'room:joined');
  const crewVictim =
    snap0.players.find((p) => p.role === 'parabasi' && p.specialRole !== 'pagol' && p.id !== 'pl_host') ??
    snap0.players[1];

  const victimCid =
    (['h1', 'g1', 'g2', 'g3', 'g4'] as const).find((cid) => {
      const joined = inbox.get(cid)?.find((m) => m.type === 'room:joined');
      return joined && joined.type === 'room:joined' && joined.playerId === crewVictim.id;
    }) ?? 'g4';

  engine.handleMessage('h1', { type: 'player:move', x: 0, z: 0, vx: 0, vz: 0, yaw: 0 });
  engine.handleMessage('h1', { type: 'player:emergency_meeting' });
  // Advance past 15s discussionTimer before casting votes
  for (let i = 0; i < 305; i++) engine.step(0.05);
  for (const cid of ['h1', 'g1', 'g2', 'g3', 'g4']) {
    engine.handleMessage(cid, { type: 'meeting:vote', targetId: crewVictim.id });
  }
  for (let i = 0; i < 220; i++) engine.step(0.05);

  const afterEject = engine.getSnapshot();
  if (afterEject.phase === 'playing') {
    assert.equal(afterEject.players.find((p) => p.id === crewVictim.id)?.alive, false);

    // Trigger ghost lamp prank
    broadcasts.length = 0;
    engine.handleMessage(victimCid, { type: 'player:use_ability' });
    const prankSnap = engine.getSnapshot();
    assert.ok((prankSnap.prankedLampUntil ?? 0) > Date.now() - 1000);
    assert.equal(prankSnap.players.find((p) => p.id === crewVictim.id)?.pranksLeft, 0);
    assert.equal(broadcasts.some((m) => m.type === 'sfx:event' && m.kind === 'prank'), true);

    // Second prank in same round should be rejected without re-sending prank SFX
    broadcasts.length = 0;
    engine.handleMessage(victimCid, { type: 'player:use_ability' });
    assert.equal(broadcasts.some((m) => m.type === 'sfx:event' && m.kind === 'prank'), false);

    // Advance past emergency cooldown & trigger another meeting -> pranksLeft resets to 1
    for (let i = 0; i < 280; i++) engine.step(0.05);
    engine.handleMessage('h1', { type: 'player:move', x: 0, z: 0, vx: 0, vz: 0, yaw: 0 });
    engine.handleMessage('h1', { type: 'player:emergency_meeting' });
    if (engine.getSnapshot().phase === 'meeting') {
      assert.equal(engine.getSnapshot().players.find((p) => p.id === crewVictim.id)?.pranksLeft, 1);
    }
  }
});

test('P2PHostRoomEngine syncs rooftop y elevation and resolves meeting votes cleanly at timer end without hanging', () => {
  const engine = new P2PHostRoomEngine('R00F1', {
    sendToClient: () => {},
    broadcast: () => {},
  });

  engine.addClient('h1', 'Host Roof', 'lal', true);
  engine.handleMessage('h1', { type: 'lobby:add_bot' });
  engine.handleMessage('h1', { type: 'lobby:add_bot' });
  engine.handleMessage('h1', { type: 'lobby:add_bot' });
  engine.handleMessage('h1', { type: 'lobby:add_bot' });
  engine.handleMessage('h1', { type: 'lobby:start' });

  for (let i = 0; i < 102; i++) engine.step(0.05);
  for (let i = 0; i < 170; i++) engine.step(0.05);
  assert.equal(engine.getSnapshot().phase, 'playing');

  // Walk host up Cha-er Dokan stairs onto rooftop
  engine.handleMessage('h1', { type: 'player:move', x: -46.0, z: -33.6, y: 3.05, vx: 0, vz: -1, yaw: 0 });
  engine.handleMessage('h1', { type: 'player:move', x: -42.5, z: -35.2, y: 3.15, vx: 1, vz: 0, yaw: 1.5 });
  const hostOnRoof = engine.getSnapshot().players.find((p) => p.id === 'pl_host');
  assert.ok(hostOnRoof && (hostOnRoof.y ?? 0) >= 3.0, `Expected host y >= 3.0 on rooftop, got ${hostOnRoof?.y}`);

  // Advance past emergency cooldown and call meeting -> let meeting expire without human voting -> must resolve cleanly
  for (let i = 0; i < 320; i++) engine.step(0.05);
  engine.handleMessage('h1', { type: 'player:move', x: 0, z: 0, y: 0, vx: 0, vz: 0, yaw: 0 });
  engine.handleMessage('h1', { type: 'player:emergency_meeting' });
  assert.equal(engine.getSnapshot().phase, 'meeting');

  for (let i = 0; i < 1000; i++) {
    engine.step(0.05);
    if (engine.getSnapshot().phase !== 'meeting') break;
  }
  assert.notEqual(engine.getSnapshot().phase, 'meeting', 'Meeting must never hang at 0s');
});

test('P2PHostRoomEngine supports entering, driving, honking, and auto-dismounting vehicles on start', () => {
  const broadcasts: ServerMessage[] = [];
  const engine = new P2PHostRoomEngine('V3H1C', {
    sendToClient: () => {},
    broadcast: (msg) => {
      broadcasts.push(msg);
    },
  });

  engine.addClient('h1', 'Driver Mia', 'lal', true);
  for (let i = 0; i < 4; i++) engine.handleMessage('h1', { type: 'lobby:add_bot' });

  const initialVeh = engine.getSnapshot().vehicles?.[0];
  assert.ok(initialVeh, 'Expected initial vehicles in snapshot');

  engine.handleMessage('h1', {
    type: 'player:move',
    x: initialVeh.x,
    z: initialVeh.z,
    vx: 0,
    vz: 0,
    yaw: 0,
  });
  engine.handleMessage('h1', { type: 'player:vehicle_toggle', vehicleId: initialVeh.id });
  const afterBoard = engine.getSnapshot();
  assert.equal(afterBoard.players.find((p) => p.id === 'pl_host')?.vehicleId, initialVeh.id);
  assert.equal(afterBoard.vehicles?.find((v) => v.id === initialVeh.id)?.driverId, 'pl_host');

  broadcasts.length = 0;
  engine.handleMessage('h1', {
    type: 'player:vehicle_drive',
    vehicleId: initialVeh.id,
    x: initialVeh.x + 1.5,
    z: initialVeh.z + 1.5,
    yaw: 0.4,
    vx: 4,
    vz: 4,
    speed: 5.5,
    steer: 0.2,
  });
  engine.handleMessage('h1', { type: 'player:vehicle_horn' });
  const drivenVeh = engine.getSnapshot().vehicles?.find((v) => v.id === initialVeh.id);
  assert.ok(drivenVeh && Math.abs(drivenVeh.x - (initialVeh.x + 1.5)) < 1.0);
  assert.equal(
    broadcasts.some((m) => m.type === 'sfx:event' && m.kind === 'vehicle_horn' && m.vehicleKind === initialVeh.kind),
    true,
  );

  engine.handleMessage('h1', { type: 'lobby:start' });
  for (let i = 0; i < 102; i++) engine.step(0.05);
  for (let i = 0; i < 170; i++) engine.step(0.05);
  assert.equal(engine.getSnapshot().phase, 'playing');

  const playVeh = engine.getSnapshot().vehicles?.[0];
  assert.ok(playVeh);
  assert.equal(playVeh.driverId, null);
});



