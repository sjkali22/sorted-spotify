"use client";

import Image from "next/image";
import type { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";

type SettingsSession = Session & {
  spotifyUserId?: string;
  user?: Session["user"] & {
    id?: string;
    spotifyId?: string;
  };
};

function initialsOf(name: string | null | undefined) {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "S";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const typedSession = session as SettingsSession | null;

  const spotifyUserId =
    typedSession?.spotifyUserId ??
    typedSession?.user?.id ??
    typedSession?.user?.spotifyId ??
    "-";

  const displayName = session?.user?.name ?? "â€”";
  const email = session?.user?.email ?? "â€”";
  const profileImage = session?.user?.image ?? null;

  const sessionLabel =
    status === "authenticated" ? "Active" : status === "loading" ? "Loading" : "None";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">
          Manage your profile in one place.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {profileImage ? (
              <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border bg-primary">
                <Image
                  src={profileImage}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-primary text-lg font-semibold text-text-primary">
                {initialsOf(displayName)}
              </div>
            )}

            <div className="min-w-0">
              <div className="truncate text-xl font-semibold text-text-primary">{displayName}</div>
              <div className="truncate text-sm text-text-secondary">{email}</div>
              <div className="mt-2 inline-flex rounded-full border border-border bg-primary/60 px-3 py-1 text-xs font-medium text-text-secondary">
                Spotify session:{" "}
                <span
                  className={[
                    "ml-1 font-semibold uppercase tracking-[0.08em]",
                    sessionLabel === "Active"
                      ? "text-green-400"
                      : sessionLabel === "Loading"
                      ? "text-yellow-300"
                      : "text-text-primary",
                  ].join(" ")}
                >
                  {sessionLabel}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-red-400 transition-colors hover:bg-accent-hover hover:text-red-300 active:bg-accent-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
          >
            Sign out
          </button>
        </div>

        <div className="mt-6">
          <div className="rounded-xl border border-border bg-primary/35 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
              Account
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Spotify user id</span>
                <span className="break-all text-right text-text-primary">{spotifyUserId}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">Email</span>
                <span className="text-right text-text-primary">{email}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
