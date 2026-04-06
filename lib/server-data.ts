import { pool } from "@/lib/db";

export type SalesDetailQueryRow = {
  id: string;
  stock_number: string | null;
  reference: string | null;
  year_value: number | null;
  date_in: string;
  date_out: string | null;
  cost: number;
  sold_for: number;
  sold_to: string | null;
  is_cashed: boolean;
  by_label: string | null;
  margin: number | null;
  profit: number;
  employees: { name: string } | null;
  brands: { name: string } | null;
  condition_types: { name: string } | null;
  in_person_options: { name: string } | null;
  lead_sources: { name: string } | null;
};

export async function getSaleFormLookups() {
  const [brands, conditionTypes, inPersonOptions, leadSources] = await Promise.all([
    pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM brands WHERE is_active = true ORDER BY name`,
    ),
    pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM condition_types WHERE is_active = true ORDER BY name`,
    ),
    pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM in_person_options WHERE is_active = true ORDER BY name`,
    ),
    pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM lead_sources WHERE is_active = true ORDER BY name`,
    ),
  ]);

  return {
    brands: brands.rows,
    conditionTypes: conditionTypes.rows,
    inPersonOptions: inPersonOptions.rows,
    leadSources: leadSources.rows,
  };
}

export async function getSalesDetailRows(): Promise<SalesDetailQueryRow[]> {
  const { rows } = await pool.query<{
    id: string;
    stock_number: string | null;
    reference: string | null;
    year_value: number | null;
    date_in: string;
    date_out: string | null;
    cost: string;
    sold_for: string;
    sold_to: string | null;
    is_cashed: boolean;
    by_label: string | null;
    margin: string | null;
    profit: string;
    employee_name: string | null;
    brand_name: string | null;
    condition_type_name: string | null;
    in_person_option_name: string | null;
    lead_source_name: string | null;
  }>(
    `SELECT s.id, s.stock_number, s.reference, s.year_value, s.date_in, s.date_out,
            s.cost, s.sold_for, s.sold_to, s.is_cashed, s.by_label, s.margin, s.profit,
            e.name  AS employee_name,
            b.name  AS brand_name,
            ct.name AS condition_type_name,
            ip.name AS in_person_option_name,
            ls.name AS lead_source_name
     FROM sales s
     LEFT JOIN employees       e  ON e.id  = s.sales_person_id
     LEFT JOIN brands          b  ON b.id  = s.brand_id
     LEFT JOIN condition_types ct ON ct.id = s.condition_type_id
     LEFT JOIN in_person_options ip ON ip.id = s.in_person_option_id
     LEFT JOIN lead_sources    ls ON ls.id = s.lead_source_id
     ORDER BY s.date_out DESC NULLS LAST`,
  );

  return rows.map((row) => ({
    id: row.id,
    stock_number: row.stock_number,
    reference: row.reference,
    year_value: row.year_value,
    date_in: row.date_in,
    date_out: row.date_out,
    cost: Number(row.cost),
    sold_for: Number(row.sold_for),
    sold_to: row.sold_to,
    is_cashed: row.is_cashed,
    by_label: row.by_label,
    margin: row.margin != null ? Number(row.margin) : null,
    profit: Number(row.profit),
    employees: row.employee_name ? { name: row.employee_name } : null,
    brands: row.brand_name ? { name: row.brand_name } : null,
    condition_types: row.condition_type_name ? { name: row.condition_type_name } : null,
    in_person_options: row.in_person_option_name ? { name: row.in_person_option_name } : null,
    lead_sources: row.lead_source_name ? { name: row.lead_source_name } : null,
  }));
}
