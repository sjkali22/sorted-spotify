import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type SessionWithAccessToken = {
  accessToken?: string;
};

type ErrorBody = {
  error?: {
    message?: string;
  };
  message?: string;
};

export type SpotifyApiError = {
  status: number;
  message: string;
  retryAfter?: number;
};

function makeError(status: number, message: string, retryAfter?: number): SpotifyApiError {
  const err: SpotifyApiError = { status, message };
  if (status === 429 && typeof retryAfter === "number" && Number.isFinite(retryAfter) && retryAfter > 0) {
    err.retryAfter = Math.floor(retryAfter);
  }
  return err;
}

export function isSpotifyApiError(error: unknown): error is SpotifyApiError {
  if (!error || typeof error !== "object") return false;

  const candidate = error as Partial<SpotifyApiError>;
  return typeof candidate.status === "number" && typeof candidate.message === "string";
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

async function safeJson(res: Response): Promise<unknown> {
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

function getErrorMessage(data: unknown, status: number) {
  if (!data || typeof data !== "object") {
    return `Spotify API error (${status})`;
  }

  const body = data as ErrorBody;
  return body.error?.message ?? body.message ?? `Spotify API error (${status})`;
}

function getThrownMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "";
}

export async function getSpotifyAccessToken(): Promise<string> {
  const session = (await getServerSession(authOptions)) as SessionWithAccessToken | null;
  const accessToken = session?.accessToken;
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
  } catch (error: unknown) {
    const message = getThrownMessage(error);
    throw makeError(502, `Failed to reach Spotify API${message ? `: ${message}` : ""}`);
  }

  if (res.status === 429) {
    const retryAfter = parseRetryAfterSeconds(res) ?? 30;
    throw makeError(429, "Spotify rate limit reached", retryAfter);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await safeJson(res);

  if (!res.ok) {
    throw makeError(res.status, getErrorMessage(data, res.status));
  }

  return data as T;
}
