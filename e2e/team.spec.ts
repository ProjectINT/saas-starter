import { expect, test } from "@playwright/test";

import { createAccount, createUser, linkIn, signIn, signOut, uniqueEmail, waitForEmail } from "./support";

// An owner invites a colleague by email; the colleague accepts from the link;
// the owner changes their role, then removes them.
test("invite, accept, change role, remove", async ({ browser }) => {
  const ownerEmail = uniqueEmail("owner");
  const inviteeEmail = uniqueEmail("invitee");

  await createUser(ownerEmail, { first_name: "Olga", last_name: "Owner" });
  await createUser(inviteeEmail, { first_name: "Ivan", last_name: "Invitee" });

  const owner = await (await browser.newContext()).newPage();

  await signIn(owner, ownerEmail);
  await expect(owner).toHaveURL(/\/onboarding$/);

  const slug = await createAccount(owner, "E2E Team");

  // Invite.
  await owner.getByRole("link", { name: "Members" }).click();
  await owner.getByRole("button", { name: "Invite member" }).click();
  await owner.getByRole("dialog").getByLabel("Email").fill(inviteeEmail);
  await owner.getByRole("button", { name: "Send invitation" }).click();
  await expect(owner.getByRole("heading", { name: "Invitation sent" })).toBeVisible();
  await owner.getByRole("button", { name: "Done" }).click();
  await expect(owner.getByText(inviteeEmail, { exact: true })).toBeVisible();

  const email = await waitForEmail(inviteeEmail, /invited you to E2E Team/);

  expect(email.text).toContain("Olga Owner invited you to join E2E Team");

  // Accept from the link.
  const invitee = await (await browser.newContext()).newPage();

  await signIn(invitee, inviteeEmail);
  await invitee.goto(linkIn(email.text, "http://localhost:3000/invite/"));
  await invitee.getByRole("button", { name: "Accept" }).click();
  await expect(invitee).toHaveURL(new RegExp(`/${slug}$`));
  await expect(invitee.getByText("Your role: Member")).toBeVisible();

  // Change the role, then remove.
  await owner.reload();
  await owner.getByRole("button", { name: "Actions for Ivan Invitee" }).click();
  await owner.getByRole("menuitem", { name: "Change role to Admin" }).click();
  await expect(owner.getByText("Ivan Invitee now has the Admin role.")).toBeVisible();

  await owner.getByRole("button", { name: "Actions for Ivan Invitee" }).click();
  await owner.getByRole("menuitem", { name: "Remove from account" }).click();
  await owner.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(owner.getByText("Ivan Invitee was removed from the account.")).toBeVisible();

  // The removed member no longer gets in.
  await invitee.goto(`/${slug}`);
  await expect(invitee.getByRole("heading", { name: "Page not found" })).toBeVisible();

  await signOut(owner);
});
