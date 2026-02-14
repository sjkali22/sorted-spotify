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
      album: { images?: SpotifyImage[] };
      external_urls?: { spotify?: string };
    };
  }[];
};

function pickImage(images?: SpotifyImage[]) {
  if (!images || images.length === 0) return null;
  return images[images.length - 1]?.url ?? images[0]?.url ?? null;
}

function formatTime(ms?: number) {
  if (typeof ms !== "number" || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function HomePage() {
  const [now, setNow] = useState<CurrentlyPlaying | null>(null);
  const [recent, setRecent] = useState<RecentlyPlayed | null>(null);
  const [error, setError] = useState<string | null>(null);

  // local, ticking progress
  const [liveProgress, setLiveProgress] = useState(0);
  const playingRef = useRef(false);
  const durationRef = useRef(0);

  const track = now?.item;
  const artwork = pickImage(track?.album?.images);
  const artistNames = track?.artists?.map((a) => a.name).join(", ") ?? "";
  const albumName = track?.album?.name ?? "";
  const openUrl = track?.external_urls?.spotify ?? null;

  const duration = useMemo(() => {
    const d = typeof track?.duration_ms === "number" ? track.duration_ms : 0;
    return d;
  }, [track?.duration_ms]);

  // Fetch now playing every 5s
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
        durationRef.current =
          typeof data?.item?.duration_ms === "number" ? data.item.duration_ms : 0;

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

  // Fetch recently played once (and you can refresh later if needed)
  useEffect(() => {
    let cancelled = false;

    async function loadRecent() {
      try {
        const res = await fetch("/api/spotify/recently-played?limit=10", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `Recently played failed (${res.status})`);
        if (!cancelled) setRecent(data);
      } catch (e: any) {
        // keep silent; page still works without it
      }
    }

    loadRecent();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tick progress every 1s while playing
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
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Home</h1>

      <section className="mt-6 rounded-md border p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Now Playing</h2>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>

        {showEmpty ? (
          <p className="mt-4 text-sm text-neutral-600">Nothing playing right now.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-28 w-28 overflow-hidden rounded-md bg-neutral-200">
                {artwork ? <Image src={artwork} alt="Album art" fill className="object-cover" /> : null}
              </div>

              <div>
                <p className="text-lg font-semibold">{track.name}</p>
                <p className="text-sm text-neutral-700">{artistNames}</p>
                <p className="text-sm text-neutral-600">{albumName}</p>

                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-neutral-600">{formatTime(liveProgress)}</span>
                  <div className="h-2 w-64 overflow-hidden rounded bg-neutral-200">
                    <div className="h-full bg-neutral-900" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-neutral-600">{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            {openUrl ? (
              <a className="rounded-md border px-3 py-2 text-sm" href={openUrl} target="_blank" rel="noreferrer">
                Open in Spotify
              </a>
            ) : null}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-md border p-5">
        <h2 className="text-sm font-semibold">Recently Played</h2>

        {!recent?.items || recent.items.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">No recently played items found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-neutral-600">
                  <th className="py-2">Artwork</th>
                  <th className="py-2">Track</th>
                  <th className="py-2">Artist</th>
                  <th className="py-2">Played at</th>
                  <th className="py-2">Open</th>
                </tr>
              </thead>
              <tbody>
                {recent.items.map((row) => {
                  const img = pickImage(row.track.album.images);
                  const playedAt = new Date(row.played_at).toLocaleString();
                  const url = row.track.external_urls?.spotify ?? null;

                  return (
                    <tr key={`${row.track.id}-${row.played_at}`} className="border-t">
                      <td className="py-2">
                        <div className="relative h-10 w-10 overflow-hidden rounded bg-neutral-200">
                          {img ? <Image src={img} alt="" fill className="object-cover" /> : null}
                        </div>
                      </td>
                      <td className="py-2">{row.track.name}</td>
                      <td className="py-2">{row.track.artists.map((a) => a.name).join(", ")}</td>
                      <td className="py-2">{playedAt}</td>
                      <td className="py-2">
                        {url ? (
                          <a className="underline" href={url} target="_blank" rel="noreferrer">
                            Open
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
