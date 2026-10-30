import Link from "next/link";
import { PlanCards } from "@/components/settings/plan-cards";
import { ProWaitlist } from "@/components/settings/pro-waitlist";
import { SettingsHeading, SettingsSection } from "@/components/settings/settings-section";

export default function BillingPage() {
  return (
    <div>
      <SettingsHeading title="Plan and billing">See your current plan and what each tier includes.</SettingsHeading>
      <Link href="/settings/usage" className="link-underline -mt-6 mb-9 inline-block text-sm font-medium">View usage and analytics</Link>

      <PlanCards />

      <div className="mt-10">
        <SettingsSection title="Get Pro first" description="Tell us you are interested and we will email you when it launches.">
          <ProWaitlist />
        </SettingsSection>
      </div>
    </div>
  );
}
