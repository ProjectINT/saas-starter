import { expect, test } from "@playwright/test";

import { PASSWORD, linkIn, signOut, uniqueEmail, waitForEmail } from "./support";

// Supabase Auth emails go through the send-email hook to the running app: if
// sign-up fails with hook_timeout locally, see README -> Email -> Troubleshooting.
test("sign up, confirm, onboard, sign out, reset the password", async ({ page }) => {
  const email = uniqueEmail("signup");

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByText("I agree to the").click();
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  const confirmation = await waitForEmail(email, /Confirm your email/);

  await page.goto(linkIn(confirmation.text, "http://localhost:3000/auth/confirm"));
  await expect(page).toHaveURL(/\/onboarding$/);
  await waitForEmail(email, /Welcome to/);

  await page.getByLabel("Account name").fill("E2E Signup");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/e2e-signup/);
  await signOut(page);

  // Password reset: the link signs in and opens the new-password form.
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  const reset = await waitForEmail(email, /Reset your password/);

  await page.goto(linkIn(reset.text, "http://localhost:3000/auth/confirm"));
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel("New password", { exact: true }).fill(`${PASSWORD}2`);
  await page.getByLabel("Confirm new password").fill(`${PASSWORD}2`);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).not.toHaveURL(/\/reset-password$/);
  await signOut(page);

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(`${PASSWORD}2`);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/e2e-signup/);
});

test("a wrong password is refused", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  // Signed-out visitors of app pages land on sign-in.
  await page.goto("/accounts");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Faccounts/);
});

