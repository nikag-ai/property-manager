-- ============================================================
-- RentLedger Seed: 864 Moray Drive
-- Generated from transaction image: Oct 2025 – Apr 2026
-- ============================================================
-- BEFORE RUNNING: Replace REPLACE_WITH_YOUR_AUTH_UUID below
-- Find it in: Supabase > Authentication > Users
-- ============================================================

-- ── Key numbers from image ─────────────────────────────────
-- Mortgage total:    $1,295.11/mo  (P&I $1,048.11 + Escrow $247)
-- HOA:              $542.49/year  (annual, paid in October — NOT monthly)
-- Management fee:   9% of rent (varies; Jan was $136.44 — possibly partial)
-- Lease:            Dec 8, 2025 → Jun 8, 2027  |  Rent $1,895/mo
-- Leasing fee:      $947.50 (one-time, Dec 2025)
-- ───────────────────────────────────────────────────────────

do $$ begin
  perform set_config('app.owner_id', 'REPLACE_WITH_YOUR_AUTH_UUID', false);
end $$;

-- ============================================================
-- 1. Property
-- ============================================================
insert into public.properties (
  id, owner_id, address,
  purchase_date, purchase_price,
  loan_amount, interest_rate, loan_term_months,
  origination_date,      -- date_trunc('month', this) + 1 month = first payment
  closing_costs, current_value, current_value_updated_at,
  selling_cost_pct, hoa_amount, mgmt_fee_pct
)
values (
  gen_random_uuid(),
  current_setting('app.owner_id')::uuid,
  '864 Moray Drive',
  '2025-10-10',   -- purchase / closing date
  314000.00,
  219800.00,
  0.0399,         -- 3.99%
  360,            -- 30 years
  '2025-10-10',   -- origination = closing; first payment = 2025-11-01
  6000.00,        -- user-stated closing costs (separate from down payment)
  314000.00,      -- current estimate as of seed
  now(),
  0.10,           -- 10% selling cost assumption
  542.49,         -- annual HOA (stored as yearly amount for reference)
  0.09            -- 9% management fee
)
;

-- ============================================================
-- 2. Default Tags  (including Down Payment for equity tracking)
-- ============================================================
insert into public.tags (property_id, name, category, is_default)
select p.id, v.name, v.cat, true
from public.properties p,
(values
  ('Mortgage',                'expense'),
  ('Mortgage Principal',      'expense'),
  ('Mortgage Interest',       'expense'),
  ('Escrow',                  'expense'),
  ('HOA',                     'expense'),
  ('Management Fee',          'expense'),
  ('Leasing Fee',             'expense'),
  ('Utilities — Electricity', 'expense'),
  ('Utilities — Water/Sewer', 'expense'),
  ('Maintenance',             'expense'),
  ('Closing Costs',           'expense'),
  ('Down Payment',            'equity'),   -- excluded from P&L cash flow
  ('Rent Income',             'income'),
  ('Other Income',            'income'),
  ('Other Expense',           'expense')
) as v(name, cat)
where p.address = '864 Moray Drive'
on conflict (property_id, name) do nothing;

-- ============================================================
-- 3. Generate Amortization Schedule
--    generate_amortization() inserts all 360 rows.
--    First payment date = date_trunc('month','2025-10-10') + 1 month = 2025-11-01
-- ============================================================
select generate_amortization(id)
from public.properties where address = '864 Moray Drive';

-- Patch escrow to $247 on all rows, recompute total_payment
update public.amortization_schedule
set escrow        = 247.00,
    total_payment = principal + interest + 247.00
where property_id = (select id from public.properties where address = '864 Moray Drive');

-- ============================================================
-- 4. Lease
-- ============================================================
insert into public.leases (property_id, tenant_name, lease_start, lease_end, monthly_rent, rent_due_day)
select p.id, null, '2025-12-08', '2027-06-08', 1895.00, 1
from public.properties p where p.address = '864 Moray Drive'
;

-- ============================================================
-- 5. Auto-Post Rules
--    HOA is annual (paid Oct), so no monthly auto-post rule.
-- ============================================================

-- Mortgage (amortized — reads P&I+escrow from amortization_schedule)
insert into public.auto_post_rules (
  property_id, tag_id, tag_name, label, amount, post_day, is_active, is_amortized, breakdown_template
)
select
  p.id, t.id, 'Mortgage', 'Monthly Mortgage Payment', 0, 1, true, true,
  '[{"label":"Principal","source":"amortization.principal"},
    {"label":"Interest",  "source":"amortization.interest"},
    {"label":"Escrow",    "source":"amortization.escrow"}]'::jsonb
from public.properties p
join public.tags t on t.property_id = p.id and t.name = 'Mortgage'
where p.address = '864 Moray Drive';

-- ============================================================
-- 6. Backfilled Transactions
-- ============================================================
-- Helper: reference property id inline via subquery throughout.
-- All expenses are negative; income is positive.
-- Mortgage rows use breakdown JSONB for principal/interest/escrow split.
-- HOA is annual — tagged separately each October.
-- ============================================================

-- ── OCTOBER 2025 ───────────────────────────────────────────
-- NOTE: Closing Cost $95,951.64 from Lennar = Down Payment $94,200 + misc $1,751.64
--       Down Payment is equity (excluded from P&L); only true closing costs hit expenses.

-- Advance Contract (part of closing costs, paid to Lennar)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-10-10', -5000.00,
  (select id from public.tags where property_id = p.id and name = 'Closing Costs'),
  'Closing Costs', 'Advance Contract — Lennar', false
from public.properties p where p.address = '864 Moray Drive';

-- Down Payment (equity outflow, not a P&L expense)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-10-10', -94200.00,
  (select id from public.tags where property_id = p.id and name = 'Down Payment'),
  'Down Payment', 'Down payment at closing ($314k - $219.8k loan)', false
from public.properties p where p.address = '864 Moray Drive';

-- True closing costs (remainder of Lennar Closing Cost line: $95,951.64 - $94,200)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-10-10', -1751.64,
  (select id from public.tags where property_id = p.id and name = 'Closing Costs'),
  'Closing Costs', 'Closing Cost — Lennar (title/fees portion)', false
from public.properties p where p.address = '864 Moray Drive';

-- Bi-weekly landscaping
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-10-17', -70.00,
  (select id from public.tags where property_id = p.id and name = 'Maintenance'),
  'Maintenance', 'Bi-weekly landscaping — Marshall Reddick', false
from public.properties p where p.address = '864 Moray Drive';

-- Marshall Reddick Advance (mgmt advance before tenant)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-10-10', -500.00,
  (select id from public.tags where property_id = p.id and name = 'Management Fee'),
  'Management Fee', 'Marshall Reddick advance (pre-lease)', false
from public.properties p where p.address = '864 Moray Drive';

-- Listing photos
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-10-10', -245.00,
  (select id from public.tags where property_id = p.id and name = 'Leasing Fee'),
  'Leasing Fee', 'Listing photos — Marshall Reddick', false
from public.properties p where p.address = '864 Moray Drive';

-- Third-party inspection
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-10-10', -450.00,
  (select id from public.tags where property_id = p.id and name = 'Other Expense'),
  'Other Expense', 'Third party inspection — Marshall Reddick', false
from public.properties p where p.address = '864 Moray Drive';

-- Water & Sewer (Oct 2025)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-10-10', -131.14,
  (select id from public.tags where property_id = p.id and name = 'Utilities — Water/Sewer'),
  'Utilities — Water/Sewer', 'Water & Sewer 10/13/25–11/05/25', false
from public.properties p where p.address = '864 Moray Drive';

-- Electricity (Oct)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-10-23', -67.58,
  (select id from public.tags where property_id = p.id and name = 'Utilities — Electricity'),
  'Utilities — Electricity', 'Electricity 10/13/25–10/23/25', false
from public.properties p where p.address = '864 Moray Drive';

-- HOA Annual (paid once in October, not monthly)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-10-10', -542.49,
  (select id from public.tags where property_id = p.id and name = 'HOA'),
  'HOA', 'HOA Annual Dues — Byers & Harvey', false
from public.properties p where p.address = '864 Moray Drive';

-- ── NOVEMBER 2025 ──────────────────────────────────────────
-- Mortgage Payment #1
-- Interest: $219,800 × 0.003325 = $730.84 | Principal: $317.27 | Escrow: $247.00
insert into public.transactions (
  property_id, date, amount, tag_id, tag_name, notes,
  is_auto_posted, amortization_id, breakdown
)
select
  p.id, '2025-11-01', -1295.11,
  (select id from public.tags where property_id = p.id and name = 'Mortgage'),
  'Mortgage', 'November 2025 Loan — Lennar | Pmt #1', true,
  (select id from public.amortization_schedule where property_id = p.id and payment_number = 1),
  '[{"label":"Principal","amount":317.27},{"label":"Interest","amount":730.84},{"label":"Escrow","amount":247.00}]'::jsonb
from public.properties p where p.address = '864 Moray Drive';

-- Electricity (Oct 23 – Nov 21)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-11-21', -46.19,
  (select id from public.tags where property_id = p.id and name = 'Utilities — Electricity'),
  'Utilities — Electricity', 'Electricity 10/23/25–11/21/25', false
from public.properties p where p.address = '864 Moray Drive';

-- Water & Sewer final bill (tenant takes over Dec 8)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-12-08', -31.14,
  (select id from public.tags where property_id = p.id and name = 'Utilities — Water/Sewer'),
  'Utilities — Water/Sewer', 'Water & Sewer final bill 11/05/25–12/08/25', false
from public.properties p where p.address = '864 Moray Drive';

-- Electricity final bill (tenant takes over Dec 8)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-12-08', -84.52,
  (select id from public.tags where property_id = p.id and name = 'Utilities — Electricity'),
  'Utilities — Electricity', 'Electricity final bill 11/21/25–12/08/25', false
from public.properties p where p.address = '864 Moray Drive';

-- ── DECEMBER 2025 ──────────────────────────────────────────
-- Mortgage Payment #2
-- Interest: $219,482.73 × 0.003325 = $729.78 | Principal: $318.33 | Escrow: $247.00
insert into public.transactions (
  property_id, date, amount, tag_id, tag_name, notes,
  is_auto_posted, amortization_id, breakdown
)
select
  p.id, '2025-12-01', -1295.11,
  (select id from public.tags where property_id = p.id and name = 'Mortgage'),
  'Mortgage', 'December 2025 Loan — Lennar | Pmt #2', true,
  (select id from public.amortization_schedule where property_id = p.id and payment_number = 2),
  '[{"label":"Principal","amount":318.33},{"label":"Interest","amount":729.78},{"label":"Escrow","amount":247.00}]'::jsonb
from public.properties p where p.address = '864 Moray Drive';

-- Leasing fee (one-time, tenant placed Dec 8)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-12-08', -947.50,
  (select id from public.tags where property_id = p.id and name = 'Leasing Fee'),
  'Leasing Fee', 'Tenant placement fee — Marshall Reddick', false
from public.properties p where p.address = '864 Moray Drive';

-- Management fee Dec ($170.55 = 9% × $1,895 — full month, confirmed by amount)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-12-31', -170.55,
  (select id from public.tags where property_id = p.id and name = 'Management Fee'),
  'Management Fee', 'Management fee Dec 2025', false
from public.properties p where p.address = '864 Moray Drive';

-- Rent Income Dec (full month — mgmt fee = 9% × $1,895 confirms full collection)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2025-12-08', 1895.00,
  (select id from public.tags where property_id = p.id and name = 'Rent Income'),
  'Rent Income', 'Rent — Dec 2025 (lease start date)', false
from public.properties p where p.address = '864 Moray Drive';

-- ── JANUARY 2026 ───────────────────────────────────────────
-- Mortgage Payment #3
-- Interest: $219,164.40 × 0.003325 = $728.72 | Principal: $319.39 | Escrow: $247.00
insert into public.transactions (
  property_id, date, amount, tag_id, tag_name, notes,
  is_auto_posted, amortization_id, breakdown
)
select
  p.id, '2026-01-01', -1295.11,
  (select id from public.tags where property_id = p.id and name = 'Mortgage'),
  'Mortgage', 'January 2026 Loan — Lennar | Pmt #3', true,
  (select id from public.amortization_schedule where property_id = p.id and payment_number = 3),
  '[{"label":"Principal","amount":319.39},{"label":"Interest","amount":728.72},{"label":"Escrow","amount":247.00}]'::jsonb
from public.properties p where p.address = '864 Moray Drive';

-- Management fee Jan ($136.44 — note: less than usual; ~7.2% of $1,895 or partial month)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2026-01-31', -136.44,
  (select id from public.tags where property_id = p.id and name = 'Management Fee'),
  'Management Fee', 'Management fee Jan 2026 (actual per statement)', false
from public.properties p where p.address = '864 Moray Drive';

-- Rent Income Jan
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2026-01-01', 1895.00,
  (select id from public.tags where property_id = p.id and name = 'Rent Income'),
  'Rent Income', 'Rent — Jan 2026', false
from public.properties p where p.address = '864 Moray Drive';

-- ── FEBRUARY 2026 ──────────────────────────────────────────
-- Mortgage Payment #4
-- Interest: $218,845.01 × 0.003325 = $727.66 | Principal: $320.45 | Escrow: $247.00
insert into public.transactions (
  property_id, date, amount, tag_id, tag_name, notes,
  is_auto_posted, amortization_id, breakdown
)
select
  p.id, '2026-02-01', -1295.11,
  (select id from public.tags where property_id = p.id and name = 'Mortgage'),
  'Mortgage', 'February 2026 Loan — Lennar | Pmt #4', true,
  (select id from public.amortization_schedule where property_id = p.id and payment_number = 4),
  '[{"label":"Principal","amount":320.45},{"label":"Interest","amount":727.66},{"label":"Escrow","amount":247.00}]'::jsonb
from public.properties p where p.address = '864 Moray Drive';

-- Management fee Feb
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2026-02-28', -170.55,
  (select id from public.tags where property_id = p.id and name = 'Management Fee'),
  'Management Fee', 'Management fee Feb 2026', false
from public.properties p where p.address = '864 Moray Drive';

-- Trash can installation (maintenance)
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2026-02-01', -380.00,
  (select id from public.tags where property_id = p.id and name = 'Maintenance'),
  'Maintenance', 'Trash can installation — Marshall Reddick', false
from public.properties p where p.address = '864 Moray Drive';

-- Rent Income Feb
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2026-02-01', 1895.00,
  (select id from public.tags where property_id = p.id and name = 'Rent Income'),
  'Rent Income', 'Rent — Feb 2026', false
from public.properties p where p.address = '864 Moray Drive';

-- ── MARCH 2026 ─────────────────────────────────────────────
-- Mortgage Payment #5
-- Interest: $218,524.56 × 0.003325 = $726.60 | Principal: $321.51 | Escrow: $247.00
insert into public.transactions (
  property_id, date, amount, tag_id, tag_name, notes,
  is_auto_posted, amortization_id, breakdown
)
select
  p.id, '2026-03-01', -1295.11,
  (select id from public.tags where property_id = p.id and name = 'Mortgage'),
  'Mortgage', 'March 2026 Loan — Lennar | Pmt #5', true,
  (select id from public.amortization_schedule where property_id = p.id and payment_number = 5),
  '[{"label":"Principal","amount":321.51},{"label":"Interest","amount":726.60},{"label":"Escrow","amount":247.00}]'::jsonb
from public.properties p where p.address = '864 Moray Drive';

-- Management fee Mar
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2026-03-31', -170.55,
  (select id from public.tags where property_id = p.id and name = 'Management Fee'),
  'Management Fee', 'Management fee Mar 2026', false
from public.properties p where p.address = '864 Moray Drive';

-- Rent Income Mar
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2026-03-01', 1895.00,
  (select id from public.tags where property_id = p.id and name = 'Rent Income'),
  'Rent Income', 'Rent — Mar 2026', false
from public.properties p where p.address = '864 Moray Drive';

-- ── APRIL 2026 ─────────────────────────────────────────────
-- Mortgage Payment #6
-- Interest: $218,203.05 × 0.003325 = $725.52 | Principal: $322.59 | Escrow: $247.00
insert into public.transactions (
  property_id, date, amount, tag_id, tag_name, notes,
  is_auto_posted, amortization_id, breakdown
)
select
  p.id, '2026-04-01', -1295.11,
  (select id from public.tags where property_id = p.id and name = 'Mortgage'),
  'Mortgage', 'April 2026 Loan — Lennar | Pmt #6', true,
  (select id from public.amortization_schedule where property_id = p.id and payment_number = 6),
  '[{"label":"Principal","amount":322.59},{"label":"Interest","amount":725.52},{"label":"Escrow","amount":247.00}]'::jsonb
from public.properties p where p.address = '864 Moray Drive';

-- Management fee Apr
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2026-04-30', -170.55,
  (select id from public.tags where property_id = p.id and name = 'Management Fee'),
  'Management Fee', 'Management fee Apr 2026', false
from public.properties p where p.address = '864 Moray Drive';

-- Rent Income Apr
insert into public.transactions (property_id, date, amount, tag_id, tag_name, notes, is_auto_posted)
select p.id, '2026-04-01', 1895.00,
  (select id from public.tags where property_id = p.id and name = 'Rent Income'),
  'Rent Income', 'Rent — Apr 2026', false
from public.properties p where p.address = '864 Moray Drive';

-- ============================================================
-- 7. Mark paid amortization rows as posted (Pmt #1–6)
-- ============================================================
update public.amortization_schedule
set is_posted = true, posted_at = now()
where property_id = (select id from public.properties where address = '864 Moray Drive')
  and payment_number between 1 and 6;

-- ============================================================
-- 8. Sanity Check
-- ============================================================
select
  to_char(date_trunc('month', date), 'Mon YYYY')   as month,
  sum(case when amount > 0 then amount else 0 end)  as income,
  sum(case when amount < 0 then amount else 0 end)  as expenses,
  sum(amount)                                        as net
from public.transactions
where property_id = (select id from public.properties where address = '864 Moray Drive')
  and tag_name != 'Down Payment'   -- exclude equity outflow from P&L
group by date_trunc('month', date)
order by date_trunc('month', date);
