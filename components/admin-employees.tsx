"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers";
import { UserAvatar } from "@/components/user-avatar";
import { BrandIcon } from "@/components/brand-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KeyRound, Trash2, X, ChevronLeft, ChevronRight, Users, ShoppingBag, Pencil, Check } from "lucide-react";

type Employee = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  initials: string | null;
  is_active: boolean;
  has_password: boolean;
  avatar_url: string | null;
};

type Brand = {
  id: string;
  name: string;
  is_active: boolean;
};

/* ── Horizontal scroll carousel ── */
function Carousel({ children, label, icon }: { children: React.ReactNode; label: string; icon: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const pageWidth = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -pageWidth : pageWidth, behavior: "smooth" });
  };

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
        {icon}
        {label}
      </h3>
      <div className="relative group">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-zinc-200 shadow-lg text-zinc-500 hover:text-zinc-800 hover:shadow-xl transition-all opacity-0 group-hover:opacity-100 sm:opacity-100 -ml-3"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-zinc-200 shadow-lg text-zinc-500 hover:text-zinc-800 hover:shadow-xl transition-all opacity-0 group-hover:opacity-100 sm:opacity-100 -mr-3"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
        {/* Fade edges */}
        {canScrollLeft && <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-[5]" />}
        {canScrollRight && <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-[5]" />}
        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-3 overflow-x-auto px-1 py-1 scrollbar-hide snap-x"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function AdminEmployees({ rows, brands = [], isAdmin = false }: { rows: Employee[]; brands?: Brand[]; isAdmin?: boolean }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();
  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; email: string; initials: string; role: string }>({ name: "", email: "", initials: "", role: "" });

  function startEditing(emp: Employee) {
    setEditingEmployee(emp.id);
    setSelectedEmployee(emp.id);
    setEditForm({ name: emp.name, email: emp.email ?? "", initials: emp.initials ?? "", role: emp.role });
  }

  async function saveEmployee() {
    if (!editingEmployee) return;
    const response = await fetch("/api/admin/employees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingEmployee,
        name: editForm.name,
        email: editForm.email || null,
        initials: editForm.initials,
        role: editForm.role,
      }),
    });
    if (!response.ok) {
      error("Failed to update employee");
      return;
    }
    success("Employee updated");
    setEditingEmployee(null);
    startTransition(() => router.refresh());
  }

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

  async function uploadAvatar(employeeId: string, file: File) {
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("employeeId", employeeId);
    const response = await fetch("/api/admin/avatar", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const json = await response.json().catch(() => ({})) as { error?: string };
      error(json.error ?? "Failed to upload avatar");
      return;
    }
    success("Avatar updated");
    startTransition(() => router.refresh());
  }

  const activeRows = rows.filter((r) => r.is_active);

  return (
    <div className="space-y-6">
      {/* ── Employee Carousel ── */}
      <Carousel label={`Team (${activeRows.length})`} icon={<Users className="h-4 w-4 text-indigo-500" />}>
        {activeRows.map((emp) => (
          <button
            key={emp.id}
            onClick={() => setSelectedEmployee(selectedEmployee === emp.id ? null : emp.id)}
            className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-3 min-w-[90px] snap-start transition-all ${
              selectedEmployee === emp.id
                ? "border-indigo-400 bg-indigo-50 shadow-md ring-2 ring-indigo-200"
                : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
            }`}
          >
            <UserAvatar name={emp.name} avatarUrl={emp.avatar_url} size={48} />
            <span className="text-xs font-medium text-zinc-700 whitespace-nowrap max-w-[80px] truncate">{emp.name.split(" ")[0]}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              emp.role === "admin" ? "bg-red-100 text-red-700"
                : emp.role === "management" ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"
            }`}>
              {emp.role.replace("_", " ")}
            </span>
          </button>
        ))}
      </Carousel>

      {/* ── Selected Employee Detail ── */}
      {selectedEmployee && (() => {
        const emp = rows.find((r) => r.id === selectedEmployee);
        if (!emp) return null;
        const isEditing = editingEmployee === emp.id;
        return (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-4">
              <UserAvatar name={emp.name} avatarUrl={emp.avatar_url} size={56} />
              {isEditing ? (
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Name"
                      className="h-9 text-sm"
                    />
                    <Input
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="Email"
                      type="email"
                      className="h-9 text-sm"
                    />
                    <Input
                      value={editForm.initials}
                      onChange={(e) => setEditForm({ ...editForm, initials: e.target.value })}
                      placeholder="Initials"
                      maxLength={4}
                      className="h-9 text-sm"
                    />
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="h-9 rounded-md border border-zinc-300 px-3 text-sm"
                    >
                      <option value="admin">admin</option>
                      <option value="management">management</option>
                      <option value="sales_associate">sales_associate</option>
                      <option value="view_only">view_only</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button className="h-8 text-xs gap-1 px-3" onClick={saveEmployee} disabled={isPending}>
                      <Check className="h-3.5 w-3.5" /> Save
                    </Button>
                    <Button variant="outline" className="h-8 text-xs px-3" onClick={() => setEditingEmployee(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-800">{emp.name}</p>
                  <p className="text-sm text-zinc-500">{emp.email ?? "No email"}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs text-zinc-400">Role: <span className="font-medium text-zinc-600">{emp.role.replace("_", " ")}</span></span>
                    <span className="text-xs text-zinc-400">Initials: <span className="font-medium text-zinc-600">{emp.initials ?? "—"}</span></span>
                    <span className="text-xs text-zinc-400">Login: <span className={`font-medium ${emp.has_password ? "text-green-600" : "text-zinc-500"}`}>{emp.has_password ? "Set" : "None"}</span></span>
                    <span className="text-xs text-zinc-400">Active: <span className={`font-medium ${emp.is_active ? "text-green-600" : "text-red-500"}`}>{emp.is_active ? "Yes" : "No"}</span></span>
                  </div>
                  {isAdmin && (
                    <Button variant="outline" className="h-7 text-xs gap-1 mt-2 px-2" onClick={() => startEditing(emp)}>
                      <Pencil className="h-3 w-3" /> Edit Profile
                    </Button>
                  )}
                </div>
              )}
              <button onClick={() => { setSelectedEmployee(null); setEditingEmployee(null); }} className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Brands Carousel ── */}
      {brands.length > 0 && (
        <Carousel label={`Brands (${brands.length})`} icon={<ShoppingBag className="h-4 w-4 text-amber-500" />}>
          {brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => setSelectedBrand(selectedBrand === brand.id ? null : brand.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-3 min-w-[90px] snap-start transition-all ${
                selectedBrand === brand.id
                  ? "border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
              }`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-50 border border-zinc-100">
                <BrandIcon name={brand.name} size={32} />
              </span>
              <span className="text-xs font-medium text-zinc-700 whitespace-nowrap max-w-[80px] truncate">{brand.name}</span>
            </button>
          ))}
        </Carousel>
      )}

      {/* ── Selected Brand Detail ── */}
      {selectedBrand && (() => {
        const brand = brands.find((b) => b.id === selectedBrand);
        if (!brand) return null;
        return (
          <div className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-white border border-zinc-200 shadow-sm">
              <BrandIcon name={brand.name} size={40} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-800">{brand.name}</p>
              <span className={`text-xs font-medium ${brand.is_active ? "text-green-600" : "text-red-500"}`}>
                {brand.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <button onClick={() => setSelectedBrand(null)} className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })()}

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
            {["Avatar", "Name", "Email", "Role", "Initials", "Login", "Active", "Actions"].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <label className="cursor-pointer group relative inline-block">
                  <UserAvatar name={row.name} avatarUrl={row.avatar_url} size={36} />
                  {isAdmin && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-white text-[9px] font-bold">Edit</span>
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadAvatar(row.id, file);
                          e.target.value = "";
                        }}
                      />
                    </>
                  )}
                </label>
              </TableCell>
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
                    <Button
                      variant="outline"
                      className="h-8 px-2"
                      title="Edit employee"
                      onClick={() => startEditing(row)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
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
