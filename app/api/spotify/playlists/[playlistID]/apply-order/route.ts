import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getAccessToken(session: any): string | null {
  return (
    session?.accessToken || // if you extended Session
    session?.user?.accessToken || // if you store on user
    session?.user?.token || // fallback if you named it differently
    null
  );
}

async function fetchSpotifyWithRetry(
  url: string,
  accessToken: string,
  init: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let attempt = 0;

  while (true) {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers || {}),
      },
    });

    if (res.status !== 429) return res;

    if (attempt >= maxRetries) return res;

    const retryAfter = Number(res.headers.get("retry-after") ?? "1");
    await sleep(Math.min(Math.max(retryAfter, 1), 10) * 1000);
    attempt += 1;
  }
}

export async function POST(req: Request, context: { params: { playlistID: string } }) {
  const session = await getServerSession(authOptions);
  const accessToken = getAccessToken(session);

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlistID = context?.params?.playlistID;
  if (!playlistID) {
    return NextResponse.json({ error: "Missing playlistID" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { uris?: string[] };
  const uris = body.uris;

  if (!Array.isArray(uris) || uris.length === 0) {
    return NextResponse.json({ error: "Missing uris[]" }, { status: 400 });
  }

  const chunks = chunk(uris, 100);
  let lastSnapshotId: string | null = null;

  // 1) Replace playlist items with first chunk
  const replaceRes = await fetchSpotifyWithRetry(
    `https://api.spotify.com/v1/playlists/${playlistID}/tracks`,
    accessToken,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris: chunks[0] }),
    }
  );

  if (!replaceRes.ok) {
    const text = await replaceRes.text().catch(() => "");
    return NextResponse.json(
      { error: "Failed to replace playlist items", status: replaceRes.status, details: text },
      { status: 500 }
    );
  }

  const replaceJson = (await replaceRes.json().catch(() => null)) as { snapshot_id?: string } | null;
  lastSnapshotId = replaceJson?.snapshot_id ?? lastSnapshotId;

  // 2) Append remaining chunks
  for (let i = 1; i < chunks.length; i += 1) {
    const addRes = await fetchSpotifyWithRetry(
      `https://api.spotify.com/v1/playlists/${playlistID}/tracks`,
      accessToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris: chunks[i] }),
      }
    );

    if (!addRes.ok) {
      const text = await addRes.text().catch(() => "");
      return NextResponse.json(
        { error: "Failed to append playlist items", status: addRes.status, details: text },
        { status: 500 }
      );
    }

    const addJson = (await addRes.json().catch(() => null)) as { snapshot_id?: string } | null;
    lastSnapshotId = addJson?.snapshot_id ?? lastSnapshotId;
  }

  return NextResponse.json({
    ok: true,
    total: uris.length,
    requests: chunks.length,
    snapshot_id: lastSnapshotId,
  });
}