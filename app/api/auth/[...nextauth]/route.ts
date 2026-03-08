import NextAuth, { type NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

type SpotifyJWT = {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  scope?: string;
  error?: "RefreshAccessTokenError";
} & Record<string, unknown>;

const spotifyScope = [
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

async function refreshSpotifyAccessToken(token: SpotifyJWT): Promise<SpotifyJWT> {
  try {
    if (!token.refreshToken) {
      return { ...token, error: "RefreshAccessTokenError" };
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID ?? "";
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? "";

    if (!clientId || !clientSecret) {
      return { ...token, error: "RefreshAccessTokenError" };
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: String(token.refreshToken),
      }),
      cache: "no-store",
    });

    const refreshed = (await response.json().catch(() => null)) as
      | {
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
          scope?: string;
        }
      | null;

    if (!response.ok || !refreshed?.access_token) {
      return { ...token, error: "RefreshAccessTokenError" };
    }

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
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID ?? "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: spotifyScope,
          show_dialog: "true",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      const currentToken = token as SpotifyJWT;

      if (account) {
        const accessToken =
          typeof account.access_token === "string" ? account.access_token : undefined;

        const refreshToken =
          typeof account.refresh_token === "string" ? account.refresh_token : undefined;

        const expiresAtSeconds =
          typeof account.expires_at === "number" ? account.expires_at : undefined;

        const scope =
          typeof account.scope === "string" ? account.scope : currentToken.scope;

        return {
          ...token,
          accessToken,
          refreshToken,
          accessTokenExpires: expiresAtSeconds
            ? expiresAtSeconds * 1000
            : Date.now() + 3600 * 1000,
          scope,
          error: undefined,
        };
      }

      if (
        typeof currentToken.accessToken === "string" &&
        typeof currentToken.accessTokenExpires === "number" &&
        Date.now() < currentToken.accessTokenExpires
      ) {
        return currentToken;
      }

      return refreshSpotifyAccessToken(currentToken);
    },

    async session({ session, token }) {
      const spotifyToken = token as SpotifyJWT;

      (session as typeof session & {
        accessToken?: string;
        scope?: string;
        error?: "RefreshAccessTokenError";
      }).accessToken = spotifyToken.accessToken;

      (session as typeof session & {
        accessToken?: string;
        scope?: string;
        error?: "RefreshAccessTokenError";
      }).scope = spotifyToken.scope;

      (session as typeof session & {
        accessToken?: string;
        scope?: string;
        error?: "RefreshAccessTokenError";
      }).error = spotifyToken.error;

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) return url;
      } catch {}

      return `${baseUrl}/home`;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };