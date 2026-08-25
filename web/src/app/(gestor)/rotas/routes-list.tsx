type RouteRow = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  visits: { count: number }[];
};

export function RoutesList({ routes }: { routes: RouteRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Rota</th>
            <th className="px-4 py-3">Visitas lançadas</th>
            <th className="px-4 py-3">Criada em</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">{r.name}</td>
              <td className="px-4 py-3">{r.visits?.[0]?.count ?? 0}</td>
              <td className="px-4 py-3 text-slate-500">
                {new Date(r.created_at).toLocaleDateString("pt-BR")}
              </td>
            </tr>
          ))}
          {!routes.length && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                Nenhuma rota lançada ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
