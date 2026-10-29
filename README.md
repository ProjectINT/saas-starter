# SaaS Starter

Multi-tenant SaaS template: Next.js 16 (App Router) + Supabase (Postgres, Auth, RLS) + HeroUI v3 + palistor (feature state and forms).

Status: **phase 4**: users, accounts, roles and permissions in the database; sign-up, sign-in (password, Google), email confirmation, password reset, sign-out, onboarding; account switcher, members page, invitations, role changes, removal, leaving, ownership transfer; English and Russian UI with a language switcher; error reporting with translated error pages; CI. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Quick start

Requirements: Node.js ≥ 22.18 (see `.nvmrc`), Docker.

```bash
npm ci
npm run db:start    # local Supabase on ports 544xx (Studio: http://127.0.0.1:54423)
npm run env:local   # writes .env.local from `supabase status`
npm run dev         # http://localhost:3000
```

The app **does not start without its environment**: `next dev`, `next build` and `next start` stop with a list of missing variables (see [core/config/env.ts](core/config/env.ts) and [.env.example](.env.example)).

Seeded local users (password `password123`): `alice@example.com` (owner of `acme`), `bob@example.com` (member of `acme`), `carol@example.com` (no accounts, goes to onboarding).

Emails sent locally (confirmation, password reset) land in Mailpit: http://127.0.0.1:54424.

Invitations are not emailed yet (phase 5): the inviter copies the link from the dialog. Only a user whose confirmed email matches the invitation can accept it; pending invitations also show up on `/accounts` after sign-in.

## Auth flows

| Flow | Path |
|---|---|
| Sign in | `/sign-in` → `/accounts` (or `?next=`) |
| Sign up | `/sign-up` → email link → `/auth/confirm` → `/accounts` → `/onboarding` |
| Password reset | `/forgot-password` → email link → `/auth/confirm` → `/reset-password` |
| OAuth (Google, GitHub) | provider → `/auth/callback` → `/accounts` (or `?next=`) |
| After sign-in | `/accounts`: pending invitations → list them; else no accounts → `/onboarding`, last opened or only account → `/[slug]`, several → list |
| Invitation | `/[slug]/members` → Invite → link `/invite/<token>` → (sign in / sign up) → Accept → `/[slug]` |

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
| `db:types` | Regenerate `core/db/database.types.ts` and the permission names in `core/tenancy/permissions.generated.ts` |
| `env:local` | Write `.env.local` for the local stack |
| `i18n:build` | Generate `messages/*.json` from `messages/dictionary` (no network) |
| `i18n:check` | Fail if the message files are stale or a locale is incomplete (CI) |
| `i18n:translate` | `i18n:build` plus machine translation of missing and outdated messages (`OPENAI_API_KEY`) |

## Languages

UI texts live in TypeScript dictionaries (`messages/dictionary/core` for the template, `messages/dictionary/app` for the product): `{ word, tip?, context? }` in ICU syntax. `npm run i18n:build` writes `messages/en.json` and prunes the other locales; `npm run i18n:translate` translates what is missing or outdated with the OpenAI API and leaves a key missing if the answer is wrong, instead of filling it with English. `messages/translations.lock.json` remembers which English text each translation was made from, so editing a `word` re-translates it.

Supported languages are listed in [core/i18n/config.ts](core/i18n/config.ts) (`en`, `ru`). The UI language is the `NEXT_LOCALE` cookie, else the browser's Accept-Language; a signed-in user's choice is also saved in `profiles.locale` and restored at sign-in on other devices. To add a language: add it to `LOCALES` and `LOCALE_NAMES`, run `npm run i18n:translate`, review the result.

## Error reporting

Server errors (rendering, Route Handlers, Server Actions, proxy) are reported from [instrumentation.ts](instrumentation.ts), browser errors from [instrumentation-client.ts](instrumentation-client.ts) and the error page. Events go to the console by default; to send them to Rollbar, Hawk or your own endpoint, return an [untracker](https://www.npmjs.com/package/untracker) transport from [core/config/monitoring.ts](core/config/monitoring.ts). Secret-looking fields and JWTs are scrubbed before any transport sees an event. `NEXT_PUBLIC_APP_RELEASE` (the commit SHA on Vercel) tags each event with a version.

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on pushes to `main` and on pull requests:

- **app**: lint, typecheck, `i18n:check`, unit tests, `next build` (with placeholder env values);
- **db**: starts local Supabase, `db:lint` (errors), pgTAP, checks that `supabase/schemas` produce no new migration, and that `db:types` output is committed.

## Layout

```
app/
  (auth)/            sign-in, sign-up, forgot/reset password, auth/callback, auth/confirm, auth/error
  (onboarding)/      accounts (picker + pending invitations), onboarding (create an account), invite/[token]
  (legal)/           terms-of-use, privacy-policy (placeholders)
  (app)/[account]/   tenant pages: layout (switcher, nav, AccountProvider), home (placeholder), members
core/                template core
  auth/              public routes, safe redirects, session helpers, captcha, OAuth providers, auth screens
  i18n/              locales, request config for next-intl, locale cookie and profile sync, language switcher, page titles
  errors/            error reporting (captureException), secret scrubbing
  tenancy/           accounts, roles and permissions (`can`, `useAccount`), members, invitations, onboarding: palistor stores (`*-store.ts`) and UI
  ui/                providers (theme, router, toasts), theme switch, logo, Next.js links styled as HeroUI, dialogs, palistor field binding
  validation/        password, slug, email and account name rules mirroring the database and Supabase Auth
  config/            env contract (zod), site name, route paths, monitoring transport
  supabase/          client (browser), server (RSC/actions), proxy (session + route guard), admin (service role)
  db/                generated database types
messages/
  dictionary/        source texts: core/ (template), app/ (product)
  *.json             generated per locale, plus translations.lock.json
scripts/i18n.ts      dictionary build, check and machine translation
instrumentation*.ts  error reporting on the server and in the browser
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
| `profiles` | One row per auth user, created by a trigger. Email synced from `auth.users`; `locale` from sign-up, the language switcher and sign-in. |
| `accounts` | Tenants. `slug` is the URL identifier (reserved route names are rejected). |
| `account_members` | User ↔ account with a role (`owner`, `admin`, `member`). Read-only for clients. |
| `account_invitations` | Invitations by email with a role; stores only the hash of the link token. Written by RPCs only. |
| `role_permissions` | The permission matrix; the only place role rules live. |
| `private.platform_admins` | Platform (super) admins. Not reachable through the API. |

RPC (all derive the caller from the session and check permissions themselves):

| Function | Who |
|---|---|
| `create_account(name, slug)` | any signed-in user |
| `create_invitation(account, email, role)` → link token, `revoke_invitation(id)` | `members.invite`; role not above the caller's |
| `get_invitation(token)`, `list_my_invitations()`, `accept_invitation(id)`, `decline_invitation(id)` | the invitee (confirmed email must match) |
| `change_member_role(account, user, role)`, `remove_member(account, user)` | `members.manage`; only members below the caller's role |
| `leave_account(account)` | any member except the owner |
| `transfer_ownership(account, user)` | the owner; becomes admin |
| `delete_account(account)` | `account.delete` (owner) |

Security model in short: nothing is reachable through the Data API without an explicit `GRANT`; RLS on every table; access checks go through `private.has_permission(account_id, permission)`; `user_metadata` never grants anything. Details and rules for changes: [AGENTS.md](AGENTS.md).
