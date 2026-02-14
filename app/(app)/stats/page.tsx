"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type TimeRange = "short_term" | "medium_term" | "long_term";
type Tab = "artists" | "tracks" | "albums" | "genres";

type SpotifyImage = { url: string; height: number | null; width: number | null };

type TopArtist = {
  id: string;
  name: string;
  images?: SpotifyImage[];
  genres?: string[];
};

type TopTrack = {
  id: string;
  name: string;
  artists: { name: string }[];
  album?: {
    id: string;
    name: string;
    release_date?: string;
    total_tracks?: number;
    images?: SpotifyImage[];
  };
};

type TopArtistsResponse = { items: TopArtist[] };
type TopTracksResponse = { items: TopTrack[] };

type AlbumRow = {
  id: string;
  name: string;
  year: string | null;
  totalTracks: number | null;
  imageUrl: string | null;
  topTracksCount: number; // derived
};

type GenreRow = {
  name: string;
  artistCount: number;
};

function pickImage(images?: SpotifyImage[]) {
  if (!images || images.length === 0) return null;
  return images[images.length - 1]?.url ?? images[0]?.url ?? null;
}

function formatYear(releaseDate?: string) {
  if (!releaseDate) return null;
  return releaseDate.slice(0, 4) || null;
}

export default function StatsPage() {
  const [tab, setTab] = useState<Tab>("artists");
  const [timeRange, setTimeRange] = useState<TimeRange>("short_term");
  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [artists, setArtists] = useState<TopArtistsResponse | null>(null);
  const [tracks, setTracks] = useState<TopTracksResponse | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const needsArtists = tab === "artists" || tab === "genres";
  const needsTracks = tab === "tracks" || tab === "albums";

  const artistsUrl = useMemo(() => {
    if (!needsArtists) return null;
    return `/api/spotify/top?type=artists&time_range=${timeRange}&limit=20&_r=${refreshKey}`;
  }, [needsArtists, timeRange, refreshKey]);

  const tracksUrl = useMemo(() => {
    if (!needsTracks) return null;
    return `/api/spotify/top?type=tracks&time_range=${timeRange}&limit=50&_r=${refreshKey}`;
  }, [needsTracks, timeRange, refreshKey]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (artistsUrl) {
          const res = await fetch(artistsUrl, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error ?? `Artists request failed (${res.status})`);
          if (!cancelled) setArtists(data);
        }

        if (tracksUrl) {
          const res = await fetch(tracksUrl, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error ?? `Tracks request failed (${res.status})`);
          if (!cancelled) setTracks(data);
        }

        if (!cancelled) setLastUpdated(new Date());
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load stats");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [artistsUrl, tracksUrl]);

  const albumRows: AlbumRow[] = useMemo(() => {
    if (!tracks?.items) return [];

    const map = new Map<string, AlbumRow>();

    for (const t of tracks.items) {
      const album = t.album;
      if (!album?.id) continue;

      const existing = map.get(album.id);
      if (!existing) {
        map.set(album.id, {
          id: album.id,
          name: album.name ?? "Unknown album",
          year: formatYear(album.release_date),
          totalTracks: typeof album.total_tracks === "number" ? album.total_tracks : null,
          imageUrl: pickImage(album.images),
          topTracksCount: 1,
        });
      } else {
        existing.topTracksCount += 1;
      }
    }

    const rows = Array.from(map.values());
    rows.sort((a, b) => b.topTracksCount - a.topTracksCount);
    return rows.slice(0, 20);
  }, [tracks]);

  const genreRows: GenreRow[] = useMemo(() => {
    if (!artists?.items) return [];

    const genreToArtists = new Map<string, Set<string>>();

    for (const a of artists.items) {
      const genres = a.genres ?? [];
      for (const g of genres) {
        if (!genreToArtists.has(g)) genreToArtists.set(g, new Set());
        genreToArtists.get(g)!.add(a.id);
      }
    }

    const rows = Array.from(genreToArtists.entries()).map(([name, set]) => ({
      name,
      artistCount: set.size,
    }));

    rows.sort((a, b) => b.artistCount - a.artistCount);
    return rows.slice(0, 30);
  }, [artists]);

  function onRefresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stats</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "—"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </button>

          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          >
            <option value="short_term">4 weeks</option>
            <option value="medium_term">6 months</option>
            <option value="long_term">12 months</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["artists", "Top Artists"],
            ["tracks", "Top Tracks"],
            ["albums", "Top Albums"],
            ["genres", "Top Genres"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={`rounded-md border px-3 py-2 text-sm ${
              tab === key ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-50"
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="mt-6 text-sm text-neutral-600">Loading…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {/* Artists: image + name + genres */}
      {!loading && !error && tab === "artists" && artists && (
        <ol className="mt-6 space-y-3">
          {artists.items.map((a, idx) => {
            const img = pickImage(a.images);
            const topGenres = (a.genres ?? []).slice(0, 3);
            return (
              <li key={a.id} className="rounded-md border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-full bg-neutral-200">
                      {img ? <Image src={img} alt={a.name} fill className="object-cover" /> : null}
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">#{idx + 1}</p>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-sm text-neutral-600">
                        {topGenres.length > 0 ? topGenres.join(" • ") : "No genres"}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Tracks: artwork + track + artists + album */}
      {!loading && !error && tab === "tracks" && tracks && (
        <ol className="mt-6 space-y-3">
          {tracks.items.slice(0, 20).map((t, idx) => {
            const img = pickImage(t.album?.images);
            const albumName = t.album?.name ?? "—";
            return (
              <li key={t.id} className="rounded-md border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-md bg-neutral-200">
                      {img ? <Image src={img} alt={t.name} fill className="object-cover" /> : null}
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">#{idx + 1}</p>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-sm text-neutral-600">
                        {t.artists?.map((a) => a.name).join(", ")} • {albumName}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Albums: year + total tracks + derived count */}
      {!loading && !error && tab === "albums" && (
        <ol className="mt-6 space-y-3">
          {albumRows.map((a, idx) => (
            <li key={a.id} className="rounded-md border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-md bg-neutral-200">
                    {a.imageUrl ? <Image src={a.imageUrl} alt={a.name} fill className="object-cover" /> : null}
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">#{idx + 1}</p>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-sm text-neutral-600">
                      Year: {a.year ?? "—"} • Tracks: {a.totalTracks ?? "—"} • Top tracks: {a.topTracksCount}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}

          {albumRows.length === 0 && (
            <p className="mt-6 text-sm text-neutral-600">No albums data yet.</p>
          )}
        </ol>
      )}

      {/* Genres: artist count only */}
      {!loading && !error && tab === "genres" && (
        <ol className="mt-6 space-y-2">
          {genreRows.map((g, idx) => (
            <li key={g.name} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">#{idx + 1}</p>
                  <p className="font-medium">{g.name}</p>
                </div>
                <div className="text-sm text-neutral-600">Artists: {g.artistCount}</div>
              </div>
            </li>
          ))}

          {genreRows.length === 0 && (
            <p className="mt-6 text-sm text-neutral-600">No genres data yet.</p>
          )}
        </ol>
      )}
    </main>
  );
}
