import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import Link from "next/link";

async function DashboardContent() {
  const { user } = await requireUser();

  return (
    <p className="text-sm text-muted-foreground">
      Signed in as {user.email}
    </p>
  );
}


export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </header>
      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
      >
        <DashboardContent />
      </Suspense>
      <Link href="/dashboard/files" className="underline">
        Source files
      </Link>
    </main>
  );
}