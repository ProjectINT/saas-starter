import { redirect } from "next/navigation";

import { routes } from "@/core/config/routes";

export default function AdminPage() {
  redirect(routes.adminAccounts);
}
