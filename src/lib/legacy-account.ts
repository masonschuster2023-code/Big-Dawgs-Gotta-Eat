// The legacy day_types system (the four fixed Run/Lift/Rest types with their
// own calorie_max/protein_g/carb_max/fat_g targets) predates the Mifflin-St
// Jeor profile onboarding and the custom day types it enabled. It was never
// meant to extend to new accounts — restricted here by account identity,
// not by incidental data presence, since data-presence gating is what let a
// new account fall through onto this list in the first place.
const LEGACY_ACCOUNT_EMAIL = "masonschuster2023@gmail.com";

// Feature 2 Step 1 migration cutover for the legacy account. Stays false
// until Mason has (a) added his four day types to custom_day_types with the
// exact offsets that reproduce his legacy targets, and (b) confirmed in the
// live app that they match before this flips. Flipping it does not touch
// the day_types table or his daily_logs history — it only changes which
// system his own dashboard reads from, and is trivially reversible.
const MIGRATED_TO_CUSTOM_DAY_TYPES = true;

export function isLegacyAccount(email: string | null | undefined): boolean {
  return email === LEGACY_ACCOUNT_EMAIL && !MIGRATED_TO_CUSTOM_DAY_TYPES;
}
