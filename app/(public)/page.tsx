// app/(public)/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/home");

  return (
    <main className="min-h-screen bg-primary text-text-primary">
      {/* Top nav */}
      <header className="mx-auto max-w-6xl px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold tracking-wide text-text-primary">SORTED</div>
            <div className="hidden text-xs text-text-muted sm:block">
              Simplify • Organise • Refresh • Tweak • Enhance • Diagnose
            </div>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/login"
              className="rounded-lg bg-accent px-4 py-2 font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
            >
              Sign in with Spotify
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 sm:p-10">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Sort your playlists. <span className="text-accent">Fix the mess.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base text-text-secondary">
              SORTED is a Spotify playlist companion for people who want cleaner playlist management with quick,
              efficient and safe tools, without the clutter.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#features"
                className="rounded-lg border border-border bg-primary px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
              >
                View features
              </a>

              <a
                href="#how"
                className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
              >
                How it works
              </a>
            </div>

            <div className="mx-auto mt-7 grid max-w-xl gap-3 text-sm text-text-secondary">
              <div className="flex items-center justify-center gap-2">
                <span className="text-accent">
                  <CheckIcon />
                </span>
                <span>Sort and organise tracks with useful tools</span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="text-accent">
                  <CheckIcon />
                </span>
                <span>Remove duplicates and unavailable tracks</span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="text-accent">
                  <CheckIcon />
                </span>
                <span>Export your playlists with safety-first UX</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-10">
        <div className="text-center">
          <div className="text-xs font-semibold text-text-muted">FEATURES</div>
          <h2 className="mt-2 text-3xl font-semibold text-text-primary">Everything you need for your playlists</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-text-secondary">Focused tools for Stats and Playlists.</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="text-sm font-semibold text-text-primary">Stats</div>
            <p className="mt-2 text-sm text-text-secondary">View your top artists, tracks and albums at a glance.</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="text-sm font-semibold text-text-primary">Playlists</div>
            <p className="mt-2 text-sm text-text-secondary">View your playlists and edit with range of advanced tools.</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="text-sm font-semibold text-text-primary">Tools</div>
            <p className="mt-2 text-sm text-text-secondary">Sort, shuffle, and remove unavailable tracks, from playlists.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-10">
        <div className="text-center">
          <div className="text-xs font-semibold text-text-muted">HOW IT WORKS</div>
          <h2 className="mt-2 text-3xl font-semibold text-text-primary">Three steps</h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="text-sm font-semibold text-text-primary">1) Sign in</div>
            <p className="mt-2 text-sm text-text-secondary">Connect your Spotify account securely.</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="text-sm font-semibold text-text-primary">2) Choose</div>
            <p className="mt-2 text-sm text-text-secondary">Pick a playlist.</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="text-sm font-semibold text-text-primary">3) Apply</div>
            <p className="mt-2 text-sm text-text-secondary">Run tools with preview + safe changes.</p>
          </div>
        </div>
      </section>

      {/* Single CTA */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl border border-border bg-surface p-8 text-center sm:p-10">
          <h3 className="text-3xl font-semibold text-text-primary">Ready to sort things out?</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-text-secondary">
            Sign in with Spotify and start cleaning up playlists in minutes.
          </p>

          <div className="mt-6 flex justify-center">
            <Link
              href="/login"
              className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
            >
              Sign in with Spotify
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-primary">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-text-muted">
              Privacy note: SORTED uses Spotify authentication and only accesses data needed for app features.
            </div>

            <div className="flex items-center gap-4 text-sm">
              <Link href="/privacy" className="text-text-secondary transition-colors hover:text-text-primary">
                Privacy
              </Link>
              <Link href="/about" className="text-text-secondary transition-colors hover:text-text-primary">
                About
              </Link>
              <a href="mailto:contact@sorted.app" className="text-text-secondary transition-colors hover:text-text-primary">
                Contact
              </a>
            </div>
          </div>

          <div className="mt-4 text-xs text-text-muted">© {new Date().getFullYear()} SORTED</div>
        </div>
      </footer>
    </main>
  );
}