import { useCallback, useEffect, useRef, useState } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import type {
  ClientMessage,
  PlayerColorId,
  PublicRoomSummary,
  RoomSnapshot,
  ServerMessage,
} from '../shared/types';
import { soundEngine, type MemeSoundId } from '../audio/soundEngine';
import { syncServerMemePack } from '../audio/memePackStore';
import { getApiUrl, getWebSocketUrl } from '../config/serverUrl';
import {
  P2PHostRoomEngine,
  buildPeerIdForRoomCode,
  generateP2PRoomCode,
  normalizeRoomCode,
} from './p2pHostEngine';

const HOST_LOCAL_CLIENT_ID = 'p2p_host_local';
const MAX_DC_BUFFERED_BYTES = 1_048_576;

type BackendTransportMode = 'express' | 'cloudflare-do' | 'p2p';

export function buildIceServers(envVars?: Record<string, string | undefined>): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:80?transport=tcp',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ];

  const customUrl = envVars?.VITE_TURN_URL?.trim();
  if (customUrl) {
    servers.unshift({
      urls: customUrl,
      username: envVars?.VITE_TURN_USER?.trim() || undefined,
      credential: envVars?.VITE_TURN_PASS?.trim() || undefined,
    });
  }
  return servers;
}

function getRuntimeIceServers(): RTCIceServer[] {
  const envVars = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return buildIceServers(envVars);
}

export function useMultiplayerClient(
  onShake?: (amount: number) => void,
  onClueNotice?: (title: string, detail: string) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const hostConnsRef = useRef<Map<string, DataConnection>>(new Map());
  const guestConnRef = useRef<DataConnection | null>(null);
  const hostEngineRef = useRef<P2PHostRoomEngine | null>(null);
  const hostTickRef = useRef<number | null>(null);

  const confirmedBackendRef = useRef<'express' | 'cloudflare-do' | null>(null);
  const inFlightCheckRef = useRef<Promise<BackendTransportMode> | null>(null);
  const activeWsUrlRef = useRef<string | null>(null);
  const intentionallyClosingSocketsRef = useRef<WeakSet<WebSocket>>(new WeakSet());
  const pendingRoomRetryRef = useRef<(() => void) | null>(null);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const snapshotRef = useRef<RoomSnapshot | null>(null);
  snapshotRef.current = snapshot;
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;
  const onClueNoticeRef = useRef(onClueNotice);
  onClueNoticeRef.current = onClueNotice;

  const closeCurrentWs = useCallback(() => {
    const existing = wsRef.current;
    if (existing) {
      intentionallyClosingSocketsRef.current.add(existing);
      wsRef.current = null;
      activeWsUrlRef.current = null;
      try {
        existing.close();
      } catch {
        // ignore close error
      }
    }
  }, []);

  const reconnectTokenRef = useRef<string | null>(null);
  const cleanupP2PRef = useRef<(() => void) | null>(null);
  const closeCurrentWsRef = useRef<(() => void) | null>(null);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    if (msg.type === 'room:joined') {
      pendingRoomRetryRef.current = null;
      if (msg.reconnectToken) {
        reconnectTokenRef.current = msg.reconnectToken;
      }
      setLocalPlayerId(msg.playerId);
      setSnapshot(msg.snapshot);
      setConnecting(false);
      setConnected(true);
      setErrorMsg(null);
    } else if (msg.type === 'room:state') {
      setSnapshot(msg.snapshot);
    } else if (msg.type === 'room:list_result') {
      setPublicRooms(msg.rooms);
    } else if (msg.type === 'room:kicked') {
      pendingRoomRetryRef.current = null;
      reconnectTokenRef.current = null;
      closeCurrentWsRef.current?.();
      cleanupP2PRef.current?.();
      setLocalPlayerId(null);
      setSnapshot(null);
      setConnected(false);
      setConnecting(false);
      setErrorMsg(msg.message || 'হোস্ট তোমাকে রুম থেকে বের করে দিয়েছে।');
    } else if (msg.type === 'room:error') {
      if (pendingRoomRetryRef.current && /already active|আগে থেকেই/i.test(msg.message)) {
        const retry = pendingRoomRetryRef.current;
        pendingRoomRetryRef.current = null;
        retry();
        return;
      }
      pendingRoomRetryRef.current = null;
      setConnecting(false);
      setErrorMsg(msg.message);
    } else if (msg.type === 'clue:result') {
      soundEngine.playClueScan();
      onClueNoticeRef.current?.(msg.title, msg.detail);
    } else if (msg.type === 'meme:play') {
      soundEngine.playMeme(msg.memeId as MemeSoundId);
    } else if (msg.type === 'memes:updated') {
      soundEngine.invalidateDecodedSlot();
      void syncServerMemePack();
    } else if (msg.type === 'sfx:event') {
      if (msg.kind === 'kill') {
        soundEngine.playKill();
        onShakeRef.current?.(0.7);
      } else if (msg.kind === 'report') {
        soundEngine.playMeetingBell('body');
        onShakeRef.current?.(0.5);
      } else if (msg.kind === 'meeting') {
        soundEngine.playMeetingBell('emergency');
        onShakeRef.current?.(0.45);
      } else if (msg.kind === 'sabotage' || msg.kind === 'sabotage_critical') {
        soundEngine.playSabotage();
        onShakeRef.current?.(0.5);
      } else if (msg.kind === 'task') {
        soundEngine.playTaskComplete();
      } else if (msg.kind === 'vent') {
        soundEngine.playVent();
      } else if (msg.kind === 'eject') {
        soundEngine.playEjectBuildup();
      } else if (msg.kind === 'door') {
        soundEngine.playDoorSlam();
        onShakeRef.current?.(0.35);
      } else if (msg.kind === 'shield') {
        soundEngine.playShieldBlock();
        onShakeRef.current?.(0.3);
      } else if (msg.kind === 'disguise') {
        soundEngine.playDisguise();
      } else if (msg.kind === 'daroga') {
        soundEngine.playDarogaShot();
        onShakeRef.current?.(0.6);
      } else if (msg.kind === 'clean') {
        soundEngine.playCleanBody();
      } else if (msg.kind === 'revive') {
        soundEngine.playRevive();
        onShakeRef.current?.(0.25);
      } else if (msg.kind === 'clue') {
        soundEngine.playClueScan();
      } else if (msg.kind === 'prank') {
        soundEngine.playDisguise();
      } else if (msg.kind === 'lobby_join') {
        soundEngine.playLobbyJoin(false);
      } else if (msg.kind === 'lobby_ready') {
        soundEngine.playLobbyReady(true);
      } else if (msg.kind === 'lobby_tick') {
        soundEngine.playLobbyTick();
      } else if (msg.kind === 'lobby_start') {
        soundEngine.playStartWhoosh();
      } else if (msg.kind === 'vehicle_horn') {
        soundEngine.playVehicleHorn(msg.vehicleKind ?? 'car');
      }
    }
  }, []);

  const cleanupP2P = useCallback(() => {
    if (hostTickRef.current !== null) {
      window.clearInterval(hostTickRef.current);
      hostTickRef.current = null;
    }
    hostEngineRef.current = null;
    guestConnRef.current?.close();
    guestConnRef.current = null;
    for (const c of hostConnsRef.current.values()) {
      c.close();
    }
    hostConnsRef.current.clear();
    peerRef.current?.destroy();
    peerRef.current = null;
  }, []);

  closeCurrentWsRef.current = closeCurrentWs;
  cleanupP2PRef.current = cleanupP2P;

  const detectBackendMode = useCallback(async (): Promise<BackendTransportMode> => {
    if (confirmedBackendRef.current) return confirmedBackendRef.current;
    if (inFlightCheckRef.current) return inFlightCheckRef.current;

    inFlightCheckRef.current = (async () => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 2200);
      try {
        const res = await fetch(getApiUrl('/api/health'), {
          cache: 'no-store',
          signal: controller.signal,
        });
        const ct = res.headers.get('content-type') ?? '';
        if (!res.ok || !ct.includes('application/json')) {
          return 'p2p';
        }
        const payload = (await res.json()) as { ok?: boolean; mode?: string };
        if (payload?.mode === 'cloudflare-do') {
          confirmedBackendRef.current = 'cloudflare-do';
          return 'cloudflare-do';
        }
        if (payload?.ok) {
          confirmedBackendRef.current = 'express';
          return 'express';
        }
        return 'p2p';
      } catch {
        return 'p2p';
      } finally {
        window.clearTimeout(timer);
        inFlightCheckRef.current = null;
      }
    })();

    return inFlightCheckRef.current;
  }, []);

  const openWsAtUrl = useCallback(
    (targetUrl: string, onOpenPayload?: ClientMessage, forceNew = false) => {
      if (
        !forceNew &&
        wsRef.current &&
        activeWsUrlRef.current === targetUrl &&
        (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        if (onOpenPayload) {
          if (wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(onOpenPayload));
          } else {
            wsRef.current.addEventListener(
              'open',
              () => {
                wsRef.current?.send(JSON.stringify(onOpenPayload));
              },
              { once: true },
            );
          }
        }
        return wsRef.current;
      }

      closeCurrentWs();
      const ws = new WebSocket(targetUrl);
      activeWsUrlRef.current = targetUrl;
      wsRef.current = ws;

      ws.onopen = () => {
        if (wsRef.current !== ws) return;
        setConnected(true);
        setErrorMsg(null);
        if (onOpenPayload) {
          ws.send(JSON.stringify(onOpenPayload));
        } else {
          ws.send(JSON.stringify({ type: 'room:list' }));
        }
        void syncServerMemePack();
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
          activeWsUrlRef.current = null;
        }
        if (intentionallyClosingSocketsRef.current.has(ws)) return;
        setConnected(false);
        setConnecting(false);
        if (snapshotRef.current) {
          setErrorMsg('সংযোগ বিচ্ছিন্ন হয়েছে। রুম কোড দিয়ে আবার ঢোকো অথবা টাইটেলে ফিরে যাও।');
        }
      };

      ws.onerror = () => {
        if (intentionallyClosingSocketsRef.current.has(ws)) return;
        setConnecting(false);
        setErrorMsg('মাল্টিপ্লেয়ার সার্ভারে সংযোগ করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করো।');
      };

      ws.onmessage = (ev) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(String(ev.data)) as ServerMessage;
        } catch {
          return;
        }
        handleServerMessage(msg);
      };

      return ws;
    },
    [closeCurrentWs, handleServerMessage],
  );

  const connectWs = useCallback(() => {
    return openWsAtUrl(getWebSocketUrl());
  }, [openWsAtUrl]);

  useEffect(() => {
    return () => {
      closeCurrentWs();
      cleanupP2P();
    };
  }, [cleanupP2P, closeCurrentWs]);

  const startP2PHostRoom = useCallback(
    (name: string, color: PlayerColorId, attempt = 0) => {
      cleanupP2P();
      closeCurrentWs();
      setConnecting(true);
      const code = generateP2PRoomCode(5);
      const peer = new Peer(buildPeerIdForRoomCode(code), {
        debug: 0,
        config: {
          iceServers: getRuntimeIceServers(),
          iceCandidatePoolSize: 4,
        },
      });
      peerRef.current = peer;

      const engine = new P2PHostRoomEngine(code, {
        sendToClient: (clientId, msg) => {
          if (clientId === HOST_LOCAL_CLIENT_ID) {
            handleServerMessage(msg);
            return;
          }
          const conn = hostConnsRef.current.get(clientId);
          if (conn && conn.open && (conn.dataChannel?.bufferedAmount ?? 0) < MAX_DC_BUFFERED_BYTES) {
            conn.send(msg);
          }
        },
        broadcast: (msg) => {
          handleServerMessage(msg);
          for (const conn of hostConnsRef.current.values()) {
            if (conn.open && (conn.dataChannel?.bufferedAmount ?? 0) < MAX_DC_BUFFERED_BYTES) {
              conn.send(msg);
            }
          }
        },
      });
      hostEngineRef.current = engine;

      peer.on('open', () => {
        if (peerRef.current !== peer) return;
        engine.addClient(HOST_LOCAL_CLIENT_ID, name, color, true);
        let lastHostTick = performance.now();
        hostTickRef.current = window.setInterval(() => {
          const now = performance.now();
          const dt = Math.min(0.5, Math.max(0.016, (now - lastHostTick) / 1000));
          lastHostTick = now;
          hostEngineRef.current?.step(dt);
        }, 50);
      });

      peer.on('disconnected', () => {
        if (peerRef.current === peer && !peer.destroyed) {
          try {
            peer.reconnect();
          } catch {
            // ignore reconnect error
          }
        }
      });

      peer.on('connection', (conn) => {
        const clientId = `peer_${conn.peer}_${Math.random().toString(36).slice(2, 5)}`;
        hostConnsRef.current.set(clientId, conn);

        conn.on('data', (raw) => {
          let payload = raw as ClientMessage;
          if (typeof raw === 'string') {
            try {
              payload = JSON.parse(raw) as ClientMessage;
            } catch {
              return;
            }
          }
          if (payload && typeof payload === 'object' && 'type' in payload) {
            engine.handleMessage(clientId, payload);
          }
        });

        conn.on('close', () => {
          hostConnsRef.current.delete(clientId);
          engine.removeClient(clientId);
        });
      });

      peer.on('error', (err) => {
        if (err?.type === 'unavailable-id' && attempt < 3) {
          startP2PHostRoom(name, color, attempt + 1);
          return;
        }
        setConnecting(false);
        setErrorMsg('রুম কোড নেটওয়ার্ক চালু করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করো।');
      });
    },
    [cleanupP2P, closeCurrentWs, handleServerMessage],
  );

  const joinP2PRoom = useCallback(
    (roomCode: string, name: string, color: PlayerColorId) => {
      cleanupP2P();
      closeCurrentWs();
      const cleanCode = normalizeRoomCode(roomCode);
      if (cleanCode.length < 3) {
        setConnecting(false);
        setErrorMsg('সঠিক রুম কোড লিখো।');
        return;
      }
      setConnecting(true);
      const peer = new Peer({
        debug: 0,
        config: {
          iceServers: getRuntimeIceServers(),
          iceCandidatePoolSize: 4,
        },
      });
      peerRef.current = peer;

      const joinTimeout = window.setTimeout(() => {
        if (!guestConnRef.current?.open) {
          setConnecting(false);
          setErrorMsg(`রুম "${cleanCode}" পাওয়া যায়নি অথবা হোস্টের নেটওয়ার্ক সরাসরি সংযোগ ব্লক করেছে।`);
          cleanupP2P();
        }
      }, 15000);

      peer.on('open', () => {
        if (peerRef.current !== peer) return;
        const conn = peer.connect(buildPeerIdForRoomCode(cleanCode), { reliable: true });
        guestConnRef.current = conn;

        conn.on('open', () => {
          window.clearTimeout(joinTimeout);
          conn.send({
            type: 'room:join',
            roomCode: cleanCode,
            name,
            color,
            reconnectToken: reconnectTokenRef.current ?? undefined,
          } satisfies ClientMessage);
        });

        conn.on('data', (raw) => {
          let msg = raw as ServerMessage;
          if (typeof raw === 'string') {
            try {
              msg = JSON.parse(raw) as ServerMessage;
            } catch {
              return;
            }
          }
          if (msg && typeof msg === 'object' && 'type' in msg) {
            handleServerMessage(msg);
          }
        });

        conn.on('close', () => {
          window.clearTimeout(joinTimeout);
          setConnected(false);
          setConnecting(false);
          setErrorMsg('হোস্ট চলে গেছে — রুম বন্ধ হয়ে গেছে।');
        });

        conn.on('error', () => {
          window.clearTimeout(joinTimeout);
          setConnecting(false);
          setErrorMsg(`এই কোডে কোনো রুম পাওয়া যায়নি (${cleanCode})।`);
        });
      });

      peer.on('error', () => {
        window.clearTimeout(joinTimeout);
        setConnecting(false);
        setErrorMsg(`এই কোডে কোনো রুম পাওয়া যায়নি (${cleanCode}) অথবা হোস্ট অফলাইন।`);
      });
    },
    [cleanupP2P, closeCurrentWs, handleServerMessage],
  );

  const send = useCallback(
    (payload: ClientMessage) => {
      if (hostEngineRef.current) {
        hostEngineRef.current.handleMessage(HOST_LOCAL_CLIENT_ID, payload);
        return;
      }
      if (guestConnRef.current) {
        if (guestConnRef.current.open) {
          guestConnRef.current.send(payload);
        }
        return;
      }
      const ws = wsRef.current;
      if (ws) {
        const isFrequentTransform =
          payload.type === 'player:move' || payload.type === 'player:vehicle_drive';
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(payload));
        } else if (ws.readyState === WebSocket.CONNECTING && !isFrequentTransform) {
          ws.addEventListener(
            'open',
            () => {
              ws.send(JSON.stringify(payload));
            },
            { once: true },
          );
        }
        return;
      }

      if (
        confirmedBackendRef.current === 'express' &&
        payload.type !== 'player:move' &&
        payload.type !== 'player:vehicle_drive'
      ) {
        openWsAtUrl(getWebSocketUrl(), payload);
      }
    },
    [openWsAtUrl],
  );

  const createCloudflareRoom = useCallback(
    (name: string, color: PlayerColorId, attempt = 0) => {
      cleanupP2P();
      const code = generateP2PRoomCode(5);
      pendingRoomRetryRef.current =
        attempt < 2 ? () => createCloudflareRoom(name, color, attempt + 1) : null;
      openWsAtUrl(getWebSocketUrl(code), { type: 'room:create', name, color }, true);
    },
    [cleanupP2P, openWsAtUrl],
  );

  const createRoom = useCallback(
    (name: string, color: PlayerColorId) => {
      setErrorMsg(null);
      setConnecting(true);
      void detectBackendMode().then((mode) => {
        if (mode === 'cloudflare-do') {
          createCloudflareRoom(name, color);
        } else if (mode === 'express') {
          cleanupP2P();
          openWsAtUrl(getWebSocketUrl(), { type: 'room:create', name, color });
        } else {
          startP2PHostRoom(name, color);
        }
      });
    },
    [cleanupP2P, createCloudflareRoom, detectBackendMode, openWsAtUrl, startP2PHostRoom],
  );

  const joinRoom = useCallback(
    (roomCode: string, name: string, color: PlayerColorId) => {
      const cleanCode = normalizeRoomCode(roomCode);
      if (cleanCode.length < 3) {
        setConnecting(false);
        setErrorMsg('সঠিক রুম কোড লিখো।');
        return;
      }
      setErrorMsg(null);
      setConnecting(true);
      void detectBackendMode().then((mode) => {
        if (mode === 'cloudflare-do') {
          cleanupP2P();
          pendingRoomRetryRef.current = null;
          openWsAtUrl(
            getWebSocketUrl(cleanCode),
            {
              type: 'room:join',
              roomCode: cleanCode,
              name,
              color,
              reconnectToken: reconnectTokenRef.current ?? undefined,
            },
            true,
          );
        } else if (mode === 'express') {
          cleanupP2P();
          openWsAtUrl(getWebSocketUrl(), {
            type: 'room:join',
            roomCode: cleanCode,
            name,
            color,
            reconnectToken: reconnectTokenRef.current ?? undefined,
          });
        } else {
          joinP2PRoom(cleanCode, name, color);
        }
      });
    },
    [cleanupP2P, detectBackendMode, joinP2PRoom, openWsAtUrl],
  );

  const refreshRooms = useCallback(() => {
    void detectBackendMode().then(async (mode) => {
      if (mode === 'cloudflare-do') {
        try {
          const res = await fetch(getApiUrl('/api/rooms'), { cache: 'no-store' });
          if (res.ok) {
            const data = (await res.json()) as { rooms?: PublicRoomSummary[] };
            setPublicRooms(Array.isArray(data.rooms) ? data.rooms : []);
          }
        } catch {
          // ignore transient refresh failure
        }
      } else if (mode === 'express') {
        openWsAtUrl(getWebSocketUrl(), { type: 'room:list' });
      }
    });
  }, [detectBackendMode, openWsAtUrl]);

  const disconnectRoom = useCallback(() => {
    send({ type: 'room:leave' });
    reconnectTokenRef.current = null;
    pendingRoomRetryRef.current = null;
    closeCurrentWs();
    cleanupP2P();
    setLocalPlayerId(null);
    setSnapshot(null);
    setConnected(false);
    setConnecting(false);
  }, [cleanupP2P, closeCurrentWs, send]);

  return {
    connected,
    connecting,
    localPlayerId,
    snapshot,
    publicRooms,
    errorMsg,
    clearError: () => setErrorMsg(null),
    connect: connectWs,
    send,
    createRoom,
    joinRoom,
    refreshRooms,
    disconnectRoom,
  };
}
