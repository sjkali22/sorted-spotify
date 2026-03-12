import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type SessionWithSpotify = {
  accessToken?: string;
  error?: string;
};

type RawSpotifyArtist = {
  name?: string | null;
};

type RawSpotifyAlbum = {
  name?: string | null;
  release_date?: string | null;
};

type RawSpotifyTrack = {
  type?: string | null;
  uri?: string | null;
  name?: string | null;
  duration_ms?: number | null;
  track_number?: number | null;
  artists?: RawSpotifyArtist[] | null;
  album?: RawSpotifyAlbum | null;
};

type RawPlaylistItem = {
  added_at?: string | null;
  is_local?: boolean;
  item?: RawSpotifyTrack | null;
  track?: RawSpotifyTrack | null;
};

type RawPlaylistItemsResponse = {
  items?: RawPlaylistItem[];
  total?: number;
  limit?: number;
  offset?: number;
  next?: string | null;
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

function getAccessToken(session: unknown): string | null {
  return (session as SessionWithSpotify | null | undefined)?.accessToken ?? null;
}

function normalizeTrack(track: RawSpotifyTrack | null | undefined) {
  if (!track) return null;
  if (track.type && track.type !== "track") return null;

  return {
    uri: typeof track.uri === "string" ? track.uri : null,
    name: typeof track.name === "string" ? track.name : "",
    duration_ms: typeof track.duration_ms === "number" ? track.duration_ms : 0,
    track_number: typeof track.track_number === "number" ? track.track_number : 0,
    artists: Array.isArray(track.artists)
      ? track.artists.map((artist) => ({
          name: typeof artist?.name === "string" ? artist.name : "",
        }))
      : [],
    album: {
      name: typeof track.album?.name === "string" ? track.album.name : "",
      release_date:
        typeof track.album?.release_date === "string" ? track.album.release_date : "",
    },
  };
}

function normalizePlaylistItem(item: RawPlaylistItem) {
  const source = item.item ?? item.track ?? null;

  return {
    added_at: typeof item.added_at === "string" ? item.added_at : null,
    is_local: Boolean(item.is_local),
    track: normalizeTrack(source),
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ playlistID: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if ((session as SessionWithSpotify).error) {
    return NextResponse.json(
      { error: "Auth token refresh failed. Please sign out and sign in again." },
      { status: 401 }
    );
  }

  const accessToken = getAccessToken(session);
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

  const { searchParams } = new URL(req.url);
  const limitValue = Number(searchParams.get("limit") ?? "50");
  const offsetValue = Number(searchParams.get("offset") ?? "0");

  const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 50) : 50;
  const offset = Number.isFinite(offsetValue) ? Math.max(offsetValue, 0) : 0;

  const fields = [
    "items(",
    "added_at,",
    "is_local,",
    "item(type,uri,name,duration_ms,track_number,artists(name),album(name,release_date)),",
    "track(type,uri,name,duration_ms,track_number,artists(name),album(name,release_date))",
    "),",
    "total,limit,offset,next",
  ].join("");

  const spotifyUrl =
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistID)}/items` +
    `?limit=${limit}` +
    `&offset=${offset}` +
    `&market=from_token` +
    `&additional_types=track,episode` +
    `&fields=${encodeURIComponent(fields)}`;

  const res = await fetch(spotifyUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as RawPlaylistItemsResponse | { error?: { message?: string } } | null;

  if (!res.ok) {
    return NextResponse.json(
      {
        error:
          (data as { error?: { message?: string } } | null)?.error?.message ??
          "Spotify request failed",
        spotify: data,
        playlistID,
        limit,
        offset,
      },
      { status: res.status }
    );
  }

  const items = Array.isArray((data as RawPlaylistItemsResponse | null)?.items)
    ? (data as RawPlaylistItemsResponse).items!.map(normalizePlaylistItem)
    : [];

  return NextResponse.json({
    items,
    total: Number((data as RawPlaylistItemsResponse | null)?.total ?? 0),
    limit: Number((data as RawPlaylistItemsResponse | null)?.limit ?? limit),
    offset: Number((data as RawPlaylistItemsResponse | null)?.offset ?? offset),
    next:
      typeof (data as RawPlaylistItemsResponse | null)?.next === "string"
        ? (data as RawPlaylistItemsResponse).next
        : null,
  });
}
