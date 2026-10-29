import { describe, expect, it } from "vitest";

import { assignableRoles, byRoleThenName, isAccountRole, outranks } from "./roles";

describe("outranks", () => {
  it("compares by enum order, strictly", () => {
    expect(outranks("owner", "admin")).toBe(true);
    expect(outranks("admin", "member")).toBe(true);
    expect(outranks("admin", "admin")).toBe(false);
    expect(outranks("member", "admin")).toBe(false);
  });
});

describe("assignableRoles", () => {
  it("never offers owner and nothing above the actor", () => {
    expect(assignableRoles("owner")).toEqual(["admin", "member"]);
    expect(assignableRoles("admin")).toEqual(["admin", "member"]);
    expect(assignableRoles("member")).toEqual(["member"]);
  });
});

describe("isAccountRole", () => {
  it("accepts enum values only", () => {
    expect(isAccountRole("admin")).toBe(true);
    expect(isAccountRole("superuser")).toBe(false);
    expect(isAccountRole(null)).toBe(false);
  });
});

describe("byRoleThenName", () => {
  it("puts the owner first, then sorts by name", () => {
    const members = [
      { role: "member" as const, name: "Bob" },
      { role: "admin" as const, name: "Zoe" },
      { role: "member" as const, name: "Ann" },
      { role: "owner" as const, name: "Yan" },
    ];

    expect(members.toSorted(byRoleThenName).map((member) => member.name)).toEqual(["Yan", "Zoe", "Ann", "Bob"]);
  });
});
