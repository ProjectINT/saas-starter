import { expect, type Page } from "@playwright/test";

// Helpers for the e2e flows: users through the Auth admin API (no email),
// emails from the local Mailpit, the sign-in form.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54421";
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54424";

/** Test-only password for every user the flows create. */
export const PASSWORD = "e2e-Passw0rd";

/** A unique address per call, so runs never see each other's emails. */
export const uniqueEmail = (label: string) => `e2e-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

function adminHeaders() {
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY is not set: run `npm run env:local`.");
  }

  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

/** A confirmed user, created without sending any email. */
export async function createUser(email: string, metadata: Record<string, string> = {}) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: metadata }),
  });

  expect(response.ok, await response.clone().text()).toBe(true);

  return (await response.json()) as { id: string };
}

interface MailpitMessage {
  ID: string;
  Subject: string;
}

/** Text of the newest email to `to` whose subject matches, waiting for it to arrive. */
export async function waitForEmail(to: string, subject: RegExp) {
  let found: MailpitMessage | undefined;

  await expect.poll(async () => {
    const response = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const { messages } = (await response.json()) as { messages: MailpitMessage[] };

    found = messages.find((message) => subject.test(message.Subject));

    return Boolean(found);
  }, { message: `email to ${to} matching ${subject}`, timeout: 20_000 }).toBe(true);

  const response = await fetch(`${MAILPIT_URL}/api/v1/message/${found!.ID}`);
  const message = (await response.json()) as { Subject: string; Text: string };

  return { subject: message.Subject, text: message.Text };
}

/** The first link in an email's text that starts with `prefix` (an app URL). */
export function linkIn(text: string, prefix: string) {
  const link = text.match(new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\S+`))?.[0];

  expect(link, `a link starting with ${prefix}`).toBeTruthy();

  return link!;
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).not.toHaveURL(/\/sign-in/);
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
}

/** Onboarding: creates an account with a unique slug and waits for its home page. */
export async function createAccount(page: Page, name: string) {
  const slug = `e2e-${Date.now().toString(36)}`;

  await page.goto("/onboarding");
  await page.getByLabel("Account name").fill(name);
  await page.getByLabel("URL").fill(slug);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(new RegExp(`/${slug}$`));

  return slug;
}
