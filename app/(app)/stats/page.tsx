"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type TimeRange = "short_term" | "medium_term" | "long_term";
type Tab = "artists" | "tracks" | "albums";

type SpotifyImage = { url: string; height: number | null; width: number | null };

type TopArtist = {
  id: string;
  name: string;
  images?: SpotifyImage[];
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
type ApiErrorResponse = { error?: string };

type AlbumRow = {
  id: string;
  name: string;
  year: string | null;
  totalTracks: number | null;
  imageUrl: string | null;
  topTracksCount: number;
};

function pickLargeImage(images?: SpotifyImage[]) {
  if (!images || images.length === 0) return null;
  return images[0]?.url ?? images[images.length - 1]?.url ?? null;
}

function formatYear(releaseDate?: string) {
  if (!releaseDate) return null;
  return releaseDate.slice(0, 4) || null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getApiErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error;
  }

  return fallback;
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

  const artistsUrl = useMemo(
    () => `/api/spotify/top?type=artists&time_range=${timeRange}&limit=20&_r=${refreshKey}`,
    [timeRange, refreshKey]
  );

  const tracksUrl = useMemo(
    () => `/api/spotify/top?type=tracks&time_range=${timeRange}&limit=50&_r=${refreshKey}`,
    [timeRange, refreshKey]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [artistsRes, tracksRes] = await Promise.all([
          fetch(artistsUrl, { cache: "no-store" }),
          fetch(tracksUrl, { cache: "no-store" }),
        ]);

        const artistsData = (await artistsRes.json()) as TopArtistsResponse | ApiErrorResponse;
        if (!artistsRes.ok) {
          throw new Error(getApiErrorMessage(artistsData, `Artists request failed (${artistsRes.status})`));
        }

        const tracksData = (await tracksRes.json()) as TopTracksResponse | ApiErrorResponse;
        if (!tracksRes.ok) {
          throw new Error(getApiErrorMessage(tracksData, `Tracks request failed (${tracksRes.status})`));
        }

        if (!cancelled) {
          setArtists(artistsData as TopArtistsResponse);
          setTracks(tracksData as TopTracksResponse);
          setLastUpdated(new Date());
        }
      } catch (error: unknown) {
        if (!cancelled) setError(getErrorMessage(error, "Failed to load stats"));
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
          imageUrl: pickLargeImage(album.images),
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

  function onRefresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Stats</h1>
          <p className="mt-1 text-sm text-text-muted">
            Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "—"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)] disabled:opacity-60"
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </button>

          <select
            className="rounded-md border border-accent/40 bg-surface px-3 py-2 text-sm text-text-primary transition-colors hover:border-accent hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          >
            <option value="short_term">1 month</option>
            <option value="medium_term">6 months</option>
            <option value="long_term">12 months</option>
          </select>
        </div>
      </div>

      <div className="sticky top-4 z-20 mt-6">
        <div className="rounded-md border border-border bg-surface/90 p-2 backdrop-blur">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(
              [
                ["artists", "Top Artists"],
                ["tracks", "Top Tracks"],
                ["albums", "Top Albums"],
              ] as const
            ).map(([key, label]) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  className={[
                    "w-full rounded-md border px-3 py-2 text-center text-sm transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]",
                    active
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-surface text-text-secondary hover:border-accent/40 hover:bg-surface-hover hover:text-text-primary",
                  ].join(" ")}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading && <p className="mt-6 text-sm text-text-muted">Loading…</p>}
      {error && <p className="mt-6 text-sm text-red-500">{error}</p>}

      {!loading && !error && tab === "artists" && artists && (
        <ol className="mt-6 space-y-3">
          {artists.items.map((a, idx) => {
            const img = pickLargeImage(a.images);

            return (
              <li key={a.id} className="rounded-md border border-border bg-surface p-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full bg-surface-hover">
                    {img ? (
                      <Image src={img} alt={a.name} fill className="object-cover" quality={90} sizes="96px" />
                    ) : null}
                  </div>

                  <div>
                    <p className="text-sm text-text-muted">#{idx + 1}</p>
                    <p className="font-medium text-text-primary">{a.name}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!loading && !error && tab === "tracks" && tracks && (
        <ol className="mt-6 space-y-3">
          {tracks.items.slice(0, 20).map((t, idx) => {
            const img = pickLargeImage(t.album?.images);
            const albumName = t.album?.name ?? "—";

            return (
              <li key={t.id} className="rounded-md border border-border bg-surface p-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-md bg-surface-hover">
                    {img ? (
                      <Image src={img} alt={t.name} fill className="object-cover" quality={90} sizes="96px" />
                    ) : null}
                  </div>

                  <div>
                    <p className="text-sm text-text-muted">#{idx + 1}</p>
                    <p className="font-medium text-text-primary">{t.name}</p>
                    <p className="text-sm text-text-secondary">
                      {t.artists?.map((a) => a.name).join(", ")} • {albumName}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!loading && !error && tab === "albums" && (
        <ol className="mt-6 space-y-3">
          {albumRows.map((a, idx) => (
            <li key={a.id} className="rounded-md border border-border bg-surface p-4">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-md bg-surface-hover">
                  {a.imageUrl ? (
                    <Image src={a.imageUrl} alt={a.name} fill className="object-cover" quality={90} sizes="96px" />
                  ) : null}
                </div>

                <div>
                  <p className="text-sm text-text-muted">#{idx + 1}</p>
                  <p className="font-medium text-text-primary">{a.name}</p>
                  <p className="text-sm text-text-secondary">
                    Year: {a.year ?? "—"} • Tracks: {a.totalTracks ?? "—"}
                  </p>
                </div>
              </div>
            </li>
          ))}

          {albumRows.length === 0 && <p className="mt-6 text-sm text-text-muted">No albums data yet.</p>}
        </ol>
      )}
    </div>
  );
}
