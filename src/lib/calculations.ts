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
    // --- NEW INSTITUTIONAL METRICS ---
    rtv: propertyValue > 0 ? (monthlyRent / propertyValue) * 100 : null,
    debtYield: prop.loan_amount > 0 ? (noi / prop.loan_amount) * 100 : null,
    appreciationYield: totalDeployed > 0 ? (annualAppreciation / totalDeployed) * 100 : null,
    ltv: propertyValue > 0 ? ((metrics?.remaining_loan_balance ?? prop.loan_amount) / propertyValue) * 100 : null,
    expenseIntensity: annualRent > 0 ? ((mgmtTTM + (metrics?.maintenance_pct_ttm ?? 0) * annualRent / 100) / annualRent) * 100 : null,
    yoc: (prop.purchase_price + prop.closing_costs) > 0 ? (noi / (prop.purchase_price + prop.closing_costs)) * 100 : null,
    equityCapture: (prop.purchase_price + prop.closing_costs) > 0 ? ((propertyValue - (prop.purchase_price + prop.closing_costs)) / (prop.purchase_price + prop.closing_costs)) * 100 : null,
    adjustedCapRate: propertyValue > 0 ? ((noi - (annualRent * 0.05)) / propertyValue) * 100 : null,
    economicVacancy: metrics?.vacancy_rate_pct ?? 0,
    interestSensitivity: annualCF != null && annualCF !== 0 ? (Math.abs(prop.loan_amount * 0.01) / Math.abs(annualCF)) * 100 : null,
    // --- EXPERT METRICS ---
    projAnnualCF: (annualRent - annualOpExp - annualDebtService),
    refiEquity: propertyValue > 0 ? Math.max(0, (propertyValue * 0.75) - (metrics?.remaining_loan_balance ?? prop.loan_amount)) : 0,
    loanConstant: prop.loan_amount > 0 ? (annualDebtService / prop.loan_amount) * 100 : null,
    equityAccRate: totalDeployed > 0 ? ((annualPrincipal + annualAppreciation) / totalDeployed) * 100 : null,
    unleveredYield: (prop.purchase_price + prop.closing_costs) > 0 ? (noi / (prop.purchase_price + prop.closing_costs)) * 100 : null,
    yote: (capitalizedNetEq != null && capitalizedNetEq > 0 && annualCF != null) ? (annualCF / capitalizedNetEq) * 100 : null,
    wealthCompVelocity: totalAnnualizedReturn,
    rateStressTest: (metrics?.remaining_loan_balance ?? prop.loan_amount) > 0 ? (noi / (metrics?.remaining_loan_balance ?? prop.loan_amount)) * 100 : null,
    maintAbsorpCap: annualCF ?? 0,
    levEffectRatio: (roe != null && capRate != null && capRate > 0) ? (roe / capRate) : null,
    amortEff: annualDebtService > 0 ? (annualPrincipal / annualDebtService) * 100 : null,
    marketValGap: propertyValue > 0 ? (propertyValue - (noi / 0.065)) : null,
    monthlyOutflow: (annualOpExp + annualDebtService) / 12,
    vacSurvivalDuration: (annualOpExp + annualDebtService) > 0 ? (Math.max(0, metrics?.cumulative_cash_flow ?? 0) / ((annualOpExp + annualDebtService) / 12)) : 0,
    vacTarget12Mo: ((annualOpExp + annualDebtService) / 12) * 12,
    opEffBenchmark: oer != null ? (oer / 35.0) : null,
    taxSensIndex: annualCF != null && annualCF !== 0 ? (((prop.hoa_amount ?? 0) * 0.10) / annualCF) * 100 : null,
    // --- UPDATED TAX SHIELD ---
    taxShieldImpact: annualRent > 0 ? ((((prop.purchase_price * 0.8) / 27.5) + (metrics ? (metrics.total_interest_paid / Math.max(monthsOwned, 1)) * 12 : 0) + annualOpExp) / annualRent) * 100 : null,
    annualInterest: metrics ? (metrics.total_interest_paid / Math.max(monthsOwned, 1)) * 12 : 0,
    annualDepreciation: (prop.purchase_price * 0.8) / 27.5,

    // --- POWER-UP: WEALTH COMPOSITION ---
    wealthDownpayment: downPayment,
    wealthPrincipal: metrics?.total_principal_paid ?? 0,
    wealthAppreciation: propertyValue - prop.purchase_price,
    wealthTotal: propertyValue - (metrics?.remaining_loan_balance ?? prop.loan_amount),

    // --- POWER-UP: RENT ALLOCATION (Monthly) ---
    allocInterest: (metrics ? (metrics.total_interest_paid / Math.max(monthsOwned, 1)) : (monthlyMortgage * 0.7)), // Interest approx
    allocPrincipal: (metrics ? (metrics.total_principal_paid / Math.max(monthsOwned, 1)) : (monthlyMortgage * 0.3)),
    allocTaxesIns: (prop.hoa_amount ?? 0),
    allocOpEx: (mgmtTTM / Math.max(monthsOwned, 1)) + ((metrics?.maintenance_pct_ttm ?? 0) * monthlyRent / 100),
    allocNetCF: monthlyRent - (monthlyMortgage + (prop.hoa_amount ?? 0) + (mgmtTTM / Math.max(monthsOwned, 1)) + ((metrics?.maintenance_pct_ttm ?? 0) * monthlyRent / 100)),

    // --- POWER-UP: ROBUST PROJECTIONS (30yr) ---
    wealthProjection: Array.from({ length: 31 }).map((_, yearIndex) => {
      // Base Appreciation rate 3%
      const projectedValue = propertyValue * Math.pow(1.03, yearIndex)
      
      // Amortization Approximation: Remaining balance decellerates linearly for now (could be an exact amort curve later)
      // Assuming a 30-year loan, every year reduces balance by increasing amounts (roughly modeled)
      const bal = metrics?.remaining_loan_balance ?? prop.loan_amount
      const remainingTerm = 30 - (monthsOwned / 12)
      const amortPace = bal / Math.max(1, remainingTerm) // strict linear for visualizing
      
      const projectedLoan = Math.max(0, bal - (amortPace * yearIndex))
      
      return {
        year: yearIndex,
        downpayment: downPayment,
        principal: Math.max(0, prop.purchase_price - downPayment - projectedLoan), // Total Principal Paid into property value
        appreciation: projectedValue - prop.purchase_price
      }
    })
  }
}

