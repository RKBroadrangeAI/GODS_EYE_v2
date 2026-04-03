create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists app;

create type public.app_role as enum ('admin', 'management', 'sales_associate', 'view_only');

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email citext unique,
  initials text,
  role public.app_role not null default 'sales_associate',
  is_active boolean not null default true,
  is_channel boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  constraint employees_name_chk check (char_length(trim(name)) > 0)
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.condition_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bracelet_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dial_colors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bezel_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marker_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.in_person_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.years (
  value int primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint years_range_chk check (value between 1950 and 2100)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  selected boolean not null default false,
  product_id bigint,
  brand_id uuid references public.brands(id),
  sales_person_id uuid not null references public.employees(id),
  condition_type_id uuid references public.condition_types(id),
  stock_number text,
  reference text,
  year_value int references public.years(value),
  bracelet_type_id uuid references public.bracelet_types(id),
  dial_color_id uuid references public.dial_colors(id),
  bezel_type_id uuid references public.bezel_types(id),
  marker_type_id uuid references public.marker_types(id),
  bezel_free_text text,
  date_in date not null,
  date_out date,
  cost numeric(12,2) not null default 0,
  sold_for numeric(12,2) not null default 0,
  sold_to text,
  in_person_option_id uuid references public.in_person_options(id),
  lead_source_id uuid references public.lead_sources(id),
  is_cashed boolean not null default false,
  cashed_by text,
  by_label text,
  cashed_at timestamptz,
  profit numeric(12,2) not null default 0,
  margin numeric(10,6),
  age_days int,
  month_number int,
  count_constant smallint not null default 1,
  unnamed_constant smallint not null default 1,
  submit_locked boolean not null default true,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_nonnegative_prices_chk check (cost >= 0 and sold_for >= 0),
  constraint sales_month_chk check (month_number between 1 and 12 or month_number is null)
);

create unique index if not exists sales_product_id_idx on public.sales(product_id) where product_id is not null;
create index if not exists sales_sales_person_id_idx on public.sales(sales_person_id);
create index if not exists sales_date_out_idx on public.sales(date_out);
create index if not exists sales_lead_source_id_idx on public.sales(lead_source_id);
create index if not exists sales_brand_id_idx on public.sales(brand_id);
create index if not exists sales_condition_type_id_idx on public.sales(condition_type_id);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  month int not null,
  employee_id uuid references public.employees(id),
  lead_source_id uuid references public.lead_sources(id),
  condition_type_id uuid references public.condition_types(id),
  gp_budget numeric(14,2),
  unit_budget numeric(14,2),
  revenue_budget numeric(14,2),
  inventory_budget numeric(14,2),
  avg_inventory_value numeric(14,2),
  avg_days numeric(10,2),
  margin_budget numeric(10,6),
  per_unit_target numeric(14,2),
  avg_price_target numeric(14,2),
  weight numeric(10,6),
  growth_percent numeric(10,6),
  is_finalized boolean not null default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_month_chk check (month between 1 and 12),
  constraint budgets_year_chk check (year between 2024 and 2100),
  constraint budgets_unique_scope unique (year, month, employee_id, lead_source_id, condition_type_id)
);

create table if not exists public.audit_log (
  id bigserial primary key,
  table_name text not null,
  record_id text not null,
  field_name text not null,
  old_value text,
  new_value text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create or replace function app.current_employee_id()
returns uuid
language sql
stable
as $$
  select e.id
  from public.employees e
  where e.auth_user_id = auth.uid()
    and e.is_active = true
  limit 1;
$$;

create or replace function app.current_role()
returns public.app_role
language sql
stable
as $$
  select e.role
  from public.employees e
  where e.auth_user_id = auth.uid()
    and e.is_active = true
  limit 1;
$$;

create or replace function app.has_role(allowed public.app_role[])
returns boolean
language sql
stable
as $$
  select coalesce(app.current_role() = any(allowed), false);
$$;

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app.set_sales_derived_fields()
returns trigger
language plpgsql
as $$
begin
  new.profit := coalesce(new.sold_for, 0) - coalesce(new.cost, 0);

  if coalesce(new.sold_for, 0) = 0 then
    new.margin := null;
  else
    new.margin := (coalesce(new.sold_for, 0) - coalesce(new.cost, 0)) / nullif(new.sold_for, 0);
  end if;

  if new.date_in is null then
    new.age_days := null;
  elsif new.date_out is null then
    new.age_days := (current_date - new.date_in);
  else
    new.age_days := (new.date_out - new.date_in);
  end if;

  if new.date_out is null then
    new.month_number := null;
  else
    new.month_number := extract(month from new.date_out)::int;
  end if;

  new.updated_by := auth.uid();
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;

  return new;
end;
$$;

create or replace function app.set_cashed_metadata()
returns trigger
language plpgsql
as $$
declare
  actor_initials text;
begin
  if new.is_cashed = true and coalesce(old.is_cashed, false) = false then
    select e.initials into actor_initials
    from public.employees e
    where e.auth_user_id = auth.uid()
      and e.is_active = true
    limit 1;

    new.cashed_at := coalesce(new.cashed_at, now());
    new.cashed_by := coalesce(new.cashed_by, actor_initials, 'NA');
    new.by_label := coalesce(new.by_label, concat(coalesce(actor_initials, 'NA'), ' ', to_char(new.cashed_at, 'MM/DD')));
  end if;

  return new;
end;
$$;

create or replace function app.log_sales_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  watched_fields text[] := array[
    'cost','sold_for','is_cashed','cashed_by','cashed_at','brand_id','condition_type_id','lead_source_id','in_person_option_id','date_in','date_out'
  ];
  field text;
  old_val text;
  new_val text;
begin
  foreach field in array watched_fields loop
    execute format('select ($1).%I::text', field) using old into old_val;
    execute format('select ($1).%I::text', field) using new into new_val;

    if old_val is distinct from new_val then
      insert into public.audit_log (table_name, record_id, field_name, old_value, new_value, changed_by)
      values ('sales', new.id::text, field, old_val, new_val, auth.uid());
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists set_updated_at_employees on public.employees;
create trigger set_updated_at_employees
before update on public.employees
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_brands on public.brands;
create trigger set_updated_at_brands
before update on public.brands
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_lead_sources on public.lead_sources;
create trigger set_updated_at_lead_sources
before update on public.lead_sources
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_condition_types on public.condition_types;
create trigger set_updated_at_condition_types
before update on public.condition_types
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_bracelet_types on public.bracelet_types;
create trigger set_updated_at_bracelet_types
before update on public.bracelet_types
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_dial_colors on public.dial_colors;
create trigger set_updated_at_dial_colors
before update on public.dial_colors
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_bezel_types on public.bezel_types;
create trigger set_updated_at_bezel_types
before update on public.bezel_types
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_marker_types on public.marker_types;
create trigger set_updated_at_marker_types
before update on public.marker_types
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_in_person_options on public.in_person_options;
create trigger set_updated_at_in_person_options
before update on public.in_person_options
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_years on public.years;
create trigger set_updated_at_years
before update on public.years
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_sales on public.sales;
create trigger set_updated_at_sales
before update on public.sales
for each row execute function app.set_updated_at();

drop trigger if exists set_updated_at_budgets on public.budgets;
create trigger set_updated_at_budgets
before update on public.budgets
for each row execute function app.set_updated_at();

drop trigger if exists set_sales_derived_fields_trigger on public.sales;
create trigger set_sales_derived_fields_trigger
before insert or update on public.sales
for each row execute function app.set_sales_derived_fields();

drop trigger if exists set_cashed_metadata_trigger on public.sales;
create trigger set_cashed_metadata_trigger
before update on public.sales
for each row execute function app.set_cashed_metadata();

drop trigger if exists log_sales_updates_trigger on public.sales;
create trigger log_sales_updates_trigger
after update on public.sales
for each row execute function app.log_sales_updates();

create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_name text;
begin
  default_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  insert into public.employees (auth_user_id, name, email, role, initials)
  values (
    new.id,
    upper(default_name),
    new.email,
    'sales_associate',
    upper(left(regexp_replace(default_name, '[^A-Za-z ]', '', 'g'), 2))
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app.handle_new_auth_user();

alter table public.employees enable row level security;
alter table public.brands enable row level security;
alter table public.lead_sources enable row level security;
alter table public.condition_types enable row level security;
alter table public.bracelet_types enable row level security;
alter table public.dial_colors enable row level security;
alter table public.bezel_types enable row level security;
alter table public.marker_types enable row level security;
alter table public.in_person_options enable row level security;
alter table public.years enable row level security;
alter table public.sales enable row level security;
alter table public.budgets enable row level security;
alter table public.audit_log enable row level security;

create policy employees_select_all_authenticated
on public.employees
for select
to authenticated
using (true);

create policy employees_insert_admin_management
on public.employees
for insert
to authenticated
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy employees_update_admin_management
on public.employees
for update
to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]))
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy employees_delete_admin_only
on public.employees
for delete
to authenticated
using (app.has_role(array['admin'::public.app_role]));

create policy lookup_select_authenticated
on public.brands for select to authenticated using (true);
create policy lookup_write_admin_management_brands
on public.brands for all to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]))
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy lookup_select_authenticated_lead_sources
on public.lead_sources for select to authenticated using (true);
create policy lookup_write_admin_management_lead_sources
on public.lead_sources for all to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]))
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy lookup_select_authenticated_condition_types
on public.condition_types for select to authenticated using (true);
create policy lookup_write_admin_management_condition_types
on public.condition_types for all to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]))
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy lookup_select_authenticated_bracelet_types
on public.bracelet_types for select to authenticated using (true);
create policy lookup_write_admin_management_bracelet_types
on public.bracelet_types for all to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]))
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy lookup_select_authenticated_dial_colors
on public.dial_colors for select to authenticated using (true);
create policy lookup_write_admin_management_dial_colors
on public.dial_colors for all to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]))
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy lookup_select_authenticated_bezel_types
on public.bezel_types for select to authenticated using (true);
create policy lookup_write_admin_management_bezel_types
on public.bezel_types for all to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]))
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy lookup_select_authenticated_marker_types
on public.marker_types for select to authenticated using (true);
create policy lookup_write_admin_management_marker_types
on public.marker_types for all to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]))
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy lookup_select_authenticated_in_person_options
on public.in_person_options for select to authenticated using (true);
create policy lookup_write_admin_management_in_person_options
on public.in_person_options for all to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]))
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy lookup_select_authenticated_years
on public.years for select to authenticated using (true);
create policy lookup_write_admin_management_years
on public.years for all to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]))
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy sales_select_policy
on public.sales
for select
to authenticated
using (
  app.has_role(array['admin'::public.app_role, 'management'::public.app_role, 'view_only'::public.app_role])
  or sales_person_id = app.current_employee_id()
);

create policy sales_insert_policy
on public.sales
for insert
to authenticated
with check (
  app.has_role(array['admin'::public.app_role, 'management'::public.app_role])
  or (app.has_role(array['sales_associate'::public.app_role]) and sales_person_id = app.current_employee_id())
);

create policy sales_update_policy
on public.sales
for update
to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]))
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy sales_delete_policy
on public.sales
for delete
to authenticated
using (app.has_role(array['admin'::public.app_role]));

create policy budgets_select_admin_management
on public.budgets
for select
to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy budgets_insert_admin_management
on public.budgets
for insert
to authenticated
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy budgets_update_admin_management
on public.budgets
for update
to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]))
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy budgets_delete_admin_only
on public.budgets
for delete
to authenticated
using (app.has_role(array['admin'::public.app_role]));

create policy audit_log_select_admin_management
on public.audit_log
for select
to authenticated
using (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));

create policy audit_log_insert_admin_management
on public.audit_log
for insert
to authenticated
with check (app.has_role(array['admin'::public.app_role, 'management'::public.app_role]));
