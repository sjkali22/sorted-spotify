import { NextResponse } from "next/server";
import { spotifyFetch, isSpotifyApiError } from "@/lib/spotify";

type SpotifyError = { status?: number; message?: string };
type SpotifyPlaylistsPage = {
  items?: unknown[];
  next?: string | null;
  total?: number;
  limit?: number;
  offset?: number;
  error?: SpotifyError;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const limitRaw = Number(searchParams.get("limit") ?? "50");
  const offsetRaw = Number(searchParams.get("offset") ?? "0");

  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 50;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

  try {
    const data = await spotifyFetch<SpotifyPlaylistsPage>(
      `/v1/me/playlists?limit=${limit}&offset=${offset}`
    );

    return NextResponse.json({
      items: data.items ?? [],
      total: data.total ?? 0,
      limit: data.limit ?? limit,
      offset: data.offset ?? offset,
      next: data.next ?? null,
    });
  } catch (e: unknown) {
    // Normal path: our spotifyFetch throws SpotifyApiError
    if (isSpotifyApiError(e)) {
      if (e.status === 429) {
        const retryAfter = typeof e.retryAfter === "number" ? e.retryAfter : 30;
        return NextResponse.json(
          { error: e.message, retryAfter },
          { status: 429, headers: { "retry-after": String(retryAfter) } }
        );
      }
      return NextResponse.json({ error: e.message }, { status: e.status });
    }

    // Fallback: never hide the actual error again
    const msg =
      e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
    return NextResponse.json({ error: `Spotify playlists request failed: ${msg}` }, { status: 502 });
  }
}