import { NextResponse } from "next/server";
import { isSpotifyApiError, spotifyFetch } from "@/lib/spotify";

type TimeRange = "short_term" | "medium_term" | "long_term";

type SpotifyImage = {
  url: string;
  height?: number | null;
  width?: number | null;
};

type TopArtist = {
  id: string;
  name: string;
  images?: SpotifyImage[];
  genres?: string[];
};

type TopTrack = {
  id: string;
  name: string;
  artists: { name: string }[];
  album?: {
    id: string;
    name: string;
    release_date?: string;
    total_tracks?: number;
    images?: SpotifyImage[];
  };
};

type TopArtistsResponse = {
  items: TopArtist[];
};

type TopTracksResponse = {
  items: TopTrack[];
};

type ArtistDetailsResponse = {
  genres?: string[];
  images?: SpotifyImage[];
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type") === "tracks" ? "tracks" : "artists";

    const timeRangeRaw = searchParams.get("time_range") ?? "short_term";
    const time_range: TimeRange =
      timeRangeRaw === "short_term" || timeRangeRaw === "medium_term" || timeRangeRaw === "long_term"
        ? timeRangeRaw
        : "short_term";

    const limitRaw = Number(searchParams.get("limit") ?? 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

    if (type === "tracks") {
      const data = await spotifyFetch<TopTracksResponse>(
        `/v1/me/top/tracks?time_range=${encodeURIComponent(time_range)}&limit=${limit}`
      );
      return NextResponse.json(data);
    }

    const top = await spotifyFetch<TopArtistsResponse>(
      `/v1/me/top/artists?time_range=${encodeURIComponent(time_range)}&limit=${limit}`
    );

    const hasAnyGenres = (top.items ?? []).some(
      (artist) => Array.isArray(artist.genres) && artist.genres.length > 0
    );

    if (hasAnyGenres) {
      return NextResponse.json(top);
    }

    const hydrated = await Promise.all(
      top.items.map(async (artist) => {
        if (!artist.id) return artist;

        try {
          const full = await spotifyFetch<ArtistDetailsResponse>(
            `/v1/artists/${encodeURIComponent(artist.id)}`
          );

          return {
            ...artist,
            genres: full.genres ?? artist.genres ?? [],
            images: full.images ?? artist.images ?? [],
          } satisfies TopArtist;
        } catch {
          return artist;
        }
      })
    );

    return NextResponse.json({ ...top, items: hydrated });
  } catch (error: unknown) {
    if (isSpotifyApiError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error && error.message ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
