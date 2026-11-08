import { redirect } from "next/navigation";
import Link from "next/link";

export default function Home() {
  redirect("/dashboard");
}

<Link href="/dashboard/files" className="underline">
  Source files
</Link>