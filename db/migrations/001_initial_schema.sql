-- ============================================================
-- GOD'S EYE — Plain PostgreSQL Schema (no Supabase / no RLS)
-- Run this against a bare PostgreSQL database to initialize.
-- ============================================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ── Types ────────────────────────────────────────────────────

create type if not exists public.app_role as enum (
  'admin', 'management', 'sales_associate', 'view_only'
);

-- ── Core tables ──────────────────────────────────────────────

create table if not exists employees (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,
  email          citext      unique,
  password_hash  text,                       -- bcrypt hash, set on first login setup
  initials       text,
  role           app_role    not null default 'sales_associate',
  is_active      boolean     not null default true,
  is_channel     boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deactivated_at timestamptz,
  constraint employees_name_chk check (char_length(trim(name)) > 0)
);

create table if not exists brands (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_sources (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists condition_types (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bracelet_types (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dial_colors (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bezel_types (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marker_types (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists in_person_options (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists years (
  value      int         primary key,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint years_range_chk check (value between 1950 and 2100)
);

create table if not exists sales (
  id                  uuid          primary key default gen_random_uuid(),
  selected            boolean       not null default false,
  product_id          bigint,
  brand_id            uuid          references brands(id),
  sales_person_id     uuid          not null references employees(id),
  condition_type_id   uuid          references condition_types(id),
  stock_number        text,
  reference           text,
  year_value          int           references years(value),
  bracelet_type_id    uuid          references bracelet_types(id),
  dial_color_id       uuid          references dial_colors(id),
  bezel_type_id       uuid          references bezel_types(id),
  marker_type_id      uuid          references marker_types(id),
  bezel_free_text     text,
  date_in             date          not null,
  date_out            date,
  cost                numeric(12,2) not null default 0,
  sold_for            numeric(12,2) not null default 0,
  sold_to             text,
  in_person_option_id uuid          references in_person_options(id),
  lead_source_id      uuid          references lead_sources(id),
  is_cashed           boolean       not null default false,
  cashed_by           text,
  by_label            text,
  cashed_at           timestamptz,
  profit              numeric(12,2) not null default 0,
  margin              numeric(10,6),
  age_days            int,
  month_number        int,
  count_constant      smallint      not null default 1,
  unnamed_constant    smallint      not null default 1,
  submit_locked       boolean       not null default true,
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now(),
  constraint sales_nonnegative_prices_chk check (cost >= 0 and sold_for >= 0),
  constraint sales_month_chk check (month_number between 1 and 12 or month_number is null)
);

create unique index if not exists sales_product_id_idx on sales(product_id) where product_id is not null;
create index if not exists sales_sales_person_id_idx on sales(sales_person_id);
create index if not exists sales_date_out_idx on sales(date_out);
create index if not exists sales_lead_source_id_idx on sales(lead_source_id);
create index if not exists sales_brand_id_idx on sales(brand_id);
create index if not exists sales_condition_type_id_idx on sales(condition_type_id);

create table if not exists budgets (
  id                  uuid          primary key default gen_random_uuid(),
  year                int           not null,
  month               int           not null,
  employee_id         uuid          references employees(id),
  lead_source_id      uuid          references lead_sources(id),
  condition_type_id   uuid          references condition_types(id),
  gp_budget           numeric(14,2),
  unit_budget         numeric(14,2),
  revenue_budget      numeric(14,2),
  inventory_budget    numeric(14,2),
  avg_inventory_value numeric(14,2),
  avg_days            numeric(10,2),
  margin_budget       numeric(10,6),
  per_unit_target     numeric(14,2),
  avg_price_target    numeric(14,2),
  weight              numeric(10,6),
  growth_percent      numeric(10,6),
  is_finalized        boolean       not null default false,
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now(),
  constraint budgets_month_chk check (month between 1 and 12),
  constraint budgets_year_chk check (year between 2024 and 2100),
  constraint budgets_unique_scope unique (year, month, employee_id, lead_source_id, condition_type_id)
);

create table if not exists audit_log (
  id         bigserial   primary key,
  table_name text        not null,
  record_id  text        not null,
  field_name text        not null,
  old_value  text,
  new_value  text,
  changed_by uuid        references employees(id),
  changed_at timestamptz not null default now()
);

-- ── Auto-update updated_at trigger ──────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$ begin
  create trigger trg_employees_updated_at
    before update on employees
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_sales_updated_at
    before update on sales
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_budgets_updated_at
    before update on budgets
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

-- ── Auto-compute derived sales columns ───────────────────────
-- Computes profit, margin, age_days, month_number on insert/update.

create or replace function compute_sale_fields()
returns trigger language plpgsql as $$
begin
  new.profit := new.sold_for - new.cost;
  new.margin := case when new.sold_for = 0 then null
                     else (new.sold_for - new.cost) / new.sold_for end;
  new.age_days := case when new.date_out is not null and new.date_in is not null
                       then (new.date_out - new.date_in)
                       else null end;
  new.month_number := case when new.date_out is not null
                           then extract(month from new.date_out)::int
                           else null end;
  return new;
end;
$$;

do $$ begin
  create trigger trg_sales_compute_fields
    before insert or update on sales
    for each row execute function compute_sale_fields();
exception when duplicate_object then null; end $$;

-- ── Seed lookup data ──────────────────────────────────────────

insert into in_person_options (name) values ('In Person'), ('Remote')
  on conflict (name) do nothing;

insert into years (value)
  select generate_series(1990, 2030)
  on conflict (value) do nothing;
