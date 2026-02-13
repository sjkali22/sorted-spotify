import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

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
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    const message = e?.message ?? "Internal error";
    return NextResponse.json({ error: message }, { status });
  }
}
