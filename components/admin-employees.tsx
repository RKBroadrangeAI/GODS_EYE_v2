"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Employee = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  initials: string | null;
  is_active: boolean;
};

export function AdminEmployees({ rows }: { rows: Employee[] }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();

  async function addEmployee(formData: FormData) {
    const response = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email") || undefined,
        initials: formData.get("initials"),
        role: formData.get("role"),
      }),
    });

    if (!response.ok) {
      error("Failed to add employee");
      return;
    }

    success("Employee added");
    startTransition(() => router.refresh());
  }

  async function toggleEmployee(id: string, isActive: boolean) {
    const response = await fetch("/api/admin/employees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive }),
    });

    if (!response.ok) {
      error("Failed to update employee");
      return;
    }

    success("Employee updated");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <form action={addEmployee} className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-5">
        <Input name="name" placeholder="Employee Name" required />
        <Input name="email" type="email" placeholder="email@company.com" />
        <Input name="initials" placeholder="AB" required maxLength={4} />
        <select name="role" className="h-10 rounded-md border border-zinc-300 px-3 text-sm" defaultValue="sales_associate">
          <option value="admin">admin</option>
          <option value="management">management</option>
          <option value="sales_associate">sales_associate</option>
          <option value="view_only">view_only</option>
        </select>
        <Button type="submit" disabled={isPending}>Add Employee</Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            {["Name", "Email", "Role", "Initials", "Active", "Action"].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.email ?? "—"}</TableCell>
              <TableCell>{row.role}</TableCell>
              <TableCell>{row.initials ?? "—"}</TableCell>
              <TableCell>{row.is_active ? "Yes" : "No"}</TableCell>
              <TableCell>
                <Button variant="outline" onClick={() => toggleEmployee(row.id, !row.is_active)}>
                  {row.is_active ? "Deactivate" : "Activate"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
