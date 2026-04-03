import { getSession } from "@/lib/session";
import type { AppRole } from "@/types/database";

export type RequestAuth = {
  userId: string;
  employeeId: string;
  role: AppRole;
  initials: string | null;
};

export async function getRequestAuth(): Promise<RequestAuth | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    userId: session.employeeId,
    employeeId: session.employeeId,
    role: session.role,
    initials: session.initials,
  };
}
