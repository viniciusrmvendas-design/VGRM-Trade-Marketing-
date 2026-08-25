import { createClient } from "@/lib/supabase/server";
import type { Profile, Store } from "@vgrm/shared";
import { NewRouteForm } from "./new-route-form";
import { RoutesList } from "./routes-list";

export default async function RotasPage() {
  const supabase = createClient();

  const [{ data: stores }, { data: reps }, { data: routes }] = await Promise.all([
    supabase.from("stores").select("*").eq("active", true).returns<Store[]>(),
    supabase
      .from("profiles")
      .select("*")
      .in("role", ["promotor", "vendedor"])
      .eq("active", true)
      .returns<Profile[]>(),
    supabase
      .from("routes")
      .select("*, visits(count)")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Rotas</h1>
      <p className="mt-1 text-sm text-slate-500">
        Lance uma rota em massa: escolha as lojas, o responsável e as datas.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_420px]">
        <RoutesList routes={routes ?? []} />
        <NewRouteForm stores={stores ?? []} reps={reps ?? []} />
      </div>
    </div>
  );
}
