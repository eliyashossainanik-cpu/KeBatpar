import test from 'node:test';
import assert from 'node:assert/strict';
import type { PublicRoomSummary, ServerMessage } from './shared/types';
import { RoomDirectoryRegistry, WorkerRoomSession } from './workerSession';

function createMockSocket() {
  const sent: ServerMessage[] = [];
  return {
    sent,
    socket: {
      send(raw: string) {
        sent.push(JSON.parse(raw) as ServerMessage);
      },
    },
  };
}

test('WorkerRoomSession rejects join when room has no active host', () => {
  const session = new WorkerRoomSession('ABCD2');
  const guest = createMockSocket();
  session.attachClient('guest_1', guest.socket);
  session.handleRawMessage(
    'guest_1',
    JSON.stringify({ type: 'room:join', roomCode: 'ABCD2', name: 'Guest', color: 'neel' }),
  );

  assert.equal(guest.sent.length, 1);
  assert.equal(guest.sent[0].type, 'room:error');
  assert.match(guest.sent[0].message, /খুঁজে পাওয়া যায়নি বা হোস্ট অফলাইন/i);
});

test('WorkerRoomSession supports host create, remote guest join, match start, and host migration', () => {
  const synced: Array<PublicRoomSummary | null> = [];
  let ticking = false;
  const session = new WorkerRoomSession('K9X2P', {
    onStartTick: () => {
      ticking = true;
    },
    onStopTick: () => {
      ticking = false;
    },
    onDirectorySync: (summary) => synced.push(summary),
  });

  const host = createMockSocket();
  const guest = createMockSocket();

  session.attachClient('host_1', host.socket);
  session.handleRawMessage(
    'host_1',
    JSON.stringify({ type: 'room:create', name: 'Chacha 420', color: 'holud' }),
  );
  assert.equal(ticking, true);
  assert.equal(synced.at(-1)?.roomCode, 'K9X2P');
  assert.equal(synced.at(-1)?.playerCount, 1);

  session.attachClient('guest_1', guest.socket);
  session.handleRawMessage(
    'guest_1',
    JSON.stringify({ type: 'room:join', roomCode: 'K9X2P', name: 'Fuchka King', color: 'komola' }),
  );

  const joined = guest.sent.find((m) => m.type === 'room:joined');
  assert.ok(joined && joined.type === 'room:joined');
  assert.equal(joined.snapshot.players.length, 2);
  assert.equal(synced.at(-1)?.playerCount, 2);

  // Add 3 bots (total 5 players), mark guest ready, and start 5s countdown
  session.handleRawMessage('host_1', JSON.stringify({ type: 'lobby:add_bot' }));
  session.handleRawMessage('host_1', JSON.stringify({ type: 'lobby:add_bot' }));
  session.handleRawMessage('host_1', JSON.stringify({ type: 'lobby:add_bot' }));
  session.handleRawMessage('guest_1', JSON.stringify({ type: 'lobby:ready', ready: true }));
  session.handleRawMessage('host_1', JSON.stringify({ type: 'lobby:start' }));

  const countdownState = [...guest.sent].reverse().find((m) => m.type === 'room:state');
  assert.ok(countdownState && countdownState.type === 'room:state');
  assert.equal(countdownState.snapshot.lobbyCountdownSec, 5);

  for (let i = 0; i < 102; i++) {
    session.tick(0.05);
  }
  const latestGuestState = [...guest.sent].reverse().find((m) => m.type === 'room:state');
  assert.ok(latestGuestState && latestGuestState.type === 'room:state');
  assert.equal(latestGuestState.snapshot.phase, 'role_reveal');

  // Host disconnects -> guest becomes host automatically
  session.detachClient('host_1');
  assert.equal(ticking, true);
  const afterMigrate = [...guest.sent].reverse().find((m) => m.type === 'room:state');
  assert.ok(afterMigrate && afterMigrate.type === 'room:state');
  const promoted = afterMigrate.snapshot.players.find((p) => p.id === joined.playerId);
  assert.equal(promoted?.isHost, true);

  // Last human leaves -> room cleans up and stops tick
  session.detachClient('guest_1');
  assert.equal(ticking, false);
  assert.equal(synced.at(-1), null);
});

test('RoomDirectoryRegistry returns only fresh lobby rooms with open slots', () => {
  const reg = new RoomDirectoryRegistry();
  reg.upsert({ roomCode: 'OPEN1', hostName: 'Lal', playerCount: 2, maxPlayers: 8, phase: 'lobby' }, 1000);
  reg.upsert({ roomCode: 'FULL1', hostName: 'Neel', playerCount: 8, maxPlayers: 8, phase: 'lobby' }, 1000);
  reg.upsert({ roomCode: 'PLAY1', hostName: 'Sada', playerCount: 4, maxPlayers: 8, phase: 'playing' }, 1000);
  reg.upsert({ roomCode: 'OLD1', hostName: 'Kalo', playerCount: 1, maxPlayers: 8, phase: 'lobby' }, 1000);

  // Remove stale check by passing updated timestamp for OPEN1
  reg.upsert({ roomCode: 'OPEN1', hostName: 'Lal', playerCount: 3, maxPlayers: 8, phase: 'lobby' }, 150_000);

  const list = reg.listActive(150_500);
  assert.equal(list.length, 1);
  assert.equal(list[0].roomCode, 'OPEN1');
  assert.equal(list[0].playerCount, 3);
});
