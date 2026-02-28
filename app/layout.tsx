import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "SORTED",
  description: "Spotify companion web app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-primary text-text-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}