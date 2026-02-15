import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// GET /api/spotify/playlists
// Returns ALL playlists (auto-paginates).
export async function GET() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken as string | undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const pageLimit = 50; // max for /me/playlists
  let url = `https://api.spotify.com/v1/me/playlists?limit=${pageLimit}&offset=0`;

  const combined: any[] = [];
  let safetyPages = 0;

  while (true) {
    safetyPages += 1;
    if (safetyPages > 50) break; // safety: up to 2500 playlists

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Spotify playlists request failed" },
        { status: res.status }
      );
    }

    combined.push(...(data.items ?? []));

    if (!data.next) {
      return NextResponse.json({
        items: combined,
        total: data.total ?? combined.length,
      });
    }

    url = data.next;
  }

  // Fallback if safety cap hit
  return NextResponse.json({ items: combined, total: combined.length });
}
