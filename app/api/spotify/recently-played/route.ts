import { NextResponse } from "next/server";
import { isSpotifyApiError, spotifyFetch } from "@/lib/spotify";

type SpotifyImage = { url: string };

type RecentlyPlayedResponse = {
  items: {
    played_at: string;
    track: {
      id: string;
      name: string;
      artists: { name: string }[];
      album: { name: string; images?: SpotifyImage[] };
      external_urls?: { spotify?: string };
    };
  }[];
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = Number(searchParams.get("limit") ?? 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10;

    const data = await spotifyFetch<RecentlyPlayedResponse>(`/v1/me/player/recently-played?limit=${limit}`);
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (isSpotifyApiError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error && error.message ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
