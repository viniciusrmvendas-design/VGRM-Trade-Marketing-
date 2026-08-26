import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getCounts() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [stores, visitsToday, checkedOutToday, pending] = await Promise.all([
    supabase.from("stores").select("id", { count: "exact", head: true }),
    supabase
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("scheduled_date", today),
    supabase
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .eq("status", "check_out"),
    supabase
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .eq("status", "pendente"),
  ]);

  return {
    stores: stores.count ?? 0,
    visitsToday: visitsToday.count ?? 0,
    checkedOutToday: checkedOutToday.count ?? 0,
    pending: pending.count ?? 0,
  };
}

export default async function DashboardPage() {
  const counts = await getCounts();

  const cards = [
    { label: "Lojas cadastradas", value: counts.stores },
    { label: "Visitas hoje", value: counts.visitsToday },
    { label: "Concluídas hoje", value: counts.checkedOutToday },
    { label: "Pendentes hoje", value: counts.pending },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold">Visão geral</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-2xl font-semibold text-brand">{c.value}</p>
            <p className="mt-1 text-sm text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
