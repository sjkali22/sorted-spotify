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
    (session as any)?.user?.id ??
    (session as any)?.profile?.id ??
    (session as any)?.spotifyUserId ??
    "—";

  const sessionLabel =
    status === "authenticated"
      ? "Active"
      : status === "loading"
        ? "Loading"
        : "Not signed in";

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
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-white/50">
            Preferences are saved locally on this device.
          </p>
        </div>

        {dirty ? (
          <div className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
            Unsaved changes
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT: Preferences */}
        <section className="lg:col-span-2 rounded-2xl border border-white/15 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold tracking-wide text-white/80">Preferences</h2>
            <div className="text-xs text-white/45">
              Current: {prettyRange(prefs.defaultStatsRange)} • {prettySort(prefs.defaultPlaylistSort)} •{" "}
              {prettyDir(prefs.defaultSortDir)}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-white/70">Default stats range</label>
              <select
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                value={draft.defaultStatsRange}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, defaultStatsRange: e.target.value as StatsRange }))
                }
              >
                <option value="4w">4 weeks</option>
                <option value="6m">6 months</option>
                <option value="12m">12 months</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70">Default playlist sort</label>
              <select
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                value={draft.defaultPlaylistSort}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, defaultPlaylistSort: e.target.value as PlaylistSort }))
                }
              >
                <option value="track">Track name</option>
                <option value="artist">Artist</option>
                <option value="album">Album</option>
                <option value="popularity">Popularity</option>
                <option value="dateAdded">Date added</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70">Default sort direction</label>
              <select
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                value={draft.defaultSortDir}
                onChange={(e) => setDraft((d) => ({ ...d, defaultSortDir: e.target.value as SortDir }))}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs font-semibold text-white/70">Preview</div>
              <div className="mt-2 text-sm text-white/85">
                {prettyRange(draft.defaultStatsRange)}
              </div>
              <div className="mt-1 text-xs text-white/50">
                {prettySort(draft.defaultPlaylistSort)} • {prettyDir(draft.defaultSortDir)}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={onReset}
              disabled={!dirty}
              className="rounded-xl border border-white/15 bg-black/20 px-5 py-2 text-sm font-medium hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
            <button
              onClick={onSave}
              disabled={!dirty}
              className="rounded-xl border border-white/15 bg-white/10 px-5 py-2 text-sm font-medium hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save changes
            </button>
          </div>
        </section>

        {/* RIGHT: Account */}
        <section className="rounded-2xl border border-white/15 bg-white/5 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/30 text-sm font-semibold">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white/90">{displayName}</div>
              <div className="truncate text-xs text-white/50">{email}</div>
            </div>
          </div>

          <div className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-white/60">Spotify user id</span>
              <span className="text-white/90">{spotifyUserId}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/60">Session</span>
              <span className="text-white/90">{sessionLabel}</span>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-5 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
          >
            Sign out
          </button>
        </section>

        {/* FULL WIDTH: Data & Access */}
        <section className="lg:col-span-3 rounded-2xl border border-white/15 bg-white/5 p-6">
          <h2 className="text-sm font-semibold tracking-wide text-white/80">Data &amp; Access</h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs font-semibold text-white/70">Spotify access</div>
              <p className="mt-2 text-xs text-white/50">
                To fully revoke SORTED&apos;s access, remove it from Spotify Account Apps.
              </p>
              <button
                onClick={openSpotifyApps}
                className="mt-3 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-xs font-medium hover:bg-black/30"
              >
                Open Spotify access apps
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs font-semibold text-white/70">Local app data</div>
              <p className="mt-2 text-xs text-white/50">Choose what to clear (does not affect Spotify).</p>

              <div className="mt-3 space-y-2 text-sm">
                <label className="flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    checked={clearPrefs}
                    onChange={(e) => setClearPrefs(e.target.checked)}
                  />
                  Preferences
                </label>

                <label className="flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    checked={clearOther}
                    onChange={(e) => setClearOther(e.target.checked)}
                  />
                  Other (cache)
                </label>
              </div>

              <button
                onClick={clearAppData}
                className="mt-4 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium hover:bg-white/15"
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