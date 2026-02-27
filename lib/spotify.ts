import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export type SpotifyApiError = {
  status: number;
  message: string;
  retryAfter?: number; // seconds (used for 429)
};

function makeError(status: number, message: string, retryAfter?: number): SpotifyApiError {
  const err: SpotifyApiError = { status, message };
  if (status === 429 && typeof retryAfter === "number" && Number.isFinite(retryAfter) && retryAfter > 0) {
    err.retryAfter = Math.floor(retryAfter);
  }
  return err;
}

export function isSpotifyApiError(e: unknown): e is SpotifyApiError {
  return (
    !!e &&
    typeof e === "object" &&
    typeof (e as any).status === "number" &&
    typeof (e as any).message === "string"
  );
}

function parseRetryAfterSeconds(res: Response): number | undefined {
  const ra = res.headers.get("retry-after");
  if (!ra) return undefined;

  const n = Number(ra);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);

  const t = Date.parse(ra);
  if (Number.isFinite(t)) {
    const diff = t - Date.now();
    if (diff > 0) return Math.ceil(diff / 1000);
  }

  return undefined;
}

async function safeJson(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    try {
      const text = await res.text();
      return text ? { message: text } : {};
    } catch {
      return {};
    }
  }

  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function getSpotifyAccessToken(): Promise<string> {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken as string | undefined;
  if (!accessToken) throw makeError(401, "Not authenticated");
  return accessToken;
}

export async function spotifyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await getSpotifyAccessToken();

  let res: Response;
  try {
    res = await fetch(`https://api.spotify.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (e: any) {
    // This is the key fix: network errors become a structured SpotifyApiError
    throw makeError(502, `Failed to reach Spotify API${e?.message ? `: ${e.message}` : ""}`);
  }

  if (res.status === 429) {
    const retryAfter = parseRetryAfterSeconds(res) ?? 30;
    throw makeError(429, "Spotify rate limit reached", retryAfter);
  }

  // Some Spotify endpoints return 204, but playlists should not. Still safe.
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const data = await safeJson(res);

  if (!res.ok) {
    const message = data?.error?.message ?? data?.message ?? `Spotify API error (${res.status})`;
    throw makeError(res.status, message);
  }

  return data as T;
}