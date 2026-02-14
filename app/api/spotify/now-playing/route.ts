import { NextResponse } from "next/server";
import { getSpotifyAccessToken } from "@/lib/spotify";

export async function GET() {
  try {
    const accessToken = await getSpotifyAccessToken();

    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    // Nothing is playing
    if (res.status === 204) {
      return NextResponse.json({ is_playing: false }, { status: 200 });
    }

    if (!res.ok) {
      let message = `Spotify API error (${res.status})`;
      try {
        const data = await res.json();
        message = data?.error?.message ?? message;
      } catch {}
      return NextResponse.json({ error: message }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    const message = e?.message ?? "Internal error";
    return NextResponse.json({ error: message }, { status });
  }
}
