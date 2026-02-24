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
  tracks?: { total?: number }; // legacy
  items?: { total?: number }; // possible rename
};

type PlaylistItem = {
  added_at?: string | null;
  item?: any;
  track?: any;
};

type SortMode = "default" | "name_asc" | "name_desc";

function pickImage(images?: SpotifyImage[]) {
  return images?.[0]?.url ?? "";
}

function formatArtist(media: any) {
  const artists = media?.artists;
  if (Array.isArray(artists) && artists.length) {
    return artists.map((a: any) => a?.name).filter(Boolean).join(", ");
  }
  return "—";
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

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [playlistsError, setPlaylistsError] = useState<string>("");

  const [playlistSearch, setPlaylistSearch] = useState("");

  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [sortDraft, setSortDraft] = useState<SortMode>("default");

  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(
    () => playlists.find((p) => p.id === selectedId) ?? null,
    [playlists, selectedId]
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"tools" | "items">("tools");

  // Items infinite scroll state
  const LIMIT = 50;
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [itemsTotal, setItemsTotal] = useState<number | null>(null);
  const [itemsOffset, setItemsOffset] = useState(0);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string>("");

  const [query, setQuery] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  async function loadPlaylists() {
    setLoadingPlaylists(true);
    setPlaylistsError("");

    try {
      const r = await fetch("/api/spotify/playlists", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? "Failed to load playlists");

      const list = Array.isArray(data?.items) ? data.items : [];
      setPlaylists(list);

      if (selectedId && !list.some((p: Playlist) => p.id === selectedId)) {
        setSelectedId("");
        setDrawerOpen(false);
      }
    } catch (e: any) {
      setPlaylistsError(e?.message ?? "Failed to load playlists");
    } finally {
      setLoadingPlaylists(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadPlaylists();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDrawerOpen(true);
    setDrawerTab("tools");
  }, [selectedId]);

  useEffect(() => {
    setItems([]);
    setItemsTotal(null);
    setItemsOffset(0);
    setItemsLoading(false);
    setItemsError("");
    setQuery("");
  }, [selectedId]);

  const canLoadMore = useMemo(() => {
    if (itemsLoading) return false;
    if (itemsTotal === null) return true;
    return items.length < itemsTotal;
  }, [itemsLoading, itemsTotal, items.length]);

  async function loadNextPage() {
    if (!selectedId) return;
    if (!canLoadMore) return;

    setItemsLoading(true);
    setItemsError("");

    try {
      const r = await fetch(
        `/api/spotify/playlists/${encodeURIComponent(selectedId)}/items?limit=${LIMIT}&offset=${itemsOffset}`,
        { cache: "no-store" }
      );

      const data = await r.json();

      if (!r.ok) {
        throw new Error(
          data?.error?.message ||
            data?.error ||
            "Playlist items unavailable (Spotify restrictions)."
        );
      }

      const pageItems: PlaylistItem[] = Array.isArray(data?.items) ? data.items : [];
      const total: number = typeof data?.total === "number" ? data.total : itemsTotal ?? pageItems.length;

      setItemsTotal(total);
      setItems((prev) => {
        const seen = new Set(
          prev.map((x: any) => `${x?.item?.id ?? x?.track?.id ?? "x"}|${x?.added_at ?? ""}`)
        );

        const merged = [...prev];
        for (const it of pageItems) {
          const media = it.item ?? it.track ?? null;
          const key = `${media?.id ?? "x"}|${it?.added_at ?? ""}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(it);
          }
        }
        return merged;
      });

      setItemsOffset((o) => o + LIMIT);
    } catch (e: any) {
      setItemsError(e?.message ?? "Failed to load items");
    } finally {
      setItemsLoading(false);
    }
  }

  useEffect(() => {
    if (drawerTab !== "items") return;
    if (!selectedId) return;
    if (items.length === 0 && !itemsLoading && !itemsError) loadNextPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerTab, selectedId]);

  useEffect(() => {
    if (drawerTab !== "items") return;
    if (!sentinelRef.current) return;

    const el = sentinelRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) loadNextPage();
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerTab, canLoadMore, itemsOffset, selectedId]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((it) => {
      const media = it.item ?? it.track ?? null;
      const name = String(media?.name ?? "").toLowerCase();
      const artists = String(formatArtist(media)).toLowerCase();
      const album = String(media?.album?.name ?? "").toLowerCase();
      return name.includes(q) || artists.includes(q) || album.includes(q);
    });
  }, [items, query]);

  const filteredPlaylists = useMemo(() => {
    const q = playlistSearch.trim().toLowerCase();
    let list = q
      ? playlists.filter((p) => {
          const name = String(p.name ?? "").toLowerCase();
          const owner = String(p.owner?.display_name ?? "").toLowerCase();
          return name.includes(q) || owner.includes(q);
        })
      : playlists;

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
  }, [playlists, playlistSearch, sortMode]);

  const sortBadge = useMemo(() => (sortMode === "default" ? 0 : 1), [sortMode]);

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

  return (
    <main className="min-h-[calc(100vh-56px)] bg-zinc-900 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Playlists</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={openSort}
              className="relative rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm hover:bg-zinc-800/40"
              title="Sort playlists"
            >
              Sort
              {sortBadge > 0 ? (
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-400 px-2 text-xs font-semibold text-black">
                  {sortBadge}
                </span>
              ) : null}
            </button>

            <button
              onClick={loadPlaylists}
              className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm hover:bg-zinc-800/40 disabled:opacity-50"
              disabled={loadingPlaylists}
              title="Refresh playlists"
            >
              {loadingPlaylists ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {playlistsError ? <p className="mt-3 text-sm text-red-300">{playlistsError}</p> : null}

        <div className="mt-4">
          <input
            value={playlistSearch}
            onChange={(e) => setPlaylistSearch(e.target.value)}
            placeholder="Search playlists…"
            className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm outline-none"
          />
        </div>

        {loadingPlaylists ? (
          <p className="mt-6 text-sm text-zinc-400">Loading…</p>
        ) : filteredPlaylists.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-400">No playlists found.</p>
        ) : (
          <div
            className="
              mt-6 grid grid-cols-2 gap-4
              sm:grid-cols-3
              md:grid-cols-4
              lg:grid-cols-5
            "
          >
            {filteredPlaylists.map((p) => {
              const cover = pickImage(p.images);
              const active = p.id === selectedId;

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`group relative overflow-hidden rounded-xl border text-left ${
                    active ? "border-zinc-600" : "border-zinc-800"
                  } bg-zinc-950/30 hover:bg-zinc-800/20`}
                >
                  <div className="relative aspect-square w-full bg-zinc-800">
                    {cover ? <Image src={cover} alt="" fill className="object-cover" /> : null}
                    <PrivacyBadge value={p.public} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3">
                      <div className="truncate text-sm font-semibold">{p.name}</div>
                      <div className="mt-1 truncate text-xs text-zinc-300">
                        {p.owner?.display_name ? `By ${p.owner.display_name}` : " "}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sort modal (ONLY sort options) */}
      {sortOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={closeSort} />
          <div className="absolute left-1/2 top-1/2 w-[min(720px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="text-2xl font-semibold">Sort your playlists</div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-zinc-200">Sort by:</div>

              <div className="mt-3 space-y-3 text-sm">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="sort"
                    checked={sortDraft === "default"}
                    onChange={() => setSortDraft("default")}
                  />
                  Default (custom order)
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="sort"
                    checked={sortDraft === "name_asc"}
                    onChange={() => setSortDraft("name_asc")}
                  />
                  Playlist name (A → Z)
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="sort"
                    checked={sortDraft === "name_desc"}
                    onChange={() => setSortDraft("name_desc")}
                  />
                  Playlist name (Z → A)
                </label>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setSortDraft("default")}
                className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-2 text-sm hover:bg-zinc-800/40"
              >
                Reset
              </button>

              <button
                onClick={closeSort}
                className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-2 text-sm hover:bg-zinc-800/40"
              >
                Cancel
              </button>

              <button
                onClick={applySort}
                className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-semibold text-black hover:bg-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Drawer overlay */}
      <div className={`fixed inset-0 z-40 ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setDrawerOpen(false)}
        />

        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-md transform border-l border-zinc-800 bg-zinc-950 text-zinc-100 shadow-xl transition-transform ${
            drawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-zinc-800 p-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{selected?.name ?? "Playlist"}</div>
              <div className="truncate text-xs text-zinc-400">
                {selected?.owner?.display_name ? `Made by ${selected.owner.display_name}` : " "}
              </div>
            </div>

            <button
              className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-xs hover:bg-zinc-800/40"
              onClick={() => setDrawerOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="flex gap-2 border-b border-zinc-800 p-3">
            <button
              onClick={() => setDrawerTab("tools")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                drawerTab === "tools"
                  ? "bg-zinc-700"
                  : "border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/40"
              }`}
            >
              Tools
            </button>
            <button
              onClick={() => setDrawerTab("items")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                drawerTab === "items"
                  ? "bg-zinc-700"
                  : "border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/40"
              }`}
            >
              List items
            </button>
          </div>

          {drawerTab === "tools" ? (
            <div className="p-4">
              <div className="text-xs font-semibold text-zinc-400">CREATION TOOLS</div>
              <div className="mt-2 space-y-2 text-sm">
                <button className="w-full rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-left hover:bg-zinc-800/40">
                  Create similar (placeholder)
                </button>
                <button className="w-full rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-left hover:bg-zinc-800/40">
                  Filtered by genre (placeholder)
                </button>
                <button className="w-full rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-left hover:bg-zinc-800/40">
                  Dedupe (placeholder)
                </button>
                <button className="w-full rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-left hover:bg-zinc-800/40">
                  Shuffle (placeholder)
                </button>
              </div>

              <div className="mt-6 text-xs font-semibold text-zinc-400">OPEN</div>
              <a
                className="mt-2 block rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm hover:bg-zinc-800/40"
                href={selected ? `https://open.spotify.com/playlist/${selected.id}` : "#"}
                target="_blank"
                rel="noreferrer"
              >
                Open on Spotify
              </a>
            </div>
          ) : (
            <div className="flex h-[calc(100%-112px)] flex-col">
              <div className="border-b border-zinc-800 p-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search items…"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-sm outline-none"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
                  <span>
                    Loaded: {items.length}
                    {itemsTotal !== null ? ` / ${itemsTotal}` : ""}
                  </span>
                  <button
                    className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-2 py-1 hover:bg-zinc-800/40"
                    onClick={() => {
                      setItems([]);
                      setItemsTotal(null);
                      setItemsOffset(0);
                      setItemsError("");
                      setTimeout(() => loadNextPage(), 0);
                    }}
                  >
                    Refresh
                  </button>
                </div>

                {itemsError ? (
                  <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-2 text-xs text-zinc-300">
                    {itemsError}
                  </div>
                ) : null}
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {filteredItems.map((it, idx) => {
                  const media = it.item ?? it.track ?? null;
                  const name = media?.name ?? "—";
                  const artists = formatArtist(media);
                  const album = media?.album?.name ?? "—";
                  const img = pickImage(media?.album?.images);

                  return (
                    <div
                      key={`${media?.id ?? "x"}-${it?.added_at ?? idx}-${idx}`}
                      className="mb-2 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/20 p-3"
                    >
                      <div className="relative h-10 w-10 overflow-hidden rounded-md bg-zinc-800">
                        {img ? <Image src={img} alt="" fill className="object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{name}</div>
                        <div className="truncate text-xs text-zinc-400">
                          {artists} · {album}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {itemsLoading ? <p className="mt-2 text-xs text-zinc-400">Loading…</p> : null}

                <div ref={sentinelRef} className="h-10" />

                {!itemsLoading && itemsTotal !== null && items.length >= itemsTotal ? (
                  <p className="mt-2 text-xs text-zinc-500">All items loaded.</p>
                ) : null}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}