import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function normalizePlaylistId(input: string | undefined) {
  if (!input) return null;

  const urlMatch = input.match(/open\.spotify\.com\/playlist\/([0-9A-Za-z]+)/);
  if (urlMatch?.[1]) return urlMatch[1];

  const uriMatch = input.match(/^spotify:playlist:([0-9A-Za-z]+)$/);
  if (uriMatch?.[1]) return uriMatch[1];

  if (/^[0-9A-Za-z]+$/.test(input)) return input;

  return null;
}

function getAccessToken(session: unknown): string | null {
  const s = session as
    | {
        accessToken?: string;
        user?: { accessToken?: string; token?: string };
        error?: string;
      }
    | undefined;

  return s?.accessToken ?? s?.user?.accessToken ?? s?.user?.token ?? null;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function spotifyFetchWithRetry(url: string, accessToken: string, maxRetries = 3) {
  let attempt = 0;

  while (true) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (res.status !== 429) return res;
    if (attempt >= maxRetries) return res;

    const retryAfter = Number(res.headers.get("retry-after") ?? "1");
    await sleep(Math.min(Math.max(retryAfter, 1), 10) * 1000);
    attempt += 1;
  }
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ playlistID: string }> }
) {
  const session = await getServerSession(authOptions);
  const accessToken = getAccessToken(session);

  if (!session || !accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if ((session as { error?: string }).error) {
    return NextResponse.json(
      { error: "Auth token refresh failed. Please sign out and sign in again." },
      { status: 401 }
    );
  }

  const { playlistID: raw } = await ctx.params;
  const playlistID = normalizePlaylistId(raw);

  if (!playlistID) {
    return NextResponse.json(
      { error: `Invalid playlist id received: "${String(raw)}"` },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limitValue = Number(searchParams.get("limit") ?? "50");
  const offsetValue = Number(searchParams.get("offset") ?? "0");

  const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : 50;
  const offset = Number.isFinite(offsetValue) ? Math.max(offsetValue, 0) : 0;

  const fields =
    "items(added_at,is_local,track(uri,name,duration_ms,track_number,artists(name),album(name,release_date))),total,limit,offset,next";

  const spotifyUrl =
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistID)}/items` +
    `?limit=${limit}` +
    `&offset=${offset}` +
    `&market=from_token` +
    `&fields=${encodeURIComponent(fields)}`;

  const res = await spotifyFetchWithRetry(spotifyUrl, accessToken);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          (data as any)?.error?.message ||
          (data as any)?.message ||
          "Spotify request failed",
        spotify: data,
        playlistID,
        limit,
        offset,
      },
      { status: res.status }
    );
  }

  return NextResponse.json({
    items: Array.isArray((data as any)?.items) ? (data as any).items : [],
    total: Number((data as any)?.total ?? 0),
    limit: Number((data as any)?.limit ?? limit),
    offset: Number((data as any)?.offset ?? offset),
    next: typeof (data as any)?.next === "string" ? (data as any).next : null,
  });
}