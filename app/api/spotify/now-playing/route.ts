import { NextResponse } from "next/server";
import { spotifyFetch, isSpotifyApiError } from "@/lib/spotify";

type SpotifyImage = { url: string };

type CurrentlyPlayingResponse = {
  is_playing?: boolean;
  progress_ms?: number;
  item?: {
    name: string;
    duration_ms?: number;
    external_urls?: { spotify?: string };
    album?: { name: string; images?: SpotifyImage[] };
    artists?: { name: string }[];
  };
};

export async function GET() {
  try {
    const data = await spotifyFetch<CurrentlyPlayingResponse | undefined>("/v1/me/player/currently-playing");
    if (!data) return NextResponse.json({ is_playing: false }, { status: 200 });
    return NextResponse.json(data, { status: 200 });
  } catch (e: unknown) {
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
    return NextResponse.json({ error: "Spotify now playing request failed" }, { status: 502 });
  }
}
