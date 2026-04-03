import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { PlaceholderPage } from "@/components/placeholder-page";
import { dashboardLinks } from "@/lib/constants";

export default async function PlaceholderRoute({
  params,
}: {
  params: Promise<{ placeholder: string[] }>;
}) {
  await requireAuth();
  const { placeholder } = await params;
  const path = `/app/${placeholder.join("/")}`;
  const match = dashboardLinks.find((item) => item.href === path);

  if (!match) {
    notFound();
  }

  return <PlaceholderPage title={match.label} />;
}
