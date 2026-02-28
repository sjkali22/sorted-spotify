// app/components/TopNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/home", label: "Home" },
  { href: "/stats", label: "Stats" },
  { href: "/playlists", label: "Playlists" },
  { href: "/settings", label: "Settings" },
] as const;

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/home"
          className="text-sm font-semibold tracking-wide text-text-primary hover:text-text-primary"
        >
          SORTED
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {links.map((l) => {
            const active = pathname === l.href;

            return (
              <Link
                key={l.href}
                href={l.href}
                className={[
                  "rounded-md px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-4",
                  "focus-visible:ring-[rgba(59,130,246,0.45)]",
                  active
                    ? "text-accent font-semibold"
                    : "text-text-secondary hover:text-text-primary",
                ].join(" ")}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}