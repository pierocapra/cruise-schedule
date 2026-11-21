import { requireUser } from "@/lib/auth";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  email: "Email and password",
};

export async function AccountSection() {
  const { supabase, user } = await requireUser();

  // requireUser() only exposes id and email (from the token's claims), so ask
  // the auth server for the profile details. Failure is not fatal: the email
  // alone is still shown.
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;

  const fullName = authUser?.user_metadata?.full_name;
  const name = typeof fullName === "string" && fullName.trim() !== "" ? fullName : null;

  const provider = authUser?.app_metadata?.provider;
  const providerLabel =
    typeof provider === "string" ? (PROVIDER_LABELS[provider] ?? provider) : null;

  return (
    <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
      {name && (
        <>
          <dt className="text-muted-foreground">Name</dt>
          <dd>{name}</dd>
        </>
      )}
      <dt className="text-muted-foreground">Email</dt>
      <dd>{user.email}</dd>
      {providerLabel && (
        <>
          <dt className="text-muted-foreground">Signed in with</dt>
          <dd>{providerLabel}</dd>
        </>
      )}
    </dl>
  );
}