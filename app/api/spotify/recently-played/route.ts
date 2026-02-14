import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = Number(searchParams.get("limit") ?? 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10;

    const data = await spotifyFetch<any>(`/v1/me/player/recently-played?limit=${limit}`);
    return NextResponse.json(data);
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    const message = e?.message ?? "Internal error";
    return NextResponse.json({ error: message }, { status });
  }
}
