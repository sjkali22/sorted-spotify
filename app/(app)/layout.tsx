// app/(app)/layout.tsx
import type { ReactNode } from "react";
import TopNav from "../components/TopNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-primary text-text-primary font-sans">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}