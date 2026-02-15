import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Main Spotify image host
      { protocol: "https", hostname: "i.scdn.co" },

      // Spotify CDN variants used for playlist/album/artist images
      { protocol: "https", hostname: "image-cdn-ak.spotifycdn.com" },
      { protocol: "https", hostname: "image-cdn-fa.spotifycdn.com" },
      { protocol: "https", hostname: "image-cdn-uk.spotifycdn.com" },
      { protocol: "https", hostname: "image-cdn-nl.spotifycdn.com" },

      // Other Spotify image hosts that show up sometimes
      { protocol: "https", hostname: "mosaic.scdn.co" },
      { protocol: "https", hostname: "seeded-session-images.scdn.co" },
    ],
  },
};

export default nextConfig;
