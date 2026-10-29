import { expect, test } from "@playwright/test";

import { PASSWORD, createAccount, createUser, signIn, signOut, uniqueEmail } from "./support";

// alice@example.com is a platform admin in supabase/seed.sql (password123).
const ADMIN = { email: "alice@example.com", password: "password123" };

test("admin deactivates an account and blocks a user", async ({ browser }) => {
  const userEmail = uniqueEmail("tenant");

  await createUser(userEmail);

  const user = await (await browser.newContext()).newPage();

  await signIn(user, userEmail);

  const slug = await createAccount(user, "E2E Admin Target");

  // Regular users do not see /admin.
  await user.goto("/admin");
  await expect(user.getByRole("heading", { name: "Page not found" })).toBeVisible();

  const admin = await (await browser.newContext()).newPage();

  await signIn(admin, ADMIN.email, ADMIN.password);
  await admin.goto("/admin");
  await expect(admin).toHaveURL(/\/admin\/accounts$/);

  // Deactivate: the members lose the account.
  await admin.getByRole("searchbox", { name: "Search" }).fill(slug);
  await admin.getByRole("button", { name: "Search" }).click();
  await expect(admin.getByText("1 result")).toBeVisible();
  await admin.getByRole("button", { name: "Deactivate" }).click();
  await admin.getByRole("alertdialog").getByRole("button", { name: "Deactivate" }).click();
  await expect(admin.getByText("E2E Admin Target was deactivated.")).toBeVisible();

  await user.goto(`/${slug}`);
  await expect(user.getByRole("heading", { name: "Page not found" })).toBeVisible();

  await admin.getByRole("button", { name: "Reactivate" }).click();
  await expect(admin.getByText("E2E Admin Target was reactivated.")).toBeVisible();
  await user.goto(`/${slug}`);
  await expect(user).toHaveURL(new RegExp(`/${slug}$`));
  await expect(user.getByRole("heading", { name: "Page not found" })).toHaveCount(0);

  // Block: sign-in is refused until unblocked.
  await signOut(user);
  await admin.getByRole("link", { name: "Users" }).click();
  await expect(admin).toHaveURL(/\/admin\/users$/);
  await expect(admin.getByRole("heading", { name: "Users" })).toBeVisible();
  await admin.getByRole("searchbox", { name: "Search" }).fill(userEmail);
  await admin.getByRole("button", { name: "Search" }).click();
  await expect(admin.getByText("1 result")).toBeVisible();
  await admin.getByRole("button", { name: "Block", exact: true }).click();
  await admin.getByRole("alertdialog").getByRole("button", { name: "Block" }).click();
  await expect(admin.getByText(`${userEmail} was blocked.`)).toBeVisible();

  await user.goto("/sign-in");
  await user.getByLabel("Email").fill(userEmail);
  await user.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await user.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(user.getByText("This account is blocked. Contact support.")).toBeVisible();

  await admin.getByRole("button", { name: "Unblock" }).click();
  await expect(admin.getByText(`${userEmail} was unblocked.`)).toBeVisible();
  await signIn(user, userEmail);
});
