import { expect, test } from "@playwright/test";

import { createAccount, createUser, signIn, uniqueEmail } from "./support";

test("profile, preferences and account settings", async ({ page }) => {
  const email = uniqueEmail("settings");

  await createUser(email);
  await signIn(page, email);

  const slug = await createAccount(page, "E2E Settings");

  // Profile: the name.
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/settings/profile$`));
  await page.getByLabel("First name").fill("Sam");
  await page.getByLabel("Last name").fill("Settings");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Your name has been saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("First name")).toHaveValue("Sam");

  // Preferences: the time zone, kept across a reload.
  await page.getByRole("link", { name: "Preferences" }).click();
  await page.getByRole("combobox", { name: "Time zone" }).fill("Asia/Tbil");
  await page.getByRole("option", { name: "Asia/Tbilisi" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Time zone" })).toHaveValue("Asia/Tbilisi");

  // Account: a new URL, then deletion.
  await page.getByRole("link", { name: "Account", exact: true }).click();
  await page.getByLabel("URL").fill(`${slug}-new`);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}-new/settings/account$`));

  await page.getByRole("button", { name: "Delete account" }).click();
  const dialog = page.getByRole("alertdialog");

  await dialog.getByLabel("Account URL").fill(`${slug}-new`);
  await dialog.getByRole("button", { name: "Delete account" }).click();
  await expect(page).toHaveURL(/\/(accounts|onboarding)$/);
  await expect(page.getByText("E2E Settings was deleted.")).toBeVisible();
});
