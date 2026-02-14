import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type") === "tracks" ? "tracks" : "artists";

    const timeRangeRaw = searchParams.get("time_range") ?? "short_term";
    const time_range =
      timeRangeRaw === "short_term" ||
      timeRangeRaw === "medium_term" ||
      timeRangeRaw === "long_term"
        ? timeRangeRaw
        : "short_term";

    const limitRaw = Number(searchParams.get("limit") ?? 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

    const data = await spotifyFetch<any>(
      `/v1/me/top/${type}?time_range=${encodeURIComponent(time_range)}&limit=${limit}`
    );

    return NextResponse.json(data);
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    const message = e?.message ?? "Internal error";
    return NextResponse.json({ error: message }, { status });
  }
}
