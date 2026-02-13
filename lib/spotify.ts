import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export type SpotifyApiError = {
  status: number;
  message: string;
};

function makeError(status: number, message: string): SpotifyApiError {
  return { status, message };
}

export async function getSpotifyAccessToken(): Promise<string> {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken as string | undefined;

  if (!accessToken) throw makeError(401, "Not authenticated");
  return accessToken;
}

export async function spotifyFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const accessToken = await getSpotifyAccessToken();

  const res = await fetch(`https://api.spotify.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Spotify API error (${res.status})`;
    try {
      const data = await res.json();
      message = data?.error?.message ?? message;
    } catch {}
    throw makeError(res.status, message);
  }

  return (await res.json()) as T;
}
