# SaaS Starter

Multi-tenant SaaS template: Next.js 16 (App Router) + Supabase (Postgres, Auth, RLS) + HeroUI v3.

Status: **phase 2**: users, accounts, memberships and roles in the database; sign-up, sign-in (password, Google), email confirmation, password reset, sign-out, account selection and onboarding in the app. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Quick start

Requirements: Node.js ≥ 22.12, Docker.

```bash
npm ci
npm run db:start    # local Supabase on ports 544xx (Studio: http://127.0.0.1:54423)
npm run env:local   # writes .env.local from `supabase status`
npm run dev         # http://localhost:3000
```

The app **does not start without its environment**: `next dev`, `next build` and `next start` stop with a list of missing variables (see [core/config/env.ts](core/config/env.ts) and [.env.example](.env.example)).

Seeded local users (password `password123`): `alice@example.com` (owner of `acme`), `bob@example.com` (member of `acme`), `carol@example.com` (no accounts, goes to onboarding).

Emails sent locally (confirmation, password reset) land in Mailpit: http://127.0.0.1:54424.

## Auth flows

| Flow | Path |
|---|---|
| Sign in | `/sign-in` → `/accounts` (or `?next=`) |
| Sign up | `/sign-up` → email link → `/auth/confirm` → `/accounts` → `/onboarding` |
| Password reset | `/forgot-password` → email link → `/auth/confirm` → `/reset-password` |
| OAuth (Google, GitHub) | provider → `/auth/callback` → `/accounts` (or `?next=`) |
| After sign-in | `/accounts`: no accounts → `/onboarding`, one → `/[slug]`, several → list |

`proxy.ts` sends signed-out visitors of any non-public page to `/sign-in?next=…` and answers `401` on `/api/*`. Public routes are listed in [core/auth/public-routes.ts](core/auth/public-routes.ts).

### Optional: Google sign-in

1. Create an OAuth client in Google Cloud. Authorized redirect URI: `http://127.0.0.1:54421/auth/v1/callback` locally, `https://<project>.supabase.co/auth/v1/callback` hosted.
2. Locally: put `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` into `supabase/.env`, set `enabled = true` under `[auth.external.google]` in [supabase/config.toml](supabase/config.toml), restart with `npm run db:stop && npm run db:start`. Hosted: Dashboard → Authentication → Providers → Google.

The button appears by itself: the sign-in page asks Supabase Auth which providers are enabled.

### Optional: captcha

Supabase Auth verifies Turnstile or hCaptcha tokens on sign-up, sign-in, password reset and resend. Enable both sides together:

- app: `NEXT_PUBLIC_CAPTCHA_PROVIDER` and `NEXT_PUBLIC_CAPTCHA_SITE_KEY` in `.env.local`;
- Supabase: `[auth.captcha]` in `config.toml` with `SUPABASE_AUTH_CAPTCHA_SECRET` in `supabase/.env` (hosted: Dashboard → Authentication → Attack Protection).

Test keys that always pass are listed in [.env.example](.env.example).

### Hosted Supabase checklist

- Authentication → URL Configuration: Site URL = the production URL; add preview/dev URLs to Redirect URLs (e.g. `https://*.vercel.app/**`).
- Authentication → Emails: replace the Confirm signup, Reset password and Change email templates with the ones in [supabase/templates](supabase/templates) (they link to `/auth/confirm`), or run `supabase config push`.
- Authentication → Providers → Email: minimum password length 8, "letters and digits" (matches [core/validation/password.ts](core/validation/password.ts)).

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
app/
  (auth)/            sign-in, sign-up, forgot/reset password, auth/callback, auth/confirm, auth/error
  (onboarding)/      accounts (picker), onboarding (create an account)
  (legal)/           terms-of-use, privacy-policy (placeholders)
  (app)/[account]/   tenant pages (placeholder home for now)
core/                template core
  auth/              public routes, safe redirects, session helpers, captcha, OAuth providers, auth screens
  tenancy/           account queries, create-account action and form
  ui/                providers (theme, router, toasts), theme switch, logo, Next.js links styled as HeroUI
  validation/        password and slug rules shared by forms and server code
  config/            env contract (zod), site name, route paths
  supabase/          client (browser), server (RSC/actions), proxy (session + route guard), admin (service role)
  db/                generated database types
proxy.ts             refreshes the Supabase session and guards routes on every request
supabase/
  schemas/00-49      core schema (declarative source of truth)
  schemas/50_app/    product-specific schema and hooks
  migrations/        generated from schemas + hand-written data migrations
  templates/         auth email templates
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
