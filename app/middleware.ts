import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/home/:path*", "/stats/:path*", "/playlists/:path*", "/settings/:path*"],
};
