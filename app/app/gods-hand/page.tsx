import { requireRoles } from "@/lib/auth";
import { GodsHand } from "@/components/gods-hand";

export default async function GodsHandPage() {
  await requireRoles(["admin"]);

  return (
    <section className="flex flex-col h-[calc(100vh-4rem)] p-6">
      <GodsHand />
    </section>
  );
}
