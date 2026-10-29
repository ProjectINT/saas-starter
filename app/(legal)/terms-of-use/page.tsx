import type { Metadata } from "next";

import { siteConfig } from "@/core/config/site";

export const metadata: Metadata = { title: "Terms of Use" };

// Placeholder. Replace with terms reviewed by a lawyer before launch.
export default function TermsOfUsePage() {
  return (
    <>
      <h1>Terms of Use</h1>
      <p className="text-muted">Placeholder text. Replace it with the terms of your product.</p>
      <h2>1. Service</h2>
      <p>{siteConfig.name} provides a hosted service. These terms govern your use of it.</p>
      <h2>2. Accounts</h2>
      <p>You are responsible for your account, its members and the activity in it.</p>
      <h2>3. Contact</h2>
      <p>Questions about these terms: add your contact address here.</p>
    </>
  );
}
