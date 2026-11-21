import { Suspense } from "react";

import { DashboardNav } from "./dashboard-nav";
import { UserMenu } from "./user-menu";

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          {/* usePathname() on a dynamic route needs a Suspense boundary
              under cacheComponents, like params does. */}
          <Suspense fallback={<div className="h-5" />}>
            <DashboardNav />
          </Suspense>
          <Suspense fallback={<div className="h-8" />}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      {children}
    </>
  );
}