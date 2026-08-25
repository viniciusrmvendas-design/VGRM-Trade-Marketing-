import { createClient } from "@/lib/supabase/server";
import type { Company, Store } from "@vgrm/shared";
import { NewStoreForm } from "./new-store-form";

export default async function LojasPage() {
  const supabase = createClient();

  const [{ data: stores }, { data: companies }] = await Promise.all([
    supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<Store[]>(),
    supabase.from("companies").select("*").returns<Company[]>(),
  ]);

  const companyName = (id: string | null) =>
    companies?.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <h1 className="text-xl font-semibold">Lojas</h1>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Cliente (contratante)</th>
                <th className="px-4 py-3">Endereço</th>
                <th className="px-4 py-3">Raio check-in</th>
                <th className="px-4 py-3">Pedido</th>
              </tr>
            </thead>
            <tbody>
              {stores?.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">{companyName(s.company_id)}</td>
                  <td className="px-4 py-3 text-slate-500">{s.address}</td>
                  <td className="px-4 py-3">{s.checkin_radius_m} m</td>
                  <td className="px-4 py-3">
                    {s.allows_order ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                        habilitado
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!stores?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Nenhuma loja cadastrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <NewStoreForm companies={companies ?? []} />
      </div>
    </div>
  );
}
