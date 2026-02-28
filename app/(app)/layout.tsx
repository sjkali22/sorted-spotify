import TopNav from "../components/TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-primary text-text-primary">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}