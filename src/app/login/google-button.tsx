"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleButton() {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("Google sign-in failed:", error.message);
      setLoading(false);
    }
  }

  return (
    <Button onClick={signIn} disabled={loading} className="w-full">
      {loading ? "Redirecting…" : "Continue with Google"}
    </Button>
  );
}