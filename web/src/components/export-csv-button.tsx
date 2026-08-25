"use client";

export function ExportCsvButton({ from, to }: { from: string; to: string }) {
  const href = `/api/export/visitas?from=${from}&to=${to}`;

  return (
    <a
      href={href}
      className="rounded-md border border-brand-accent px-4 py-2 text-sm text-brand-accent hover:bg-brand-accent hover:text-white"
    >
      Exportar CSV
    </a>
  );
}
