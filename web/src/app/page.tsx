import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function HomePage() {
  const { profile } = await requireUser();

  if (profile.role === "gestor") redirect("/dashboard");
  if (profile.role === "cliente") redirect("/portal");
  // vendedor / promotor usam o app mobile no dia a dia; aqui só um aviso
  redirect("/app-mobile");
}
