import { requireAuth } from "@/lib/auth";
import { SmartGraph } from "@/components/smart-graph";

export default async function SmartGraphPage() {
  await requireAuth();

  const currentYear = new Date().getFullYear();

  return (
    <section className="flex flex-col h-[calc(100vh-4rem)]">
      <SmartGraph year={currentYear} />
    </section>
  );
}
