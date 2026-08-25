import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@vgrm/shared";

/** Usuário logado + perfil (papel). Redireciona para /login se não autenticado. */
export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    redirect("/login");
  }

  return { user, profile };
}

/** Igual a requireUser, mas também garante que o papel está na lista permitida. */
export async function requireRole(...roles: UserRole[]) {
  const { user, profile } = await requireUser();
  if (!roles.includes(profile.role)) {
    redirect("/");
  }
  return { user, profile };
}
