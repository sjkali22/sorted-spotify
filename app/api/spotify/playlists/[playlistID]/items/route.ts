// app/api/spotify/playlists/[playlistID]/items/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";

function normalizePlaylistId(input: string | undefined) {
  if (!input) return null;

  const urlMatch = input.match(/open\.spotify\.com\/playlist\/([0-9A-Za-z]+)/);
  if (urlMatch?.[1]) return urlMatch[1];

  const uriMatch = input.match(/^spotify:playlist:([0-9A-Za-z]+)$/);
  if (uriMatch?.[1]) return uriMatch[1];

  if (/^[0-9A-Za-z]+$/.test(input)) return input;

  return null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ playlistID: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.error) {
    return NextResponse.json(
      { error: "Auth token refresh failed. Please sign out and sign in again." },
      { status: 401 }
    );
  }

  const accessToken = session.accessToken;
  if (!accessToken) return NextResponse.json({ error: "Missing access token" }, { status: 401 });

  const { playlistID: raw } = await ctx.params;
  const playlistID = normalizePlaylistId(raw);

  if (!playlistID) {
    return NextResponse.json(
      { error: `Invalid playlist id received: "${String(raw)}"` },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") ?? "50";
  const offset = searchParams.get("offset") ?? "0";

  const fields =
    "items(added_at,is_local,track(uri,name,duration_ms,track_number,artists(name),album(name,release_date))),total,limit,offset,next";

  const url =
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistID)}/items` +
    `?limit=${encodeURIComponent(limit)}` +
    `&offset=${encodeURIComponent(offset)}` +
    `&market=from_token` +
    `&fields=${encodeURIComponent(fields)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({} as any));

  if (!res.ok) {
    // DEBUG: log the Spotify request + returned body so we can inspect what Spotify is receiving
    console.warn("Spotify playlist items request failed", {
      url,
      status: res.status,
      body: data,
    });

    return NextResponse.json(
      { error: data?.error?.message ?? "Spotify request failed", spotify: data },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}