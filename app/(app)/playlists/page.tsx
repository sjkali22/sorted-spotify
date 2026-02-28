// app/(app)/playlists/page.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type SpotifyImage = { url: string; width?: number; height?: number };

type Playlist = {
  id: string;
  name: string;
  images?: SpotifyImage[];
  owner?: { display_name?: string; id?: string };
  public?: boolean;
  collaborative?: boolean;
  description?: string;
  tracks?: { total?: number };
};

type SortMode = "default" | "name_asc" | "name_desc";

type PlaylistsApiResponse = {
  items: Playlist[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  error?: string;
  retryAfter?: number;
};

const DISPLAY_PAGE_SIZE = 25;
const FETCH_LIMIT = 50; // max Spotify allows for /me/playlists

function pickImage(images?: SpotifyImage[]) {
  return images?.[0]?.url ?? "";
}

function PrivacyBadge({ value }: { value: boolean | undefined }) {
  const common =
    "absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-black/55 text-white ring-1 ring-white/10";

  if (value === true) {
    return (
      <span className={common} title="Public">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" />
          <path d="M2 12h20" />
          <path d="M12 2a15 15 0 0 1 0 20" />
          <path d="M12 2a15 15 0 0 0 0 20" />
        </svg>
      </span>
    );
  }

  if (value === false) {
    return (
      <span className={common} title="Private">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <path d="M6 11h12v10H6z" />
        </svg>
      </span>
    );
  }

  return (
    <span className={common} title="Unknown">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 18h.01" />
        <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4" />
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" />
      </svg>
    </span>
  );
}

function mergeUniqueById(existing: Playlist[], incoming: Playlist[]) {
  const map = new Map<string, Playlist>();
  for (const p of existing) map.set(p.id, p);
  for (const p of incoming) map.set(p.id, p);
  return Array.from(map.values());
}

export default function PlaylistsPage() {
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>("");

  const [retryAfter, setRetryAfter] = useState<number>(0);

  const [playlistSearch, setPlaylistSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("default");

  const [sortOpen, setSortOpen] = useState(false);
  const [sortDraft, setSortDraft] = useState<SortMode>("default");

  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selected = useMemo(
    () => allPlaylists.find((p) => p.id === selectedId) ?? null,
    [allPlaylists, selectedId]
  );

  const fetchInFlightRef = useRef(false);

  async function fetchPlaylistsChunk(offset: number) {
    const r = await fetch(`/api/spotify/playlists?limit=${FETCH_LIMIT}&offset=${offset}`, {
      cache: "no-store",
    });

    let body: PlaylistsApiResponse | null = null;
    try {
      body = (await r.json()) as PlaylistsApiResponse;
    } catch {
      body = null;
    }

    if (!r.ok) {
      const ra = Number((body as any)?.retryAfter ?? 0);
      if (r.status === 429 && ra > 0) {
        setRetryAfter(ra);
        throw new Error(`Rate limited. Try again in ${ra}s.`);
      }
      const msg = (body as any)?.error ? String((body as any).error) : `Request failed (${r.status})`;
      throw new Error(msg);
    }

    return body as PlaylistsApiResponse;
  }

  async function loadInitial() {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;

    setLoading(true);
    setError("");
    setRetryAfter(0);

    try {
      const data = await fetchPlaylistsChunk(0);
      setAllPlaylists(data.items ?? []);
      setTotal(Number(data.total ?? 0));
      setPage(1);

      if (selectedId && !data.items.some((p) => p.id === selectedId)) {
        setSelectedId("");
        setDrawerOpen(false);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load playlists");
      setAllPlaylists([]);
      setTotal(0);
    } finally {
      setLoading(false);
      fetchInFlightRef.current = false;
    }
  }

  async function ensureLoadedUpTo(count: number) {
    if (retryAfter > 0) return;
    if (fetchInFlightRef.current) return;

    if (total > 0 && allPlaylists.length >= Math.min(count, total)) return;

    fetchInFlightRef.current = true;
    setLoadingMore(true);
    setError("");

    try {
      let offset = allPlaylists.length;
      let current = allPlaylists;

      while ((total === 0 || offset < total) && current.length < count) {
        const data = await fetchPlaylistsChunk(offset);
        setTotal(Number(data.total ?? total));
        current = mergeUniqueById(current, data.items ?? []);
        offset = current.length;
        setAllPlaylists(current);

        if (!data.next) break;
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load more playlists");
    } finally {
      setLoadingMore(false);
      fetchInFlightRef.current = false;
    }
  }

  async function ensureAllLoaded() {
    if (retryAfter > 0) return;
    if (fetchInFlightRef.current) return;

    if (total > 0 && allPlaylists.length >= total) return;

    fetchInFlightRef.current = true;
    setLoadingMore(true);
    setError("");

    try {
      let offset = allPlaylists.length;
      let current = allPlaylists;

      while (total === 0 || offset < total) {
        const data = await fetchPlaylistsChunk(offset);
        setTotal(Number(data.total ?? total));
        current = mergeUniqueById(current, data.items ?? []);
        offset = current.length;
        setAllPlaylists(current);

        if (!data.next) break;
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load all playlists");
    } finally {
      setLoadingMore(false);
      fetchInFlightRef.current = false;
    }
  }

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDrawerOpen(true);
  }, [selectedId]);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const t = window.setInterval(() => {
      setRetryAfter((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [retryAfter]);

  useEffect(() => {
    const q = playlistSearch.trim();
    if (!q) return;

    const handle = window.setTimeout(() => {
      ensureAllLoaded();
    }, 300);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistSearch]);

  const sortedPlaylists = useMemo(() => {
    let list = allPlaylists;

    if (sortMode === "name_asc") {
      list = [...list].sort((a, b) =>
        String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { sensitivity: "base" })
      );
    } else if (sortMode === "name_desc") {
      list = [...list].sort((a, b) =>
        String(b.name ?? "").localeCompare(String(a.name ?? ""), undefined, { sensitivity: "base" })
      );
    }

    return list;
  }, [allPlaylists, sortMode]);

  const filteredPlaylists = useMemo(() => {
    const q = playlistSearch.trim().toLowerCase();
    if (!q) return sortedPlaylists;

    return sortedPlaylists.filter((p) => {
      const name = String(p.name ?? "").toLowerCase();
      const owner = String(p.owner?.display_name ?? "").toLowerCase();
      return name.includes(q) || owner.includes(q);
    });
  }, [sortedPlaylists, playlistSearch]);

  const isSearching = playlistSearch.trim().length > 0;
  const totalPages = useMemo(() => {
    const n = isSearching ? filteredPlaylists.length : total;
    return Math.max(1, Math.ceil(n / DISPLAY_PAGE_SIZE));
  }, [filteredPlaylists.length, isSearching, total]);

  const currentPage = Math.min(Math.max(page, 1), totalPages);

  useEffect(() => {
    if (isSearching) return;
    const needed = currentPage * DISPLAY_PAGE_SIZE;
    ensureLoadedUpTo(needed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, isSearching, total]);

  const pageSlice = useMemo(() => {
    const start = (currentPage - 1) * DISPLAY_PAGE_SIZE;
    const end = start + DISPLAY_PAGE_SIZE;
    return filteredPlaylists.slice(start, end);
  }, [filteredPlaylists, currentPage]);

  function openSort() {
    setSortDraft(sortMode);
    setSortOpen(true);
  }
  function closeSort() {
    setSortOpen(false);
  }
  function applySort() {
    setSortMode(sortDraft);
    setSortOpen(false);
  }

  function goToPage(p: number) {
    setPage(p);
  }

  const pageButtons = useMemo(() => {
    const buttons: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) buttons.push(i);

    if (!buttons.includes(1)) buttons.unshift(1);
    if (!buttons.includes(totalPages)) buttons.push(totalPages);

    return Array.from(new Set(buttons));
  }, [currentPage, totalPages]);

  return (
    <main className="min-h-[calc(100vh-56px)] bg-primary text-text-primary">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-text-primary">Playlists</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={openSort}
              className="relative rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
              title="Sort playlists"
            >
              Sort
              {sortMode === "default" ? null : (
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-2 text-xs font-semibold text-white">
                  1
                </span>
              )}
            </button>

            <button
              onClick={loadInitial}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)] disabled:opacity-50"
              disabled={loading || loadingMore}
              title="Refresh playlists"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
        {retryAfter > 0 ? (
          <p className="mt-2 text-xs text-text-muted">Retry available in {retryAfter}s</p>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={playlistSearch}
            onChange={(e) => {
              setPlaylistSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search playlists…"
            className="w-full max-w-md rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
          />

          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <span>
              Page <span className="font-semibold text-text-primary">{currentPage}</span> / {totalPages}
            </span>
            {loadingMore ? <span className="text-xs text-text-muted">Loading…</span> : null}
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-text-muted">Loading…</p>
        ) : filteredPlaylists.length === 0 ? (
          <p className="mt-6 text-sm text-text-muted">No playlists found.</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {pageSlice.map((p) => {
                const cover = pickImage(p.images);
                const active = p.id === selectedId;

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={[
                      "group relative overflow-hidden rounded-xl border text-left transition-colors",
                      active ? "border-accent" : "border-border",
                      "bg-surface hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]",
                    ].join(" ")}
                  >
                    <div className="relative aspect-square w-full bg-surface-hover">
                      {cover ? <Image src={cover} alt="" fill className="object-cover" /> : null}
                      <PrivacyBadge value={p.public} />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3">
                        <div className="truncate text-sm font-semibold text-text-primary">{p.name}</div>
                        <div className="mt-1 truncate text-xs text-text-secondary">
                          {p.owner?.display_name ? `By ${p.owner.display_name}` : " "}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || retryAfter > 0}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>

              {pageButtons.map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  disabled={retryAfter > 0}
                  className={[
                    "rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    p === currentPage
                      ? "border-accent bg-surface-hover text-text-primary"
                      : "border-border bg-surface text-text-primary hover:bg-surface-hover",
                  ].join(" ")}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || retryAfter > 0}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {sortOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={closeSort} />
          <div className="absolute left-1/2 top-1/2 w-[min(720px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="text-2xl font-semibold text-text-primary">Sort your playlists</div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-text-secondary">Sort by:</div>

              <div className="mt-3 space-y-3 text-sm text-text-primary">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="sort"
                    checked={sortDraft === "default"}
                    onChange={() => setSortDraft("default")}
                    className="accent-[var(--accent)]"
                  />
                  Default (custom order)
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="sort"
                    checked={sortDraft === "name_asc"}
                    onChange={() => setSortDraft("name_asc")}
                    className="accent-[var(--accent)]"
                  />
                  Playlist name (A → Z)
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="sort"
                    checked={sortDraft === "name_desc"}
                    onChange={() => setSortDraft("name_desc")}
                    className="accent-[var(--accent)]"
                  />
                  Playlist name (Z → A)
                </label>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setSortDraft("default")}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover"
              >
                Reset
              </button>

              <button
                onClick={closeSort}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover"
              >
                Cancel
              </button>

              <button
                onClick={applySort}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`fixed inset-0 z-40 ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setDrawerOpen(false)}
        />

        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-md transform border-l border-border bg-surface text-text-primary shadow-xl transition-transform ${
            drawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{selected?.name ?? "Playlist"}</div>
              <div className="truncate text-xs text-text-muted">
                {selected?.owner?.display_name ? `Made by ${selected.owner.display_name}` : " "}
              </div>
            </div>

            <button
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
              onClick={() => setDrawerOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="p-4">
            <div className="text-xs font-semibold text-text-muted">OPEN</div>
            <a
              className="mt-2 block rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
              href={selected ? `https://open.spotify.com/playlist/${selected.id}` : "#"}
              target="_blank"
              rel="noreferrer"
            >
              Open on Spotify
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}