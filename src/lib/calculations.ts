import { differenceInMonths } from 'date-fns'
import type { Property, PropertyMetrics, Lease } from './types'

export function computeInvestmentIntelligence(
  prop: Property | null | undefined,
  metrics: PropertyMetrics | null | undefined,
  activeLease: Lease | null | undefined,
  monthlyMortgage: number,
  simRent?: number,
  simValue?: number,
  simOpEx?: number
) {
  if (!prop) return null

  const downPayment     = prop.purchase_price - prop.loan_amount
  const totalDeployed   = downPayment + prop.closing_costs
  const monthsOwned     = Math.max(1, differenceInMonths(new Date(), new Date(prop.purchase_date)))
  
  const monthlyRent     = simRent ?? activeLease?.monthly_rent ?? 0
  const annualRent      = monthlyRent * 12

  // Annual debt service
  const annualDebtService = monthlyMortgage * 12

  // NOI = Annual rent - operating expenses excl mortgage (annualized)
  const mgmtTTM     = metrics?.management_cost_ttm ?? 0
  const annualOpExp = simOpEx !== undefined ? simOpEx : (mgmtTTM * (12 / Math.max(monthsOwned, 1)) + (prop.hoa_amount ?? 0))
  const noi         = annualRent - annualOpExp
  
  const currentVal  = simValue ?? prop.current_value ?? prop.purchase_price
  const capRate     = currentVal > 0 ? (noi / currentVal) * 100 : null

  // If sim args are provided, we force annualCF = noi - annualDebtService 
  // Otherwise we use the historical truth from the DB.
  const isSimulating = simRent !== undefined || simOpEx !== undefined || simValue !== undefined
  const annualCF = isSimulating 
    ? (noi - annualDebtService) 
    : (metrics ? (metrics.cumulative_cash_flow / monthsOwned) * 12 : null)
    
  const cocReturn       = annualCF != null && totalDeployed > 0 ? (annualCF / totalDeployed) * 100 : null

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

  // Educational Metrics
  // Return on Equity
  const roe = capitalizedNetEq != null && capitalizedNetEq > 0 && annualCF != null ? (annualCF / capitalizedNetEq) * 100 : null
  
  // Operating Expense Ratio
  const oer = annualRent > 0 ? (annualOpExp / annualRent) * 100 : null
  
  // Gross Yield
  const propertyValue = currentVal
  const grm = propertyValue > 0 && annualRent > 0 ? (annualRent / propertyValue) * 100 : null
  
  // Break-Even Occupancy Ratio
  const breakEvenOccupancy = annualRent > 0 ? ((annualOpExp + annualDebtService) / annualRent) * 100 : null
  
  // Principal Paydown Yield
  const annualPrincipal = metrics ? (metrics.total_principal_paid / Math.max(monthsOwned, 1)) * 12 : 0
  const principalPaydownYield = totalDeployed > 0 ? (annualPrincipal / totalDeployed) * 100 : null
  
  // Total Annualized Return (Cash Flow + Principal + Appreciation)
  const annualAppreciation = ((propertyValue - prop.purchase_price) / Math.max(monthsOwned, 1)) * 12
  const totalAnnualizedReturn = annualCF != null && totalDeployed > 0 
    ? ((annualCF + annualPrincipal + annualAppreciation) / totalDeployed) * 100 
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
    roe,
    oer,
    grm,
    breakEvenOccupancy,
    annualPrincipal,
    principalPaydownYield,
    annualAppreciation,
    totalAnnualizedReturn,
    totalInterestPaid: metrics?.total_interest_paid ?? 0,
    totalPrincipalPaid: metrics?.total_principal_paid ?? 0,
  }
}

