import { PasswordForm } from "@/components/settings/password-form";
import { SettingsHeading, SettingsSection } from "@/components/settings/settings-section";

const SIGN_IN_METHODS = [
  { title: "Google", detail: "Sign in with the Google account that uses this email.", status: "Available" },
  { title: "Email sign-in link", detail: "A one-time link sent to your inbox. It expires after 15 minutes.", status: "Always available" },
];

export default function SecurityPage() {
  return (
    <div>
      <SettingsHeading title="Security and login">Keep your account safe with a strong password.</SettingsHeading>

      <SettingsSection title="Change password" description="Use at least 8 characters. A mix of upper case, numbers and symbols is stronger.">
        <PasswordForm />
      </SettingsSection>

      <SettingsSection title="Other ways to sign in" description="Use whichever is easiest. You can keep more than one.">
        <ul className="max-w-[560px]">
          {SIGN_IN_METHODS.map((method) => (
            <li key={method.title} className="flex items-center justify-between gap-6 border-t border-line py-4 first:border-t-0 first:pt-0">
              <div>
                <p className="text-[15px] font-medium">{method.title}</p>
                <p className="mt-0.5 text-[13px] text-muted">{method.detail}</p>
              </div>
              <span className="whitespace-nowrap text-[13px] text-muted">{method.status}</span>
            </li>
          ))}
        </ul>
      </SettingsSection>
    </div>
  );
}
