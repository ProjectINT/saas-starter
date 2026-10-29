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

## Auth

- Server Components and layouts read the user with `getClaims()` / `requireClaims()` from `core/auth/session` (cached per request). Pages check on their own even though `proxy.ts` guards routes.
- Route paths live in `core/config/routes.ts`. A new page reachable without a session must be added to `PUBLIC_ROUTES` in `core/auth/public-routes.ts`; everything else requires one. A new top-level route also goes into `accounts_slug_not_reserved` (`supabase/schemas/21_accounts.sql`).
- Every user-supplied redirect target (`next` in query strings, forms, callbacks) goes through `safeNextPath()`.
- Sign-in, sign-up, password reset and resend run in the browser through `core/supabase/client` and pass `captcha.token` from `useCaptcha()`; reset the captcha after each call. Do not proxy them through API routes: Supabase Auth verifies the captcha and rate-limits per user IP.
- Show Supabase Auth errors with `authErrorMessage(error)` (by error code), never `error.message`.

## UI

- HeroUI v3 (`@heroui/react`): compound components (`Card.Header`, `Checkbox.Control`), no provider. Root providers are in `core/ui/providers.tsx` (next-themes, `RouterProvider`, `Toast.Provider`); toasts via `toast.success()` / `toast.danger()`.
- Next.js links: `AppLink` / `ButtonLink` from `core/ui/links` (next/link with HeroUI classes), not HeroUI `Link` with `href`.
- Theme colors through HeroUI tokens (`bg-background`, `bg-surface`, `text-muted`, `text-accent`, `text-danger`), so both themes work. Icons from `@gravity-ui/icons`.
- Forms: HeroUI `Form` + `TextField`/`Label`/`Input`/`FieldError`; client rules in `core/validation` mirror the database or Supabase Auth settings and name what they mirror. Server field errors go into `Form validationErrors`.
- UI text is English until the i18n phase; keep strings in components, not concatenated from fragments.

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

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
