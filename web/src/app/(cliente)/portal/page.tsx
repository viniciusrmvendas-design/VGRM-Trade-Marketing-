import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Store, Visit } from "@vgrm/shared";
import { StatusBadge } from "@/components/status-badge";
import { ExportCsvButton } from "@/components/export-csv-button";

type VisitRow = Visit & { store: Store; assigned: Profile };

export default async function PortalPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const from = searchParams.from ?? today;
  const to = searchParams.to ?? today;

  // RLS já restringe automaticamente às lojas da empresa do usuário logado.
  const { data: visits } = await supabase
    .from("visits")
    .select("*, store:stores(*), assigned:profiles!visits_assigned_to_fkey(*)")
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .order("scheduled_date", { ascending: false })
    .returns<VisitRow[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Atendimentos</h1>
        <ExportCsvButton from={from} to={to} />
      </div>

      <form className="mt-4 flex gap-3">
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="rounded-md bg-brand-accent px-4 py-2 text-sm text-white">
          Filtrar
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Loja</th>
              <th className="px-4 py-3">Promotor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visits?.map((v) => (
              <tr key={v.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  {new Date(`${v.scheduled_date}T00:00:00`).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 font-medium">{v.store?.name}</td>
                <td className="px-4 py-3">{v.assigned?.full_name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={v.status} />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/portal/${v.id}`}
                    className="text-brand-accent hover:underline"
                  >
                    Ver atendimento
                  </Link>
                </td>
              </tr>
            ))}
            {!visits?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhum atendimento no período selecionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
