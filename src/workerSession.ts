import type { ClientMessage, PublicRoomSummary, ServerMessage } from './shared/types';
import { P2PHostRoomEngine, normalizeRoomCode } from './game/p2pHostEngine';

export interface WorkerSocketLike {
  send: (data: string) => void;
  close?: (code?: number, reason?: string) => void;
}

export interface DirectoryEntry extends PublicRoomSummary {
  updatedAt: number;
}

const DIRECTORY_TTL_MS = 120_000;

export class RoomDirectoryRegistry {
  private entries = new Map<string, DirectoryEntry>();

  public upsert(summary: PublicRoomSummary, nowMs = Date.now()): void {
    const code = normalizeRoomCode(summary.roomCode);
    if (!code) return;
    this.entries.set(code, {
      ...summary,
      roomCode: code,
      updatedAt: nowMs,
    });
  }

  public remove(roomCode: string): void {
    const code = normalizeRoomCode(roomCode);
    if (!code) return;
    this.entries.delete(code);
  }

  public listActive(nowMs = Date.now()): PublicRoomSummary[] {
    const out: PublicRoomSummary[] = [];
    for (const [code, entry] of this.entries.entries()) {
      if (nowMs - entry.updatedAt > DIRECTORY_TTL_MS) {
        this.entries.delete(code);
        continue;
      }
      if (entry.phase === 'lobby' && entry.playerCount < entry.maxPlayers) {
        out.push({
          roomCode: entry.roomCode,
          hostName: entry.hostName,
          playerCount: entry.playerCount,
          maxPlayers: entry.maxPlayers,
          phase: entry.phase,
        });
      }
    }
    return out;
  }
}

export interface WorkerRoomSessionHooks {
  onStartTick?: () => void;
  onStopTick?: () => void;
  onDirectorySync?: (summary: PublicRoomSummary | null) => void;
  onRequestRoomList?: (clientId: string) => void;
}

export class WorkerRoomSession {
  public readonly roomCode: string;
  private sockets = new Map<string, WorkerSocketLike>();
  private engine: P2PHostRoomEngine | null = null;
  private hooks: WorkerRoomSessionHooks;
  private lastDirSyncKey = '';

  constructor(roomCode: string, hooks: WorkerRoomSessionHooks = {}) {
    this.roomCode = normalizeRoomCode(roomCode) || 'MOHOLLA';
    this.hooks = hooks;
  }

  public getEngine(): P2PHostRoomEngine | null {
    return this.engine;
  }

  public getSocketCount(): number {
    return this.sockets.size;
  }

  public sendToClient(clientId: string, msg: ServerMessage): void {
    const sock = this.sockets.get(clientId);
    if (!sock) return;
    try {
      sock.send(JSON.stringify(msg));
    } catch {
      this.detachClient(clientId);
    }
  }

  public broadcast(msg: ServerMessage): void {
    const raw = JSON.stringify(msg);
    for (const [cid, sock] of Array.from(this.sockets.entries())) {
      try {
        sock.send(raw);
      } catch {
        this.detachClient(cid);
      }
    }
  }

  public attachClient(clientId: string, socket: WorkerSocketLike): void {
    this.sockets.set(clientId, socket);
  }

  public detachClient(clientId: string): void {
    const hadSocket = this.sockets.delete(clientId);
    if (!hadSocket && !this.engine) return;

    this.engine?.removeClient(clientId);
    if (!this.engine || !this.engine.hasHumanClients() || this.sockets.size === 0) {
      this.engine = null;
      this.lastDirSyncKey = '';
      this.hooks.onStopTick?.();
      this.hooks.onDirectorySync?.(null);
      return;
    }

    this.syncDirectory(true);
  }

  public handleRawMessage(clientId: string, raw: string): void {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
      return;
    }

    if (msg.type === 'room:list') {
      this.hooks.onRequestRoomList?.(clientId);
      return;
    }

    if (msg.type === 'room:create') {
      if (this.engine && this.engine.hasHumanClients()) {
        this.sendToClient(clientId, {
          type: 'room:error',
          message: `রুম "${this.roomCode}" আগে থেকেই চালু আছে। নতুন কোড তৈরি হচ্ছে...`,
        });
        return;
      }

      this.engine = new P2PHostRoomEngine(this.roomCode, {
        sendToClient: (targetId, out) => this.sendToClient(targetId, out),
        broadcast: (out) => this.broadcast(out),
      });
      this.engine.addClient(clientId, msg.name, msg.color, true);
      this.hooks.onStartTick?.();
      this.syncDirectory(true);
      return;
    }

    if (msg.type === 'room:join') {
      if (!this.engine || !this.engine.hasHumanClients()) {
        this.sendToClient(clientId, {
          type: 'room:error',
          message: `এই কোডে কোনো রুম পাওয়া যায়নি (${normalizeRoomCode(msg.roomCode) || this.roomCode} খুঁজে পাওয়া যায়নি বা হোস্ট অফলাইন)।`,
        });
        return;
      }
      this.engine.handleMessage(clientId, msg);
      this.syncDirectory(true);
      return;
    }

    if (!this.engine) return;
    this.engine.handleMessage(clientId, msg);

    if (
      msg.type === 'lobby:add_bot' ||
      msg.type === 'lobby:remove_bot' ||
      msg.type === 'lobby:remove_bots' ||
      msg.type === 'lobby:customize' ||
      msg.type === 'lobby:ready' ||
      msg.type === 'lobby:kick' ||
      msg.type === 'lobby:start' ||
      msg.type === 'lobby:cancel_start' ||
      msg.type === 'room:play_again'
    ) {
      this.syncDirectory(false);
    }
  }

  public tick(dt = 0.05): void {
    if (!this.engine) return;
    this.engine.step(dt);
    this.syncDirectory(false);
  }

  private syncDirectory(force: boolean): void {
    if (!this.engine || !this.engine.hasHumanClients()) return;
    const summary = this.engine.getRoomSummary();
    const key = `${summary.roomCode}:${summary.hostName}:${summary.playerCount}:${summary.phase}`;
    if (force || key !== this.lastDirSyncKey) {
      this.lastDirSyncKey = key;
      this.hooks.onDirectorySync?.(summary);
    }
  }
}
