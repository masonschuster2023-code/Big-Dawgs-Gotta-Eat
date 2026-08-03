import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/actions/profile";
import { getCustomDayTypes } from "@/lib/actions/custom-day-types";
import { isLegacyAccount } from "@/lib/legacy-account";
import { ProfileForm } from "@/components/ProfileForm";
import { CustomDayTypesEditor } from "@/components/CustomDayTypesEditor";
import { Card } from "@/components/Card";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string }>;
}) {
  const { onboarded } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { profile } = await getProfile();
  const { customDayTypes } = profile ? await getCustomDayTypes() : { customDayTypes: [] };

  // Durable on account state (has a profile, isn't the legacy account) —
  // not on the one-time onboarded=1 param or on already having a day type,
  // both of which meant this card vanished for good the moment someone
  // skipped adding a day type on their very first settings visit.
  const showDayTypes = Boolean(profile) && !isLegacyAccount(user?.email);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-black/5 bg-white/90 px-5 py-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80">
          <div>
            <h1 className="text-xl font-bold">Your goals</h1>
            <p className="text-sm text-neutral-500">
              {profile
                ? "Update your stats and we'll recalculate your targets."
                : "A few details to set your calorie and macro targets."}
            </p>
          </div>
          {profile && (
            <Link href="/" className="text-sm font-medium text-tennessee hover:underline">
              ← Today
            </Link>
          )}
        </header>

        <div className="space-y-5">
          <Card>
            <ProfileForm initialProfile={profile ?? null} />
          </Card>

          {showDayTypes && (
            <Card title="Your day types">
              <CustomDayTypesEditor initial={customDayTypes ?? []} />
              {onboarded === "1" && (
                <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                  <Link
                    href="/"
                    className="inline-block rounded-md bg-tennessee px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark"
                  >
                    Continue to dashboard →
                  </Link>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
