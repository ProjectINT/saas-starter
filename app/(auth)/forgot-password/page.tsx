import { ForgotPasswordView } from "@/core/auth/components/forgot-password-view";
import { pageMetadata } from "@/core/i18n/metadata";

export const generateMetadata = pageMetadata("forgotPassword");

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
