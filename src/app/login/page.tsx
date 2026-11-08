import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { GoogleButton } from "./google-button";

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Sign-in failed. Please try again.
        </p>
      )}
      <GoogleButton />
    </>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Cruise Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage your crew schedules.
        </p>
        <Suspense
          fallback={
            <Button disabled className="w-full">
              Continue with Google
            </Button>
          }
        >
          <LoginContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}