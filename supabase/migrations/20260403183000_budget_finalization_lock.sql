drop policy if exists budgets_update_admin_management on public.budgets;

create policy budgets_update_admin_management
on public.budgets
for update
to authenticated
using (
  app.has_role(array['admin'::public.app_role, 'management'::public.app_role])
  and coalesce(is_finalized, false) = false
)
with check (
  app.has_role(array['admin'::public.app_role, 'management'::public.app_role])
);
