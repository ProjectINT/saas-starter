# Adding a module

A module is a feature of your product: its tables, its pages, its texts. It lives next to the core and plugs into it through extension points, so template updates keep merging cleanly. The template ships one, **Projects** (`modules/example`), built exactly the way described here: read it alongside.

## Where things go

| Part | Path | Example |
|---|---|---|
| Tables, grants, RLS, RPCs | `supabase/schemas/50_app/<nn>_<module>.sql` | [10_example_projects.sql](../supabase/schemas/50_app/10_example_projects.sql) |
| Migrations | `supabase/migrations/` (generated DDL + a hand-written one for permissions) | `*_example_projects.sql`, `*_example_projects_permissions.sql` |
| Store and components | `modules/<module>/` | [projects-store.ts](../modules/example/projects-store.ts), [components/projects-view.tsx](../modules/example/components/projects-view.tsx) |
| Registration (tabs, settings sections) | [modules/index.ts](../modules/index.ts) | `exampleNavigation` |
| Pages | `app/(app)/[account]/<segment>/page.tsx` | [projects/page.tsx](../app/(app)/[account]/projects/page.tsx) |
| Texts | `messages/dictionary/app/<module>.ts`, registered in `app/index.ts` | [projects.ts](../messages/dictionary/app/projects.ts) |
| Tests | `modules/<module>/*.test.ts`, `supabase/tests/database/5x_*.test.sql`, `e2e/<module>.spec.ts` | the three Projects tests |

Never edit `core/` or `supabase/schemas/00-49` for a module. If the core lacks an extension point you need, add it to the template (and send it upstream).

## Step by step

### 1. Schema

Create `supabase/schemas/50_app/<nn>_<module>.sql`. Every tenant table:

- has `account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE` (deleting an account deletes its data);
- enables RLS and grants only what clients need, next to the table: column lists for `INSERT`/`UPDATE`, so server-owned columns (`created_by`, timestamps) stay the database's;
- checks access with `private.has_permission(account_id, '<module>.<action>')` in its policies, never with role names.

Plain create/update/delete of one row can go straight to the table under RLS, as Projects does. A write that touches several rows or has rules beyond "may this user write this row" is an RPC: `public.<fn>` `SECURITY INVOKER` calling `private.<fn>` `SECURITY DEFINER SET search_path = ''`, raising stable error keys (see `supabase/schemas/31_members.sql`). Add such functions to the whitelist in `supabase/tests/database/01_privileges.test.sql`.

Per-account set-up (default rows when an account is created) goes into `private.app_on_account_created` in `supabase/schemas/50_app/00_hooks.sql`.

### 2. Migrations and permissions

```bash
npm run db:migration -- <module>     # generates the DDL migration from the schema; review it
```

Permissions are data: write a migration by hand that grants them to roles.

```sql
INSERT INTO public.role_permissions (role, permission) VALUES
  ('owner', '<module>.view'), ('owner', '<module>.manage'),
  ('admin', '<module>.view'), ('admin', '<module>.manage'),
  ('member', '<module>.view')
ON CONFLICT DO NOTHING;
```

Then `npm run db:reset && npm run db:types`: the new names join the `Permission` type, so `can("<module>.manage")` type-checks.

### 3. Texts

Add `messages/dictionary/app/<module>.ts` (`{ word, tip?, context? }`, ICU syntax), register it in `messages/dictionary/app/index.ts`, run `npm run i18n:build`, then translate (`npm run i18n:translate`, or by hand in `messages/<locale>.json` and build again). The namespace must not clash with a core one.

### 4. Store and components

One palistor store per page, created on mount (`useState(createXStore)`), with the account id in `store.context`. List resolvers return `[]` while the context is missing (nothing is fetched during SSR). Writes go through `core/supabase/client`; errors are reported with `captureException` and shown from the dictionary, never `error.message`. Hide controls with `useAccount().can(...)`: a hint only, RLS decides. The rules are in [AGENTS.md](../AGENTS.md) → State and forms.

### 5. Page and navigation

The page checks its own permission:

```tsx
const context = await getAccountContext(slug);
if (!context || !can(context, "<module>.view")) notFound();
```

Its title: `export const generateMetadata = pageTitle("<Namespace>.title")`. Then register the tab in `modules/index.ts`:

```ts
export const appNavigation: AccountNavItem[] = [
  { segment: "<segment>", label: "<Namespace>.nav", permission: "<module>.view" },
];
```

A settings section is the same with `appSettingsSections` (`group: "account"` or `"personal"`) and a page under `app/(app)/[account]/settings/<segment>/`.

### 6. Tests

- pgTAP (`supabase/tests/database/5x_<module>.test.sql`): who can read and write, server-owned columns, no access across accounts.
- Vitest (`modules/<module>/*-store.test.ts`): the store config with `@/core/supabase/client` and `@heroui/react` mocked.
- Playwright (`e2e/<module>.spec.ts`): the main flow with users from `e2e/support.ts`.

Before finishing: `npm run lint && npm run typecheck && npm run i18n:check && npm run test:run && npm run db:test && npm run db:lint && npm run test:e2e`.

## Removing the example

When your first module exists, delete Projects:

1. `modules/example/`, `app/(app)/[account]/projects/`, `messages/dictionary/app/projects.ts`, `e2e/projects.spec.ts`, `supabase/tests/database/50_example_projects.test.sql`, `supabase/schemas/50_app/10_example_projects.sql`.
2. In `modules/index.ts` drop `exampleNavigation`; in `messages/dictionary/app/index.ts` drop `Projects`.
3. A migration that undoes it in deployed databases: `npm run db:migration -- remove_example` (drops the table), plus by hand `DELETE FROM public.role_permissions WHERE permission LIKE 'projects.%';`.
4. `npm run db:reset && npm run db:types && npm run i18n:build`, then the checks above.
