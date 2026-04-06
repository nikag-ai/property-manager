import { useParams, useNavigate } from 'react-router-dom'
import { useProperty } from '../contexts/PropertyContext'
import { useMetrics, useActiveLease } from '../hooks/useData'
import { computeInvestmentIntelligence } from '../lib/calculations'
import { formatCurrency, formatPct } from '../lib/utils'

export default function IntelligenceDeepDive() {
  const { metric } = useParams<{ metric: string }>()
  const navigate = useNavigate()
  const { activeProperty: prop } = useProperty()
  const { data: metrics } = useMetrics(prop?.id ?? null)
  const activeLease = useActiveLease(prop?.id ?? null)

  const calc = prop ? computeInvestmentIntelligence(prop, metrics, activeLease, 1295.11) : null

  if (!prop || !calc) {
    return <div className="empty-state" style={{ marginTop: 80 }}><p>Loading...</p></div>
  }

  const getMetricDetails = () => {
    switch (metric) {
      case 'gross-equity':
      case 'gross':
        return {
          title: 'Gross Equity',
          value: metrics?.gross_equity != null ? formatCurrency(metrics.gross_equity) : '—',
          color: 'var(--blue)',
          formula: 'Current Market Value - Remaining Loan Balance = Gross Equity',
          math: `${formatCurrency(metrics?.current_value ?? prop.purchase_price)} - ${formatCurrency(metrics?.remaining_loan_balance ?? prop.loan_amount)} = ${formatCurrency(metrics?.gross_equity ?? 0)}`,
          mathBreakdown: [
            `Current Value (${formatCurrency(metrics?.current_value ?? prop.purchase_price)}): The latest appraised or market value of the property.`,
            `Remaining Loan Balance (${formatCurrency(metrics?.remaining_loan_balance ?? prop.loan_amount)}): Your current mortgage principal balance. As you pay your mortgage, this number goes down, increasing your equity.`
          ],
          meaning: "Gross Equity is the simplest measure of your wealth in a property. It represents the difference between what the house is worth and what you owe the bank. It does not account for the costs of selling or the cumulative cash you've spent on the property.",
          benchmarks: [
            { label: 'Equity Cushion (Safe)', value: '25%+' },
            { label: 'Wealth Goal', value: '100% (Debt Free)' },
          ]
        }
      case 'net-equity':
      case 'net':
        return {
          title: 'Net Equity (True Cash Out)',
          value: metrics?.net_equity != null ? formatCurrency(metrics.net_equity) : '—',
          color: 'var(--purple)',
          formula: 'Gross Equity - Selling Costs + All-time Net P&L = Net Equity',
          math: `${formatCurrency(metrics?.gross_equity ?? 0)} - ${formatCurrency(metrics?.selling_costs ?? 0)} + ${formatCurrency(metrics?.cumulative_cash_flow ?? 0)} = ${formatCurrency(metrics?.net_equity ?? 0)}`,
          mathBreakdown: [
            `Gross Equity (${formatCurrency(metrics?.gross_equity ?? 0)}): Value minus Debt.`,
            `Estimated Selling Costs (${formatCurrency(metrics?.selling_costs ?? 0)}): A simulated 10% expense for realtor commissions, title fees, and transfer taxes.`,
            `All-time Net P&L (${formatCurrency(metrics?.cumulative_cash_flow ?? 0)}): Every dollar of rent received minus every dollar of expense and closing costs since you purchased the property.`
          ],
          meaning: "Net Equity is your 'True North' for wealth. It represents the actual amount of cash that would hit your bank account if you sold the property today and closed your books. It is 'All-In', meaning it accounts for your original closing costs and all historical profits or losses.",
          benchmarks: [
            { label: 'Break-Even Point', value: '$0' },
            { label: 'Target Cash-on-Cash', value: '2x Invested Capital' },
          ]
        }
      case 'tar':
      case 'total-return':
        return {
          title: 'Total Annualized Return',
          value: calc.totalAnnualizedReturn != null ? formatPct(calc.totalAnnualizedReturn) : '—',
          color: 'var(--purple)',
          formula: '(Annual Cash Flow + Annual Principal Paydown + Annual Appreciation) ÷ Total Cash Deployed',
          math: `(${formatCurrency(calc.annualCF ?? 0)} + ${formatCurrency(calc.annualPrincipal ?? 0)} + ${formatCurrency(calc.annualAppreciation ?? 0)}) ÷ ${formatCurrency(calc.totalDeployed)} = ${calc.totalAnnualizedReturn ? (calc.totalAnnualizedReturn/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Annualized Cash Flow (${formatCurrency(calc.annualCF ?? 0)}): Pure operational profit taking into account all expenses and debt service.`,
            `Annual Principal Paydown (${formatCurrency(calc.annualPrincipal ?? 0)}): The amount of the mortgage loan that the tenant paid down for you this year.`,
            `Annual Appreciation (${formatCurrency(calc.annualAppreciation ?? 0)}): The estimated growth in property value annualized over the hold period.`,
            `Total Cash Deployed (${formatCurrency(calc.totalDeployed)}): The denominator. Down payment + closing costs.`
          ],
          meaning: "Total Annualized Return acts like a simplified IRR (Internal Rate of Return). It takes all three major wealth generation distinct vectors of real estate—cash flow, mortgage paydown, and equity appreciation—and aggregates them into one powerful percentage. This lets you compare your entire real estate engine directly against the S&P 500 or bond yields.",
          benchmarks: [
            { label: 'S&P 500 Average', value: '7.0% – 10.0%' },
            { label: 'Healthy Real Estate Total Return', value: '12.0% – 18.0%' },
            { label: 'Exceptional Performers', value: '20.0%+' },
          ]
        }
      case 'coc':
        return {
          title: 'Cash-on-Cash Return',
          value: calc.cocReturn != null ? formatPct(calc.cocReturn) : '—',
          color: 'var(--green)',
          formula: 'Annualized Cash Flow ÷ Total Cash Deployed = Cash-on-Cash Return',
          math: `${formatCurrency(calc.annualCF ?? 0)} ÷ ${formatCurrency(calc.totalDeployed)} = ${calc.cocReturn ? (calc.cocReturn/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Annualized Cash Flow (${formatCurrency(calc.annualCF ?? 0)}): Generated by taking your exact Cumulative Cash Flow to date, divided by the exact months owned, then multiplied by 12.`,
            `Total Cash Deployed (${formatCurrency(calc.totalDeployed)}): Your initial Down Payment plus all Closing Costs.`
          ],
          meaning: "Cash-on-Cash return tells you exactly what your cash yield is. It answers the question: 'For every dollar I physically put into this property, how many cents am I putting into my pocket each year?' It intentionally excludes invisible wealth builders like principal paydown and appreciation.",
          benchmarks: [
            { label: 'Standard Residential', value: '8.0% – 12.0%' },
            { label: 'A-Class Stable', value: '5.0% – 8.0%' },
            { label: 'High Yield / Value-Add', value: '12.0%+' },
          ]
        }
      case 'yoc':
        return {
          title: 'Yield on Cost (YOC)',
          value: calc.yoc != null ? formatPct(calc.yoc) : '—',
          color: 'var(--teal)',
          formula: 'Current NOI ÷ Total Original Basis = Yield on Cost',
          math: `${formatCurrency(calc.noi)} ÷ ${formatCurrency(prop.purchase_price + prop.closing_costs)} = ${calc.yoc ? (calc.yoc/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Current NOI (${formatCurrency(calc.noi)}): Your annualized Net Operating Income. Calculated as (Monthly Rent × 12) - (Annualized Management + Maintenance + HOA). It excludes your mortgage.`,
            `Original Basis (${formatCurrency(prop.purchase_price + prop.closing_costs)}): The total amount of money required to acquire the property. Purchase Price (${formatCurrency(prop.purchase_price)}) + Closing Costs (${formatCurrency(prop.closing_costs)}).`
          ],
          meaning: "Yield on Cost measures your current yield against the money you originally spent. It ignores current market value and focuses on your personal performance. If you bought a property 10 years ago and rents have doubled, your YOC will be much higher than the market cap rate, showing the power of long-term hold strategies.",
          benchmarks: [
            { label: 'Standard Acquisition', value: '5.0% – 7.0%' },
            { label: 'Successful 5-Yr Hold', value: '8.0% – 11.0%' },
            { label: 'Legacy Asset (10+ Yr)', value: '15.0%+' },
          ]
        }
      case 'roe':
        return {
          title: 'Return on Equity (ROE)',
          value: calc.roe != null ? formatPct(calc.roe) : '—',
          color: 'var(--yellow)',
          formula: 'Annualized Cash Flow ÷ Current Capitalized Net Equity',
          math: `${formatCurrency(calc.annualCF ?? 0)} ÷ ${formatCurrency(calc.capitalizedNetEq ?? 0)} = ${calc.roe ? (calc.roe/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Annualized Cash Flow (${formatCurrency(calc.annualCF ?? 0)}): Your net operating P&L extended to a 12-month period based on historicals.`,
            `Capitalized Net Equity (${formatCurrency(calc.capitalizedNetEq ?? 0)}): The exact dollar amount of cash you would walk away with if you sold the property tomorrow. Calculated as Current Value - Remaining Loan - Selling Costs (${formatPct(8)}).`
          ],
          meaning: "ROE is an extremely advanced metric that helps you answer: 'Should I sell or refinance?' As your equity grows over the years through appreciation and loan paydown, your ROE will drop. If your ROE drops below 4%, it means you have significant equity 'trapped' in the property, signalling it might be time for a cash-out refinance.",
          benchmarks: [
            { label: 'Highly Efficient Equity', value: '10.0% – 15.0%' },
            { label: 'Maturing Investment', value: '5.0% – 8.0%' },
            { label: 'Trapped Dead Equity', value: 'Below 4.0%' },
          ]
        }
      case 'em':
      case 'equity-multiple':
        return {
          title: 'Equity Multiple',
          value: calc.equityMultiple != null ? `${calc.equityMultiple.toFixed(2)}x` : '—',
          color: 'var(--purple)',
          formula: '(Capitalized Net Equity + Total Cash Deployed) ÷ Total Cash Deployed = Equity Multiple',
          math: `(${formatCurrency(calc.capitalizedNetEq ?? 0)} + ${formatCurrency(calc.totalDeployed)}) ÷ ${formatCurrency(calc.totalDeployed)} = ${calc.equityMultiple ? calc.equityMultiple.toFixed(2) : '—'}`,
          mathBreakdown: [
            `Capitalized Net Equity (${formatCurrency(calc.capitalizedNetEq ?? 0)}): Includes all wealth accumulation (Appreciation + Principal Downpay + Cash Flow) minus hypothetical selling costs. This gives you the true 'pull-out' sum of your investment today.`,
            `Total Cash Deployed (${formatCurrency(calc.totalDeployed)}): The initial capital injection required to acquire the asset (Down Payment + Closing Costs).`
          ],
          meaning: "Equity Multiple tells you how much your initial investment has grown across all vectors (cash flow, principal paydown, and appreciation). Unlike IRR, it does not account for the time value of money, but it clearly answers: 'If I put in $1, how much total wealth do I have now?'",
          benchmarks: [
            { label: 'Break-even', value: '1.00x' },
            { label: 'Solid Core Investment (5-7 yrs)', value: '1.50x – 2.00x' },
            { label: 'Home Run / Heavy Value-Add', value: '2.50x+' },
          ]
        }
      case 'rtv':
        return {
          title: 'Rent-to-Value (RTV) Ratio',
          value: calc.rtv != null ? formatPct(calc.rtv) : '—',
          color: 'var(--pink)',
          formula: 'Monthly Rent ÷ Current Property Value = RTV',
          math: `${formatCurrency(calc.monthlyRent)} ÷ ${formatCurrency(prop.current_value ?? prop.purchase_price)} = ${calc.rtv ? (calc.rtv/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Monthly Rent (${formatCurrency(calc.monthlyRent)}): Your current lease rent or simulated monthly income input.`,
            `Current Value (${formatCurrency(prop.current_value ?? prop.purchase_price)}): The latest appraised or market value of the property.`
          ],
          meaning: "The RTV ratio is a quick-and-dirty tool for evaluating rental property performance. A higher RTV means more rent for every dollar of property value. While the '1% Rule' (RTV = 1.0%) is a famous industry benchmark, it is increasingly rare in high-appreciation or modern interest-rate environments.",
          benchmarks: [
            { label: 'The "1% Rule"', value: '1.0%+' },
            { label: 'Strong Rental Market', value: '0.7% – 0.9%' },
            { label: 'High Appreciation Market', value: 'Below 0.5%' },
          ]
        }
      case 'oer':
        return {
          title: 'Operating Expense Ratio (OER)',
          value: calc.oer != null ? formatPct(calc.oer) : '—',
          color: 'var(--red)',
          formula: 'Annual Operating Expenses ÷ Gross Operating Income',
          math: `${formatCurrency(calc.annualOpExp ?? 0)} ÷ ${formatCurrency(calc.annualRent ?? 0)} = ${calc.oer ? (calc.oer/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Annual Operating Expenses (${formatCurrency(calc.annualOpExp ?? 0)}): The annualized sum of Management, Maintenance, HOA, Insurance, and Taxes. It explicitly excludes the mortgage.`,
            `Gross Operating Income (${formatCurrency(calc.annualRent ?? 0)}): Your total potential annual revenue (Monthly Rent × 12).`
          ],
          meaning: "OER measures how lean your property runs. It shows what percentage of your rental income is vaporized by taxes, insurance, maintenance, property management, and HOAs before you even reach the mortgage. Because it excludes mortgage payments, it's a pure indicator of management efficiency.",
          benchmarks: [
            { label: 'Extremely Lean (Self-Managed / No HOA)', value: '25% – 35%' },
            { label: 'Industry Standard "50% Rule"', value: '45% – 50%' },
            { label: 'Very Heavy (High Taxes / Luxury HOA)', value: '55%+' },
          ]
        }
      case 'intensity':
        return {
          title: 'Expense Intensity',
          value: calc.expenseIntensity != null ? formatPct(calc.expenseIntensity) : '—',
          color: 'var(--orange)',
          formula: '(Management + Maintenance Costs) ÷ Gross Revenue = Intensity',
          math: `${formatCurrency(calc.mgmtTTM + (metrics?.maintenance_pct_ttm ?? 0) * calc.annualRent / 100)} ÷ ${formatCurrency(calc.annualRent)} = ${calc.expenseIntensity ? (calc.expenseIntensity/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Active Costs (${formatCurrency(calc.mgmtTTM + (metrics?.maintenance_pct_ttm ?? 0) * calc.annualRent / 100)}): The sum of Management Fees (${formatCurrency(calc.mgmtTTM)}) and estimated Maintenance/Repairs. These represent the "high-effort" expenses of property ownership.`,
            `Gross Revenue (${formatCurrency(calc.annualRent)}): Total potential annual rental income.`
          ],
          meaning: "Expense Intensity isolates the 'active' costs of running a property (management and maintenance) from the 'passive' costs (taxes, insurance, HOA). A high intensity score suggests the property is difficult to manage or physically deteriorating, which can eat up your time as well as your money.",
          benchmarks: [
            { label: 'Efficient / High Quality', value: 'Below 15%' },
            { label: 'Standard Managed Property', value: '15% – 22%' },
            { label: 'Distressed / Intensive', value: 'Above 25%' },
          ]
        }
      case 'adjCap':
      case 'adjusted-cap':
        return {
          title: 'Adjusted Cap Rate (w/ Reserves)',
          value: calc.adjustedCapRate != null ? formatPct(calc.adjustedCapRate) : '—',
          color: 'var(--indigo)',
          formula: '(NOI - 5% Capital Reserve) ÷ Property Value = Adjusted Cap Rate',
          math: `(${formatCurrency(calc.noi)} - ${formatCurrency(calc.annualRent * 0.05)}) ÷ ${formatCurrency(prop.current_value ?? prop.purchase_price)} = ${calc.adjustedCapRate ? (calc.adjustedCapRate/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `NOI (${formatCurrency(calc.noi)}): Your annualized Net Operating Income (Income - OpEx).`,
            `Capital Reserve (${formatCurrency(calc.annualRent * 0.05)}): A simulated 5% holdback from total rent for future major capital expenditures (Roof, HVAC, etc.).`,
            `Property Value (${formatCurrency(prop.current_value ?? prop.purchase_price)}): The current market or purchase valuation.`
          ],
          meaning: "Standard Cap Rates often produce overly optimistic projections by ignoring the eventual need for major repairs (roof, HVAC, etc.). The Adjusted Cap Rate forces a 5% 'Capital Reserve' into the math, creating a much more accurate reflection of the property's long-term distributable income.",
          benchmarks: [
            { label: 'Conservative Healthy Core', value: '4.5% – 6.0%' },
            { label: 'Marginal Performance', value: '3.0% – 4.5%' },
            { label: 'Value Traps', value: 'Below 2.5%' },
          ]
        }
      case 'dscr':
        return {
          title: 'Debt Service Coverage Ratio (DSCR)',
          value: calc.dscr != null ? calc.dscr.toFixed(2) : '—',
          color: calc.dscr && calc.dscr >= 1.25 ? 'var(--green)' : 'var(--orange)',
          formula: 'Annual Net Operating Income (NOI) ÷ Annual Debt Service = DSCR',
          math: `${formatCurrency(calc.noi)} ÷ ${formatCurrency(calc.annualDebtService)} = ${calc.dscr ? calc.dscr.toFixed(2) : '—'}`,
          mathBreakdown: [
            `NOI (${formatCurrency(calc.noi)}): Your gross annual rent minus operational expenses (HOA, management, maintenance). Excludes the mortgage itself.`,
            `Annual Debt Service (${formatCurrency(calc.annualDebtService)}): The total amount paid entirely sequentially to your mortgage in a year (Principal + Interest + Escrow).`
          ],
          meaning: "This ratio measures your buffer against default. A DSCR of 1.0 means your income exactly covers your mortgage. Anything above 1.0 is profit margin. Commercial lenders typically require at least a 1.25 DSCR to underwrite a loan, ensuring a 25% safety buffer.",
          benchmarks: [
            { label: 'Bankable (Standard)', value: '1.25x or higher' },
            { label: 'Aggressive / High Leverage', value: '1.10x – 1.24x' },
            { label: 'Underwater / Structurally Negative', value: 'Below 1.00x' },
          ]
        }
      case 'ltv':
        return {
          title: 'Loan-to-Value (LTV)',
          value: calc.ltv != null ? formatPct(calc.ltv) : '—',
          color: 'var(--blue)',
          formula: 'Remaining Loan Balance ÷ Current Property Value = LTV',
          math: `${formatCurrency(metrics?.remaining_loan_balance ?? prop.loan_amount)} ÷ ${formatCurrency(prop.current_value ?? prop.purchase_price)} = ${calc.ltv ? (calc.ltv/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Remaining Loan Balance (${formatCurrency(metrics?.remaining_loan_balance ?? prop.loan_amount)}): Your current mortgage balance (principal only).`,
            `Current Value (${formatCurrency(prop.current_value ?? prop.purchase_price)}): The current market appraisal or purchase price.`
          ],
          meaning: "LTV measures your leverage risk. A low LTV (like 50%) means you have a massive equity cushion; even a significant market crash won't put you underwater. A high LTV (85%+) means even a small price correction could leave you owing the bank more than the house is worth.",
          benchmarks: [
            { label: 'Ultra-Conservative', value: 'Below 50%' },
            { label: 'Standard Leveraged', value: '65% – 75%' },
            { label: 'Highly Leveraged', value: 'Above 85%' },
          ]
        }
      case 'debtYield':
      case 'debt-yield':
        return {
          title: 'Debt Yield',
          value: calc.debtYield != null ? formatPct(calc.debtYield) : '—',
          color: 'var(--teal)',
          formula: 'Annual NOI ÷ Loan Amount = Debt Yield',
          math: `${formatCurrency(calc.noi)} ÷ ${formatCurrency(prop.loan_amount)} = ${calc.debtYield ? (calc.debtYield/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Annual NOI (${formatCurrency(calc.noi)}): Your annualized Net Operating Income.`,
            `Loan Amount (${formatCurrency(prop.loan_amount)}): The original total borrowed amount from the bank.`
          ],
          meaning: "Debt Yield is the primary metric institutional lenders use because it ignores interest rates and amortization. It tells the bank how many years of property income it would take to recover their loan amount if they had to take the property back today. Lenders typically look for 8-10% to feel safe.",
          benchmarks: [
            { label: 'Institutional Grade', value: '10.0%+' },
            { label: 'Standard / Bankable', value: '8.0% – 10.0%' },
            { label: 'Riskier Entry', value: 'Below 7.0%' },
          ]
        }
      case 'ber':
      case 'breakeven-occupancy':
        return {
          title: 'Break-Even Occupancy Ratio',
          value: calc.breakEvenOccupancy != null ? formatPct(calc.breakEvenOccupancy) : '—',
          color: 'var(--teal)',
          formula: '(Annual Operating Expenses + Annual Debt Service) ÷ Gross Potential Rent',
          math: `(${formatCurrency(calc.annualOpExp ?? 0)} + ${formatCurrency(calc.annualDebtService ?? 0)}) ÷ ${formatCurrency(calc.annualRent ?? 0)} = ${calc.breakEvenOccupancy ? (calc.breakEvenOccupancy/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Total Carrying Cost (${formatCurrency((calc.annualOpExp ?? 0) + (calc.annualDebtService ?? 0))}): The annualized sum of all Operating Expenses (${formatCurrency(calc.annualOpExp ?? 0)}) plus all Mortgage/Debt payments (${formatCurrency(calc.annualDebtService ?? 0)}).`,
            `Gross Potential Rent (${formatCurrency(calc.annualRent ?? 0)}): The total possible annual revenue if the property stayed 100% occupied.`
          ],
          meaning: "This tells you exactly how bulletproof your investment is against vacancies. If your Break-Even Occupancy is 70%, that means 3 months out of the year the house can sit empty, and you still won't have to pull money out of your own pocket to pay the bank.",
          benchmarks: [
            { label: 'Bulletproof (Extremely Safe)', value: 'Below 65%' },
            { label: 'Standard Safe Target', value: '70% – 75%' },
            { label: 'Risky / Thin Margins', value: 'Above 85%' },
          ]
        }
      case 'sensitivity':
        return {
          title: 'Interest Sensitivity',
          value: calc.interestSensitivity != null ? `${calc.interestSensitivity.toFixed(1)}%` : '—',
          color: 'var(--red)',
          formula: '(1% Loan Amount Change) ÷ Current Annual Cash Flow',
          math: `(${formatCurrency(prop.loan_amount * 0.01)}) ÷ ${formatCurrency(calc.annualCF ?? 0)} = ${calc.interestSensitivity ? (calc.interestSensitivity/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Simulated Interest Hike (${formatCurrency(prop.loan_amount * 0.01)}): The estimated annual cost of a 1% increase in your interest rate, based on your original loan of ${formatCurrency(prop.loan_amount)}.`,
            `Current Annual Cash Flow (${formatCurrency(calc.annualCF ?? 0)}): Your current annualized operational profit.`
          ],
          meaning: "Interest sensitivity shows you how much your annual cash flow is at risk if interest rates were 1% higher. This is critical for thinking about variable rate loans or future refinances. If sensitivity is 50%, a 1% rate hike would swallow half of your profit.",
          benchmarks: [
            { label: 'Stable / Hedged', value: 'Below 20%' },
            { label: 'Moderate Risk', value: '25% – 50%' },
            { label: 'Extremely Sensitive', value: 'Above 75%' },
          ]
        }
      case 'capture':
        return {
          title: 'Equity Capture',
          value: calc.equityCapture != null ? formatPct(calc.equityCapture) : '—',
          color: 'var(--purple)',
          formula: '(Current Profit over Basis) ÷ Total Basis = Equity Capture',
          math: `(${formatCurrency((prop.current_value ?? prop.purchase_price) - (prop.purchase_price + prop.closing_costs))}) ÷ ${formatCurrency(prop.purchase_price + prop.closing_costs)} = ${calc.equityCapture ? (calc.equityCapture/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Unrealized Profit (${formatCurrency((prop.current_value ?? prop.purchase_price) - (prop.purchase_price + prop.closing_costs))}): Current Market Value (${formatCurrency(prop.current_value ?? prop.purchase_price)}) minus your total original cash basis (${formatCurrency(prop.purchase_price + prop.closing_costs)}).`,
            `Total Basis (${formatCurrency(prop.purchase_price + prop.closing_costs)}): The total purchase price plus original closing costs.`
          ],
          meaning: "Equity Capture is your 'unrealized ROI'. It shows how much you have increased the original capital you deployed, strictly through value growth and appreciation. It captures the gain you would lock in at the moment of sale.",
          benchmarks: [
            { label: 'Strong Buy (Locked Gain)', value: '10.0%+' },
            { label: 'Mature Investment', value: '30.0% – 50.0%' },
            { label: 'Grand Slam', value: '100%+' },
          ]
        }
      case 'shield':
        return {
          title: 'Tax Shield Impact',
          value: calc.taxShieldImpact != null ? formatPct(calc.taxShieldImpact) : '—',
          color: 'var(--indigo)',
          formula: 'Estimated Annual Depreciation ÷ Current NOI = Tax Shield',
          math: `${formatCurrency((prop.purchase_price * 0.8) / 27.5)} ÷ ${formatCurrency(calc.noi)} = ${calc.taxShieldImpact ? (calc.taxShieldImpact/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Annual Depreciation (${formatCurrency((prop.purchase_price * 0.8) / 27.5)}): IRS allows writing off the building value (estimated as 80% of purchase) over 27.5 years. This is a non-cash expense that reduces your taxable income.`,
            `Current NOI (${formatCurrency(calc.noi)}): Your annualized Net Operating Income.`
          ],
          meaning: "The IRS allows you to write off a portion of your building's value as an 'expense' (depreciation) even if the building is actually appreciating. Tax Shield Impact shows what percentage of your profit is offset by this paper loss, often making property income zero-tax or tax-negative.",
          benchmarks: [
            { label: 'Standard Shield', value: '30% – 50%' },
            { label: 'High Efficiency', value: 'Above 75%' },
            { label: 'Tax Free Income Zone', value: '100%+' },
          ]
        }
      case 'tcd':
      case 'cash-deployed':
        return {
          title: 'Total Cash Deployed',
          value: formatCurrency(calc.totalDeployed),
          color: 'var(--yellow)',
          formula: 'Down Payment + Total Closing Costs = Total Cash Deployed',
          math: `${formatCurrency(calc.downPayment)} + ${formatCurrency(prop.closing_costs)} = ${formatCurrency(calc.totalDeployed)}`,
          mathBreakdown: [
            `Down Payment (${formatCurrency(calc.downPayment)}): The upfront cash required by the bank. Calculated as Purchase Price (${formatCurrency(prop.purchase_price)}) minus original Loan Amount (${formatCurrency(prop.loan_amount)}).`,
            `Closing Costs (${formatCurrency(prop.closing_costs)}): Points, loan fees, title, and escrow costs paid at acquisition.`
          ],
          meaning: "This is your true 'skin in the game'. It's the total upfront, un-leveraged capital you wired to the title company on closing day. This number forms the denominator for nearly all return-on-investment calculations.",
          benchmarks: [
            { label: 'FHA / Primary Hustle', value: '3.5% – 5% down' },
            { label: 'Standard Investment Loan', value: '20% – 25% down' },
            { label: 'DSCR / Commercial Loan', value: '20% – 30% down' },
          ]
        }
      case 'ipr':
      case 'interest-ratio':
        return {
          title: 'Interest to Principal Ratio',
          value: calc.interestRatio != null ? `${calc.interestRatio.toFixed(2)} : 1` : '—',
          color: 'var(--orange)',
          formula: 'Total Interest Paid to Date ÷ Total Principal Paid to Date',
          math: `${formatCurrency(calc.totalInterestPaid)} ÷ ${formatCurrency(calc.totalPrincipalPaid)} = ${calc.interestRatio ? calc.interestRatio.toFixed(2) : '—'}`,
          mathBreakdown: [
            `Total Interest Paid (${formatCurrency(calc.totalInterestPaid)}): The sum of all historical interest payments made to the bank from acquisition to date.`,
            `Total Principal Paid (${formatCurrency(calc.totalPrincipalPaid)}): The total amount of actual debt reduced from the tenant's rental payments.`
          ],
          meaning: "A 30-year fixed mortgage is heavily front-loaded with interest. In the early years, you might pay $4 in interest for every $1 of principal you pay down. Over time, as the principal decreases, this ratio flips in your favor.",
          benchmarks: [
            { label: 'Years 1-5 (7% Rate)', value: 'approx 4.0 – 6.0 : 1' },
            { label: 'Years 15-20 (Midway)', value: 'approx 1.5 – 1.0 : 1' },
            { label: 'Years 25-30 (Payoff)', value: 'Sub 0.5 : 1' },
          ]
        }
      case 'cap-rate':
      case 'cap':
        return {
          title: 'Capitalization Rate (Cap Rate)',
          value: calc.capRate != null ? formatPct(calc.capRate) : '—',
          color: 'var(--blue)',
          formula: 'Annual Net Operating Income (NOI) ÷ Current Property Value = Cap Rate',
          math: `${formatCurrency(calc.noi)} ÷ ${formatCurrency(prop.current_value ?? prop.purchase_price)} = ${calc.capRate ? (calc.capRate/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `NOI (${formatCurrency(calc.noi)}): Your gross annual rent (${formatCurrency(calc.annualRent)}) minus your annualized operational expenses (${formatCurrency(calc.annualOpExp)}).`,
            `Operating Expenses (${formatCurrency(calc.annualOpExp)}): Includes annualized management fees + expected maintenance + annual HOA dues (${formatCurrency(prop.hoa_amount ?? 0)}). It explicitly EXCLUDES your mortgage payments.`,
            `Property Value (${formatCurrency(prop.current_value ?? prop.purchase_price)}): Utilizing the current estimated value, or falling back to the original purchase price if no estimate is provided.`
          ],
          meaning: "The Cap Rate indicates the unlevered yield of a property. By excluding your mortgage, it acts as a universal ruler to compare one property's operational profitability directly against another's, regardless of how they are financed.",
          benchmarks: [
            { label: 'Class A (Low Risk, Stable)', value: '4.0% – 5.5%' },
            { label: 'Class B (Average Risk)', value: '5.5% – 7.5%' },
            { label: 'Class C (Higher Risk)', value: '7.5% – 10.0%+' },
          ]
        }
      case 'principal-yield':
      case 'ppy':
        return {
          title: 'Principal Paydown Yield',
          value: calc.principalPaydownYield != null ? formatPct(calc.principalPaydownYield) : '—',
          color: 'var(--green)',
          formula: 'Annual Principal Paid ÷ Total Cash Deployed',
          math: `${formatCurrency(calc.annualPrincipal ?? 0)} ÷ ${formatCurrency(calc.totalDeployed)} = ${calc.principalPaydownYield ? (calc.principalPaydownYield/100).toFixed(4) : '—'}`,
          mathBreakdown: [
            `Annualized Principal (${formatCurrency(calc.annualPrincipal ?? 0)}): The estimated total principal reduction over 12 months, based on your mortgage amortization to date.`,
            `Total Cash Deployed (${formatCurrency(calc.totalDeployed)}): Your total original cash investment (Down Payment + Closing Costs).`
          ],
          meaning: "Principal paydown yield calculates the annualized return generated strictly by your debt amortization. Every mortgage payment reduces your debt and increases your equity—this metric treats that as a cash-equivalent yield.",
          benchmarks: [
            { label: 'Typical 30yr (Years 1-5)', value: '1.5% – 2.5%' },
            { label: 'Typical 30yr (Years 10-15)', value: '3.0% – 4.5%' },
            { label: '15yr Accelerator', value: '5.0%+' },
          ]
        }
      default:
        return null
    }
  }

  const details = getMetricDetails()
  if (!details) return <div className="empty-state" style={{ marginTop: 80 }}><p>Metric not found.</p></div>

  return (
    <main className="page-content" style={{ maxWidth: 800 }}>
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: 24, alignSelf: 'flex-start' }}>
        ← Back to Overview
      </button>

      <div className="card" style={{ padding: '40px', borderTop: `6px solid ${details.color}` }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: 8 }}>{details.title}</h1>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '3rem', color: details.color, marginBottom: 32 }}>
          {details.value}
        </div>

        <div style={{ marginBottom: 40 }}>
          <h3 className="section-title" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: 12 }}>What it tells you</h3>
          <p style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>{details.meaning}</p>
        </div>

        <div style={{ padding: '24px', background: 'var(--surface-1)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: 40 }}>
          <h3 className="section-title" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: 16 }}>The Calculation</h3>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 8 }}>{details.formula}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', padding: '16px', background: 'var(--surface-3)', borderRadius: 'var(--radius-md)', fontWeight: 600, marginBottom: details.mathBreakdown ? 20 : 0 }}>
            {details.math}
          </div>
          {details.mathBreakdown && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {details.mathBreakdown.map((txt, idx) => {
                const [boldPart, rest] = txt.split(/:(.+)/)
                return (
                  <div key={idx} style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: details.color, fontSize: '1.2rem', lineHeight: '1rem' }}>•</span>
                    <div>
                      {rest ? <><strong style={{ color: 'var(--text-muted)' }}>{boldPart}:</strong>{rest}</> : txt}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <h3 className="section-title" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: 16 }}>Industry Benchmarks</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {details.benchmarks.map((b, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--surface-3)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontWeight: 500 }}>{b.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{b.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
