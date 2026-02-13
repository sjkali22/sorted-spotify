"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "authenticated") router.replace("/home");
  }, [status, router]);

  const callbackUrl = searchParams.get("callbackUrl") || "/home";

  if (status === "loading") return null;

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Sign in with Spotify to continue.
      </p>

      <button
        className="mt-6 rounded-md bg-black px-4 py-2 text-white"
        onClick={() => signIn("spotify", { callbackUrl })}
      >
        Continue with Spotify
      </button>
    </main>
  );
}
