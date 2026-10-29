import { requireClaims } from "@/core/auth/session";
import { pageMetadata } from "@/core/i18n/metadata";
import { ProfileSettings } from "@/core/settings/components/profile-settings";
import { createClient } from "@/core/supabase/server";

export const generateMetadata = pageMetadata("settingsProfile");

/** The signed-in user's name, email and password; the same in every account. */
export default async function ProfileSettingsPage() {
  const claims = await requireClaims();
  const supabase = await createClient();
  // getUser() for new_email: a change waiting for confirmation is not in the claims.
  const [{ data: profile, error }, { data: auth }] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name, email").eq("id", claims.sub).single(),
    supabase.auth.getUser(),
  ]);

  if (error) {
    throw error;
  }

  return (
    <ProfileSettings
      initial={{ firstName: profile.first_name ?? "", lastName: profile.last_name ?? "", email: profile.email ?? claims.email ?? "" }}
      pendingEmail={auth.user?.new_email ?? ""}
      userId={claims.sub}
    />
  );
}
