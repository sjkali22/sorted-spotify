import { NextResponse } from "next/server";
import { isSpotifyApiError, spotifyFetch } from "@/lib/spotify";

type SpotifyMe = {
  id: string;
  display_name: string | null;
  email?: string;
  product?: string;
  images?: { url: string; height: number | null; width: number | null }[];
};

export async function GET() {
  try {
    const me = await spotifyFetch<SpotifyMe>("/v1/me");
    return NextResponse.json(me);
  } catch (error: unknown) {
    if (isSpotifyApiError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error && error.message ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
