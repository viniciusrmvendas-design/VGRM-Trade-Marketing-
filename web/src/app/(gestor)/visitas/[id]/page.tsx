import Link from "next/link";
import { VisitDetail } from "@/components/visit-detail";

export const dynamic = "force-dynamic";

export default function VisitaDetalhePage({ params }: { params: { id: string } }) {
  return (
    <div>
      <Link href="/visitas" className="text-sm text-brand-accent hover:underline">
        ← Voltar
      </Link>
      <div className="mt-4">
        <VisitDetail visitId={params.id} />
      </div>
    </div>
  );
}
