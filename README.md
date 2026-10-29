# SaaS Starter

Multi-tenant SaaS template: Next.js 16 (App Router) + Supabase (Postgres, Auth, RLS) + HeroUI v3 + palistor (feature state and forms).

Status: **phase 9** (all phases except deployment): users, accounts, roles and permissions in the database; sign-up, sign-in (password, Google), email confirmation, password reset, sign-out, onboarding; account switcher, members page, invitations by email, role changes, removal, leaving, ownership transfer; settings (profile, email and password, theme, language, time zone, account name and URL, account deletion) with navigation and settings sections from a registry; platform admin area (all accounts and users, deactivation, blocking); English and Russian UI; emails in the reader's language (Auth emails through the Send Email Hook, invitations, welcome) over SMTP or Resend; error reporting with translated error pages; CI with Playwright end-to-end tests. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Quick start

Requirements: Node.js ≥ 22.18 (see `.nvmrc`), Docker.

```bash
npm ci
npm run db:start    # local Supabase on ports 544xx (Studio: http://127.0.0.1:54423)
npm run env:local   # writes .env.local from `supabase status`
npm run dev         # http://localhost:3000
```

The app **does not start without its environment**: `next dev`, `next build` and `next start` stop with a list of missing variables (see [core/config/env.ts](core/config/env.ts) and [.env.example](.env.example)).

Seeded local users (password `password123`): `alice@example.com` (owner of `acme`, platform admin: `/admin`), `bob@example.com` (member of `acme`), `carol@example.com` (no accounts, goes to onboarding).

Every email sent locally (confirmation, password reset, invitations, welcome) lands in Mailpit: http://127.0.0.1:54424. Supabase Auth hands its emails to the running app (see [Email](#email)), so keep `npm run dev` up on port 3000 when signing up or resetting a password.

Invitations are emailed to the invitee; the dialog also shows the link once, for passing it on by hand. Only a user whose confirmed email matches the invitation can accept it; pending invitations also show up on `/accounts` after sign-in.

## Auth flows

| Flow | Path |
|---|---|
| Sign in | `/sign-in` → `/accounts` (or `?next=`) |
| Sign up | `/sign-up` → email link → `/auth/confirm` → `/accounts` → `/onboarding` |
| Password reset | `/forgot-password` → email link → `/auth/confirm` → `/reset-password` |
| OAuth (Google, GitHub) | provider → `/auth/callback` → `/accounts` (or `?next=`) |
| After sign-in | `/accounts`: pending invitations → list them; else no accounts → `/onboarding`, last opened or only account → `/[slug]`, several → list |
| Invitation | `/[slug]/members` → Invite → link `/invite/<token>` → (sign in / sign up) → Accept → `/[slug]` |
| Platform admin | `/admin/accounts`, `/admin/users`: platform admins only (`private.platform_admins`), everyone else gets 404 |

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
- Authentication → Hooks → Send Email: HTTPS, URL `https://<your domain>/api/auth/send-email`, generate a secret and put it into the app's `SEND_EMAIL_HOOK_SECRET`. Without the hook Supabase sends its own English emails, which link to `/auth/callback` and work only in the browser that started the flow.
- Authentication → Providers → Email: minimum password length 8, "letters and digits" (matches [core/validation/password.ts](core/validation/password.ts)).

## Email

The app writes every email itself, from the `Emails` namespace of the dictionaries, in the reader's language (`profiles.locale`), and sends it through `EMAIL_PROVIDER`:

| Email | Sent by |
|---|---|
| Sign-up confirmation, password reset, email change, magic link, reauthentication code | Supabase Auth → Send Email Hook → [app/api/auth/send-email](app/api/auth/send-email/route.ts) |
| Invitation | `createInvitation` Server Action ([core/tenancy/invitation-actions.ts](core/tenancy/invitation-actions.ts)) after `create_invitation` |
| Welcome (once per user) | `/auth/confirm` after a confirmed sign-up, `/auth/callback` after an OAuth sign-in |

| `EMAIL_PROVIDER` | Needs | Use |
|---|---|---|
| `smtp` | `SMTP_HOST`, `SMTP_PORT` (+ `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`) | Local Mailpit (set by `env:local`), any SMTP service |
| `resend` | `RESEND_API_KEY` | [Resend](https://resend.com) HTTP API |
| `console` | — | Prints emails to the server log (bodies only outside production); CI |

`EMAIL_FROM` is the sender for all of them. Links in app emails use `SITE_URL`, on Vercel the deployment URL by default; links in Auth emails use the origin the user started from (checked by Auth against the redirect URLs).

Templates are plain functions in [core/email/templates.ts](core/email/templates.ts) over one layout ([core/email/render.ts](core/email/render.ts)) that escapes every text. Invitations are limited to 50 pending per account and 50 sent per inviter a day (`create_invitation`).

**Troubleshooting `hook_timeout` on sign-up (Linux):** Auth runs in Docker and calls the app on the host through `host.docker.internal:3000`. A host firewall that drops traffic from Docker networks (e.g. `ufw` with the default incoming policy) blocks it; allow it once, e.g. `sudo ufw allow from 172.16.0.0/12 to any port 3000 proto tcp`. Check from the container: `docker exec supabase_auth_saas-starter wget -qO- http://host.docker.internal:3000/sign-in > /dev/null && echo ok`.

## Platform admin

`/admin` is for the operators of the product, not for account owners: it lists every account (search, members, owner) and every user (accounts, last sign-in, confirmation). An admin deactivates an account (its data stays, nobody gets in until it is reactivated) and blocks a user from signing in (an Auth ban; the session ends within an hour).

Admins live in `private.platform_admins`, which no client can read or write. Add one with SQL (Dashboard → SQL Editor, or `psql` locally):

```sql
INSERT INTO private.platform_admins (user_id) SELECT id FROM auth.users WHERE email = 'you@example.com';
```

Every admin RPC (`supabase/schemas/40_admin.sql`) checks it again, and blocking goes through a Server Action that asks the database before using the service role.

## Extending the core

A product adds its pages without editing `core/`. The template's example module, Projects (`modules/example`, the Projects tab), shows every part; [docs/ADDING_A_MODULE.md](docs/ADDING_A_MODULE.md) walks through it step by step and explains how to remove it.

| What | Where |
|---|---|
| Account tabs (between Overview and Members) and settings sections | `appNavigation` / `appSettingsSections` in [modules/index.ts](modules/index.ts): `{ segment, label, permission? }`, label = a message key of the product dictionary |
| Pages | `app/(app)/[account]/<segment>/page.tsx` (check the permission with `can(context, …)`), settings sections in `app/(app)/[account]/settings/<segment>/page.tsx` |
| Texts | `messages/dictionary/app/` |
| Tables, RLS, RPCs | `supabase/schemas/50_app/`; account set-up in `private.app_on_account_created` |
| Permissions | a migration inserting into `public.role_permissions`, then `npm run db:types` |

## Testing

- `npm run test:run`: Vitest (store configs, validators, email rendering, hook verification).
- `npm run db:test`: pgTAP (privileges whitelist, RLS, RPC rules, limits).
- `npm run test:e2e`: Playwright against the local stack (`db:start` + `env:local`); it reuses a running `npm run dev` or starts one. Users are created through the Auth admin API, emails are read from Mailpit. The sign-up flow needs Auth to reach the app (see [Email](#email) → Troubleshooting).

## Scripts

| Script | What it does |
|---|---|
| `dev` / `build` / `start` | Next.js |
| `lint` / `typecheck` / `test` | ESLint, `tsc --noEmit`, Vitest |
| `test:e2e` | Playwright end-to-end flows in `e2e/` |
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
- **db**: starts local Supabase, `db:lint` (errors), pgTAP, checks that `supabase/schemas` produce no new migration, and that `db:types` output is committed;
- **e2e**: starts local Supabase, builds and starts the app, runs Playwright (report uploaded on failure).

## Deploy (Vercel + Supabase)

1. **Supabase project.** Create it in the region closest to your users, then from this repo: `npx supabase link --project-ref <ref>` and `npx supabase db push` (applies `supabase/migrations`; `seed.sql` is local only). Make yourself a platform admin with the SQL from [Platform admin](#platform-admin).
2. **Auth settings** (Dashboard → Authentication), as in the [Hosted Supabase checklist](#hosted-supabase-checklist): Site URL, redirect URLs for previews (`https://*-<team>.vercel.app/**`), the Send Email Hook with its secret, password rules, optionally captcha and Google.
3. **Vercel project.** Import the repo (framework: Next.js), function region next to the database. Environment variables (Production and Preview):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys (the Vercel Supabase integration can set them) |
   | `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY` or `SMTP_*` | your email provider; the sender's domain must be verified there |
   | `SEND_EMAIL_HOOK_SECRET` | the secret of the hook from step 2 |
   | `SITE_URL` | the production URL (optional: Vercel's URL is used otherwise; previews use their own) |

4. **Check** a preview deployment: sign up (the confirmation email arrives through the hook), confirm, create an account, invite someone. Then Dashboard → Advisors → Security should show no errors.

Preview deployments share the production database unless you use [Supabase branching](https://supabase.com/docs/guides/deployment/branching); keep test data out of it or give previews their own project.

## Layout

```
app/
  (auth)/            sign-in, sign-up, forgot/reset password, auth/callback, auth/confirm, auth/error
  api/auth/send-email  Supabase Auth Send Email Hook
  (onboarding)/      accounts (picker + pending invitations), onboarding (create an account), invite/[token]
  (legal)/           terms-of-use, privacy-policy (placeholders)
  (admin)/admin/     platform admin: accounts, users
  (app)/[account]/   tenant pages: layout (switcher, nav, AccountProvider), home (placeholder), members, settings/{profile,preferences,account}
core/                template core
  admin/             platform admin lists (palistor stores), user blocking (Server Action)
  auth/              public routes, safe redirects, session helpers, captcha, OAuth providers, auth screens
  i18n/              locales, request config for next-intl, locale cookie and profile sync, language switcher, page titles
  errors/            error reporting (captureException), secret scrubbing
  tenancy/           accounts, roles and permissions (`can`, `useAccount`), members, invitations, onboarding: palistor stores (`*-store.ts`) and UI
  ui/                providers (theme, router, toasts), theme switch, logo, Next.js links styled as HeroUI, dialogs, palistor field binding
  validation/        password, slug, email and account name rules mirroring the database and Supabase Auth
  config/            env contract (zod), site name and URL, route paths, monitoring transport
  email/             sending (SMTP, Resend, console), templates and layout, Send Email Hook verification, welcome email
  navigation/        registry of account tabs and settings sections (core items + modules/index.ts)
  settings/          profile, preferences and account settings: palistor stores and UI
  supabase/          client (browser), server (RSC/actions), proxy (session + route guard), admin (service role)
  db/                generated database types
modules/index.ts     the product's additions to the core registries
e2e/                 Playwright flows: sign-up and reset, team (invite, accept, roles), settings, admin, projects
modules/example/     example module (Projects): store, UI, registration
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
