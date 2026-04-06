-- ============================================================
-- RentLedger — Complete Database Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── Extensions ────────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ── Profiles ──────────────────────────────────────────────
create table if not exists public.profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  email text,
  role  text not null default 'owner' check (role in ('owner','readonly'))
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'owner')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Properties ────────────────────────────────────────────
create table if not exists public.properties (
  id                       uuid primary key default gen_random_uuid(),
  owner_id                 uuid not null references public.profiles(id),
  address                  text not null,
  purchase_date            date not null,
  purchase_price           numeric(12,2) not null,
  loan_amount              numeric(12,2) not null,
  interest_rate            numeric(6,4) not null,
  loan_term_months         int not null,
  origination_date         date not null,
  closing_costs            numeric(12,2) not null default 0,
  current_value            numeric(12,2),
  current_value_updated_at timestamptz,
  selling_cost_pct         numeric(5,4) not null default 0.10,
  hoa_amount               numeric(10,2) not null default 0,
  mgmt_fee_pct             numeric(5,4) not null default 0,
  created_at               timestamptz default now()
);

-- ── Tags ──────────────────────────────────────────────────
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name        text not null,
  category    text not null default 'expense' check (category in ('income','expense','equity')),
  is_default  boolean default false,
  unique (property_id, name)
);

-- ── Amortization Schedule ─────────────────────────────────
create table if not exists public.amortization_schedule (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid not null references public.properties(id) on delete cascade,
  payment_number    int not null,
  payment_date      date not null,
  total_payment     numeric(12,2) not null,
  principal         numeric(12,2) not null,
  interest          numeric(12,2) not null,
  escrow            numeric(12,2) not null default 0,
  remaining_balance numeric(12,2) not null,
  is_posted         boolean default false,
  posted_at         timestamptz,
  edited_by_user    boolean default false,
  unique (property_id, payment_number)
);

-- Trigger: recompute total_payment when principal/interest/escrow changes
create or replace function sync_total_payment()
returns trigger language plpgsql as $$
begin
  new.total_payment := new.principal + new.interest + new.escrow;
  return new;
end;
$$;

drop trigger if exists trg_sync_total_payment on public.amortization_schedule;
create trigger trg_sync_total_payment
  before insert or update of principal, interest, escrow
  on public.amortization_schedule
  for each row execute procedure sync_total_payment();

-- ── Auto-Post Rules ───────────────────────────────────────
create table if not exists public.auto_post_rules (
  id                  uuid primary key default gen_random_uuid(),
  property_id         uuid not null references public.properties(id) on delete cascade,
  tag_id              uuid references public.tags(id),
  tag_name            text not null,
  label               text not null,
  amount              numeric(12,2) not null default 0,
  post_day            int not null default 1,
  is_active           boolean default true,
  is_amortized        boolean default false,
  breakdown_template  jsonb,
  created_at          timestamptz default now()
);

-- ── Transactions ──────────────────────────────────────────
create table if not exists public.transactions (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid not null references public.properties(id) on delete cascade,
  date              date not null,
  amount            numeric(12,2) not null,
  tag_id            uuid references public.tags(id),
  tag_name          text not null default '',
  notes             text,
  is_auto_posted    boolean default false,
  auto_post_rule_id uuid references public.auto_post_rules(id),
  amortization_id   uuid references public.amortization_schedule(id),
  breakdown         jsonb,
  created_at        timestamptz default now(),
  created_by        uuid references public.profiles(id)
);

create index if not exists idx_transactions_property_date on public.transactions(property_id, date desc);
create index if not exists idx_transactions_tag on public.transactions(property_id, tag_name);

-- ── Leases ────────────────────────────────────────────────
create table if not exists public.leases (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  tenant_name   text,
  lease_start   date not null,
  lease_end     date not null,
  monthly_rent  numeric(10,2) not null,
  rent_due_day  int not null default 1,
  created_at    timestamptz default now(),
  constraint no_overlapping_leases exclude using gist (
    property_id with =,
    daterange(lease_start, lease_end, '[)') with &&
  )
);

-- ── Monthly Summary View ──────────────────────────────────
create or replace view public.v_monthly_summary as
select
  t.property_id,
  date_trunc('month', t.date)::date                                   as month,
  coalesce(sum(case when t.amount > 0 and t.tag_name not in ('Down Payment', 'Closing Costs') then t.amount else 0 end), 0) as income,
  coalesce(sum(case
    when t.tag_name in ('Down Payment', 'Closing Costs') then 0
    when t.breakdown is not null then
      -(select coalesce(sum((b->>'amount')::numeric), 0)
        from jsonb_array_elements(t.breakdown) b
        where b->>'label' in ('Interest','Escrow'))
    when t.amount < 0 then t.amount
    else 0
  end), 0)                                                            as expenses,
  coalesce(sum(case
    when t.tag_name in ('Down Payment', 'Closing Costs') then 0
    when t.breakdown is not null then
      -(select coalesce(sum((b->>'amount')::numeric), 0)
        from jsonb_array_elements(t.breakdown) b
        where b->>'label' in ('Interest','Escrow'))
    else t.amount
  end), 0)                                                            as net_cash_flow,
  coalesce(sum(case
    when t.breakdown is not null then
      (select coalesce(sum((b->>'amount')::numeric), 0)
       from jsonb_array_elements(t.breakdown) b where b->>'label' = 'Principal')
    else 0
  end), 0)                                                            as principal_paid,
  coalesce(sum(case
    when t.breakdown is not null then
      (select coalesce(sum((b->>'amount')::numeric), 0)
       from jsonb_array_elements(t.breakdown) b where b->>'label' = 'Interest')
    else 0
  end), 0)                                                            as interest_paid,
  coalesce(sum(case when t.tag_name = 'Maintenance' then abs(t.amount) else 0 end), 0) as maintenance,
  coalesce(sum(case when t.tag_name = 'Management Fee' then abs(t.amount) else 0 end), 0) as management_fee,
  coalesce(sum(case when t.tag_name = 'Closing Costs' then abs(t.amount) else 0 end), 0) as closing_costs
from public.transactions t
group by t.property_id, date_trunc('month', t.date);

-- ── generate_amortization() ───────────────────────────────
create or replace function public.generate_amortization(p_property_id uuid)
returns void language plpgsql as $$
declare
  v_prop        public.properties%rowtype;
  v_rate        numeric;
  v_payment     numeric;
  v_balance     numeric;
  v_principal   numeric;
  v_interest    numeric;
  v_pmt_date    date;
  i             int;
begin
  select * into v_prop from public.properties where id = p_property_id;
  v_rate    := v_prop.interest_rate / 12;
  v_payment := round(
    v_prop.loan_amount * (v_rate * power(1 + v_rate, v_prop.loan_term_months))
    / (power(1 + v_rate, v_prop.loan_term_months) - 1),
  2);
  v_balance  := v_prop.loan_amount;
  -- First payment = 1st of month following origination month
  v_pmt_date := date_trunc('month', v_prop.origination_date)::date + interval '1 month';

  delete from public.amortization_schedule where property_id = p_property_id;

  for i in 1..v_prop.loan_term_months loop
    v_interest  := round(v_balance * v_rate, 2);
    v_principal := round(v_payment - v_interest, 2);
    if i = v_prop.loan_term_months then
      v_principal := v_balance;
    end if;
    v_balance := round(v_balance - v_principal, 2);

    insert into public.amortization_schedule
      (property_id, payment_number, payment_date, total_payment,
       principal, interest, escrow, remaining_balance)
    values
      (p_property_id, i, v_pmt_date, v_payment,
       v_principal, v_interest, 0, v_balance);

    v_pmt_date := v_pmt_date + interval '1 month';
  end loop;
end;
$$;

-- ── get_property_metrics() ────────────────────────────────
create or replace function public.get_property_metrics(p_property_id uuid)
returns json language plpgsql as $$
declare
  v_prop              public.properties%rowtype;
  v_cv                numeric;
  v_balance           numeric;
  v_gross_equity      numeric;
  v_selling_costs     numeric;
  v_net_equity        numeric;
  v_monthly_cf        numeric;
  v_cumul_cf          numeric;      -- excludes closing costs (dashboard display)
  v_allin_cf          numeric;      -- includes closing costs (net equity calc)
  v_principal_paid    numeric;
  v_interest_paid     numeric;
  v_maint_ttm         numeric;
  v_exp_ttm           numeric;
  v_mgmt_ttm          numeric;
  v_breakeven         numeric;
  v_this_month        date;
  v_vacant_days       int;
  v_total_days        int;
  v_lease_end         date;
  v_monthly_rent      numeric;
  v_days_remaining    int;
begin
  select * into v_prop from public.properties where id = p_property_id;
  v_cv          := coalesce(v_prop.current_value, v_prop.purchase_price);
  v_this_month  := date_trunc('month', current_date)::date;

  -- Remaining loan balance (latest posted amort row, else original loan amount)
  select remaining_balance into v_balance
  from public.amortization_schedule
  where property_id = p_property_id and is_posted = true
  order by payment_number desc limit 1;
  v_balance := coalesce(v_balance, v_prop.loan_amount);

  v_gross_equity  := v_cv - v_balance;
  v_selling_costs := v_cv * v_prop.selling_cost_pct;

  -- Monthly CF (current month, excl principal and down payment)
  select coalesce(sum(
    case
      when tag_name = 'Down Payment' then 0
      when breakdown is not null then
        -(select coalesce(sum((b->>'amount')::numeric),0)
          from jsonb_array_elements(breakdown) b
          where b->>'label' in ('Interest','Escrow'))
      else amount
    end
  ), 0) into v_monthly_cf
  from public.transactions
  where property_id = p_property_id
    and date_trunc('month', date) = v_this_month;

  -- Cumulative CF excl closing costs (displayed on dashboard)
  select coalesce(sum(
    case
      when tag_name in ('Down Payment','Closing Costs') then 0
      when breakdown is not null then
        -(select coalesce(sum((b->>'amount')::numeric),0)
          from jsonb_array_elements(breakdown) b
          where b->>'label' in ('Interest','Escrow'))
      else amount
    end
  ), 0) into v_cumul_cf
  from public.transactions
  where property_id = p_property_id;

  -- All-in CF incl closing costs (used for net equity)
  select coalesce(sum(
    case
      when tag_name = 'Down Payment' then 0
      when breakdown is not null then
        -(select coalesce(sum((b->>'amount')::numeric),0)
          from jsonb_array_elements(breakdown) b
          where b->>'label' in ('Interest','Escrow'))
      else amount
    end
  ), 0) into v_allin_cf
  from public.transactions
  where property_id = p_property_id;

  -- Net equity & break-even
  v_net_equity := v_gross_equity + v_allin_cf - v_selling_costs;
  v_breakeven  := (v_balance - v_allin_cf) / nullif(1 - v_prop.selling_cost_pct, 0);

  -- Principal paid (from breakdown JSON)
  select coalesce(sum((b->>'amount')::numeric), 0) into v_principal_paid
  from public.transactions t, jsonb_array_elements(t.breakdown) b
  where t.property_id = p_property_id
    and t.breakdown is not null
    and b->>'label' = 'Principal';

  -- Interest paid
  select coalesce(sum((b->>'amount')::numeric), 0) into v_interest_paid
  from public.transactions t, jsonb_array_elements(t.breakdown) b
  where t.property_id = p_property_id
    and t.breakdown is not null
    and b->>'label' = 'Interest';

  -- Maintenance TTM
  select coalesce(sum(abs(amount)),0) into v_maint_ttm
  from public.transactions
  where property_id = p_property_id
    and tag_name = 'Maintenance'
    and date >= current_date - interval '12 months';

  -- Total expenses TTM (for maintenance %)
  select coalesce(sum(abs(amount)),0) into v_exp_ttm
  from public.transactions
  where property_id = p_property_id
    and amount < 0
    and tag_name != 'Down Payment'
    and date >= current_date - interval '12 months';

  -- Management cost TTM
  select coalesce(sum(abs(amount)),0) into v_mgmt_ttm
  from public.transactions
  where property_id = p_property_id
    and tag_name = 'Management Fee'
    and date >= current_date - interval '12 months';

  -- Vacancy (days since closing with no active lease)
  v_total_days := (current_date - v_prop.purchase_date)::int;
  select count(*)::int into v_vacant_days
  from generate_series(v_prop.purchase_date, current_date - 1, '1 day'::interval) d
  where not exists (
    select 1 from public.leases l
    where l.property_id = p_property_id
      and l.lease_start <= d::date
      and l.lease_end > d::date
  );

  -- Active lease info
  select lease_end, monthly_rent into v_lease_end, v_monthly_rent
  from public.leases
  where property_id = p_property_id
    and lease_start <= current_date
    and lease_end >= current_date
  order by lease_start desc limit 1;

  v_days_remaining := case
    when v_lease_end is not null then greatest(0, (v_lease_end - current_date)::int)
    else null
  end;

  return json_build_object(
    'gross_equity',              round(v_gross_equity, 2),
    'net_equity',                round(v_net_equity, 2),
    'monthly_cash_flow',         round(v_monthly_cf, 2),
    'cumulative_cash_flow',      round(v_cumul_cf, 2),
    'total_principal_paid',      round(v_principal_paid, 2),
    'total_interest_paid',       round(v_interest_paid, 2),
    'vacancy_rate_pct',          case when v_total_days > 0
                                    then round(v_vacant_days::numeric / v_total_days * 100, 2)
                                    else 0 end,
    'maintenance_pct_ttm',       case when v_exp_ttm > 0
                                    then round(v_maint_ttm / v_exp_ttm * 100, 2)
                                    else 0 end,
    'management_cost_ttm',       round(v_mgmt_ttm, 2),
    'breakeven_sale_price',      round(v_breakeven, 2),
    'remaining_loan_balance',    round(v_balance, 2),
    'lease_days_remaining',      v_days_remaining,
    'projected_rent_to_lease_end', case
                                    when v_days_remaining is not null and v_monthly_rent is not null
                                    then round((v_days_remaining::numeric / 30) * v_monthly_rent, 2)
                                    else null end,
    'current_value',             v_cv,
    'selling_costs',             round(v_selling_costs, 2)
  );
end;
$$;

-- ── Row Level Security ────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.properties        enable row level security;
alter table public.tags              enable row level security;
alter table public.transactions      enable row level security;
alter table public.amortization_schedule enable row level security;
alter table public.auto_post_rules   enable row level security;
alter table public.leases            enable row level security;

-- Helper: is current user the owner of a property?
create or replace function public.is_owner(p_property_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.properties
    where id = p_property_id and owner_id = auth.uid()
  );
$$;

-- Helper: is current user readonly?
create or replace function public.is_readonly()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'readonly'
  );
$$;

-- profiles
drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  using (id = auth.uid());

-- properties
drop policy if exists "properties_owner" on public.properties;
create policy "properties_owner" on public.properties
  using (owner_id = auth.uid() or public.is_readonly());

drop policy if exists "properties_owner_write" on public.properties;
create policy "properties_owner_write" on public.properties
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- tags
drop policy if exists "tags_read" on public.tags;
create policy "tags_read" on public.tags for select
  using (property_id in (select id from public.properties where owner_id = auth.uid())
      or public.is_readonly());

drop policy if exists "tags_write" on public.tags;
create policy "tags_write" on public.tags for all
  using (property_id in (select id from public.properties where owner_id = auth.uid()))
  with check (property_id in (select id from public.properties where owner_id = auth.uid()));

-- transactions
drop policy if exists "txns_read" on public.transactions;
create policy "txns_read" on public.transactions for select
  using (property_id in (select id from public.properties where owner_id = auth.uid())
      or public.is_readonly());

drop policy if exists "txns_write" on public.transactions;
create policy "txns_write" on public.transactions for all
  using (property_id in (select id from public.properties where owner_id = auth.uid()))
  with check (property_id in (select id from public.properties where owner_id = auth.uid()));

-- amortization_schedule
drop policy if exists "amort_read" on public.amortization_schedule;
create policy "amort_read" on public.amortization_schedule for select
  using (property_id in (select id from public.properties where owner_id = auth.uid())
      or public.is_readonly());

drop policy if exists "amort_write" on public.amortization_schedule;
create policy "amort_write" on public.amortization_schedule for all
  using (property_id in (select id from public.properties where owner_id = auth.uid()))
  with check (property_id in (select id from public.properties where owner_id = auth.uid()));

-- auto_post_rules
drop policy if exists "rules_read" on public.auto_post_rules;
create policy "rules_read" on public.auto_post_rules for select
  using (property_id in (select id from public.properties where owner_id = auth.uid())
      or public.is_readonly());

drop policy if exists "rules_write" on public.auto_post_rules;
create policy "rules_write" on public.auto_post_rules for all
  using (property_id in (select id from public.properties where owner_id = auth.uid()))
  with check (property_id in (select id from public.properties where owner_id = auth.uid()));

-- leases
drop policy if exists "leases_read" on public.leases;
create policy "leases_read" on public.leases for select
  using (property_id in (select id from public.properties where owner_id = auth.uid())
      or public.is_readonly());

drop policy if exists "leases_write" on public.leases;
create policy "leases_write" on public.leases for all
  using (property_id in (select id from public.properties where owner_id = auth.uid()))
  with check (property_id in (select id from public.properties where owner_id = auth.uid()));
