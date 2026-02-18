import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

type SpotifyPlaylistsPage = {
  items?: unknown[];
  next?: string | null;
  total?: number;
  error?: { message?: string };
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken as string | undefined;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const all: unknown[] = [];
  const limit = 50;

  let url: string | null = `https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=0`;
  let safety = 0;

  while (url) {
    safety += 1;
    if (safety > 50) break;

    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    const data: SpotifyPlaylistsPage = (await res
      .json()
      .catch(() => ({}))) as SpotifyPlaylistsPage;

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Spotify playlists request failed" },
        { status: res.status }
      );
    }

    all.push(...(data.items ?? []));
    url = data.next ?? null;
  }

  return NextResponse.json({ items: all, total: all.length });
}
