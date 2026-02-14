import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import TopNav from "./components/TopNav";

export const metadata: Metadata = {
  title: "SORTED",
  description: "Spotify companion web app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <TopNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
