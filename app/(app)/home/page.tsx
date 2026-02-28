"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type SpotifyImage = { url: string };

type CurrentlyPlaying = {
  is_playing?: boolean;
  progress_ms?: number;
  item?: {
    name: string;
    duration_ms?: number;
    external_urls?: { spotify?: string };
    album?: { name: string; images?: SpotifyImage[] };
    artists?: { name: string }[];
  };
};

type RecentlyPlayed = {
  items: {
    played_at: string;
    track: {
      id: string;
      name: string;
      artists: { name: string }[];
      album: { name: string; images?: SpotifyImage[] };
      external_urls?: { spotify?: string };
    };
  }[];
};

function pickLargeImage(images?: SpotifyImage[]) {
  if (!images || images.length === 0) return null;
  return images[0]?.url ?? images[images.length - 1]?.url ?? null;
}

function formatTime(ms?: number) {
  if (typeof ms !== "number" || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function timeAgo(iso: string) {
  const played = new Date(iso).getTime();
  const now = Date.now();
  if (!Number.isFinite(played)) return "";

  const diffSec = Math.floor((now - played) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  const mins = Math.floor(diffSec / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (diffSec < 60) return rtf.format(-diffSec, "second");
  if (mins < 60) return rtf.format(-mins, "minute");
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-days, "day");
}

export default function HomePage() {
  const [now, setNow] = useState<CurrentlyPlaying | null>(null);
  const [recent, setRecent] = useState<RecentlyPlayed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [liveProgress, setLiveProgress] = useState(0);
  const playingRef = useRef(false);
  const durationRef = useRef(0);

  const track = now?.item;

  const artworkLarge = pickLargeImage(track?.album?.images);
  const artistNames = track?.artists?.map((a) => a.name).join(", ") ?? "";
  const albumName = track?.album?.name ?? "";
  const openUrl = track?.external_urls?.spotify ?? null;

  const duration = useMemo(() => {
    const d = typeof track?.duration_ms === "number" ? track.duration_ms : 0;
    return d;
  }, [track?.duration_ms]);

  useEffect(() => {
    let cancelled = false;

    async function loadNow() {
      try {
        const res = await fetch("/api/spotify/now-playing", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `Now playing failed (${res.status})`);
        if (cancelled) return;

        setNow(data);

        const p = typeof data?.progress_ms === "number" ? data.progress_ms : 0;
        setLiveProgress(p);

        playingRef.current = !!data?.is_playing;
        durationRef.current = typeof data?.item?.duration_ms === "number" ? data.item.duration_ms : 0;

        setError(null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load now playing");
      }
    }

    loadNow();
    const t = setInterval(loadNow, 5000);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRecent() {
      try {
        const res = await fetch("/api/spotify/recently-played?limit=20", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `Recently played failed (${res.status})`);
        if (!cancelled) setRecent(data);
      } catch {
        // silent
      }
    }

    loadRecent();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!playingRef.current) return;

      setLiveProgress((p) => {
        const d = durationRef.current;
        if (!d) return p;
        const next = p + 1000;
        return next > d ? d : next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const pct = duration > 0 ? Math.min(100, Math.max(0, (liveProgress / duration) * 100)) : 0;
  const showEmpty = !track || now?.is_playing === false;

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="text-2xl font-semibold text-text-primary">Home</h1>

      <section className="mt-6 rounded-md border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Now Playing</h2>
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
        </div>

        {showEmpty ? (
          <p className="mt-4 text-sm text-text-muted">Nothing playing right now.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-28 w-28 overflow-hidden rounded-md bg-surface-hover">
                {artworkLarge ? (
                  <Image
                    src={artworkLarge}
                    alt="Album art"
                    fill
                    className="object-cover"
                    quality={100}
                    sizes="112px"
                    priority
                  />
                ) : null}
              </div>

              <div>
                <p className="text-lg font-semibold text-text-primary">{track.name}</p>
                <p className="text-sm text-text-secondary">{artistNames}</p>
                <p className="text-sm text-text-muted">{albumName}</p>

                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-text-muted">{formatTime(liveProgress)}</span>

                  <div className="h-2 w-64 overflow-hidden rounded bg-surface-hover">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>

                  <span className="text-xs text-text-muted">{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            {openUrl ? (
              <a
                className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
                href={openUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open in Spotify
              </a>
            ) : null}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-md border border-border bg-surface p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Recent streams</h2>
            <p className="mt-1 text-sm text-text-muted">Your recently played tracks</p>
          </div>
        </div>

        {!recent?.items || recent.items.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">No recently played items found.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <div className="hidden grid-cols-[56px_2fr_1.5fr_1.5fr_140px] border-b border-border bg-surface md:grid">
              <div className="px-3 py-3" />
              <div className="px-3 py-3 text-center text-xs font-semibold text-text-muted">Track</div>
              <div className="px-3 py-3 text-center text-xs font-semibold text-text-muted">Artist</div>
              <div className="px-3 py-3 text-center text-xs font-semibold text-text-muted">Album</div>
              <div className="px-3 py-3" />
            </div>

            <div className="divide-y divide-border">
              {recent.items.map((row) => {
                const img = pickLargeImage(row.track.album.images); // higher-res
                const artists = row.track.artists.map((a) => a.name).join(", ");
                const album = row.track.album.name;
                const ago = timeAgo(row.played_at);

                return (
                  <div
                    key={`${row.track.id}-${row.played_at}`}
                    className="grid grid-cols-[56px_1fr] gap-3 px-3 py-5 md:grid-cols-[56px_2fr_1.5fr_1.5fr_140px] md:gap-0"
                  >
                    <div className="flex items-center">
                      <div className="relative h-11 w-11 overflow-hidden rounded bg-surface-hover">
                        {img ? (
                          <Image
                            src={img}
                            alt=""
                            fill
                            className="object-cover"
                            quality={90}
                            // request a larger optimized size than the visual box for sharper downscaling
                            sizes="96px"
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="min-w-0 md:px-3 md:flex md:items-center">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-text-primary">{row.track.name}</div>
                        <div className="mt-0.5 truncate text-xs text-text-muted md:hidden">
                          {artists} • {album}
                        </div>
                      </div>
                    </div>

                    <div className="hidden min-w-0 px-3 md:flex md:items-center md:justify-center">
                      <div className="truncate text-sm text-text-secondary text-center">{artists}</div>
                    </div>

                    <div className="hidden min-w-0 px-3 md:flex md:items-center md:justify-center">
                      <div className="truncate text-sm text-text-secondary text-center">{album}</div>
                    </div>

                    <div className="flex items-center justify-end md:px-3">
                      <div className="text-xs text-text-muted">{ago}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}