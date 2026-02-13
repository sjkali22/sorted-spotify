import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./api/auth/[...nextauth]/route";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  if (session) redirect("/home");

  return (
    <main style={{ padding: 24 }}>
      <h1>SORTED</h1>
      <p style={{ marginTop: 12 }}>
        Spotify companion app for stats and playlist tools.
      </p>

      <div style={{ marginTop: 16 }}>
        <a href="/login">Go to login</a>
      </div>
    </main>
  );
}
