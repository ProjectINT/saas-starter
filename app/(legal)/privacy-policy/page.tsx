import type { Metadata } from "next";

import { siteConfig } from "@/core/config/site";

export const metadata: Metadata = { title: "Privacy Policy" };

// Placeholder. Replace with a policy that matches your data processing before launch.
export default function PrivacyPolicyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-muted">Placeholder text. Replace it with the privacy policy of your product.</p>
      <h2>1. Data we collect</h2>
      <p>{siteConfig.name} stores your email address, profile details and the data you add to your accounts.</p>
      <h2>2. How we use it</h2>
      <p>To provide the service, secure your account and contact you about it.</p>
      <h2>3. Contact</h2>
      <p>Privacy questions: add your contact address here.</p>
    </>
  );
}
