import type { PublicRoomSummary } from './src/shared/types';
import { normalizeRoomCode } from './src/game/p2pHostEngine';
import { RoomDirectoryRegistry, WorkerRoomSession } from './src/workerSession';

interface CFWebSocket {
  accept(): void;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: 'message' | 'close' | 'error', listener: (ev: { data?: unknown }) => void): void;
}

declare const WebSocketPair: {
  new (): { 0: CFWebSocket; 1: CFWebSocket };
};

interface CFDurableObjectId {
  toString(): string;
}

interface CFDurableObjectStub {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

interface CFDurableObjectNamespace {
  idFromName(name: string): CFDurableObjectId;
  get(id: CFDurableObjectId): CFDurableObjectStub;
}

interface CFDurableObjectState {
  id: CFDurableObjectId;
  waitUntil(promise: Promise<unknown>): void;
}

interface CFAssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface CFEnv {
  ASSETS: CFAssetsFetcher;
  MOHOLLA_ROOM: CFDurableObjectNamespace;
}

interface CFExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-passcode',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
    },
  });
}

export class MohollaRoomDO {
  private state: CFDurableObjectState;
  private env: CFEnv;
  private directory = new RoomDirectoryRegistry();
  private session: WorkerRoomSession | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastSummary: PublicRoomSummary | null = null;

  constructor(state: CFDurableObjectState, env: CFEnv) {
    this.state = state;
    this.env = env;
  }

  private getDirectoryStub(): CFDurableObjectStub {
    const id = this.env.MOHOLLA_ROOM.idFromName('__DIRECTORY__');
    return this.env.MOHOLLA_ROOM.get(id);
  }

  private pushDirectoryUpdate(roomCode: string, summary: PublicRoomSummary | null): void {
    this.lastSummary = summary;
    const stub = this.getDirectoryStub();
    const op = summary
      ? stub.fetch('https://do/directory/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(summary),
        })
      : stub.fetch(`https://do/directory/remove?room=${encodeURIComponent(roomCode)}`, {
          method: 'POST',
        });
    this.state.waitUntil(op.catch(() => undefined));
  }

  private startLoops(roomCode: string): void {
    if (this.tickTimer === null) {
      let lastTickMs = Date.now();
      this.tickTimer = setInterval(() => {
        const nowMs = Date.now();
        const dt = Math.min(0.5, Math.max(0.016, (nowMs - lastTickMs) / 1000));
        lastTickMs = nowMs;
        this.session?.tick(dt);
      }, 50);
    }
    if (this.heartbeatTimer === null) {
      this.heartbeatTimer = setInterval(() => {
        if (this.lastSummary) {
          this.pushDirectoryUpdate(roomCode, this.lastSummary);
        }
      }, 30_000);
    }
  }

  private stopLoops(): void {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Internal singleton room directory endpoints
    if (url.pathname === '/directory/list') {
      return jsonResponse({ rooms: this.directory.listActive() });
    }
    if (url.pathname === '/directory/upsert' && request.method === 'POST') {
      try {
        const body = (await request.json()) as PublicRoomSummary;
        this.directory.upsert(body);
      } catch {
        // ignore invalid payload
      }
      return jsonResponse({ ok: true });
    }
    if (url.pathname === '/directory/remove') {
      const code = url.searchParams.get('room') ?? '';
      this.directory.remove(code);
      return jsonResponse({ ok: true });
    }

    // Room WebSocket endpoint
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const roomCode = normalizeRoomCode(
      url.searchParams.get('room') ?? request.headers.get('X-Room-Code') ?? 'MOHOLLA',
    );
    if (!this.session || this.session.roomCode !== roomCode) {
      this.stopLoops();
      this.session = new WorkerRoomSession(roomCode, {
        onStartTick: () => this.startLoops(roomCode),
        onStopTick: () => {
          this.stopLoops();
          this.lastSummary = null;
        },
        onDirectorySync: (summary) => this.pushDirectoryUpdate(roomCode, summary),
        onRequestRoomList: (targetClientId) => {
          const op = this.getDirectoryStub()
            .fetch('https://do/directory/list')
            .then(async (res) => {
              const data = (await res.json()) as { rooms?: PublicRoomSummary[] };
              this.session?.sendToClient(targetClientId, {
                type: 'room:list_result',
                rooms: data.rooms ?? [],
              });
            })
            .catch(() => {
              this.session?.sendToClient(targetClientId, { type: 'room:list_result', rooms: [] });
            });
          this.state.waitUntil(op);
        },
      });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    const clientId = `do_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const session = this.session;
    session.attachClient(clientId, server);

    server.addEventListener('message', (ev) => {
      if (typeof ev.data === 'string') {
        session.handleRawMessage(clientId, ev.data);
      }
    });

    server.addEventListener('close', () => {
      session.detachClient(clientId);
    });

    server.addEventListener('error', () => {
      session.detachClient(clientId);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as unknown as ResponseInit);
  }
}

export default {
  async fetch(request: Request, env: CFEnv, _ctx: CFExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return jsonResponse({ ok: true, mode: 'cloudflare-do' });
    }

    if (url.pathname === '/api/memes') {
      return jsonResponse({ requiresPin: false, clips: {} });
    }

    if (url.pathname === '/api/bot-meeting-chat' && request.method === 'POST') {
      return jsonResponse({ messages: [], fallback: true });
    }

    if (url.pathname === '/api/rooms') {
      const dirStub = env.MOHOLLA_ROOM.get(env.MOHOLLA_ROOM.idFromName('__DIRECTORY__'));
      return dirStub.fetch('https://do/directory/list');
    }

    if (url.pathname === '/ws' || url.pathname.startsWith('/ws/')) {
      const rawRoom =
        url.searchParams.get('room') ??
        (url.pathname.startsWith('/ws/') ? url.pathname.slice('/ws/'.length) : '') ??
        '';
      const roomCode = normalizeRoomCode(rawRoom) || 'LOBBY';
      const roomId = env.MOHOLLA_ROOM.idFromName(`room:${roomCode}`);
      const stub = env.MOHOLLA_ROOM.get(roomId);
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
