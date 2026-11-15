import { Suspense } from "react";

import { CreateCruiseForm } from "./create-cruise-form";
import { CruisesContent } from "./cruises-content";

export default function CruisesPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-xl font-semibold">Cruises</h1>
      <CreateCruiseForm />
      <Suspense fallback={<p>Loading cruises…</p>}>
        <CruisesContent />
      </Suspense>
    </main>
  );
}