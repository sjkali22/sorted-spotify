// app/(public)/login/page.tsx
"use client";

import { Suspense, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginPageContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "authenticated") router.replace("/home");
  }, [status, router]);

  const callbackUrl = searchParams.get("callbackUrl") || "/home";

  if (status === "loading") return null;

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold text-text-primary">Login</h1>
        <p className="mt-2 text-sm text-text-secondary">Sign in with Spotify to continue.</p>

        <button
          className="mt-6 w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,130,246,0.45)]"
          onClick={() => signIn("spotify", { callbackUrl })}
        >
          Continue with Spotify
        </button>

        <p className="mt-3 text-xs text-text-muted">
          You&apos;ll be redirected to Spotify to approve access.
        </p>
      </div>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold text-text-primary">Login</h1>
        <p className="mt-2 text-sm text-text-secondary">Loading sign-in options...</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
