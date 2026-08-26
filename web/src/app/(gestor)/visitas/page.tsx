import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Store, Visit } from "@vgrm/shared";
import { StatusBadge } from "@/components/status-badge";
import { ExportCsvButton } from "@/components/export-csv-button";

export const dynamic = "force-dynamic";

type VisitRow = Visit & { store: Store; assigned: Profile };

export default async function VisitasPage({
  searchParams,
}: {
  searchParams: { date?: string; status?: string };
}) {
  const supabase = createClient();
  const date = searchParams.date ?? new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("visits")
    .select("*, store:stores(*), assigned:profiles!visits_assigned_to_fkey(*)")
    .eq("scheduled_date", date)
    .order("created_at", { ascending: false });

  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  const { data: visits } = await query.returns<VisitRow[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Visitas</h1>
        <ExportCsvButton from={date} to={date} />
      </div>

      <form className="mt-4 flex gap-3">
        <input
          type="date"
          name="date"
          defaultValue={date}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={searchParams.status ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="check_in">Check-in feito</option>
          <option value="check_out">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <button className="rounded-md bg-brand-accent px-4 py-2 text-sm text-white">
          Filtrar
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Loja</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Check-in</th>
              <th className="px-4 py-3">Check-out</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visits?.map((v) => (
              <tr key={v.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{v.store?.name}</td>
                <td className="px-4 py-3">{v.assigned?.full_name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={v.status} />
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {v.check_in_at
                    ? new Date(v.check_in_at).toLocaleTimeString("pt-BR")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {v.check_out_at
                    ? new Date(v.check_out_at).toLocaleTimeString("pt-BR")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/visitas/${v.id}`}
                    className="text-brand-accent hover:underline"
                  >
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
            {!visits?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma visita para essa data/filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
