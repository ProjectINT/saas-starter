# SaaS Starter

Multi-tenant SaaS template: Next.js 16 (App Router) + Supabase (Postgres, Auth, RLS).

Status: **phase 1**, the foundation (users, accounts, memberships, roles, Next.js ↔ Supabase wiring). See [docs/ROADMAP.md](docs/ROADMAP.md).

## Quick start

Requirements: Node.js ≥ 22.12, Docker.

```bash
npm ci
npm run db:start    # local Supabase on ports 544xx (Studio: http://127.0.0.1:54423)
npm run env:local   # writes .env.local from `supabase status`
npm run dev         # http://localhost:3000
```

The app **does not start without its environment**: `next dev`, `next build` and `next start` stop with a list of missing variables (see [core/config/env.ts](core/config/env.ts) and [.env.example](.env.example)).

Seeded local users (password `password123`): `alice@example.com` (owner of `acme`), `bob@example.com` (member of `acme`), `carol@example.com` (no accounts).

## Scripts

| Script | What it does |
|---|---|
| `dev` / `build` / `start` | Next.js |
| `lint` / `typecheck` / `test` | ESLint, `tsc --noEmit`, Vitest |
| `db:start` / `db:stop` / `db:status` | Local Supabase stack |
| `db:reset` | Recreate the local DB from migrations + `supabase/seed.sql` |
| `db:migration -- <name>` | Generate a migration from `supabase/schemas` (pg-delta) |
| `db:test` | pgTAP tests in `supabase/tests` |
| `db:lint` | plpgsql_check on `public` and `private` |
| `db:types` | Regenerate `core/db/database.types.ts` |
| `env:local` | Write `.env.local` for the local stack |

## Layout

```
app/                 routes (thin)
core/                template core: config, Supabase clients, DB types
  config/            env contract (zod), publicEnv, serverEnv
  supabase/          client (browser), server (RSC/actions), proxy (session refresh), admin (service role)
  db/                generated database types
proxy.ts             refreshes the Supabase session on every request
supabase/
  schemas/00-49      core schema (declarative source of truth)
  schemas/50_app/    product-specific schema and hooks
  migrations/        generated from schemas + hand-written data migrations
  tests/database/    pgTAP: privileges, provisioning, RLS
```

## Data model (core)

| Table | Purpose |
|---|---|
| `profiles` | One row per auth user, created by a trigger. Email synced from `auth.users`. |
| `accounts` | Tenants. `slug` is the URL identifier (reserved route names are rejected). |
| `account_members` | User ↔ account with a role (`owner`, `admin`, `member`). Read-only for clients. |
| `role_permissions` | The permission matrix; the only place role rules live. |
| `private.platform_admins` | Platform (super) admins. Not reachable through the API. |

RPC: `create_account(p_name, p_slug)` creates an account owned by the caller.

Security model in short: nothing is reachable through the Data API without an explicit `GRANT`; RLS on every table; access checks go through `private.has_permission(account_id, permission)`; `user_metadata` never grants anything. Details and rules for changes: [AGENTS.md](AGENTS.md).
