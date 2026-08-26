-- =========================================================================
-- Corrige recursão infinita nas policies de RLS.
--
-- Causa: stores_promotor_select (em `stores`) consultava `visits`, e
-- visits_cliente_select (em `visits`) consultava `stores` de volta -
-- o Postgres detecta esse ciclo e recusa a query.
--
-- Solução: mover as consultas cruzadas para funções `security definer`
-- (que já usamos em auth_role/auth_company_id) - elas rodam com bypass
-- de RLS, então deixam de disparar a policy da outra tabela.
-- =========================================================================

create or replace function auth_assigned_store_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select store_id from visits where assigned_to = auth.uid();
$$;

create or replace function auth_client_store_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from stores where company_id = auth_company_id();
$$;

create or replace function auth_client_visit_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select v.id from visits v join stores s on s.id = v.store_id
  where s.company_id = auth_company_id();
$$;

create or replace function auth_client_order_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select o.id from orders o join stores s on s.id = o.store_id
  where s.company_id = auth_company_id();
$$;

-- stores: promotor/vendedor só vê lojas da própria rota
drop policy if exists stores_promotor_select on stores;
create policy stores_promotor_select on stores for select
  using (
    auth_role() in ('promotor', 'vendedor')
    and id in (select auth_assigned_store_ids())
  );

-- visits: cliente vê as visitas das lojas da própria empresa
drop policy if exists visits_cliente_select on visits;
create policy visits_cliente_select on visits for select
  using (
    auth_role() = 'cliente'
    and store_id in (select auth_client_store_ids())
  );

-- visit_photos: idem
drop policy if exists visit_photos_cliente_select on visit_photos;
create policy visit_photos_cliente_select on visit_photos for select
  using (
    auth_role() = 'cliente'
    and visit_id in (select auth_client_visit_ids())
  );

-- visit_signatures: idem
drop policy if exists visit_signatures_cliente_select on visit_signatures;
create policy visit_signatures_cliente_select on visit_signatures for select
  using (
    auth_role() = 'cliente'
    and visit_id in (select auth_client_visit_ids())
  );

-- orders: idem
drop policy if exists orders_cliente_select on orders;
create policy orders_cliente_select on orders for select
  using (
    auth_role() = 'cliente'
    and store_id in (select auth_client_store_ids())
  );

-- order_items: idem
drop policy if exists order_items_cliente_select on order_items;
create policy order_items_cliente_select on order_items for select
  using (
    auth_role() = 'cliente'
    and order_id in (select auth_client_order_ids())
  );

-- storage (fotos/assinatura): idem, usando a mesma função para consistência
drop policy if exists visit_media_cliente_select on storage.objects;
create policy visit_media_cliente_select on storage.objects for select
  using (
    bucket_id = 'visit-media'
    and auth_role() = 'cliente'
    and (storage.foldername(name))[1] in (
      select v::text from auth_client_visit_ids() as v
    )
  );
