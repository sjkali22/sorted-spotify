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

type ApiErrorResponse = {
  error?: string;
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
        const data = (await res.json()) as CurrentlyPlaying | ApiErrorResponse;
        if (!res.ok) throw new Error(getApiErrorMessage(data, `Now playing failed (${res.status})`));
        if (cancelled) return;

        const nowData = data as CurrentlyPlaying;
        setNow(nowData);

        const p = typeof nowData.progress_ms === "number" ? nowData.progress_ms : 0;
        setLiveProgress(p);

        playingRef.current = !!nowData.is_playing;
        durationRef.current = typeof nowData.item?.duration_ms === "number" ? nowData.item.duration_ms : 0;

        setError(null);
      } catch (error: unknown) {
        if (!cancelled) setError(getErrorMessage(error, "Failed to load now playing"));
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
        const data = (await res.json()) as RecentlyPlayed | ApiErrorResponse;
        if (!res.ok) throw new Error(getApiErrorMessage(data, `Recently played failed (${res.status})`));
        if (!cancelled) setRecent(data as RecentlyPlayed);
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
          <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-center">
            <div className="grid gap-5 md:grid-cols-[152px_minmax(0,1fr)] md:items-center">
              <div className="relative aspect-square w-full max-w-[152px] overflow-hidden rounded-2xl bg-surface-hover shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
                {artworkLarge ? (
                  <Image
                    src={artworkLarge}
                    alt="Album art"
                    fill
                    className="object-cover"
                    quality={100}
                    sizes="152px"
                    priority
                  />
                ) : null}
              </div>

              <div className="flex min-h-[152px] min-w-0 flex-col justify-center">
                <div className="min-w-0">
                  <p className="text-2xl font-semibold leading-tight text-text-primary md:text-3xl">
                    {track.name}
                  </p>
                  <p className="mt-2 text-base text-text-secondary md:text-lg">{artistNames}</p>
                  <p className="mt-1 text-sm text-text-muted md:text-base">{albumName}</p>
                </div>

                <div className="mt-5 rounded-2xl border border-border bg-primary/35 p-4">
                  <div className="flex items-center gap-3">
                    <span className="min-w-10 text-xs text-text-muted">{formatTime(liveProgress)}</span>

                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-hover">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>

                    <span className="min-w-10 text-right text-xs text-text-muted">{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>

            {openUrl ? (
              <a
                className="inline-flex items-center justify-center self-stretch rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)] xl:self-center"
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
            <div className="hidden grid-cols-[52px_2fr_1.5fr_1.5fr_120px] border-b border-border bg-surface md:grid">
              <div className="px-3 py-3" />
              <div className="px-3 py-3 text-center text-xs font-semibold text-text-muted">Track</div>
              <div className="px-3 py-3 text-center text-xs font-semibold text-text-muted">Artist</div>
              <div className="px-3 py-3 text-center text-xs font-semibold text-text-muted">Album</div>
              <div className="px-3 py-3" />
            </div>

            <div className="divide-y divide-border">
              {recent.items.map((row) => {
                const img = pickLargeImage(row.track.album.images);
                const artists = row.track.artists.map((a) => a.name).join(", ");
                const album = row.track.album.name;
                const ago = timeAgo(row.played_at);

                return (
                  <div
                    key={`${row.track.id}-${row.played_at}`}
                    className="grid grid-cols-[52px_1fr] gap-3 px-3 py-3.5 md:grid-cols-[52px_2fr_1.5fr_1.5fr_120px] md:gap-0"
                  >
                    <div className="flex items-center">
                      <div className="relative h-10 w-10 overflow-hidden rounded bg-surface-hover">
                        {img ? (
                          <Image
                            src={img}
                            alt=""
                            fill
                            className="object-cover"
                            quality={90}
                            sizes="96px"
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="min-w-0 md:flex md:items-center md:px-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-text-primary">{row.track.name}</div>
                        <div className="truncate text-xs text-text-muted md:hidden">
                          {artists} â€¢ {album}
                        </div>
                      </div>
                    </div>

                    <div className="hidden min-w-0 px-3 md:flex md:items-center md:justify-center">
                      <div className="truncate text-sm text-center text-text-secondary">{artists}</div>
                    </div>

                    <div className="hidden min-w-0 px-3 md:flex md:items-center md:justify-center">
                      <div className="truncate text-sm text-center text-text-secondary">{album}</div>
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
