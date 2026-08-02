import Link from "next/link";
import { getProfile } from "@/lib/actions/profile";
import { ProfileForm } from "@/components/ProfileForm";
import { Card } from "@/components/Card";

export default async function SettingsPage() {
  const { profile } = await getProfile();

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

        <Card>
          <ProfileForm initialProfile={profile ?? null} />
        </Card>
      </div>
    </div>
  );
}
