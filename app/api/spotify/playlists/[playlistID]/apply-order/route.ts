import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type SessionWithSpotify = {
  accessToken?: string;
  scope?: string;
  error?: string;
};

type SpotifyErrorPayload = {
  error?: {
    message?: string;
    status?: number;
  };
  snapshot_id?: string;
};

function normalizePlaylistId(input: string | undefined) {
  if (!input) return null;

  const urlMatch = input.match(/open\.spotify\.com\/playlist\/([0-9A-Za-z]+)/);
  if (urlMatch?.[1]) return urlMatch[1];

  const uriMatch = input.match(/^spotify:playlist:([0-9A-Za-z]+)$/);
  if (uriMatch?.[1]) return uriMatch[1];

  if (/^[0-9A-Za-z]+$/.test(input)) return input;

  return null;
}

function getSessionData(session: unknown) {
  const s = (session as SessionWithSpotify | null | undefined) ?? null;
  return {
    accessToken: s?.accessToken ?? null,
    scope: s?.scope ?? "",
    error: s?.error,
  };
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }

  return out;
}

function hasModifyScope(scope: string) {
  const granted = new Set(scope.split(/\s+/).filter(Boolean));
  return granted.has("playlist-modify-public") || granted.has("playlist-modify-private");
}

function buildForbiddenMessage(scope: string, spotifyMessage?: string) {
  const hasScope = hasModifyScope(scope);

  if (!hasScope) {
    return "Spotify rejected the playlist update because the current session is missing playlist modify scope. Sign out and sign in again to grant playlist-modify-public and playlist-modify-private.";
  }

  if (spotifyMessage) {
    return `${spotifyMessage} Spotify only allows modifying playlists you own or can collaborate on.`;
  }

  return "Spotify rejected the playlist update. You can only modify playlists you own or can collaborate on.";
}

async function spotifyWrite(
  url: string,
  accessToken: string,
  method: "POST" | "PUT",
  uris: string[],
  scope: string
) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ uris }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as SpotifyErrorPayload | null;

  if (!res.ok) {
    const spotifyMessage = data?.error?.message;
    const errorMessage =
      res.status === 403
        ? buildForbiddenMessage(scope, spotifyMessage)
        : spotifyMessage ?? "Spotify playlist update failed";

    throw NextResponse.json(
      {
        error: errorMessage,
        spotify: data,
      },
      { status: res.status }
    );
  }

  return data;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ playlistID: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { accessToken, scope, error } = getSessionData(session);

  if (error) {
    return NextResponse.json(
      { error: "Auth token refresh failed. Please sign out and sign in again." },
      { status: 401 }
    );
  }

  if (!accessToken) {
    return NextResponse.json({ error: "Missing access token" }, { status: 401 });
  }

  const { playlistID: rawPlaylistId } = await ctx.params;
  const playlistID = normalizePlaylistId(rawPlaylistId);

  if (!playlistID) {
    return NextResponse.json(
      { error: `Invalid playlist id received: "${String(rawPlaylistId)}"` },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as { uris?: unknown } | null;
  const uris = Array.isArray(body?.uris)
    ? body.uris.filter((uri): uri is string => typeof uri === "string" && uri.startsWith("spotify:track:"))
    : [];

  if (uris.length === 0) {
    return NextResponse.json({ error: "No track URIs were provided." }, { status: 400 });
  }

  try {
    const chunks = chunk(uris, 100);
    let lastSnapshotId: string | undefined;
    const itemsUrl = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistID)}/items`;

    const first = await spotifyWrite(itemsUrl, accessToken, "PUT", chunks[0] ?? [], scope);
    lastSnapshotId = first?.snapshot_id;

    for (let i = 1; i < chunks.length; i += 1) {
      const appended = await spotifyWrite(itemsUrl, accessToken, "POST", chunks[i], scope);
      lastSnapshotId = appended?.snapshot_id ?? lastSnapshotId;
    }

    return NextResponse.json({
      ok: true,
      snapshot_id: lastSnapshotId ?? null,
      total: uris.length,
    });
  } catch (response) {
    if (response instanceof Response) {
      return response;
    }

    return NextResponse.json({ error: "Spotify playlist update failed" }, { status: 502 });
  }
}
