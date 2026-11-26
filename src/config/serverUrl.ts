export interface ResolvedServerConfig {
  apiBaseUrl: string;
  wsUrl: string;
}

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Resolves the REST API base URL and WebSocket `/ws` endpoint.
 * Priority:
 *  1. `configuredUrl` (typically `import.meta.env.VITE_SERVER_URL`, e.g. for Cloudflare Pages -> external Node/WS host)
 *  2. Same-origin fallback (`location.protocol` + `location.host`) for unified hosting or Cloudflare Tunnel
 */
export function resolveServerConfig(
  configuredUrl: string | undefined,
  locationLike?: { protocol: string; host: string },
  roomCode?: string,
): ResolvedServerConfig {
  const cleanRoom = roomCode?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') ?? '';
  const wsQuery = cleanRoom ? `?room=${encodeURIComponent(cleanRoom)}` : '';
  const trimmed = configuredUrl?.trim() ?? '';
  if (trimmed) {
    const clean = stripTrailingSlashes(trimmed);
    const hasScheme = /^https?:\/\//i.test(clean);
    const normalizedHttp = hasScheme ? clean : `https://${clean}`;
    const wsUrl = `${normalizedHttp.replace(/^http/i, 'ws')}/ws${wsQuery}`;
    return {
      apiBaseUrl: normalizedHttp,
      wsUrl,
    };
  }

  const proto = locationLike?.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = locationLike?.host || 'localhost:3000';
  return {
    apiBaseUrl: '',
    wsUrl: `${proto}//${host}/ws${wsQuery}`,
  };
}

export function getServerConfig(roomCode?: string): ResolvedServerConfig {
  const envUrl =
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SERVER_URL;
  const loc = typeof window !== 'undefined' ? window.location : undefined;
  return resolveServerConfig(envUrl, loc, roomCode);
}

export function getApiUrl(path: string): string {
  const { apiBaseUrl } = getServerConfig();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
}

export function getWebSocketUrl(roomCode?: string): string {
  return getServerConfig(roomCode).wsUrl;
}
