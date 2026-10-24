export type ProfileNames = { firstName: string; lastName: string | null };

function cleanName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().replace(/\s+/g, " ").slice(0, 100).trim();
}

// Same naming rule as the main app, so a first sign-in here still fills the profile.
export function namesFromGoogle(metadata: Record<string, unknown> | undefined, email: string): ProfileNames {
  let firstName = cleanName(metadata?.given_name);
  let lastName = cleanName(metadata?.family_name);
  const fullName = cleanName(metadata?.full_name) || cleanName(metadata?.name);
  if (!firstName && fullName) {
    const [first, ...rest] = fullName.split(" ");
    firstName = first;
    lastName ||= rest.join(" ");
  }
  return { firstName: firstName || cleanName(email.split("@")[0]), lastName: lastName || null };
}

export function getSiteUrl() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001");
  return url.origin;
}

export function isColumbiaEmail(email: unknown): email is string {
  return typeof email === "string" && email.trim().toLowerCase().endsWith("@columbia.edu");
}

export const authErrors: Record<string, string> = {
  cancelled: "Google sign-in was cancelled. Please try again when you’re ready.",
  callback: "We couldn’t finish signing you in. Please start Google sign-in again.",
  domain: "This account is not approved for access. Contact the administrator.",
  profile: "We couldn’t load your profile. Please try signing in again.",
  signout: "We couldn’t sign you out. Please try again.",
};

