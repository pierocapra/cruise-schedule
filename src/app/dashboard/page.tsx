import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/auth";

async function HomeContent() {
  // Guards the page: redirects to /login when signed out. The layout's user
  // menu does the same, but a layout does not re-run on client navigation,
  // so every page keeps its own guard.
  await requireUser();

  return (
    <ul className="space-y-1 text-sm">
      <li>
        <Link href="/dashboard/cruises" className="underline">
          Cruises
        </Link>
      </li>
    </ul>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
      >
        <HomeContent />
      </Suspense>
    </main>
  );
}