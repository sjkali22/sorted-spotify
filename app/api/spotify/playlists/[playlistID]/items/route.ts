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

function extractIdFromPath(reqUrl: string) {
  const { pathname } = new URL(reqUrl);
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("playlists");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return undefined;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ playlistID: string }> }
) {
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

  const params = await context.params;
  const rawFromParams = params?.playlistID;
  const rawFromPath = extractIdFromPath(req.url);
  const raw = rawFromParams ?? rawFromPath;

  const playlistID = normalizePlaylistId(raw);
  if (!playlistID) {
    return NextResponse.json(
      {
        error: `Invalid playlist id received: "${raw}"`,
        debug: { rawFromParams, rawFromPath, pathname: new URL(req.url).pathname },
      },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") ?? "50";
  const offset = searchParams.get("offset") ?? "0";

  const url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks?limit=${encodeURIComponent(
    limit
  )}&offset=${encodeURIComponent(offset)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 401 = expired token (usually) → your NextAuth refresh should handle it,
    // but if it didn't, you need to re-login.
    if (res.status === 401) {
      return NextResponse.json(
        { error: "Spotify token expired. Sign out and sign in again.", spotify: data, status: 401 },
        { status: 401 }
      );
    }

    // 403 = scope/access issue (most common)
    if (res.status === 403) {
      return NextResponse.json(
        {
          error:
            "Spotify returned 403 Forbidden. This is almost always missing scopes or needing re-consent. Sign out and sign in again (prompt=consent).",
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