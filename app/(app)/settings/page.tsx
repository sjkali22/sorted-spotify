"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";

type StatsRange = "4w" | "6m" | "12m";
type PlaylistSort = "track" | "artist" | "album" | "popularity" | "dateAdded";
type SortDir = "asc" | "desc";

type SettingsPrefs = {
  defaultStatsRange: StatsRange;
  defaultPlaylistSort: PlaylistSort;
  defaultSortDir: SortDir;
};

const LS_KEY = "sorted:settings:prefs";

const DEFAULT_PREFS: SettingsPrefs = {
  defaultStatsRange: "6m",
  defaultPlaylistSort: "dateAdded",
  defaultSortDir: "desc",
};

function readPrefs(): SettingsPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<SettingsPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writePrefs(p: SettingsPrefs) {
  window.localStorage.setItem(LS_KEY, JSON.stringify(p));
}

function isSamePrefs(a: SettingsPrefs, b: SettingsPrefs) {
  return (
    a.defaultStatsRange === b.defaultStatsRange &&
    a.defaultPlaylistSort === b.defaultPlaylistSort &&
    a.defaultSortDir === b.defaultSortDir
  );
}

function prettyRange(r: StatsRange) {
  if (r === "4w") return "4 weeks";
  if (r === "6m") return "6 months";
  return "12 months";
}

function prettySort(s: PlaylistSort) {
  if (s === "track") return "Track name";
  if (s === "artist") return "Artist";
  if (s === "album") return "Album";
  if (s === "popularity") return "Popularity";
  return "Date added";
}

function prettyDir(d: SortDir) {
  return d === "asc" ? "Ascending" : "Descending";
}

export default function SettingsPage() {
  const { data: session, status } = useSession();

  const [prefs, setPrefs] = useState<SettingsPrefs>(DEFAULT_PREFS);
  const [draft, setDraft] = useState<SettingsPrefs>(DEFAULT_PREFS);

  const [clearPrefs, setClearPrefs] = useState(true);
  const [clearOther, setClearOther] = useState(false);

  useEffect(() => {
    const loaded = readPrefs();
    setPrefs(loaded);
    setDraft(loaded);
  }, []);

  const displayName =
    (session as any)?.user?.name ??
    (session as any)?.user?.displayName ??
    (session as any)?.profile?.display_name ??
    "—";

  const email = (session as any)?.user?.email ?? "—";
  const spotifyUserId =
    (session as any)?.user?.id ?? (session as any)?.profile?.id ?? (session as any)?.spotifyUserId ?? "—";

  const sessionLabel = status === "authenticated" ? "Active" : status === "loading" ? "Loading" : "Not signed in";

  const initials = useMemo(() => {
    const name = String(displayName ?? "").trim();
    if (!name || name === "—") return "S";
    const parts = name.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "S";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (a + b).toUpperCase();
  }, [displayName]);

  const dirty = useMemo(() => !isSamePrefs(draft, prefs), [draft, prefs]);

  function onSave() {
    setPrefs(draft);
    writePrefs(draft);
  }

  function onReset() {
    setDraft(prefs);
  }

  function openSpotifyApps() {
    window.open("https://www.spotify.com/account/apps/", "_blank", "noopener,noreferrer");
  }

  function clearAppData() {
    if (typeof window === "undefined") return;

    if (clearPrefs) {
      window.localStorage.removeItem(LS_KEY);
      setPrefs(DEFAULT_PREFS);
      setDraft(DEFAULT_PREFS);
    }

    if (clearOther) {
      window.localStorage.removeItem("sorted:cache");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-muted">Preferences are saved locally on this device.</p>
        </div>

        {dirty ? (
          <div className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-secondary">
            Unsaved changes
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT: Preferences */}
        <section className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold tracking-wide text-text-secondary">Preferences</h2>
            <div className="text-xs text-text-muted">
              Current: {prettyRange(prefs.defaultStatsRange)} • {prettySort(prefs.defaultPlaylistSort)} •{" "}
              {prettyDir(prefs.defaultSortDir)}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-text-secondary">Default stats range</label>
              <select
                className="mt-2 w-full rounded-xl border border-border bg-primary px-3 py-2 text-sm text-text-primary outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
                value={draft.defaultStatsRange}
                onChange={(e) => setDraft((d) => ({ ...d, defaultStatsRange: e.target.value as StatsRange }))}
              >
                <option value="4w">4 weeks</option>
                <option value="6m">6 months</option>
                <option value="12m">12 months</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary">Default playlist sort</label>
              <select
                className="mt-2 w-full rounded-xl border border-border bg-primary px-3 py-2 text-sm text-text-primary outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
                value={draft.defaultPlaylistSort}
                onChange={(e) => setDraft((d) => ({ ...d, defaultPlaylistSort: e.target.value as PlaylistSort }))}
              >
                <option value="track">Track name</option>
                <option value="artist">Artist</option>
                <option value="album">Album</option>
                <option value="popularity">Popularity</option>
                <option value="dateAdded">Date added</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary">Default sort direction</label>
              <select
                className="mt-2 w-full rounded-xl border border-border bg-primary px-3 py-2 text-sm text-text-primary outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
                value={draft.defaultSortDir}
                onChange={(e) => setDraft((d) => ({ ...d, defaultSortDir: e.target.value as SortDir }))}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>

            <div className="rounded-xl border border-border bg-primary p-4">
              <div className="text-xs font-semibold text-text-secondary">Preview</div>
              <div className="mt-2 text-sm text-text-primary">{prettyRange(draft.defaultStatsRange)}</div>
              <div className="mt-1 text-xs text-text-muted">
                {prettySort(draft.defaultPlaylistSort)} • {prettyDir(draft.defaultSortDir)}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={onReset}
              disabled={!dirty}
              className="rounded-xl border border-border bg-surface px-5 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>

            <button
              onClick={onSave}
              disabled={!dirty}
              className="rounded-xl bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover active:bg-accent-pressed disabled:cursor-not-allowed disabled:opacity-50"
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
            onClick={() => signOut({ callbackUrl: "/login" })}
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

              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-center gap-2 text-text-primary">
                  <input
                    type="checkbox"
                    checked={clearPrefs}
                    onChange={(e) => setClearPrefs(e.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  Preferences
                </label>

                <label className="flex items-center gap-2 text-text-primary">
                  <input
                    type="checkbox"
                    checked={clearOther}
                    onChange={(e) => setClearOther(e.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  Other (cache)
                </label>
              </div>

              <button
                onClick={clearAppData}
                className="mt-4 w-full rounded-xl border border-border bg-surface px-4 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
              >
                Clear app data
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}