// app/api/auth/[...nextauth]/route.ts

import NextAuth, { type NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

type SpotifyToken = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number; // ms epoch
  scope?: string;
  error?: "RefreshAccessTokenError";
};

const scope = [
  "user-read-email",
  "user-read-private",
  "user-top-read",
  "user-read-recently-played",
  "user-read-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

async function refreshSpotifyAccessToken(token: SpotifyToken): Promise<SpotifyToken> {
  try {
    if (!token.refreshToken) return { ...token, error: "RefreshAccessTokenError" };

    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = await res.json();
    if (!res.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      scope: refreshed.scope ?? token.scope,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID ?? "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope,
          prompt: "consent",
          show_dialog: "true",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      const t = token as SpotifyToken;

      // Initial sign-in
      if (account) {
        return {
          ...token, // ✅ preserve existing NextAuth fields (sub, name, email, etc.)
          accessToken: (account as any).access_token,
          refreshToken: (account as any).refresh_token,
          accessTokenExpires:
            typeof (account as any).expires_at === "number"
              ? (account as any).expires_at * 1000
              : Date.now() + 3600 * 1000,
          scope: (account as any).scope,
          error: undefined,
        } satisfies SpotifyToken;
      }

      // If we still have a valid access token, return it
      if (typeof t.accessTokenExpires === "number" && Date.now() < t.accessTokenExpires) {
        return token;
      }

      // Otherwise, refresh
      return refreshSpotifyAccessToken(t);
    },

    async session({ session, token }) {
      const t = token as SpotifyToken;
      (session as any).accessToken = t.accessToken;
      (session as any).scope = t.scope;
      (session as any).error = t.error;
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/home`;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };