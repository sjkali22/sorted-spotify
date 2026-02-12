"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <button
        onClick={() => signIn("spotify", { callbackUrl: "/home" })}
        style={{
          padding: "12px 18px",
          borderRadius: 10,
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        Sign in with Spotify
      </button>
    </main>
  );
}
