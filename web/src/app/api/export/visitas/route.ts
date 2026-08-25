import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Store, Visit } from "@vgrm/shared";

type VisitRow = Visit & { store: Store; assigned: Profile };

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const HEADERS = [
  "data",
  "loja",
  "endereco",
  "responsavel",
  "status",
  "check_in",
  "check_in_distancia_m",
  "check_out",
  "check_out_distancia_m",
];

// Requer usuário autenticado; o RLS do Supabase já restringe os resultados
// ao escopo do usuário logado (cliente vê só sua empresa, gestor vê tudo).
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? from;

  const { data: visits, error } = await supabase
    .from("visits")
    .select("*, store:stores(*), assigned:profiles!visits_assigned_to_fkey(*)")
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .order("scheduled_date", { ascending: false })
    .returns<VisitRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (visits ?? []).map((v) =>
    [
      v.scheduled_date,
      v.store?.name,
      v.store?.address,
      v.assigned?.full_name,
      v.status,
      v.check_in_at ?? "",
      v.check_in_distance_m ?? "",
      v.check_out_at ?? "",
      v.check_out_distance_m ?? "",
    ]
      .map(csvEscape)
      .join(",")
  );

  const csv = [HEADERS.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="visitas_${from}_a_${to}.csv"`,
    },
  });
}
