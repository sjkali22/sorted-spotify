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

export async function GET(req: Request, context: { params: { playlistID: string } }) {
  const session = await getServerSession(authOptions);

  // If token refresh failed, force re-login
  const sessionError = (session as any)?.error as string | undefined;
  if (sessionError) {
    return NextResponse.json(
      { error: "Auth token refresh failed. Please sign out and sign in again." },
      { status: 401 }
    );
  }

  const accessToken = (session as any)?.accessToken as string | undefined;
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rawFromParams = context.params?.playlistID;
  const playlistID = normalizePlaylistId(rawFromParams);

  if (!playlistID) {
    return NextResponse.json(
      { error: `Invalid playlist id received: "${rawFromParams}"` },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") ?? "50";
  const offset = searchParams.get("offset") ?? "0";

  // ✅ Feb 2026 change: /tracks -> /items
  const url = `https://api.spotify.com/v1/playlists/${playlistID}/items?limit=${encodeURIComponent(
    limit
  )}&offset=${encodeURIComponent(offset)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      return NextResponse.json(
        { error: "Spotify token expired. Sign out and sign in again.", spotify: data, status: 401 },
        { status: 401 }
      );
    }

    if (res.status === 403) {
      return NextResponse.json(
        {
          error:
            "Spotify returned 403 Forbidden for playlist items. This can occur due to access restrictions on playlist contents and/or missing scopes. Try signing out/in again (prompt=consent).",
          spotify: data,
          status: 403,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: data?.error?.message ?? "Spotify request failed", spotify: data, status: res.status },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}