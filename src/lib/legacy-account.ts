// The legacy day_types system (the four fixed Run/Lift/Rest types with their
// own calorie_max/protein_g/carb_max/fat_g targets) predates the Mifflin-St
// Jeor profile onboarding and the custom day types it enabled. It was never
// meant to extend to new accounts — restricted here by account identity,
// not by incidental data presence, since data-presence gating is what let a
// new account fall through onto this list in the first place.
const LEGACY_ACCOUNT_EMAIL = "masonschuster2023@gmail.com";

export function isLegacyAccount(email: string | null | undefined): boolean {
  return email === LEGACY_ACCOUNT_EMAIL;
}
