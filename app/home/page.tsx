import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  return (
    <main style={{ padding: 24 }}>
      <h1>Home</h1>
      <pre style={{ marginTop: 16 }}>{JSON.stringify(session, null, 2)}</pre>
    </main>
  );
}
