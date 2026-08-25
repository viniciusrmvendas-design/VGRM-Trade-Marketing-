"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Company } from "@vgrm/shared";

export function NewStoreForm({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("150");
  const [companyId, setCompanyId] = useState("");
  const [allowsOrder, setAllowsOrder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function useCurrentLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      () => setError("Não foi possível obter sua localização."),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("stores").insert({
      name,
      address,
      lat: Number(lat),
      lng: Number(lng),
      checkin_radius_m: Number(radius),
      company_id: companyId || null,
      allows_order: allowsOrder,
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setName("");
    setAddress("");
    setLat("");
    setLng("");
    setAllowsOrder(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="h-fit rounded-lg bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold">Nova loja</h2>

      <label className="mt-4 block text-xs font-medium text-slate-600">Nome</label>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      <label className="mt-3 block text-xs font-medium text-slate-600">Endereço</label>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">Latitude</label>
          <input
            required
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Longitude</label>
          <input
            required
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={useCurrentLocation}
        className="mt-2 text-xs text-brand-accent underline"
      >
        Usar minha localização atual
      </button>

      <label className="mt-3 block text-xs font-medium text-slate-600">
        Raio de check-in (metros)
      </label>
      <input
        required
        type="number"
        min={20}
        value={radius}
        onChange={(e) => setRadius(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      <label className="mt-3 block text-xs font-medium text-slate-600">
        Cliente (contratante)
      </label>
      <select
        value={companyId}
        onChange={(e) => setCompanyId(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Nenhum</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600">
        <input
          type="checkbox"
          checked={allowsOrder}
          onChange={(e) => setAllowsOrder(e.target.checked)}
        />
        Permite lançar pedido nesta loja
      </label>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-4 w-full rounded-md bg-brand-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Cadastrar loja"}
      </button>
    </form>
  );
}
