import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";

// Accepts:
// - "37i9dQZF1DX..." (base62 id, length varies)
// - "spotify:playlist:37i9dQZF1DX..."
// - "https://open.spotify.com/playlist/37i9dQZF1DX...?..."
// Returns extracted id or null.
function normalizePlaylistId(input: string | undefined) {
  if (!input) return null;

  // From full URL
  const urlMatch = input.match(/open\.spotify\.com\/playlist\/([0-9A-Za-z]+)/);
  if (urlMatch?.[1]) return urlMatch[1];

  // From URI
  const uriMatch = input.match(/^spotify:playlist:([0-9A-Za-z]+)$/);
  if (uriMatch?.[1]) return uriMatch[1];

  // Raw id
  if (/^[0-9A-Za-z]+$/.test(input)) return input;

  return null;
}

// GET /api/spotify/playlists/:playlistId/items?limit=50&offset=0
export async function GET(
  req: Request,
  { params }: { params: { playlistId: string } }
) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken as string | undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Normalize in case something passes URI/URL (or odd length IDs)
  const playlistId = normalizePlaylistId(params.playlistId);

  if (!playlistId) {
    return NextResponse.json(
      { error: `Invalid playlist id received: "${params.playlistId}"` },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") ?? "50";
  const offset = searchParams.get("offset") ?? "0";

  // Feb 2026 endpoint
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=${encodeURIComponent(
    limit
  )}&offset=${encodeURIComponent(offset)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error?.message ?? "Spotify playlist items request failed" },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}
