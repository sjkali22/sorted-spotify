import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {},
  {
    pages: { signIn: "/login" },
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow everything except protected pages
        const isProtected =
          pathname === "/home" ||
          pathname.startsWith("/home/") ||
          pathname === "/stats" ||
          pathname.startsWith("/stats/") ||
          pathname === "/playlists" ||
          pathname.startsWith("/playlists/") ||
          pathname === "/settings" ||
          pathname.startsWith("/settings/");

        if (!isProtected) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
