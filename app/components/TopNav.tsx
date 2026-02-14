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
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <Link href="/home" className="text-sm font-semibold">
          SORTED
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={active ? "font-semibold underline" : "text-neutral-600 hover:text-neutral-900"}
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
