import { beforeEach, describe, expect, it, vi } from "vitest";

import { reported } from "@/core/errors/testing";
import { englishT } from "@/core/i18n/testing";

import { createProjectsStore } from "./projects-store";

const supabase = vi.hoisted(() => ({
  rows: [] as unknown[],
  insert: vi.fn(),
  delete: vi.fn(),
  deleteEq: vi.fn(),
  from: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), danger: vi.fn() }));

vi.mock("@/core/supabase/client", () => ({ createClient: () => supabase }));
vi.mock("@heroui/react", () => ({ toast }));

supabase.from.mockImplementation(() => {
  const result = Promise.resolve({ data: supabase.rows, error: null });
  const query = { select: () => query, eq: () => query, order: () => query, then: result.then.bind(result) };

  return { ...query, insert: supabase.insert, delete: supabase.delete };
});
supabase.delete.mockImplementation(() => ({ eq: supabase.deleteEq }));

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup() {
  const store = createProjectsStore();

  store.setContext({ accountId: "acc-1", t: englishT });
  store.setTranslator(englishT);

  return store.proxy;
}

beforeEach(() => {
  vi.clearAllMocks();
  supabase.rows = [];
  supabase.insert.mockResolvedValue({ error: null });
  supabase.deleteEq.mockResolvedValue({ error: null });
});

describe("projects", () => {
  it("does not query before the account is known", async () => {
    void createProjectsStore().proxy.projects.items;
    await settle();

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("lists the account's projects", async () => {
    supabase.rows = [{ id: "p1", name: "Launch", description: "Q4", created_at: "2026-10-01T00:00:00Z" }];

    const { projects } = setup();

    void projects.items;
    await settle();

    expect(projects.getValues()).toEqual([{ id: "p1", name: "Launch", details: "Q4", createdAt: "2026-10-01T00:00:00Z" }]);
  });

  it("creates a project with trimmed texts and starts the form over", async () => {
    const { create } = setup();

    create.name.value = "  Launch ";
    create.details.value = " Q4 ";
    await create.submit();

    expect(supabase.insert).toHaveBeenCalledWith({ account_id: "acc-1", name: "Launch", description: "Q4" });
    expect(toast.success).toHaveBeenCalledWith("Project Launch created.");
    expect(create.values).toMatchObject({ name: "", details: "" });
  });

  it("needs a name and reports a refused insert", async () => {
    const { create } = setup();

    create.name.value = "   ";
    await create.submit();
    expect(create.name.errorMessage).toBe("Enter the project name.");
    expect(supabase.insert).not.toHaveBeenCalled();

    supabase.insert.mockResolvedValue({ error: { code: "42501", message: "new row violates row-level security policy" } });
    create.name.value = "Launch";
    await create.submit();
    expect(create.formError.value).toBe("Could not create the project. Try again.");
    expect(reported.events).toHaveLength(1);
  });

  it("deletes a project and closes the confirmation", async () => {
    const { remove } = setup();

    remove.setValues({ targetId: "p1", targetName: "Launch", isOpen: true });
    await remove.submit();

    expect(supabase.deleteEq).toHaveBeenCalledWith("id", "p1");
    expect(toast.success).toHaveBeenCalledWith("Project Launch deleted.");
    expect(remove.isOpen.value).toBe(false);
  });
});
