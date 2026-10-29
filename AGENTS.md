# Agent guide

Multi-tenant SaaS template on Next.js 16 + Supabase. Read [README.md](README.md) for setup and [docs/ROADMAP.md](docs/ROADMAP.md) for what exists and what comes next.

## Boundaries

- `core/` and `supabase/schemas/00-49` are the template core. Products built on the template put their code in `modules/`, `app/(app)/...` and `supabase/schemas/50_app/`, and extend the core through hooks (e.g. `private.app_on_account_created`), not by editing it.
- No private packages (`@projectint/*`): `npm ci` must work without tokens. ESLint enforces it.

## Environment

- Every variable is declared in the zod schema in `core/config/env.ts` and listed in `.env.example`.
- `NEXT_PUBLIC_*` values are read through `publicEnv` (`core/config/public-env.ts`), where each key is spelled out as a literal `process.env.NAME` so Next.js inlines it. Server-only values go through `serverEnv` (`core/config/server-env.ts`, guarded by `server-only`).
- Never read `process.env` directly elsewhere.

## Supabase clients

| Where | Use |
|---|---|
| Client Components | `createClient` from `core/supabase/client` |
| Server Components, Server Actions, Route Handlers | `createClient` from `core/supabase/server` (acts as the user, RLS applies) |
| `proxy.ts` | `updateSession` from `core/supabase/proxy`; keep `getClaims()` directly after client creation |
| Trusted server code after an explicit permission check | `createAdminClient` from `core/supabase/admin` (bypasses RLS) |

Identify the user on the server with `supabase.auth.getClaims()`, not `getSession()`.

## Database workflow

1. Edit the declarative files in `supabase/schemas/` (files apply in name order; table, grants and policies live together).
2. `npm run db:migration -- <name>` generates the migration. Review it; do not hand-edit generated migrations.
3. Data (permission rows, lookup values) goes into a hand-written migration, never into `schemas/`. `seed.sql` is local-only.
4. `npm run db:reset && npm run db:test && npm run db:lint && npm run db:types`.

## Database security rules

- **Deny by default.** Default privileges for `anon`/`authenticated` are revoked. Every table/function a client needs gets an explicit `GRANT` next to its definition; prefer column-level `GRANT UPDATE (col, ...)` over table-wide updates.
- **RLS on every table**, policies `TO authenticated` (or `anon` deliberately). Wrap `auth.uid()` as `(SELECT auth.uid())`.
- **Access checks** go through `private.has_permission(account_id, 'area.action')`; tenant data uses it in RLS. Role rules exist only in `public.role_permissions`; never hard-code role lists in SQL or TS.
- **Roles** are the enum `public.account_role`; declaration order is privilege order (`owner` < `admin` < `member`).
- **RPC pattern**: `public.<fn>` is `SECURITY INVOKER` (the API entry point); privileged work lives in `private.<fn>` `SECURITY DEFINER`. No `SECURITY DEFINER` in `public`.
- Every `SECURITY DEFINER` function has `SET search_path = ''` and schema-qualifies everything (`public.accounts`, `auth.uid()`).
- Derive the acting user from `auth.uid()` inside the function; never accept a user id or role from the client for authorization.
- `raw_user_meta_data` is client-controlled: only cosmetic profile fields may come from it. Server-assigned data goes into `app_metadata` or explicit RPCs.
- Views are `security_invoker = true`.
- `supabase/tests/database/01_privileges.test.sql` holds the whitelist of functions callable by `authenticated`. Adding a client-callable function means extending it in the same change; anything else failing there is a bug.

## Code style

ESLint (`npm run lint`) carries the formatting rules of the donor project: double quotes, semicolons, 2-space indent, `import/order` groups with blank lines, blank line before `return` and after declarations. Use the `@/` alias for imports across folders.

## Checks before finishing

`npm run lint && npm run typecheck && npm run test:run`, plus the database checks above when SQL changed.
