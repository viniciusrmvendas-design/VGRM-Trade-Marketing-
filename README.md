# VGRM Trade Marketing

App interno para gestão de **rotas, visitas de promotoria e trade marketing**:
gestores lançam rotas em massa, promotores/vendedores executam as visitas em
campo (check-in/checkout com geolocalização, fotos e assinatura) e os
clientes contratantes acompanham o atendimento em um portal somente leitura.

## Papéis e fluxos

| Papel | Onde usa | O que faz |
|---|---|---|
| **Gestor** | Web | Cadastra lojas, lança rotas em massa (N lojas x N datas x 1 responsável), monitora todas as visitas, exporta dados |
| **Vendedor** | Mobile + Web | Abre/gerencia contas de loja, executa visitas e lança pedidos onde a loja permitir |
| **Promotor** | Mobile | Vê só a própria rota do dia, faz check-in (exige estar perto da loja), tira fotos de antes/depois, coleta assinatura do responsável e faz check-out |
| **Cliente (contratante)** | Web (portal) | Acesso somente leitura ao atendimento das lojas da própria empresa, com exportação em CSV |

### Regras de negócio importantes (aplicadas no banco, não só no app)

- **Check-in/check-out só dentro do raio da loja** (`checkin_radius_m`,
  padrão 150 m) — calculado por fórmula de haversine em uma função SQL.
- **Check-out exige**: pelo menos 1 foto "antes", 1 foto "depois" e 1
  assinatura do responsável pela loja. Sem isso, o banco recusa o check-out
  (`register_check_out` lança erro explicando o que falta).
- Essas validações ficam em funções `security definer` no Postgres
  (`supabase/migrations/0001_init.sql`), então nenhum app cliente consegue
  burlar a regra — a validação client-side é só para dar feedback rápido.

## Arquitetura

```
Mobile (Expo)  ──┐
                 ├──►  Supabase (Postgres + Auth + Storage) ◄──  Web (Next.js)
Web (gestor/     │        - RLS por papel                        - painel gestor
cliente)      ───┘        - funções de check-in/out               - portal cliente
                           - bucket "visit-media" (fotos/assinatura)
```

- **Banco de dados / backend**: [Supabase](https://supabase.com) (Postgres +
  Auth + Storage). Todo o controle de acesso é feito via **Row Level
  Security**, então qualquer client (mobile, web, ou uma chamada direta à
  API) respeita as mesmas regras.
- **Web** (`web/`): Next.js 14 (App Router) + Tailwind. Usado pelo gestor
  (cadastros, rotas em massa, monitoramento) e pelo cliente (portal
  read-only). Vendedor/promotor não usam o web no dia a dia — a rota
  `/app-mobile` só mostra um aviso para baixar o app.
- **Mobile** (`mobile/`): Expo + Expo Router + TypeScript. Usado por
  promotores e vendedores em campo: rota do dia, check-in/checkout com
  geolocalização, câmera para fotos, assinatura em tela e lançamento de
  pedido.
- **`packages/shared`**: tipos TypeScript do banco compartilhados entre web
  e mobile, para não duplicar (e não dessincronizar) os modelos.

## Estrutura de pastas

```
supabase/
  migrations/0001_init.sql   # schema completo + RLS + funções de negócio
  seed.sql                   # dados de exemplo para dev local
  config.toml                # config do Supabase CLI (rodar local)
packages/shared/              # tipos TS compartilhados (Visit, Store, etc.)
web/                          # Next.js — painel do gestor + portal do cliente
mobile/                       # Expo — app de campo do promotor/vendedor
```

## Como rodar

### 1. Banco (Supabase)

Crie um projeto em [supabase.com](https://supabase.com) (ou rode local com o
[Supabase CLI](https://supabase.com/docs/guides/cli)) e aplique a migration:

```bash
# projeto na nuvem
supabase link --project-ref SEU_PROJECT_REF
supabase db push

# ou 100% local
supabase start
supabase db reset   # aplica migrations + seed.sql
```

Depois, crie os primeiros usuários (o cadastro público está **desligado** de
propósito — só o gestor cria contas):

1. No Supabase Studio → Authentication → cadastre o usuário (e-mail/senha).
2. Insira a linha correspondente em `profiles` com o `role` certo:

```sql
insert into profiles (id, role, full_name)
values ('UUID_DO_USUARIO_CRIADO', 'gestor', 'Seu Nome');
```

Para usuários com `role = 'cliente'`, preencha também `company_id` apontando
para a linha em `companies`.

### 2. Web (gestor + portal do cliente)

```bash
cd web
cp .env.example .env.local   # preencha com a URL/anon key do seu projeto
npm install
npm run dev
```

### 3. Mobile (promotor/vendedor)

```bash
cd mobile
cp .env.example .env   # EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npx expo start
```

Abra no Expo Go (para testar rápido) ou gere um build de desenvolvimento
(`npx expo run:android` / `npx expo run:ios`) para usar câmera/GPS sem
limitações do Expo Go.

## Extração de dados para o cliente

- O portal do cliente (`/portal`) tem um botão **Exportar CSV** por período,
  com data/hora de check-in e check-out, distância até a loja e status.
- O mesmo endpoint (`GET /api/export/visitas?from=...&to=...`) pode ser
  chamado por automações suas (o RLS garante que cada usuário só exporta o
  que tem permissão de ver — cliente só vê a própria empresa).
- Fotos e assinaturas ficam no bucket privado `visit-media` do Supabase
  Storage; o portal gera URLs assinadas temporárias para exibi-las.
- Como é tudo Postgres, dá para conectar Metabase/Looker Studio direto no
  banco (ou numa réplica) para relatórios mais elaborados sem programar nada
  novo.

## Apps parecidos no mercado (referência)

Esse tipo de solução é chamado de **Retail Execution / Field Force
Automation (SFA)**. Alguns exemplos consolidados, caso queira comparar
funcionalidades ou UX:

- **Involves Stage** — o mais usado no Brasil especificamente para trade
  marketing/merchandising (check-in geolocalizado, fotos, pesquisa de
  preço/ruptura).
- **Field Control** — força de vendas e trade marketing, forte em roteirização.
- **GKO Force** — SFA voltado a distribuidoras (venda + entrega + trade).
- **ProMobile (SIS)** — outra plataforma nacional de força de vendas/promotoria.
- **Repsly** e **SPOTIO** — equivalentes internacionais, focados em
  retail execution e roteirização de vendedores externos.

Vale olhar esses apps para referência de UX (principalmente telas de rota e
de auditoria de PDV), mas nenhum deles foi copiado aqui — o schema e o fluxo
foram desenhados do zero para o seu caso de uso.

## O que fica para depois (roadmap)

O MVP cobre: cadastro de lojas, lançamento de rota em massa, check-in/out
com geofence + fotos + assinatura, pedido simples em loja habilitada, e
portal read-only do cliente com exportação. Fica para as próximas etapas:

- **Módulo completo do vendedor**: abertura de conta/cliente com mais dados
  cadastrais, carteira, histórico de pedidos, metas e comissão.
- **Catálogo de produtos mais rico**: categorias, imagens, tabela de preço
  por cliente/região.
- **Modo offline no mobile**: fila local de check-in/fotos/pedidos para
  sincronizar quando a conexão voltar (hoje depende de internet no momento
  da ação).
- **Notificações push** (nova rota lançada, visita atrasada, pedido
  confirmado).
- **Relatórios/BI**: dashboards de indicadores (cobertura de rota, tempo
  médio de visita, taxa de ruptura) além do CSV simples.
- **Auditoria de fotos com IA** (opcional): validar automaticamente se a
  foto corresponde ao PDV esperado.
- **Testes automatizados** e pipeline de CI para web e mobile.
