"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KeyRound, Trash2, X } from "lucide-react";

type Employee = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  initials: string | null;
  is_active: boolean;
  has_password: boolean;
};

export function AdminEmployees({ rows, isAdmin = false }: { rows: Employee[]; isAdmin?: boolean }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();
  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function addEmployee(formData: FormData) {
    const password = String(formData.get("password") ?? "");
    const response = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email") || undefined,
        initials: formData.get("initials"),
        role: formData.get("role"),
        password: password.length >= 6 ? password : undefined,
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

  async function setPassword(employeeId: string) {
    if (newPassword.length < 6) {
      error("Password must be at least 6 characters");
      return;
    }
    const response = await fetch("/api/admin/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, password: newPassword }),
    });

    if (!response.ok) {
      const json = await response.json().catch(() => ({})) as { error?: string };
      error(json.error ?? "Failed to set password");
      return;
    }

    success("Password updated");
    setPasswordFor(null);
    setNewPassword("");
    startTransition(() => router.refresh());
  }

  async function deleteEmployee(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
    const response = await fetch("/api/admin/employees", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      const json = await response.json().catch(() => ({})) as { error?: string };
      error(json.error ?? "Failed to delete employee");
      return;
    }

    success("Employee deleted");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <form action={addEmployee} className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-6">
          <Input name="name" placeholder="Employee Name" required />
          <Input name="email" type="email" placeholder="email@company.com" />
          <Input name="initials" placeholder="AB" required maxLength={4} />
          <select name="role" className="h-10 rounded-md border border-zinc-300 px-3 text-sm" defaultValue="sales_associate">
            <option value="admin">admin</option>
            <option value="management">management</option>
            <option value="sales_associate">sales_associate</option>
            <option value="view_only">view_only</option>
          </select>
          <Input name="password" type="password" placeholder="Password (min 6)" />
          <Button type="submit" disabled={isPending}>Add Employee</Button>
        </form>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {["Name", "Email", "Role", "Initials", "Login", "Active", "Actions"].map((h) => (
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
              <TableCell>
                {row.has_password ? (
                  <span className="text-green-600 text-xs font-medium">✓ Set</span>
                ) : (
                  <span className="text-zinc-400 text-xs">None</span>
                )}
              </TableCell>
              <TableCell>{row.is_active ? "Yes" : "No"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <Button variant="outline" className="h-8 text-xs px-2" onClick={() => toggleEmployee(row.id, !row.is_active)}>
                      {row.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="h-8 px-2"
                      title="Change password"
                      onClick={() => {
                        setPasswordFor(passwordFor === row.id ? null : row.id);
                        setNewPassword("");
                      }}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="h-8 px-2 text-red-500 hover:text-red-700 hover:border-red-300"
                      title="Delete employee"
                      onClick={() => deleteEmployee(row.id, row.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {passwordFor === row.id && (
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      type="password"
                      placeholder="New password (min 6)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-8 text-xs w-40"
                    />
                    <Button className="h-8 text-xs px-2" onClick={() => setPassword(row.id)}>
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8 px-1"
                      onClick={() => { setPasswordFor(null); setNewPassword(""); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
