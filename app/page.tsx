import { redirect } from "next/navigation";

import { getClaims } from "@/core/auth/session";
import { routes } from "@/core/config/routes";

// Entry point. A product with a landing page renders it here for signed-out visitors.
export default async function HomePage() {
  const claims = await getClaims();

  redirect(claims ? routes.accounts : routes.signIn);
}
