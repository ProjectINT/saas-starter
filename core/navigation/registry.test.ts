import { describe, expect, it } from "vitest";

import { DEFAULT_TIME_ZONE, isTimeZone } from "@/core/i18n/config";

import { ACCOUNT_NAVIGATION, SETTINGS_SECTIONS, visibleItems } from "./registry";

describe("registry", () => {
  it("keeps home first and settings last", () => {
    expect(ACCOUNT_NAVIGATION[0].segment).toBe("");
    expect(ACCOUNT_NAVIGATION.at(-1)?.segment).toBe("settings");
  });

  it("opens settings on a section every member may see", () => {
    expect(SETTINGS_SECTIONS[0].permission).toBeUndefined();
  });

  it("shows only what the permissions allow", () => {
    const memberCan = (permission: string) => permission === "members.view";

    expect(visibleItems(SETTINGS_SECTIONS, memberCan).map((section) => section.segment)).toEqual(["profile", "preferences"]);
    expect(visibleItems(ACCOUNT_NAVIGATION, () => false).map((item) => item.segment)).toEqual(["", "settings"]);
  });
});

describe("isTimeZone", () => {
  it("accepts IANA zones the runtime knows and nothing else", () => {
    expect(isTimeZone("Europe/Berlin")).toBe(true);
    expect(isTimeZone(DEFAULT_TIME_ZONE)).toBe(true);
    expect(isTimeZone("Mars/Olympus")).toBe(false);
    expect(isTimeZone("")).toBe(false);
    expect(isTimeZone(undefined)).toBe(false);
  });
});
