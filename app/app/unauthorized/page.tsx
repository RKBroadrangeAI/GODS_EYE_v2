import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold">Unauthorized</h1>
      <p className="mt-2 text-sm text-zinc-600">You do not have access to this page.</p>
      <Button asChild className="mt-5">
        <Link href="/app/sales-performance">Back to dashboard</Link>
      </Button>
    </div>
  );
}
