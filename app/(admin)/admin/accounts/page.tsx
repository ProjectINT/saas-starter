import { AdminAccounts } from "@/core/admin/components/admin-accounts";
import { pageMetadata } from "@/core/i18n/metadata";

export const generateMetadata = pageMetadata("adminAccounts");

/** The layout has checked the platform admin; the list loads in the browser through admin_list_accounts. */
export default function AdminAccountsPage() {
  return <AdminAccounts />;
}
