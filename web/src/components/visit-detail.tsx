import { createClient } from "@/lib/supabase/server";
import type { Profile, Store, Visit, VisitPhoto, VisitSignature } from "@vgrm/shared";
import { VISIT_MEDIA_BUCKET } from "@vgrm/shared";
import { StatusBadge } from "@/components/status-badge";

type VisitFull = Visit & { store: Store; assigned: Profile };

async function signedUrl(path: string) {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from(VISIT_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function VisitDetail({ visitId }: { visitId: string }) {
  const supabase = createClient();

  const { data: visit } = await supabase
    .from("visits")
    .select("*, store:stores(*), assigned:profiles!visits_assigned_to_fkey(*)")
    .eq("id", visitId)
    .single<VisitFull>();

  if (!visit) {
    return <p className="text-sm text-slate-500">Visita não encontrada.</p>;
  }

  const [{ data: photos }, { data: signatures }] = await Promise.all([
    supabase
      .from("visit_photos")
      .select("*")
      .eq("visit_id", visitId)
      .returns<VisitPhoto[]>(),
    supabase
      .from("visit_signatures")
      .select("*")
      .eq("visit_id", visitId)
      .returns<VisitSignature[]>(),
  ]);

  const photoUrls = await Promise.all(
    (photos ?? []).map(async (p) => ({ ...p, url: await signedUrl(p.storage_path) }))
  );
  const signatureUrls = await Promise.all(
    (signatures ?? []).map(async (s) => ({
      ...s,
      url: await signedUrl(s.storage_path),
    }))
  );

  const before = photoUrls.filter((p) => p.kind === "antes");
  const after = photoUrls.filter((p) => p.kind === "depois");

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{visit.store?.name}</h2>
            <p className="text-sm text-slate-500">{visit.store?.address}</p>
          </div>
          <StatusBadge status={visit.status} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-500">Responsável</dt>
            <dd>{visit.assigned?.full_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Data agendada</dt>
            <dd>{new Date(`${visit.scheduled_date}T00:00:00`).toLocaleDateString("pt-BR")}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Check-in</dt>
            <dd>
              {visit.check_in_at
                ? `${new Date(visit.check_in_at).toLocaleString("pt-BR")} (${Math.round(
                    visit.check_in_distance_m ?? 0
                  )} m)`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Check-out</dt>
            <dd>
              {visit.check_out_at
                ? `${new Date(visit.check_out_at).toLocaleString("pt-BR")} (${Math.round(
                    visit.check_out_distance_m ?? 0
                  )} m)`
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <PhotoGrid title="Fotos - antes" photos={before} />
        <PhotoGrid title="Fotos - depois" photos={after} />
      </div>

      <div className="rounded-lg bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold">Assinatura do responsável</h3>
        {signatureUrls.length ? (
          signatureUrls.map((s) => (
            <div key={s.id} className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {s.url && (
                <img
                  src={s.url}
                  alt={`Assinatura de ${s.signer_name}`}
                  className="h-24 rounded border border-slate-200 bg-white"
                />
              )}
              <p className="mt-1 text-xs text-slate-500">
                {s.signer_name} — {new Date(s.signed_at).toLocaleString("pt-BR")}
              </p>
            </div>
          ))
        ) : (
          <p className="mt-2 text-sm text-slate-400">Sem assinatura registrada.</p>
        )}
      </div>
    </div>
  );
}

function PhotoGrid({
  title,
  photos,
}: {
  title: string;
  photos: { id: string; url: string | null }[];
}) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {photos.map(
          (p) =>
            p.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.url}
                alt={title}
                className="aspect-square rounded object-cover"
              />
            )
        )}
        {!photos.length && (
          <p className="col-span-2 text-sm text-slate-400">Nenhuma foto.</p>
        )}
      </div>
    </div>
  );
}
