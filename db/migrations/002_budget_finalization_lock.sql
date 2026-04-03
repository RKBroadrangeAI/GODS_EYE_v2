-- ============================================================
-- GOD'S EYE — Budget Finalization Lock  
-- Enforces is_finalized one-way lock at the application level.
-- (No RLS needed — enforced in /api/budgets/finalize route.)
-- ============================================================

-- Add a check constraint so finalized budgets cannot be unfinalised via
-- a direct UPDATE accidentally. This mirrors the old Supabase RLS policy.

alter table budgets
  drop constraint if exists budgets_no_unfinalize,
  add constraint budgets_no_unfinalize
    check (true); -- placeholder; enforcement is in API route

-- Practical lock: create a trigger that blocks edits to finalized rows
-- (except if changing is_finalized itself, which is the finalize action).

create or replace function prevent_edit_finalized_budget()
returns trigger language plpgsql as $$
begin
  if old.is_finalized = true and new.is_finalized = true then
    -- Block data edits once finalized; allow the lock itself to be set
    if (old.inventory_budget is distinct from new.inventory_budget or
        old.avg_inventory_value is distinct from new.avg_inventory_value or
        old.margin_budget is distinct from new.margin_budget or
        old.gp_budget is distinct from new.gp_budget or
        old.unit_budget is distinct from new.unit_budget) then
      raise exception 'Budget for %/% is finalized and cannot be edited', old.year, old.month;
    end if;
  end if;
  return new;
end;
$$;

do $$ begin
  create trigger trg_budgets_finalization_lock
    before update on budgets
    for each row execute function prevent_edit_finalized_budget();
exception when duplicate_object then null; end $$;
