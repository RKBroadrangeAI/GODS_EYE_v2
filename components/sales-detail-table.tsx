"use client";

import { useMemo, useState, useTransition, useCallback } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";

type SalesDetailRow = {
  id: string;
  salesPerson: string;
  avatarUrl: string | null;
  make: string;
  condition: string;
  stockNumber: string | null;
  reference: string | null;
  year: number | null;
  dateIn: string;
  dateOut: string | null;
  cost: number;
  soldFor: number;
  soldTo: string | null;
  inPerson: string;
  source: string;
  cashed: boolean;
  by: string | null;
  margin: number | null;
  profit: number;
};

const columnHelper = createColumnHelper<SalesDetailRow>();

export function SalesDetailTable({ rows }: { rows: SalesDetailRow[] }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateRow = useCallback(async (id: string, payload: { cost?: number; soldFor?: number; isCashed?: boolean }) => {
    setPendingRowId(id);
    const response = await fetch(`/api/sales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPendingRowId(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      error(data.error ?? "Update failed");
      return;
    }

    success("Sale updated");
    startTransition(() => router.refresh());
  }, [error, router, success]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "salesPerson",
        header: "SALES PERSON",
        cell: ({ row }) => (
          <Link href={`/app/sales-detail?salesPerson=${encodeURIComponent(row.original.salesPerson)}`} className="flex items-center gap-2 text-blue-600 hover:underline font-medium">
            <UserAvatar name={row.original.salesPerson} avatarUrl={row.original.avatarUrl} size={24} />
            {row.original.salesPerson}
          </Link>
        ),
      }),
      columnHelper.display({
        id: "make",
        header: "MAKE",
        cell: ({ row }) => (
          <Link href={`/app/sales-detail?brand=${encodeURIComponent(row.original.make)}`} className="text-blue-600 hover:underline font-medium">
            {row.original.make}
          </Link>
        ),
      }),
      columnHelper.accessor("condition", { header: "CONDITION" }),
      columnHelper.accessor("stockNumber", { header: "STOCK #" }),
      columnHelper.accessor("reference", { header: "REFERENCE" }),
      columnHelper.accessor("year", { header: "YEAR" }),
      columnHelper.accessor("dateIn", { header: "DATE IN" }),
      columnHelper.accessor("dateOut", { header: "DATE OUT" }),
      columnHelper.display({
        id: "cost",
        header: "COST",
        cell: ({ row }) => (
          <InlineNumber
            defaultValue={row.original.cost}
            disabled={pendingRowId === row.original.id || isPending}
            onSave={(value) => updateRow(row.original.id, { cost: value })}
          />
        ),
      }),
      columnHelper.display({
        id: "soldFor",
        header: "SOLD FOR",
        cell: ({ row }) => (
          <InlineNumber
            defaultValue={row.original.soldFor}
            disabled={pendingRowId === row.original.id || isPending}
            onSave={(value) => updateRow(row.original.id, { soldFor: value })}
          />
        ),
      }),
      columnHelper.accessor("soldTo", { header: "SOLD TO" }),
      columnHelper.accessor("inPerson", { header: "IN PERSON?" }),
      columnHelper.display({
        id: "source",
        header: "SOURCE",
        cell: ({ row }) => (
          <Link href={`/app/sales-detail?source=${encodeURIComponent(row.original.source)}`} className="text-blue-600 hover:underline font-medium">
            {row.original.source}
          </Link>
        ),
      }),
      columnHelper.display({
        id: "cashed",
        header: "CASHED",
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.original.cashed}
            disabled={pendingRowId === row.original.id || isPending}
            onChange={(event) => updateRow(row.original.id, { isCashed: event.target.checked })}
          />
        ),
      }),
      columnHelper.accessor("by", { header: "BY" }),
      columnHelper.display({
        id: "margin",
        header: "MARGIN",
        cell: ({ row }) =>
          row.original.margin == null ? "—" : `${(Number(row.original.margin) * 100).toFixed(1)}%`,
      }),
      columnHelper.display({
        id: "profit",
        header: "PROFIT",
        cell: ({ row }) => Number(row.original.profit).toLocaleString(),
      }),
    ],
    [isPending, pendingRowId, updateRow],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function InlineNumber({
  defaultValue,
  onSave,
  disabled,
}: {
  defaultValue: number;
  onSave: (value: number) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(String(defaultValue));

  return (
    <Input
      value={value}
      disabled={disabled}
      type="number"
      step="0.01"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        const next = Number(value);
        if (Number.isFinite(next) && next !== defaultValue) {
          onSave(next);
        }
      }}
      className="h-8 min-w-28"
    />
  );
}
