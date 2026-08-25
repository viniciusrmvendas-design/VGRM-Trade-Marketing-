import type { VisitStatus } from "@vgrm/shared";

const STYLES: Record<VisitStatus, string> = {
  pendente: "bg-slate-100 text-slate-600",
  check_in: "bg-amber-100 text-amber-700",
  check_out: "bg-emerald-100 text-emerald-700",
  cancelada: "bg-red-100 text-red-700",
};

const LABELS: Record<VisitStatus, string> = {
  pendente: "Pendente",
  check_in: "Em andamento",
  check_out: "Concluída",
  cancelada: "Cancelada",
};

export function StatusBadge({ status }: { status: VisitStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
