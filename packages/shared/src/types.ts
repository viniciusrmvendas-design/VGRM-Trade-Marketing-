// Tipos espelhando o schema do Supabase (supabase/migrations/0001_init.sql).
// Se o schema mudar, atualize este arquivo junto (ou gere via `supabase gen types`).

export type UserRole = "gestor" | "vendedor" | "promotor" | "cliente";

export type VisitStatus = "pendente" | "check_in" | "check_out" | "cancelada";

export type PhotoKind = "antes" | "depois";

export type OrderStatus = "rascunho" | "enviado" | "confirmado" | "cancelado";

export interface Company {
  id: string;
  name: string;
  document: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  company_id: string | null;
  active: boolean;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  document: string | null;
  address: string | null;
  lat: number;
  lng: number;
  checkin_radius_m: number;
  company_id: string | null;
  allows_order: boolean;
  owner_user_id: string | null;
  active: boolean;
  created_at: string;
}

export interface Route {
  id: string;
  name: string;
  created_by: string;
  notes: string | null;
  created_at: string;
}

export interface Visit {
  id: string;
  route_id: string | null;
  store_id: string;
  assigned_to: string;
  scheduled_date: string; // YYYY-MM-DD
  status: VisitStatus;

  check_in_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_distance_m: number | null;

  check_out_at: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_distance_m: number | null;

  notes: string | null;
  created_at: string;
}

/** Visita com dados da loja já resolvidos, como retornado pelas telas de rota. */
export interface VisitWithStore extends Visit {
  store: Store;
}

export interface VisitPhoto {
  id: string;
  visit_id: string;
  kind: PhotoKind;
  storage_path: string;
  taken_at: string;
  created_by: string;
}

export interface VisitSignature {
  id: string;
  visit_id: string;
  signer_name: string;
  signer_document: string | null;
  storage_path: string;
  signed_at: string;
}

export interface Product {
  id: string;
  sku: string | null;
  name: string;
  price: number;
  company_id: string | null;
  active: boolean;
}

export interface Order {
  id: string;
  visit_id: string | null;
  store_id: string;
  created_by: string;
  status: OrderStatus;
  total_amount: number;
  notes: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  description: string;
  qty: number;
  unit_price: number;
  subtotal: number;
}

/** Bucket único no Storage para fotos e assinaturas de visita. */
export const VISIT_MEDIA_BUCKET = "visit-media";

/** Monta o path padrão de um arquivo de visita dentro do bucket visit-media. */
export function visitMediaPath(
  visitId: string,
  fileName: string
): string {
  return `${visitId}/${fileName}`;
}
