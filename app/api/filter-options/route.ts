import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getLookupMap, getPeopleMap } from "@/lib/analytics";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "people") {
    const people = await getPeopleMap(false);
    return NextResponse.json(people.map((p) => ({ id: p.id, name: p.name })));
  }

  const allowed = ["brands", "lead_sources", "condition_types", "in_person_options"] as const;
  if (type && allowed.includes(type as (typeof allowed)[number])) {
    const map = await getLookupMap(type as (typeof allowed)[number]);
    const items = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    return NextResponse.json(items);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
