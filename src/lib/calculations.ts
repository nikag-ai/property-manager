import { differenceInMonths } from 'date-fns'
import type { Property, PropertyMetrics, Lease } from './types'

export function computeInvestmentIntelligence(
  prop: Property | null | undefined,
  metrics: PropertyMetrics | null | undefined,
  activeLease: Lease | null | undefined,
  monthlyMortgage: number
) {
  if (!prop) return null

  const downPayment     = prop.purchase_price - prop.loan_amount
  const totalDeployed   = downPayment + prop.closing_costs
  const monthsOwned     = Math.max(1, differenceInMonths(new Date(), new Date(prop.purchase_date)))
  const annualCF        = metrics ? (metrics.cumulative_cash_flow / monthsOwned) * 12 : null
  const cocReturn       = annualCF != null ? (annualCF / totalDeployed) * 100 : null
  const monthlyRent     = activeLease?.monthly_rent ?? 0
  const annualRent      = monthlyRent * 12

  // NOI = Annual rent - operating expenses excl mortgage (annualized)
  const mgmtTTM     = metrics?.management_cost_ttm ?? 0
  const annualOpExp = mgmtTTM * (12 / Math.max(monthsOwned, 1)) + (prop.hoa_amount ?? 0)
  const noi         = annualRent - annualOpExp
  const capRate     = prop.current_value ? (noi / prop.current_value) * 100 : null

  // Annual debt service
  const annualDebtService = monthlyMortgage * 12
  const dscr = annualDebtService > 0 ? noi / annualDebtService : null

  // Equity multiple = (net equity [capitalized] + totalDeployed) / totalDeployed
  const capitalizedNetEq = metrics
    ? metrics.gross_equity + metrics.cumulative_cash_flow - metrics.selling_costs
    : null
  const equityMultiple = capitalizedNetEq != null && totalDeployed > 0
    ? (capitalizedNetEq + totalDeployed) / totalDeployed
    : null

  const interestRatio = metrics && metrics.total_principal_paid > 0
    ? metrics.total_interest_paid / metrics.total_principal_paid
    : null

  return {
    downPayment,
    totalDeployed,
    monthsOwned,
    annualCF,
    cocReturn,
    monthlyRent,
    annualRent,
    mgmtTTM,
    annualOpExp,
    noi,
    capRate,
    annualDebtService,
    dscr,
    capitalizedNetEq,
    equityMultiple,
    interestRatio,
    totalInterestPaid: metrics?.total_interest_paid ?? 0,
    totalPrincipalPaid: metrics?.total_principal_paid ?? 0,
  }
}
