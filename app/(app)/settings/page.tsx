"use client";

import { useEffect, useState } from "react";
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
    status === "authenticated" ? "Active" : status === "loading" ? "Loading" : "Not signed in";

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
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT: Preferences */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <h2 className="text-sm font-semibold tracking-wide text-white/80">PREFERENCES</h2>

            <div className="mt-5 grid grid-cols-1 gap-5">
              <div>
                <label className="block text-xs font-medium text-white/70">DEFAULT STATS RANGE</label>
                <select
                  className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  value={draft.defaultStatsRange}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, defaultStatsRange: e.target.value as StatsRange }))
                  }
                >
                  <option value="4w">4 WEEKS</option>
                  <option value="6m">6 MONTHS</option>
                  <option value="12m">12 MONTHS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70">DEFAULT PLAYLIST SORT</label>
                <select
                  className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  value={draft.defaultPlaylistSort}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, defaultPlaylistSort: e.target.value as PlaylistSort }))
                  }
                >
                  <option value="track">TRACK NAME</option>
                  <option value="artist">ARTIST</option>
                  <option value="album">ALBUM</option>
                  <option value="popularity">POPULARITY</option>
                  <option value="dateAdded">DATE ADDED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70">DEFAULT SORT DIRECTION</label>
                <select
                  className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  value={draft.defaultSortDir}
                  onChange={(e) => setDraft((d) => ({ ...d, defaultSortDir: e.target.value as SortDir }))}
                >
                  <option value="asc">ASCENDING</option>
                  <option value="desc">DESCENDING</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onSave}
                  className="rounded-xl border border-white/15 bg-white/10 px-5 py-2 text-sm font-medium hover:bg-white/15"
                >
                  SAVE
                </button>
                <button
                  onClick={onReset}
                  className="rounded-xl border border-white/15 bg-black/20 px-5 py-2 text-sm font-medium hover:bg-black/30"
                >
                  RESET
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT: Account + Data & Access */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <h2 className="text-sm font-semibold tracking-wide text-white/80">ACCOUNT</h2>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-white/60">Spotify display name:</span>
                <span className="text-white/90">{displayName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/60">Spotify user id:</span>
                <span className="text-white/90">{spotifyUserId}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/60">Email:</span>
                <span className="text-white/90">{email}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-white/60">Session:</span>
                <span className="text-white/90">{sessionLabel}</span>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-5 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
            >
              SIGN OUT
            </button>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <h2 className="text-sm font-semibold tracking-wide text-white/80">DATA &amp; ACCESS</h2>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs font-semibold text-white/70">SPOTIFY ACCESS</div>
              <p className="mt-2 text-xs text-white/50">
                To fully revoke SORTED&apos;s access, remove it from Spotify Account Apps.
              </p>
              <button
                onClick={openSpotifyApps}
                className="mt-3 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-xs font-medium hover:bg-black/30"
              >
                OPEN SPOTIFY ACCESS APPS
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs font-semibold text-white/70">SORTED APP DATA</div>
              <p className="mt-2 text-xs text-white/50">Choose what to clear (does not affect Spotify):</p>

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
                CLEAR APP DATA
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}