"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/providers";

type Option = { id: string; name: string };

type EnterSaleFormProps = {
  brands: Option[];
  conditionTypes: Option[];
  inPersonOptions: Option[];
  leadSources: Option[];
};

export function EnterSaleForm({
  brands,
  conditionTypes,
  inPersonOptions,
  leadSources,
}: EnterSaleFormProps) {
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { success, error } = useToast();

  async function submitSale(formData: FormData) {
    setSubmitting(true);
    const payload = {
      productId: formData.get("productId"),
      brandId: formData.get("brandId"),
      reference: formData.get("reference"),
      conditionTypeId: formData.get("conditionTypeId"),
      dateIn: formData.get("dateIn"),
      dateOut: formData.get("dateOut"),
      soldTo: formData.get("soldTo"),
      inPersonOptionId: formData.get("inPersonOptionId"),
      leadSourceId: formData.get("leadSourceId"),
      soldFor: formData.get("soldFor"),
    };

    const response = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      error(data.error ?? "Failed to create sale");
      return;
    }

    success("Sale entered successfully");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter Sales Information Here</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={submitSale}
          className="grid gap-4 md:grid-cols-2"
        >
          <Field label="Product ID">
            <Input name="productId" type="number" placeholder="100245" required />
          </Field>

          <Field label="Brand">
            <select
              name="brandId"
              required
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select brand
              </option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reference">
            <Input name="reference" placeholder="126710BLRO" required />
          </Field>

          <Field label="Type">
            <select
              name="conditionTypeId"
              required
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select type
              </option>
              {conditionTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Date In">
            <Input name="dateIn" type="date" required />
          </Field>

          <Field label="Date Out">
            <Input name="dateOut" type="date" required />
          </Field>

          <Field label="Customer Name">
            <Input name="soldTo" placeholder="Client Name" required />
          </Field>

          <Field label="In Person?">
            <select
              name="inPersonOptionId"
              required
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select option
              </option>
              {inPersonOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Lead Source?">
            <select
              name="leadSourceId"
              required
              className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select lead source
              </option>
              {leadSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Price (Sold For)">
            <Input name="soldFor" type="number" min="0" step="0.01" required placeholder="12500" />
          </Field>

          <div className="md:col-span-2">
            <Button type="submit" className="w-full md:w-56" disabled={submitting || isPending}>
              {submitting || isPending ? "Saving..." : "ENTER SALE"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
