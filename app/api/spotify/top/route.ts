import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

type TimeRange = "short_term" | "medium_term" | "long_term";

type TopArtist = {
  id: string;
  name: string;
  images?: any[];
  genres?: string[];
};

type TopArtistsResponse = {
  items: TopArtist[];
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type") === "tracks" ? "tracks" : "artists";

    const timeRangeRaw = searchParams.get("time_range") ?? "short_term";
    const time_range: TimeRange =
      timeRangeRaw === "short_term" || timeRangeRaw === "medium_term" || timeRangeRaw === "long_term"
        ? (timeRangeRaw as TimeRange)
        : "short_term";

    const limitRaw = Number(searchParams.get("limit") ?? 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

    const data = await spotifyFetch<any>(
      `/v1/me/top/${type}?time_range=${encodeURIComponent(time_range)}&limit=${limit}`
    );

    // For tracks, return as-is
    if (type === "tracks") {
      return NextResponse.json(data);
    }

    // For artists: ensure genres exist by hydrating via /v1/artists/{id} if needed
    const top = data as TopArtistsResponse;

    const hasAnyGenres = (top?.items ?? []).some(
      (a) => Array.isArray(a?.genres) && a.genres.length > 0
    );

    if (hasAnyGenres) {
      return NextResponse.json(top);
    }

    const items = top?.items ?? [];

    const hydrated = await Promise.all(
      items.map(async (a) => {
        if (!a?.id) return a;

        try {
          const full = await spotifyFetch<any>(`/v1/artists/${encodeURIComponent(a.id)}`);
          return {
            ...a,
            genres: full?.genres ?? a.genres ?? [],
            images: full?.images ?? a.images ?? [],
          } satisfies TopArtist;
        } catch {
          return a;
        }
      })
    );

    return NextResponse.json({ ...top, items: hydrated });
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    const message = e?.message ?? "Internal error";
    return NextResponse.json({ error: message }, { status });
  }
}