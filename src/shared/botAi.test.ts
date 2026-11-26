import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOT_AI_CONFIG,
  applyBatchedGeminiChats,
  applyBatchedGeminiReactionChats,
  buildBatchedGeminiMeetingPayload,
  createBotBrainState,
  decideBotVote,
  generateFallbackMeetingChats,
  getMeetingTypingBotIds,
  processChatMessageForBots,
  stepBotsMeeting,
  stepBotsPlaying,
  type BotBrainState,
} from './botAi';
import {
  DEFAULT_ROOM_SETTINGS,
  assignMatchTasks,
  createEmptySabotageState,
  makeDefaultPlayerState,
  makeEmptyDoorLocks,
  redactSnapshotForPlayer,
} from './gameRules';
import type { BodyMarker, ChatMessage, PlayerState, RoomSnapshot } from './types';

function makeRng(seed = 42): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makePlayers(): PlayerState[] {
  const specs: Array<{ id: string; name: string; color: PlayerState['color']; role: 'parabasi' | 'vondo'; isBot: boolean }> = [
    { id: 'p_human', name: 'Lal Mia', color: 'lal', role: 'parabasi', isBot: false },
    { id: 'b1', name: 'Chacha Miah', color: 'holud', role: 'parabasi', isBot: true },
    { id: 'b2', name: 'Babu Bhai', color: 'neel', role: 'parabasi', isBot: true },
    { id: 'b3', name: 'Pintu Da', color: 'shobuj', role: 'vondo', isBot: true },
    { id: 'b4', name: 'Tuktuki Apa', color: 'beguni', role: 'parabasi', isBot: true },
  ];
  const players = specs.map((s, idx) => {
    const pl = makeDefaultPlayerState({
      id: s.id,
      name: s.name,
      color: s.color,
      role: s.role,
      isBot: s.isBot,
      isHost: idx === 0,
      ready: true,
    });
    pl.pingMs = 38;
    return pl;
  });
  assignMatchTasks(players, 5, makeRng(7));
  return players;
}

test('BOT_AI_CONFIG exposes expected tuning keys with sane ranges', () => {
  assert.ok(BOT_AI_CONFIG.voteRandomness >= 0 && BOT_AI_CONFIG.voteRandomness <= 1);
  assert.ok(BOT_AI_CONFIG.memoryErrorChance >= 0 && BOT_AI_CONFIG.memoryErrorChance <= 1);
  assert.ok(BOT_AI_CONFIG.riskyKillChance >= 0 && BOT_AI_CONFIG.riskyKillChance <= 1);
  assert.ok(BOT_AI_CONFIG.bandwagonStrength >= 0 && BOT_AI_CONFIG.bandwagonStrength <= 1);
  assert.equal(BOT_AI_CONFIG.chatDelayRange.length, 2);
  assert.ok(BOT_AI_CONFIG.chatDelayRange[0] < BOT_AI_CONFIG.chatDelayRange[1]);
});

test('bots treat human and bot players identically in chat reactions and voting', () => {
  const playersA = makePlayers();
  const playersB = makePlayers();
  // Flip p_human to isBot=true in cohort B; both cohorts must get identical suspicion & vote
  playersB[0].isBot = true;

  const setupBrains = (players: PlayerState[]) => {
    const brains = new Map<string, BotBrainState>();
    for (const p of players) {
      if (!p.isBot) continue;
      const br = createBotBrainState(() => 0.35);
      br.personality = 'follower';
      br.recentSightings.push({
        id: 'p_human',
        perceivedName: 'Lal Mia',
        perceivedColor: 'lal',
        zoneName: 'DESCO Power',
        x: 30,
        z: 30,
        atMs: 5000,
      });
      brains.set(p.id, br);
    }
    return brains;
  };

  const brainsA = setupBrains(playersA);
  const brainsB = setupBrains(playersB);

  const msg: ChatMessage = {
    id: 'm1',
    senderId: 'b2',
    senderName: 'Babu Bhai',
    senderColor: 'neel',
    text: 'Lal shamne kill korte dekhsi, vote Lal!',
    timestamp: 1000,
  };

  processChatMessageForBots({ msg, players: playersA, brains: brainsA, rng: () => 0.4 });
  processChatMessageForBots({ msg, players: playersB, brains: brainsB, rng: () => 0.4 });

  assert.equal(
    brainsA.get('b1')!.suspicion['p_human'],
    brainsB.get('b1')!.suspicion['p_human'],
  );

  const bodies: BodyMarker[] = [
    {
      id: 'body1',
      victimId: 'b4',
      victimName: 'Tuktuki Apa',
      color: 'beguni',
      x: 30,
      z: 30,
      reported: true,
      killedAt: 5500,
      killerColorHint: 'Dark Shade',
      killerZoneHint: 'DESCO Power',
    },
  ];
  const voteA = decideBotVote({
    bot: playersA[1],
    brain: brainsA.get('b1')!,
    players: playersA,
    bodies,
    rng: () => 0.9,
  });
  const voteB = decideBotVote({
    bot: playersB[1],
    brain: brainsB.get('b1')!,
    players: playersB,
    bodies,
    rng: () => 0.9,
  });
  assert.equal(voteA, voteB);
});

test('contradiction detector catches false zone alibis and triggers direct defense replies', () => {
  const players = makePlayers();
  const brains = new Map<string, BotBrainState>();
  for (const p of players) {
    if (!p.isBot) continue;
    const br = createBotBrainState(makeRng(11));
    br.personality = 'leader';
    br.zoneHistory.push('Cha-er Dokan');
    if (p.id === 'b1') {
      br.recentSightings.push({
        id: 'b3',
        perceivedName: 'Pintu Da',
        perceivedColor: 'shobuj',
        zoneName: 'DESCO Power',
        x: 32,
        z: 32,
        atMs: 9000,
      });
    }
    brains.set(p.id, br);
  }

  // Pintu claims he was at Cha-er Dokan while b1 clearly saw him in DESCO Power -> suspicion jumps & contradiction reply queued
  processChatMessageForBots({
    msg: {
      id: 'lie_1',
      senderId: 'b3',
      senderName: 'Pintu Da',
      senderColor: 'shobuj',
      text: 'ami Cha-er Dokan e chilam bro, clean',
      timestamp: 12000,
    },
    players,
    brains,
    rng: () => 0.1,
  });

  const b1 = brains.get('b1')!;
  assert.ok((b1.suspicion['b3'] ?? 0) >= 2.0, 'Contradiction must raise private suspicion');
  assert.ok(
    b1.pendingChats.some((c) => c.accusedId === 'b3' && c.text.includes('DESCO Power')),
    'Bot should call out contradictory zone claim',
  );

  // When b4 accuses b1 directly, b1 schedules a defense reply
  processChatMessageForBots({
    msg: {
      id: 'acc_b1',
      senderId: 'b4',
      senderName: 'Tuktuki Apa',
      senderColor: 'beguni',
      text: 'Chacha Miah ke onek sus lagse',
      timestamp: 13000,
    },
    players,
    brains,
    rng: () => 0.2,
  });
  assert.ok(b1.pendingChats.some((c) => c.defended), 'Accused bot should defend itself');
});

test('buildBatchedGeminiMeetingPayload exposes only private bot memory and never reveals other roles', () => {
  const players = makePlayers();
  const brains = new Map<string, BotBrainState>();
  for (const p of players) {
    if (!p.isBot) continue;
    const br = createBotBrainState(makeRng(3));
    br.zoneHistory.push('Fuchka Corner');
    if (p.id === 'b1') {
      br.recentSightings.push({
        id: 'p_human',
        perceivedName: 'Lal Mia',
        perceivedColor: 'lal',
        zoneName: 'Fuchka Corner',
        x: -20,
        z: 10,
        atMs: 8000,
      });
    }
    brains.set(p.id, br);
  }

  const payload = buildBatchedGeminiMeetingPayload({
    roomCode: 'TEST',
    players,
    bodies: [],
    brains,
    chat: [],
    meetingReason: 'emergency',
    meetingCallerId: 'p_human',
  });

  assert.equal(payload.bots.length, 4);
  const b1Ctx = payload.bots.find((b) => b.id === 'b1')!;
  assert.equal(b1Ctx.role, 'parabasi');
  assert.equal(b1Ctx.partnerName, undefined);
  assert.equal(b1Ctx.fakeAlibiZone, undefined);
  assert.ok(b1Ctx.privateMemory.some((m) => m.includes('Lal Mia')));

  // Payload JSON must not contain any isBot/isHuman leak flags
  const raw = JSON.stringify(payload);
  assert.equal(raw.includes('isBot'), false);
  assert.equal(raw.includes('isHuman'), false);
});

test('Gemini batched replies and fallback schedules emit typing indicators before delayed chat messages', () => {
  const players = makePlayers();
  const brains = new Map<string, BotBrainState>();
  for (const p of players) {
    if (p.isBot) brains.set(p.id, createBotBrainState(makeRng(5)));
  }

  generateFallbackMeetingChats({
    players,
    bodies: [],
    brains,
    meetingReason: 'emergency',
    meetingCallerId: 'p_human',
    rng: makeRng(8),
  });

  applyBatchedGeminiChats({
    replies: [{ botId: 'b1', text: 'ami fuchka corner e chilam bro, ke sus?', delaySec: 3.5 }],
    players,
    brains,
    rng: () => 0.5,
  });

  const sent: string[] = [];
  let sawTyping = false;
  for (let i = 0; i < 20; i++) {
    stepBotsMeeting({
      players,
      bodies: [],
      discussionTimer: 10,
      brains,
      dt: 0.25,
      meetingReason: 'emergency',
      meetingCallerId: 'p_human',
      rng: () => 0.5,
      onChat: (p, text) => {
        sent.push(`${p.id}:${text}`);
      },
    });
    const typing = getMeetingTypingBotIds(players, brains);
    if (typing.includes('b1')) sawTyping = true;
  }

  assert.equal(sawTyping, true, 'Bot should appear in typing indicator before message sends');
  assert.ok(
    sent.some((s) => s.startsWith('b1:ami fuchka corner e chilam bro, ke sus?')),
    'Batched Gemini line must be emitted after its delay',
  );
});

test('redactSnapshotForPlayer masks isBot flags during active gameplay so clients cannot tell bots apart', () => {
  const players = makePlayers();
  const snapshot: RoomSnapshot = {
    roomCode: 'ADDA',
    phase: 'playing',
    meetingTimer: 0,
    discussionTimer: 0,
    meetingCallerId: null,
    meetingReason: null,
    players,
    bodies: [],
    footprints: [],
    sabotage: createEmptySabotageState(),
    doorLocks: makeEmptyDoorLocks(),
    chat: [],
    lobbyChat: [],
    lobbyCountdownSec: null,
    ejection: null,
    outcome: null,
    taskProgress: 0,
    totalTasks: 20,
    completedTasks: 0,
    emergencyCooldownRemaining: 10,
    netaRevealedId: null,
    prankedLampUntil: 0,
    commsJammedUntil: 0,
    ghotokLinkedIds: null,
    settings: DEFAULT_ROOM_SETTINGS,
    typingPlayerIds: ['b1'],
  };

  const redacted = redactSnapshotForPlayer(snapshot, 'p_human');
  for (const p of redacted.players) {
    assert.equal(p.isBot, false, `Player ${p.id} must not expose isBot during playing phase`);
    assert.ok((p.pingMs ?? 0) >= 20, 'Ping should look realistic across all players');
  }
});

test('bots do not blindly pile all votes onto one suspect from a single unproven chat accusation', () => {
  const players = makePlayers();
  const bodies: BodyMarker[] = [
    {
      id: 'body1',
      victimId: 'p_human',
      victimName: 'Lal Mia',
      color: 'lal',
      x: 20,
      z: 20,
      reported: true,
      killedAt: 5000,
      killerColorHint: 'সবুজ',
      killerZoneHint: 'রাস্তার মোড়',
    },
  ];

  const brains = new Map<string, BotBrainState>();
  const personalities: Array<BotBrainState['personality']> = ['follower', 'skeptic', 'chill', 'paranoid'];
  let idx = 0;
  for (const p of players) {
    if (!p.isBot) continue;
    const br = createBotBrainState(makeRng(10 + idx));
    br.personality = personalities[idx % personalities.length];
    brains.set(p.id, br);
    idx++;
  }

  // Only ONE weak rumor accusing Babu Bhai without first-hand witness proof
  processChatMessageForBots({
    msg: {
      id: 'weak_1',
      senderId: 'b1',
      senderName: 'Chacha Miah',
      senderColor: 'holud',
      text: 'আমার তো বাবু ভাইকে সন্দেহ লাগতেছে',
      timestamp: 9000,
    },
    players,
    brains,
    rng: () => 0.4,
  });

  const votes = new Map<string, number>();
  const r = makeRng(99);
  for (const p of players) {
    if (!p.isBot || !p.alive) continue;
    const v = decideBotVote({ bot: p, brain: brains.get(p.id)!, players, bodies, rng: r });
    votes.set(v, (votes.get(v) ?? 0) + 1);
  }

  const maxOnOneTarget = Math.max(...Array.from(votes.entries()).filter(([k]) => k !== 'skip').map(([, c]) => c), 0);
  assert.ok(maxOnOneTarget < 4, `Expected bots to split/skip rather than unanimous 4/4 pile-on (got ${maxOnOneTarget})`);
  assert.ok((votes.get('skip') ?? 0) >= 1, 'Expected cautious/skeptic bots to skip on a single unproven rumor');
});

test('applyBatchedGeminiReactionChats schedules 1-3 safe staggered replies and suspectName updates', () => {
  const players = makePlayers();
  const brains = new Map<string, BotBrainState>();
  for (const p of players) {
    if (p.isBot) {
      const br = createBotBrainState(makeRng(12));
      br.meetingElapsedSec = 4.0;
      brains.set(p.id, br);
    }
  }

  // Mark b2 as actively typing so it is skipped without interruption
  brains.get('b2')!.isTypingInMeeting = true;

  const payload = buildBatchedGeminiMeetingPayload({
    roomCode: 'TEST',
    players,
    bodies: [],
    brains,
    chat: [],
    meetingReason: 'emergency',
    meetingCallerId: 'p_human',
    phase: 'reaction',
  });
  assert.equal(payload.phase, 'reaction');
  assert.equal(JSON.stringify(payload).includes('isBot'), false);

  applyBatchedGeminiReactionChats({
    replies: [
      { botId: 'b1', text: 'বাবুকে গ্যারেজে দেখছি তো একটু আগে!', delaySec: 2.0, suspectName: 'Babu Bhai' },
      { botId: 'b2', text: 'এইটা স্কিপ করা উচিত', delaySec: 2.5 },
      { botId: 'b4', text: 'সত্যি বলতে আমিও সন্দেহ করতেছি', delaySec: 3.1, suspectName: 'Babu' },
    ],
    players,
    brains,
    rng: makeRng(55),
  });

  const b1 = brains.get('b1')!;
  const b2 = brains.get('b2')!;
  const b4 = brains.get('b4')!;

  assert.equal(b1.pendingChats.length, 1);
  assert.ok(b1.pendingChats[0].sendAtSec >= 5.6 && b1.pendingChats[0].sendAtSec <= 8.5);
  assert.ok((b1.suspicion['b2'] ?? 0) >= 1.1, 'Expected suspectName to increase suspicion');
  assert.equal(b2.pendingChats.length, 0, 'Typing bot should not be interrupted');
  assert.equal(b4.pendingChats.length, 1);
  assert.ok((b4.suspicion['b2'] ?? 0) >= 1.1);
});

test('stepBotsPlaying distributes 15-task selection beyond just the single closest station', () => {
  const players = makePlayers();
  assignMatchTasks(players, 15, makeRng(19));
  const brains = new Map<string, BotBrainState>();
  for (const p of players) {
    if (p.isBot) brains.set(p.id, createBotBrainState(makeRng(71)));
  }

  const chosenTasks = new Set<string>();
  const sab = createEmptySabotageState();
  const doors = makeEmptyDoorLocks();
  const holdingFixMap = new Map();

  for (let sample = 0; sample < 24; sample++) {
    const b1 = brains.get('b1')!;
    b1.activeTaskId = null;
    b1.pauseTimer = 0;
    stepBotsPlaying({
      players,
      bodies: [],
      sabotage: sab,
      doorLocks: doors,
      settings: { ...DEFAULT_ROOM_SETTINGS, tasksPerPlayer: 15 },
      holdingFixMap,
      brains,
      dt: 0.05,
      nowMs: 1000 + sample * 100,
      rng: makeRng(100 + sample),
    });
    if (b1.activeTaskId) chosenTasks.add(b1.activeTaskId);
  }

  assert.ok(chosenTasks.size >= 3, `Expected varied multi-zone task picking across runs, got ${chosenTasks.size}`);
});

