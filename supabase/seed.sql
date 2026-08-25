-- Dados de exemplo para desenvolvimento local (supabase db reset)
-- Usuários (auth.users/profiles) não são criados aqui: crie-os pelo Studio
-- ou pela API de admin e depois rode os inserts de profiles/stores abaixo
-- trocando os UUIDs pelos ids reais gerados.

insert into companies (id, name, document) values
  ('11111111-1111-1111-1111-111111111111', 'Cliente Exemplo Ltda', '00.000.000/0001-00')
on conflict (id) do nothing;

insert into products (id, sku, name, price, company_id) values
  ('22222222-2222-2222-2222-222222222221', 'SKU-001', 'Produto Exemplo 1', 19.90, '11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222', 'SKU-002', 'Produto Exemplo 2', 29.90, '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;
