"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Store } from "@vgrm/shared";

const WEEKDAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

function buildDates(start: string, end: string, weekdays: number[]): string[] {
  if (!start || !end || !weekdays.length) return [];
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);

  while (cursor <= last) {
    if (weekdays.includes(cursor.getDay())) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function NewRouteForm({
  stores,
  reps,
}: {
  stores: Store[];
  reps: Profile[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const dates = useMemo(
    () => buildDates(startDate, endDate, weekdays),
    [startDate, endDate, weekdays]
  );

  function toggleStore(id: string) {
    setSelectedStores((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function toggleWeekday(v: number) {
    setWeekdays((prev) =>
      prev.includes(v) ? prev.filter((w) => w !== v) : [...prev, v]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedStores.length) {
      setError("Selecione ao menos uma loja.");
      return;
    }
    if (!dates.length) {
      setError("Defina um período e ao menos um dia da semana.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("create_route_bulk", {
      p_route_name: name,
      p_assigned_to: assignedTo,
      p_store_ids: selectedStores,
      p_dates: dates,
      p_notes: notes || null,
    });
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(
      `Rota criada com ${selectedStores.length} loja(s) x ${dates.length} data(s) = ${
        selectedStores.length * dates.length
      } visitas.`
    );
    setName("");
    setSelectedStores([]);
    setNotes("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="h-fit rounded-lg bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold">Lançar rota em massa</h2>

      <label className="mt-4 block text-xs font-medium text-slate-600">
        Nome da rota
      </label>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      <label className="mt-3 block text-xs font-medium text-slate-600">
        Responsável (promotor/vendedor)
      </label>
      <select
        required
        value={assignedTo}
        onChange={(e) => setAssignedTo(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Selecione</option>
        {reps.map((r) => (
          <option key={r.id} value={r.id}>
            {r.full_name} ({r.role})
          </option>
        ))}
      </select>

      <label className="mt-3 block text-xs font-medium text-slate-600">
        Lojas ({selectedStores.length} selecionada(s))
      </label>
      <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-300 p-2">
        {stores.map((s) => (
          <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={selectedStores.includes(s.id)}
              onChange={() => toggleStore(s.id)}
            />
            {s.name}
          </label>
        ))}
        {!stores.length && (
          <p className="text-xs text-slate-400">Cadastre lojas primeiro.</p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">De</label>
          <input
            required
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Até</label>
          <input
            required
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <label className="mt-3 block text-xs font-medium text-slate-600">
        Dias da semana
      </label>
      <div className="mt-1 flex flex-wrap gap-2">
        {WEEKDAYS.map((w) => (
          <button
            key={w.value}
            type="button"
            onClick={() => toggleWeekday(w.value)}
            className={`rounded-full px-3 py-1 text-xs ${
              weekdays.includes(w.value)
                ? "bg-brand-accent text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {dates.length} visita(s) por loja selecionada — total de{" "}
        {dates.length * selectedStores.length} visitas.
      </p>

      <label className="mt-3 block text-xs font-medium text-slate-600">
        Observações
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        rows={2}
      />

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      {success && <p className="mt-3 text-xs text-emerald-600">{success}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-4 w-full rounded-md bg-brand-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? "Lançando..." : "Lançar rota"}
      </button>
    </form>
  );
}
