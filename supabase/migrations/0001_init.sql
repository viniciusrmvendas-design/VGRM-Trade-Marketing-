-- =========================================================================
-- VGRM Trade Marketing - schema inicial
-- Papeis: gestor | vendedor | promotor | cliente
-- =========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type user_role as enum ('gestor', 'vendedor', 'promotor', 'cliente');
create type visit_status as enum ('pendente', 'check_in', 'check_out', 'cancelada');
create type photo_kind as enum ('antes', 'depois');
create type order_status as enum ('rascunho', 'enviado', 'confirmado', 'cancelado');

-- ---------------------------------------------------------------------
-- companies: empresas CONTRATANTES do serviço de promotoria/trade
-- (o "cliente" que só enxerga o próprio atendimento)
-- ---------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- profiles: 1:1 com auth.users, carrega o papel de cada pessoa
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  full_name text not null,
  phone text,
  -- só preenchido para role = 'cliente': a que empresa contratante essa pessoa pertence
  company_id uuid references companies (id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on profiles (role);
create index profiles_company_idx on profiles (company_id);

-- ---------------------------------------------------------------------
-- stores: pontos de venda / lojas (rota do promotor e carteira do vendedor)
-- ---------------------------------------------------------------------
create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text, -- CNPJ/CPF
  address text,
  lat double precision not null,
  lng double precision not null,
  checkin_radius_m integer not null default 150,
  -- empresa contratante para quem esse PDV é reportado (trade marketing); pode ser nulo
  company_id uuid references companies (id),
  -- permite ao promotor/vendedor lançar pedido nessa loja durante a visita
  allows_order boolean not null default false,
  -- vendedor que abriu essa conta
  owner_user_id uuid references profiles (id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index stores_company_idx on stores (company_id);
create index stores_owner_idx on stores (owner_user_id);

-- ---------------------------------------------------------------------
-- routes: agrupador criado pelo gestor para lançar visitas em massa
-- ---------------------------------------------------------------------
create table routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references profiles (id),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- visits: cada parada de rota (1 loja, 1 responsável, 1 data)
-- ---------------------------------------------------------------------
create table visits (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references routes (id) on delete set null,
  store_id uuid not null references stores (id),
  assigned_to uuid not null references profiles (id), -- promotor ou vendedor
  scheduled_date date not null,
  status visit_status not null default 'pendente',

  check_in_at timestamptz,
  check_in_lat double precision,
  check_in_lng double precision,
  check_in_distance_m double precision,

  check_out_at timestamptz,
  check_out_lat double precision,
  check_out_lng double precision,
  check_out_distance_m double precision,

  notes text,
  created_at timestamptz not null default now()
);

create index visits_assigned_idx on visits (assigned_to, scheduled_date);
create index visits_store_idx on visits (store_id);
create index visits_route_idx on visits (route_id);
create unique index visits_unique_stop on visits (route_id, store_id, assigned_to, scheduled_date);

-- ---------------------------------------------------------------------
-- visit_photos: fotos de antes/depois (arquivo fica no Storage, aqui só o path)
-- ---------------------------------------------------------------------
create table visit_photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references visits (id) on delete cascade,
  kind photo_kind not null,
  storage_path text not null,
  taken_at timestamptz not null default now(),
  created_by uuid not null references profiles (id)
);

create index visit_photos_visit_idx on visit_photos (visit_id);

-- ---------------------------------------------------------------------
-- visit_signatures: assinatura do responsável na loja para liberar o check-out
-- ---------------------------------------------------------------------
create table visit_signatures (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references visits (id) on delete cascade,
  signer_name text not null,
  signer_document text,
  storage_path text not null, -- imagem da assinatura no Storage
  signed_at timestamptz not null default now()
);

create index visit_signatures_visit_idx on visit_signatures (visit_id);

-- ---------------------------------------------------------------------
-- products / orders / order_items: pedidos lançados em loja (allows_order = true)
-- ---------------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  sku text,
  name text not null,
  price numeric(12, 2) not null default 0,
  company_id uuid references companies (id), -- catálogo pode ser específico de um cliente
  active boolean not null default true
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits (id),
  store_id uuid not null references stores (id),
  created_by uuid not null references profiles (id),
  status order_status not null default 'rascunho',
  total_amount numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index orders_store_idx on orders (store_id);
create index orders_created_by_idx on orders (created_by);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id),
  description text not null,
  qty numeric(12, 3) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  subtotal numeric(12, 2) generated always as (qty * unit_price) stored
);

create index order_items_order_idx on order_items (order_id);

-- =========================================================================
-- FUNÇÕES AUXILIARES
-- =========================================================================

-- papel do usuário logado
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

-- empresa (contratante) do usuário logado, quando role = cliente
create or replace function auth_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid();
$$;

-- distância em metros entre dois pontos (haversine)
create or replace function haversine_distance_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable as $$
  select 6371000 * acos(
    least(1, greatest(-1,
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1))
      + sin(radians(lat1)) * sin(radians(lat2))
    ))
  );
$$;

-- registra check-in: só permite se estiver dentro do raio da loja
create or replace function register_check_in(
  p_visit_id uuid, p_lat double precision, p_lng double precision
) returns visits
language plpgsql security definer set search_path = public as $$
declare
  v_visit visits;
  v_store stores;
  v_distance double precision;
begin
  select * into v_visit from visits where id = p_visit_id;
  if v_visit.id is null then
    raise exception 'Visita não encontrada';
  end if;
  if v_visit.assigned_to <> auth.uid() then
    raise exception 'Você não é o responsável por esta visita';
  end if;
  if v_visit.status <> 'pendente' then
    raise exception 'Visita já possui check-in registrado';
  end if;

  select * into v_store from stores where id = v_visit.store_id;
  v_distance := haversine_distance_m(p_lat, p_lng, v_store.lat, v_store.lng);

  if v_distance > v_store.checkin_radius_m then
    raise exception 'Você está a %m da loja (limite de %m). Aproxime-se para fazer check-in.',
      round(v_distance), v_store.checkin_radius_m;
  end if;

  update visits set
    status = 'check_in',
    check_in_at = now(),
    check_in_lat = p_lat,
    check_in_lng = p_lng,
    check_in_distance_m = v_distance
  where id = p_visit_id
  returning * into v_visit;

  return v_visit;
end;
$$;

-- registra check-out: exige foto de antes+depois, assinatura e proximidade da loja
create or replace function register_check_out(
  p_visit_id uuid, p_lat double precision, p_lng double precision
) returns visits
language plpgsql security definer set search_path = public as $$
declare
  v_visit visits;
  v_store stores;
  v_distance double precision;
  v_before_count int;
  v_after_count int;
  v_signature_count int;
begin
  select * into v_visit from visits where id = p_visit_id;
  if v_visit.id is null then
    raise exception 'Visita não encontrada';
  end if;
  if v_visit.assigned_to <> auth.uid() then
    raise exception 'Você não é o responsável por esta visita';
  end if;
  if v_visit.status <> 'check_in' then
    raise exception 'É necessário fazer check-in antes do check-out';
  end if;

  select count(*) into v_before_count from visit_photos where visit_id = p_visit_id and kind = 'antes';
  select count(*) into v_after_count from visit_photos where visit_id = p_visit_id and kind = 'depois';
  select count(*) into v_signature_count from visit_signatures where visit_id = p_visit_id;

  if v_before_count = 0 then
    raise exception 'É necessário anexar ao menos 1 foto de ANTES';
  end if;
  if v_after_count = 0 then
    raise exception 'É necessário anexar ao menos 1 foto de DEPOIS';
  end if;
  if v_signature_count = 0 then
    raise exception 'É necessária a assinatura do responsável pela loja';
  end if;

  select * into v_store from stores where id = v_visit.store_id;
  v_distance := haversine_distance_m(p_lat, p_lng, v_store.lat, v_store.lng);

  if v_distance > v_store.checkin_radius_m then
    raise exception 'Você está a %m da loja (limite de %m). Aproxime-se para fazer check-out.',
      round(v_distance), v_store.checkin_radius_m;
  end if;

  update visits set
    status = 'check_out',
    check_out_at = now(),
    check_out_lat = p_lat,
    check_out_lng = p_lng,
    check_out_distance_m = v_distance
  where id = p_visit_id
  returning * into v_visit;

  return v_visit;
end;
$$;

-- lançamento de rota em massa: 1 rota + N lojas x N datas para 1 responsável
create or replace function create_route_bulk(
  p_route_name text,
  p_assigned_to uuid,
  p_store_ids uuid[],
  p_dates date[],
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_route_id uuid;
  v_store_id uuid;
  v_date date;
begin
  if auth_role() <> 'gestor' then
    raise exception 'Somente gestores podem lançar rotas';
  end if;

  insert into routes (name, created_by, notes)
  values (p_route_name, auth.uid(), p_notes)
  returning id into v_route_id;

  foreach v_store_id in array p_store_ids loop
    foreach v_date in array p_dates loop
      insert into visits (route_id, store_id, assigned_to, scheduled_date)
      values (v_route_id, v_store_id, p_assigned_to, v_date)
      on conflict do nothing;
    end loop;
  end loop;

  return v_route_id;
end;
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table companies enable row level security;
alter table profiles enable row level security;
alter table stores enable row level security;
alter table routes enable row level security;
alter table visits enable row level security;
alter table visit_photos enable row level security;
alter table visit_signatures enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- companies: gestor gerencia tudo; cliente vê só a própria empresa
create policy companies_gestor_all on companies for all
  using (auth_role() = 'gestor') with check (auth_role() = 'gestor');
create policy companies_cliente_select on companies for select
  using (auth_role() = 'cliente' and id = auth_company_id());

-- profiles: gestor vê/gerencia todos; qualquer usuário vê o próprio perfil
create policy profiles_gestor_all on profiles for all
  using (auth_role() = 'gestor') with check (auth_role() = 'gestor');
create policy profiles_self_select on profiles for select
  using (id = auth.uid());
create policy profiles_self_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- stores: gestor tudo; vendedor gerencia as próprias; promotor vê as da sua rota;
-- cliente vê só as lojas da própria empresa
create policy stores_gestor_all on stores for all
  using (auth_role() = 'gestor') with check (auth_role() = 'gestor');
create policy stores_vendedor_manage on stores for all
  using (auth_role() = 'vendedor' and owner_user_id = auth.uid())
  with check (auth_role() = 'vendedor' and owner_user_id = auth.uid());
create policy stores_promotor_select on stores for select
  using (
    auth_role() in ('promotor', 'vendedor')
    and id in (select store_id from visits where assigned_to = auth.uid())
  );
create policy stores_cliente_select on stores for select
  using (auth_role() = 'cliente' and company_id = auth_company_id());

-- routes: gestor gerencia; responsáveis pelas visitas da rota podem ver
create policy routes_gestor_all on routes for all
  using (auth_role() = 'gestor') with check (auth_role() = 'gestor');
create policy routes_assigned_select on routes for select
  using (id in (select route_id from visits where assigned_to = auth.uid()));

-- visits: gestor tudo; responsável vê/atualiza as próprias; cliente vê as da sua empresa
create policy visits_gestor_all on visits for all
  using (auth_role() = 'gestor') with check (auth_role() = 'gestor');
create policy visits_assigned_select on visits for select
  using (assigned_to = auth.uid());
create policy visits_assigned_update on visits for update
  using (assigned_to = auth.uid()) with check (assigned_to = auth.uid());
create policy visits_cliente_select on visits for select
  using (
    auth_role() = 'cliente'
    and store_id in (select id from stores where company_id = auth_company_id())
  );

-- visit_photos: gestor tudo; responsável da visita insere/vê; cliente vê (via visita)
create policy visit_photos_gestor_all on visit_photos for all
  using (auth_role() = 'gestor') with check (auth_role() = 'gestor');
create policy visit_photos_owner_all on visit_photos for all
  using (visit_id in (select id from visits where assigned_to = auth.uid()))
  with check (visit_id in (select id from visits where assigned_to = auth.uid()));
create policy visit_photos_cliente_select on visit_photos for select
  using (
    auth_role() = 'cliente'
    and visit_id in (
      select v.id from visits v join stores s on s.id = v.store_id
      where s.company_id = auth_company_id()
    )
  );

-- visit_signatures: mesmas regras das fotos
create policy visit_signatures_gestor_all on visit_signatures for all
  using (auth_role() = 'gestor') with check (auth_role() = 'gestor');
create policy visit_signatures_owner_all on visit_signatures for all
  using (visit_id in (select id from visits where assigned_to = auth.uid()))
  with check (visit_id in (select id from visits where assigned_to = auth.uid()));
create policy visit_signatures_cliente_select on visit_signatures for select
  using (
    auth_role() = 'cliente'
    and visit_id in (
      select v.id from visits v join stores s on s.id = v.store_id
      where s.company_id = auth_company_id()
    )
  );

-- products: gestor tudo; demais papéis autenticados podem ler catálogo ativo
create policy products_gestor_all on products for all
  using (auth_role() = 'gestor') with check (auth_role() = 'gestor');
create policy products_read on products for select
  using (auth.uid() is not null and active = true);

-- orders/order_items: gestor tudo; criador gerencia os próprios pedidos;
-- cliente vê pedidos das lojas da sua empresa
create policy orders_gestor_all on orders for all
  using (auth_role() = 'gestor') with check (auth_role() = 'gestor');
create policy orders_owner_all on orders for all
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy orders_cliente_select on orders for select
  using (
    auth_role() = 'cliente'
    and store_id in (select id from stores where company_id = auth_company_id())
  );

create policy order_items_gestor_all on order_items for all
  using (auth_role() = 'gestor') with check (auth_role() = 'gestor');
create policy order_items_owner_all on order_items for all
  using (order_id in (select id from orders where created_by = auth.uid()))
  with check (order_id in (select id from orders where created_by = auth.uid()));
create policy order_items_cliente_select on order_items for select
  using (
    auth_role() = 'cliente'
    and order_id in (
      select o.id from orders o join stores s on s.id = o.store_id
      where s.company_id = auth_company_id()
    )
  );

-- =========================================================================
-- STORAGE: bucket para fotos e assinaturas das visitas
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('visit-media', 'visit-media', false)
on conflict (id) do nothing;

create policy visit_media_owner_rw on storage.objects for all
  using (
    bucket_id = 'visit-media'
    and (storage.foldername(name))[1] in (
      select id::text from visits where assigned_to = auth.uid()
    )
  )
  with check (
    bucket_id = 'visit-media'
    and (storage.foldername(name))[1] in (
      select id::text from visits where assigned_to = auth.uid()
    )
  );

create policy visit_media_gestor_all on storage.objects for all
  using (bucket_id = 'visit-media' and auth_role() = 'gestor')
  with check (bucket_id = 'visit-media' and auth_role() = 'gestor');

create policy visit_media_cliente_select on storage.objects for select
  using (
    bucket_id = 'visit-media'
    and auth_role() = 'cliente'
    and (storage.foldername(name))[1] in (
      select v.id::text from visits v join stores s on s.id = v.store_id
      where s.company_id = auth_company_id()
    )
  );
