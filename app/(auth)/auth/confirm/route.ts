import type { EmailOtpType } from "@supabase/supabase-js";

import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/core/auth/redirect";
import { routes } from "@/core/config/routes";
import { createClient } from "@/core/supabase/server";

const EMAIL_OTP_TYPES: readonly string[] = [
  "email",
  "signup",
  "recovery",
  "email_change",
  "invite",
  "magiclink",
] satisfies EmailOtpType[];

const isEmailOtpType = (value: string | null): value is EmailOtpType => value !== null && EMAIL_OTP_TYPES.includes(value);

/**
 * Target of the links in supabase/templates:
 * /auth/confirm?token_hash=...&type=email|recovery|email_change[&next=/path].
 * Verifies the one-time token on the server and sets the session cookie, so
 * the link works in any browser. Recovery links continue to the new-password form.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (tokenHash && isEmailOtpType(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      const next = type === "recovery" ? routes.resetPassword : safeNextPath(searchParams.get("next"));

      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL(`${routes.authError}?reason=link`, request.url));
}
