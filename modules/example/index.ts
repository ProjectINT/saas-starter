import type { AccountNavItem } from "@/core/navigation/registry";

// Example module: projects inside an account. Its parts:
//   supabase/schemas/50_app/10_example_projects.sql   table, grants, RLS
//   supabase/migrations/*_example_projects*.sql       generated DDL + permissions
//   modules/example/                                   store, UI, this registration
//   app/(app)/[account]/projects/page.tsx              the page (checks projects.view)
//   messages/dictionary/app/projects.ts                texts
//   tests: projects-store.test.ts, supabase/tests/database/50_example_projects.test.sql, e2e/projects.spec.ts
// See docs/ADDING_A_MODULE.md, including how to remove it.

export const exampleNavigation: AccountNavItem[] = [
  { segment: "projects", label: "Projects.nav", permission: "projects.view" },
];
