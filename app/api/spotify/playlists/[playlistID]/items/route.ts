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
  context: { params: Promise<{ playlistID: string }> | { playlistID: string } }
) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken as string | undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const params = await Promise.resolve(context.params);

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
    // ✅ return full Spotify error info
    return NextResponse.json(
      { error: data?.error?.message ?? "Spotify request failed", spotify: data, status: res.status },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
