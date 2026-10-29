import { expect, test } from "@playwright/test";

import { createAccount, createUser, linkIn, signIn, uniqueEmail, waitForEmail } from "./support";

// Example module: owners and admins manage projects, members only see them.
test("projects: an owner creates and deletes, a member only reads", async ({ browser }) => {
  const ownerEmail = uniqueEmail("proj-owner");
  const memberEmail = uniqueEmail("proj-member");

  await createUser(ownerEmail);
  await createUser(memberEmail);

  const owner = await (await browser.newContext()).newPage();

  await signIn(owner, ownerEmail);

  const slug = await createAccount(owner, "E2E Projects");

  await owner.getByRole("link", { name: "Projects", exact: true }).click();
  await expect(owner.getByText("No projects yet.")).toBeVisible();
  await owner.getByLabel("Project name").fill("Launch");
  await owner.getByLabel("Description").fill("Ship the first version");
  await owner.getByRole("button", { name: "Create project" }).click();
  await expect(owner.getByText("Project Launch created.")).toBeVisible();
  await expect(owner.getByText("Ship the first version")).toBeVisible();

  // A member sees the project but no form or delete button.
  await owner.getByRole("link", { name: "Members", exact: true }).click();
  await owner.getByRole("button", { name: "Invite member" }).click();
  await owner.getByRole("dialog").getByLabel("Email").fill(memberEmail);
  await owner.getByRole("button", { name: "Send invitation" }).click();
  await expect(owner.getByRole("heading", { name: "Invitation sent" })).toBeVisible();

  const invitation = await waitForEmail(memberEmail, /invited you to E2E Projects/);
  const member = await (await browser.newContext()).newPage();

  await signIn(member, memberEmail);
  await member.goto(linkIn(invitation.text, "http://localhost:3000/invite/"));
  await member.getByRole("button", { name: "Accept" }).click();
  await member.goto(`/${slug}/projects`);
  await expect(member.getByText("Launch", { exact: true })).toBeVisible();
  await expect(member.getByRole("button", { name: "Create project" })).toHaveCount(0);
  await expect(member.getByRole("button", { name: "Delete Launch" })).toHaveCount(0);

  // The owner deletes it.
  await owner.goto(`/${slug}/projects`);
  await owner.getByRole("button", { name: "Delete Launch" }).click();
  await owner.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(owner.getByText("Project Launch deleted.")).toBeVisible();
  await expect(owner.getByText("No projects yet.")).toBeVisible();
});
