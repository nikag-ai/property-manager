export const INVESTMENT_METRICS = [
  // Primary
  { key: 'gross', label: 'Gross Equity', category: 'Primary' },
  { key: 'net', label: 'Net Equity', category: 'Primary' },
  { key: 'adjCap', label: 'Adjusted Cap Rate', category: 'Primary' },

  // Returns
  { key: 'tar', label: 'Total Annualized Return', category: 'Returns' },
  { key: 'coc', label: 'Cash-on-Cash Return', category: 'Returns' },
  { key: 'roe', label: 'Return on Equity (ROE)', category: 'Returns' },
  { key: 'yoc', label: 'Yield on Cost (YOC)', category: 'Returns' },
  { key: 'em', label: 'Equity Multiple', category: 'Returns' },

  // Projections
  { key: 'pcf', label: 'Exp. Annual Cash Flow', category: 'Projections' },
  { key: 'refi', label: 'Refinance-able Equity', category: 'Projections' },
  { key: 'loanConstant', label: 'Loan Constant', category: 'Projections' },
  { key: 'equityAcc', label: 'Equity Accumulation Rate', category: 'Projections' },
  { key: 'unleveredYield', label: 'Unlevered Yield', category: 'Projections' },
  { key: 'yote', label: 'Yield on Trapped Equity', category: 'Projections' },

  // Efficiency
  { key: 'cap', label: 'Cap Rate (Market)', category: 'Efficiency' },
  { key: 'rtv', label: 'Rent-to-Value (RTV)', category: 'Efficiency' },
  { key: 'oer', label: 'Expense Ratio (OER)', category: 'Efficiency' },
  { key: 'opEffBenchmark', label: 'Op. Efficiency Benchmark', category: 'Efficiency' },

  // Risk
  { key: 'dscr', label: 'DSCR', category: 'Risk' },
  { key: 'ltv', label: 'Current LTV', category: 'Risk' },
  { key: 'sensitivity', label: 'Interest Sensitivity', category: 'Risk' },
  { key: 'debtYield', label: 'Debt Yield', category: 'Risk' },

  // Stress Tests
  { key: 'rateStress', label: 'Interest Rate Stress Test', category: 'Stress Tests' },
  { key: 'maintAbsorp', label: 'Maint. Absorption Cap', category: 'Stress Tests' },
  { key: 'levEffect', label: 'Leverage Effect Ratio', category: 'Stress Tests' },
  { key: 'amortEff', label: 'Amortization Efficiency', category: 'Stress Tests' },
  { key: 'marketValGap', label: 'Implied Market Value Gap', category: 'Stress Tests' },
  { key: 'vacSurvival', label: 'Vacancy Survival Duration', category: 'Stress Tests' },
  { key: 'taxSens', label: 'Tax Sensitivity Index', category: 'Stress Tests' },

  // Wealth
  { key: 'shield', label: 'Tax Shield Impact', category: 'Wealth' },
  { key: 'tcd', label: 'Total Cash Deployed', category: 'Wealth' },
  { key: 'capture', label: 'Equity Capture', category: 'Wealth' },
  { key: 'ber', label: 'Break-Even Occupancy', category: 'Wealth' },
]

export const METRIC_COUNT = INVESTMENT_METRICS.length
