import { NextResponse } from "next/server";
import { spotifyFetch, isSpotifyApiError } from "@/lib/spotify";

export async function GET() {
  try {
    const data = await spotifyFetch<any>("/v1/me/player/currently-playing");
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