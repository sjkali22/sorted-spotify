// app/(app)/settings/page.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type Theme = "system" | "dark";

type TimeRange = "short_term" | "medium_term" | "long_term";

type SortOrder = "asc" | "desc";

type PlaylistSortBy =
  | "track"
  | "artist"
  | "album"
  | "release_date"
  | "popularity"
  | "date_added";

type Preferences = {
  defaultTimeRange: TimeRange;
  playlistSortBy: PlaylistSortBy;
  playlistSortOrder: SortOrder;
  theme: Theme;
};

const DEFAULTS: Preferences = {
  defaultTimeRange: "short_term",
  playlistSortBy: "track",
  playlistSortOrder: "asc",
  theme: "system",
};

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function initialsOf(name: string | null | undefined) {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "S";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

export default function SettingsPage() {
  const { data: session, status } = useSession();

  const spotifyUserId =
    (session as any)?.spotifyUserId ??
    (session as any)?.user?.id ??
    (session as any)?.user?.spotifyId ??
    "—";

  const displayName = (session as any)?.user?.name ?? "—";
  const email = (session as any)?.user?.email ?? "—";

  const sessionLabel = status === "authenticated" ? "Active" : status === "loading" ? "Loading" : "None";

  const initials = useMemo(() => initialsOf(displayName), [displayName]);

  const [prefs, setPrefs] = useState<Preferences>(() => {
    const stored = safeJsonParse<Preferences>(typeof window !== "undefined" ? localStorage.getItem("sorted:prefs") : null);
    return stored ? { ...DEFAULTS, ...stored } : DEFAULTS;
  });

  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!dirty) return;
    setSaveState("idle");
  }, [dirty]);

  function setPref<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }

  async function onSave() {
    setSaveState("saving");
    try {
      localStorage.setItem("sorted:prefs", JSON.stringify(prefs));
      setDirty(false);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setSaveState("idle");
    }
  }

  function openSpotifyApps() {
    window.open("https://www.spotify.com/account/apps/", "_blank", "noopener,noreferrer");
  }

  function clearLocalData() {
    localStorage.removeItem("sorted:prefs");
    setPrefs(DEFAULTS);
    setDirty(false);
    setSaveState("idle");
  }

  function clearSessionOnly() {
    setDirty(false);
    setSaveState("idle");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* LEFT: Preferences */}
      <section className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
        <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">Preferences for how SORTED behaves on this device.</p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-primary p-4">
            <div className="text-xs font-semibold text-text-secondary">Default time range</div>
            <p className="mt-2 text-xs text-text-muted">Used for Stats by default.</p>

            <select
              className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
              value={prefs.defaultTimeRange}
              onChange={(e) => setPref("defaultTimeRange", e.target.value as TimeRange)}
            >
              <option value="short_term">1 month</option>
              <option value="medium_term">6 months</option>
              <option value="long_term">12 months</option>
            </select>
          </div>

          <div className="rounded-xl border border-border bg-primary p-4">
            <div className="text-xs font-semibold text-text-secondary">Theme</div>
            <p className="mt-2 text-xs text-text-muted">System uses your OS preference.</p>

            <select
              className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
              value={prefs.theme}
              onChange={(e) => setPref("theme", e.target.value as Theme)}
            >
              <option value="system">System</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="rounded-xl border border-border bg-primary p-4">
            <div className="text-xs font-semibold text-text-secondary">Playlist sort</div>
            <p className="mt-2 text-xs text-text-muted">Default sort option for playlist tools.</p>

            <select
              className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
              value={prefs.playlistSortBy}
              onChange={(e) => setPref("playlistSortBy", e.target.value as PlaylistSortBy)}
            >
              <option value="track">Track</option>
              <option value="artist">Artist</option>
              <option value="album">Album</option>
              <option value="release_date">Release date</option>
              <option value="popularity">Popularity</option>
              <option value="date_added">Date added</option>
            </select>

            <div className="mt-3 flex gap-2">
              <button
                className={[
                  "flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]",
                  prefs.playlistSortOrder === "asc"
                    ? "border-border bg-surface-hover text-text-primary"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                ].join(" ")}
                onClick={() => setPref("playlistSortOrder", "asc")}
              >
                Asc
              </button>
              <button
                className={[
                  "flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]",
                  prefs.playlistSortOrder === "desc"
                    ? "border-border bg-surface-hover text-text-primary"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                ].join(" ")}
                onClick={() => setPref("playlistSortOrder", "desc")}
              >
                Desc
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-primary p-4">
            <div className="text-xs font-semibold text-text-secondary">Debug</div>
            <p className="mt-2 text-xs text-text-muted">Clear UI save state without changing preferences.</p>

            <button
              onClick={clearSessionOnly}
              className="mt-3 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
            >
              Reset save state
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <div className="text-xs text-text-muted">
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : dirty ? "Unsaved changes" : ""}
          </div>

          <button
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)] disabled:opacity-60"
            onClick={onSave}
            disabled={!dirty || saveState === "saving"}
          >
            Save changes
          </button>
        </div>
      </section>

      {/* RIGHT: Account */}
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-primary text-sm font-semibold text-text-primary">
            {initials}
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-text-primary">{displayName}</div>
            <div className="truncate text-xs text-text-muted">{email}</div>
          </div>
        </div>

        <div className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-text-muted">Spotify user id</span>
            <span className="text-text-primary">{spotifyUserId}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-text-muted">Session</span>
            <span className="text-text-primary">{sessionLabel}</span>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-5 w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
        >
          Sign out
        </button>
      </section>

      {/* FULL WIDTH: Data & Access */}
      <section className="rounded-2xl border border-border bg-surface p-6 lg:col-span-3">
        <h2 className="text-sm font-semibold tracking-wide text-text-secondary">Data &amp; Access</h2>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-primary p-4">
            <div className="text-xs font-semibold text-text-secondary">Spotify access</div>
            <p className="mt-2 text-xs text-text-muted">
              To fully revoke SORTED&apos;s access, remove it from Spotify Account Apps.
            </p>

            <button
              onClick={openSpotifyApps}
              className="mt-3 w-full rounded-xl border border-border bg-surface px-4 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
            >
              Open Spotify access apps
            </button>
          </div>

          <div className="rounded-xl border border-border bg-primary p-4">
            <div className="text-xs font-semibold text-text-secondary">Local app data</div>
            <p className="mt-2 text-xs text-text-muted">Choose what to clear (does not affect Spotify).</p>

            <button
              onClick={clearLocalData}
              className="mt-3 w-full rounded-xl border border-border bg-surface px-4 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
            >
              Clear local preferences
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}