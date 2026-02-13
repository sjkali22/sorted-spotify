import NextAuth, { type NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

type SpotifyToken = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: "RefreshAccessTokenError";
};

async function refreshSpotifyAccessToken(token: SpotifyToken): Promise<SpotifyToken> {
  try {
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
        refresh_token: token.refreshToken ?? "",
      }),
    });

    const refreshed = await res.json();
    if (!res.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID ?? "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
      authorization:
        "https://accounts.spotify.com/authorize?scope=user-read-email user-read-private",
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      const t = token as SpotifyToken;

      if (account) {
        return {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires:
            typeof account.expires_at === "number" ? account.expires_at * 1000 : 0,
        } satisfies SpotifyToken;
      }

      if (typeof t.accessTokenExpires === "number" && Date.now() < t.accessTokenExpires) {
        return token;
      }

      return refreshSpotifyAccessToken(t);
    },

    async session({ session, token }) {
      const t = token as SpotifyToken;
      (session as any).accessToken = t.accessToken;
      (session as any).error = t.error;
      return session;
    },

    async redirect({ url, baseUrl }) {
      // after login, always land in /home unless already going somewhere else on same site
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/home`;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
