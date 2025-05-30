export async function handleSocialLogin(profile: any) {
  // Lookup user in DB or create if not found
  return {
    id: profile.id,
    email: profile.emails?.[0]?.value,
    name: profile.displayName,
    provider: profile.provider,
  };
}
