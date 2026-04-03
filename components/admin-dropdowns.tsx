"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DropdownTable = {
  table: string;
  rows: Array<{ id: string; name: string; is_active: boolean }>;
};

export function AdminDropdowns({ tables }: { tables: DropdownTable[] }) {
  const [selectedTable, setSelectedTable] = useState(tables[0]?.table ?? "brands");
  const router = useRouter();
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();

  const current = tables.find((table) => table.table === selectedTable) ?? tables[0];

  async function addOption(formData: FormData) {
    const response = await fetch("/api/admin/dropdowns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: selectedTable,
        name: formData.get("name"),
      }),
    });

    if (!response.ok) {
      error("Failed to add option");
      return;
    }

    success("Dropdown option added");
    startTransition(() => router.refresh());
  }

  async function toggle(id: string, isActive: boolean) {
    const response = await fetch("/api/admin/dropdowns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: selectedTable, id, isActive }),
    });

    if (!response.ok) {
      error("Failed to update option");
      return;
    }

    success("Dropdown option updated");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedTable}
          onChange={(event) => setSelectedTable(event.target.value)}
          className="h-10 rounded-md border border-zinc-300 px-3 text-sm"
        >
          {tables.map((table) => (
            <option key={table.table} value={table.table}>
              {table.table}
            </option>
          ))}
        </select>
        <form action={addOption} className="flex gap-2">
          <Input name="name" required placeholder="New value" />
          <Button type="submit" disabled={isPending}>Add</Button>
        </form>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {current?.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.is_active ? "Yes" : "No"}</TableCell>
              <TableCell>
                <Button variant="outline" onClick={() => toggle(row.id, !row.is_active)}>
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
