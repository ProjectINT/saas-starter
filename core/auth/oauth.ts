import "server-only";

import { publicEnv } from "@/core/config/public-env";

/** OAuth providers the sign-in page has buttons for. */
const SUPPORTED_PROVIDERS = ["google", "github"] as const;

export type OAuthProvider = (typeof SUPPORTED_PROVIDERS)[number];

/**
 * Providers enabled in Supabase Auth, read from its public settings endpoint,
 * so a button appears once the provider is configured there
 * ([auth.external.<provider>] locally, Dashboard -> Authentication -> Providers
 * when hosted). Returns none if Auth is unreachable.
 */
export async function getEnabledOAuthProviders(): Promise<OAuthProvider[]> {
  try {
    const response = await fetch(`${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return [];
    }

    const settings = (await response.json()) as { external?: Record<string, boolean> };

    return SUPPORTED_PROVIDERS.filter((provider) => settings.external?.[provider] === true);
  } catch {
    return [];
  }
}
