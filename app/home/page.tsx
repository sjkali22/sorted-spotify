import { spotifyFetch } from "@/lib/spotify";

type SpotifyMe = {
  id: string;
  display_name: string | null;
};

export default async function HomePage() {
  const me = await spotifyFetch<SpotifyMe>("/v1/me");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Home</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Welcome, {me.display_name ?? me.id}
      </p>
    </main>
  );
}
