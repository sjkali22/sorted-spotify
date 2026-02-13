"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <main style={{ padding: 24 }}>
      <h1>Login</h1>

      {error ? (
        <p style={{ marginTop: 12, color: "crimson" }}>
          Login failed ({error}). Try again.
        </p>
      ) : null}

      <button
        style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8 }}
        onClick={() => signIn("spotify", { callbackUrl: "/home" })}
      >
        Sign in with Spotify
      </button>
    </main>
  );
}
