import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import type { AppRole } from "@/types/database";

export type AuthContext = {
  userId: string;
  email: string | null;
  employeeId: string;
  role: AppRole;
  name: string;
  initials: string | null;
};

export async function requireAuth(): Promise<AuthContext> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return {
    userId: session.employeeId,
    email: session.email,
    employeeId: session.employeeId,
    role: session.role,
    name: session.name,
    initials: session.initials,
  };
}

export async function requireRoles(roles: AppRole[]) {
  const auth = await requireAuth();
  if (!roles.includes(auth.role)) {
    redirect("/app/unauthorized");
  }
  return auth;
}
