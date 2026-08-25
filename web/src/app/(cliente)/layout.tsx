import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole("cliente");

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-brand">Portal do Cliente</p>
            <p className="text-xs text-slate-500">{profile.full_name}</p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
