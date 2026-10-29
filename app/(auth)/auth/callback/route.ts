import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/core/auth/redirect";
import { routes } from "@/core/config/routes";
import { syncProfileLocale } from "@/core/i18n/locale";
import { createClient } from "@/core/supabase/server";

/**
 * PKCE callback for OAuth sign-in and for links from the default Supabase
 * email templates: exchanges `code` for a session cookie and continues to
 * `next`. The code verifier lives in a cookie of the browser that started the
 * flow, so links opened in another browser fail here; the templates in
 * supabase/templates use /auth/confirm, which has no such limit.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      await syncProfileLocale(supabase, data.user.id);

      return NextResponse.redirect(new URL(safeNextPath(searchParams.get("next")), request.url));
    }
  }

  // Expired email links arrive as ?error=access_denied&error_code=otp_expired.
  const reason = searchParams.get("error_code") === "otp_expired" ? "link" : "callback";

  return NextResponse.redirect(new URL(`${routes.authError}?reason=${reason}`, request.url));
}
