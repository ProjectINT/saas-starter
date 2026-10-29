import { AdminUsers } from "@/core/admin/components/admin-users";
import { requireClaims } from "@/core/auth/session";
import { pageMetadata } from "@/core/i18n/metadata";

export const generateMetadata = pageMetadata("adminUsers");

/** The layout has checked the platform admin; the list loads in the browser through admin_list_users. */
export default async function AdminUsersPage() {
  const claims = await requireClaims();

  return <AdminUsers myId={claims.sub} />;
}
