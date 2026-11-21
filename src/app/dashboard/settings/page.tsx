import { Suspense } from "react";

import { AccountSection } from "./account-section";
import { UsageSection } from "./usage-section";

const loading = <p className="text-sm text-muted-foreground">Loading…</p>;

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Account</h2>
        <Suspense fallback={loading}>
          <AccountSection />
        </Suspense>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">AI usage</h2>
        <Suspense fallback={loading}>
          <UsageSection />
        </Suspense>
      </section>
    </main>
  );
}