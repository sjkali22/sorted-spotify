"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

// Minimal types for what we use
type SpotifyImage = { url: string; width?: number; height?: number };

type Playlist = {
  id: string;
  name: string;
  public: boolean | null;
  owner?: { display_name?: string };
  images?: SpotifyImage[];
  tracks?: { total?: number }; // older shape
  items?: { total?: number }; // Feb 2026 rename tracks -> items (some responses)
};

type PlaylistItem = {
  added_at?: string;
  track?: {
    id?: string;
    name?: string;
    external_urls?: { spotify?: string };
    album?: { name?: string; images?: SpotifyImage[] };
    artists?: { name?: string }[];
  };
  item?: {
    // Feb 2026 may use item instead of track in some contexts
    id?: string;
    name?: string;
    external_urls?: { spotify?: string };
    album?: { name?: string; images?: SpotifyImage[] };
    artists?: { name?: string }[];
  };
};

function getImageUrl(images?: SpotifyImage[]) {
  return images?.[0]?.url ?? "";
}

function formatAddedAt(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string>("");
  const [selected, setSelected] = useState<Playlist | null>(null);

  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // 1) Load playlists (ALL)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoadingPlaylists(true);
      setPlaylistsError(null);

      try {
        const res = await fetch("/api/spotify/playlists", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error ?? "Failed to load playlists");

        const list: Playlist[] = data?.items ?? [];
        if (cancelled) return;

        setPlaylists(list);

        // Select first playlist by default if none selected
        if (!selectedId && list.length > 0) {
          setSelectedId(list[0].id); // IMPORTANT: id comes from list item
          setSelected(list[0]);
        }
      } catch (e: any) {
        if (cancelled) return;
        setPlaylistsError(e?.message ?? "Failed to load playlists");
      } finally {
        if (!cancelled) setLoadingPlaylists(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) When selectedId changes, reset paging/search and fetch items
  useEffect(() => {
    if (!selectedId) return;

    setOffset(0);
    setQuery("");
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!selectedId) return;

      setItemsLoading(true);
      setItemsError(null);

      try {
        const res = await fetch(
          `/api/spotify/playlists/${encodeURIComponent(
            selectedId
          )}/items?limit=${limit}&offset=${offset}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error ?? "Failed to load tracks");

        const list: PlaylistItem[] = data?.items ?? [];
        if (cancelled) return;

        setItems(list);
      } catch (e: any) {
        if (cancelled) return;
        setItems([]);
        setItemsError(e?.message ?? "Failed to load tracks");
      } finally {
        if (!cancelled) setItemsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedId, offset]);

  // Filter current page client-side (simple V1)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((it) => {
      const t = it.track ?? it.item;
      const name = t?.name ?? "";
      const artist = t?.artists?.map((a) => a.name).join(", ") ?? "";
      const album = t?.album?.name ?? "";
      return (
        name.toLowerCase().includes(q) ||
        artist.toLowerCase().includes(q) ||
        album.toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  // Total tracks display: handle both shapes
  const selectedTotalTracks =
    selected?.items?.total ??
    selected?.tracks?.total ??
    0;

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Playlists</h1>

        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "8px 12px" }} disabled>
            Shuffle
          </button>
          <button style={{ padding: "8px 12px" }} disabled>
            Dedupe
          </button>
          <button style={{ padding: "8px 12px" }} disabled>
            Remove unavailable
          </button>
        </div>
      </div>

      {playlistsError && (
        <p style={{ color: "red", marginTop: 8 }}>{playlistsError}</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        {/* LEFT: playlist list */}
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 12,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
            Your playlists
          </h2>

          {loadingPlaylists ? (
            <p>Loading playlists…</p>
          ) : playlists.length === 0 ? (
            <p>No playlists found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {playlists.map((p) => {
                const active = p.id === selectedId;
                const img = getImageUrl(p.images);
                const total =
                  p.items?.total ?? p.tracks?.total ?? 0;

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      // IMPORTANT: this must set a real id
                      setSelectedId(p.id);
                      setSelected(p);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #ccc",
                      background: active ? "#111" : "#fff",
                      color: active ? "#fff" : "#111",
                      cursor: "pointer",
                    }}
                  >
                    {img ? (
                      <Image
                        src={img}
                        alt=""
                        width={42}
                        height={42}
                        style={{ borderRadius: 6, objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 6,
                          background: "#eee",
                        }}
                      />
                    )}

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.name}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        Tracks: {total}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT: selected playlist + tracks */}
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 12,
            minHeight: 420,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                Playlist selected
              </div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                {selected?.name ?? "—"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                By: {selected?.owner?.display_name ?? "—"} ·{" "}
                {selected?.public ? "Public" : "Private"} · Total tracks:{" "}
                {selectedTotalTracks}
              </div>
            </div>

            {selected?.id ? (
              <a
                href={`https://open.spotify.com/playlist/${selected.id}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  alignSelf: "start",
                  padding: "8px 12px",
                  border: "1px solid #ccc",
                  borderRadius: 8,
                  textDecoration: "none",
                }}
              >
                Open in Spotify
              </a>
            ) : null}
          </div>

          {itemsError && (
            <p style={{ color: "red", marginTop: 10 }}>{itemsError}</p>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tracks in this page…"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />
            <button
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0 || itemsLoading}
              style={{ padding: "8px 12px" }}
            >
              Prev
            </button>
            <button
              onClick={() => setOffset((o) => o + limit)}
              disabled={itemsLoading || items.length < limit}
              style={{ padding: "8px 12px" }}
            >
              Next
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "70px 2fr 1.5fr 1.5fr 140px 60px",
                gap: 10,
                fontSize: 12,
                fontWeight: 700,
                padding: "10px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <div>Artwork</div>
              <div>Track</div>
              <div>Artist</div>
              <div>Album</div>
              <div>Added</div>
              <div>Open</div>
            </div>

            {itemsLoading ? (
              <p style={{ padding: "12px 0" }}>Loading tracks…</p>
            ) : filtered.length === 0 ? (
              <p style={{ padding: "12px 0" }}>No tracks found on this page.</p>
            ) : (
              filtered.map((it, idx) => {
                const t = it.track ?? it.item; // handle both shapes
                const img = getImageUrl(t?.album?.images);
                const artist = t?.artists?.map((a) => a.name).join(", ") ?? "";
                const openUrl = t?.external_urls?.spotify ?? "";
                return (
                  <div
                    key={`${t?.id ?? "x"}-${idx}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "70px 2fr 1.5fr 1.5fr 140px 60px",
                      gap: 10,
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: "1px solid #f2f2f2",
                      fontSize: 13,
                    }}
                  >
                    <div>
                      {img ? (
                        <Image
                          src={img}
                          alt=""
                          width={46}
                          height={46}
                          style={{ borderRadius: 8, objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 8,
                            background: "#eee",
                          }}
                        />
                      )}
                    </div>
                    <div style={{ fontWeight: 700 }}>{t?.name ?? "—"}</div>
                    <div>{artist}</div>
                    <div>{t?.album?.name ?? "—"}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {formatAddedAt(it.added_at)}
                    </div>
                    <div>
                      {openUrl ? (
                        <a href={openUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                );
              })
            )}

            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 10 }}>
              Showing {offset + 1}–{offset + filtered.length} of{" "}
              {selectedTotalTracks || "?"}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
