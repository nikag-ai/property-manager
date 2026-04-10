// Shared TypeScript types mirroring the DB schema

export interface Property {
  id: string
  owner_id: string
  address: string
  purchase_date: string
  purchase_price: number
  loan_amount: number
  interest_rate: number
  loan_term_months: number
  origination_date: string
  closing_costs: number
  current_value: number | null
  current_value_updated_at: string | null
  selling_cost_pct: number
  hoa_amount: number
  mgmt_fee_pct: number
  quick_links: { label: string; url: string }[] | null
  important_contacts: { name: string; role: string; email: string; phone: string }[] | null
  created_at: string
}

export interface Transaction {
  id: string
  property_id: string
  date: string
  amount: number
  tag_id: string | null
  tag_name: string
  notes: string | null
  is_auto_posted: boolean
  auto_post_rule_id: string | null
  amortization_id: string | null
  breakdown: BreakdownLine[] | null
  created_at: string
  created_by: string | null
}

export interface BreakdownLine {
  label: string
  amount: number
}

export interface Tag {
  id: string
  property_id: string
  name: string
  category: 'income' | 'expense' | 'equity'
  is_default: boolean
}

export interface Lease {
  id: string
  property_id: string
  tenant_name: string | null
  lease_start: string
  lease_end: string
  monthly_rent: number
  rent_due_day: number
  is_active?: boolean
  created_at: string
}

export interface AmortizationRow {
  id: string
  property_id: string
  payment_number: number
  payment_date: string
  total_payment: number
  principal: number
  interest: number
  escrow: number
  remaining_balance: number
  is_posted: boolean
  posted_at: string | null
  edited_by_user: boolean
}

export interface AutoPostRule {
  id: string
  property_id: string
  tag_id: string
  tag_name: string
  label: string
  amount: number
  post_day: number
  is_active: boolean
  is_amortized: boolean
  breakdown_template: { label: string; source: string }[] | null
  created_at: string
}

export interface PropertyMetrics {
  gross_equity: number
  net_equity: number
  monthly_cash_flow: number
  cumulative_cash_flow: number
  total_principal_paid: number
  total_interest_paid: number
  vacancy_rate_pct: number
  maintenance_pct_ttm: number
  management_cost_ttm: number
  breakeven_sale_price: number
  remaining_loan_balance: number
  lease_days_remaining: number | null
  projected_rent_to_lease_end: number | null
  current_value: number | null
  selling_costs: number
}

export interface MonthlySummary {
  month: string   // ISO date string (first of month)
  income: number
  expenses: number
  net_cash_flow: number
  principal_paid: number
  interest_paid: number
  maintenance: number
  management_fee: number
  closing_costs: number
}

export interface TransactionFilters {
  month?: string       // 'YYYY-MM'
  tag_name?: string
  tags?: string[]      // Support multiple tags
  date_from?: string
  date_to?: string
  search?: string
}
