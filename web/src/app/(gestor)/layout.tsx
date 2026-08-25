import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

const NAV = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/lojas", label: "Lojas" },
  { href: "/rotas", label: "Rotas" },
  { href: "/visitas", label: "Visitas" },
];

export default async function GestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole("gestor");

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-brand">VGRM Trade Marketing</p>
            <p className="text-xs text-slate-500">Olá, {profile.full_name}</p>
          </div>
          <nav className="flex gap-4 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-slate-600 hover:text-brand-accent"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
