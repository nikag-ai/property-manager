import { useForm } from 'react-hook-form'
import { useProperty } from '../../contexts/PropertyContext'
import { useAutoPostRules, useCurrentMonthTransactions, useActiveLease, useTags, useAddTransaction, useCurrentAmortizationRow } from '../../hooks/useData'
import { formatCurrency } from '../../lib/utils'
import clsx from 'clsx'

interface FormValues {
  date: string
  amount: string
  tag_id: string
  notes: string
}

interface ChipDef {
  label: string
  amount: number
  tagName: string
  disabled: boolean
  breakdown?: { label: string; amount: number }[]
}

export function QuickAddForm() {
  const { activePropertyId: propId } = useProperty()
  const { data: tags = [] }          = useTags(propId)
  const { data: rules = [] }         = useAutoPostRules(propId)
  const { data: txns = [] }          = useCurrentMonthTransactions(propId)
  const activeLease                  = useActiveLease(propId)
  const currentAmortRow              = useCurrentAmortizationRow(propId)
  const addTx                        = useAddTransaction()

  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { date: today, amount: '', tag_id: '', notes: '' },
  })

  const onSubmit = async (data: FormValues) => {
    if (!propId) return
    const tag = tags.find(t => t.id === data.tag_id)
    await addTx.mutateAsync({
      property_id: propId,
      date:        data.date,
      amount:      parseFloat(data.amount),
      tag_id:      data.tag_id || null,
      tag_name:    tag?.name ?? '',
      notes:       data.notes || null,
    })
    reset({ date: today, amount: '', tag_id: '', notes: '' })
  }

  // Build suggestion chips

  // Rent income chip
  const suggestionChips: ChipDef[] = []
  const autoPostChips: ChipDef[] = []

  if (activeLease) {
    const alreadyPosted = txns.some(t => t.tag_name === 'Rent Income')
    suggestionChips.push({
      label:    `Rent Income  +${formatCurrency(activeLease.monthly_rent)}`,
      amount:   activeLease.monthly_rent,
      tagName:  'Rent Income',
      disabled: alreadyPosted,
    })
  }

  // Chips from auto-post rules
  for (const rule of rules) {
    const alreadyPosted = txns.some(t => t.auto_post_rule_id === rule.id || (rule.is_amortized && t.amortization_id === currentAmortRow?.id))
    if (rule.is_amortized && currentAmortRow) {
      const total = -(currentAmortRow.principal + currentAmortRow.interest + currentAmortRow.escrow)
      autoPostChips.push({
        label:    alreadyPosted ? `${rule.label}  (auto-posted ✓)` : `${rule.label}  ${formatCurrency(total)}`,
        amount:   total,
        tagName:  rule.tag_name,
        disabled: !!currentAmortRow.is_posted || alreadyPosted,
        breakdown: [
          { label: 'Principal', amount: currentAmortRow.principal },
          { label: 'Interest',  amount: currentAmortRow.interest },
          { label: 'Escrow',    amount: currentAmortRow.escrow },
        ],
      })
    } else {
      autoPostChips.push({
        label:    `${rule.label}  ${formatCurrency(rule.amount)}`,
        amount:   rule.amount,
        tagName:  rule.tag_name,
        disabled: alreadyPosted,
      })
    }
  }

  const fillFromChip = (chip: ChipDef) => {
    const tag = tags.find(t => t.name === chip.tagName)
    setValue('amount', String(chip.amount))
    if (tag) setValue('tag_id', tag.id)
  }

  const incomeTags  = tags.filter(t => t.category === 'income')
  const expenseTags = tags.filter(t => t.category === 'expense')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
      {/* Form */}
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>Add Transaction</h3>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="date">Date</label>
            <input id="date" type="date" className="form-input"
              {...register('date', { required: 'Date is required' })} />
            {errors.date && <span className="form-error">{errors.date.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              placeholder="e.g. 1895 or -170.55"
              className="form-input mono"
              {...register('amount', {
                required: 'Amount is required',
                validate: v => v !== '0' || 'Amount cannot be zero',
              })}
            />
            <span className="form-hint">Positive = income, negative = expense</span>
            {errors.amount && <span className="form-error">{errors.amount.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tag_id">Tag</label>
            <select id="tag_id" className="form-select" {...register('tag_id', { required: 'Tag is required' })}>
              <option value="">— Select tag —</option>
              <optgroup label="Income">
                {incomeTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </optgroup>
              <optgroup label="Expense">
                {expenseTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </optgroup>
            </select>
            {errors.tag_id && <span className="form-error">{errors.tag_id.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="notes">Notes</label>
            <input id="notes" type="text" className="form-input" placeholder="Optional description"
              {...register('notes')} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : '+ Add Transaction'}
          </button>
        </form>
      </div>

      {/* Chips sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {(suggestionChips.length > 0 || autoPostChips.length === 0) && (
          <div className="card card-sm">
            <div className="section-header" style={{ marginBottom: 12 }}>
              <h3 className="section-title">Quick Suggestions</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestionChips.length > 0 ? suggestionChips.map((chip, i) => (
                <button
                  key={i}
                  className={clsx('chip', chip.amount > 0 ? 'chip-income' : '')}
                  disabled={chip.disabled}
                  onClick={() => fillFromChip(chip)}
                  title={chip.disabled ? 'Already posted this month' : 'Click to fill form'}
                  style={{ justifyContent: 'space-between', textAlign: 'left' }}
                >
                  <span>{chip.label}</span>
                  {chip.disabled && <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>✓</span>}
                </button>
              )) : (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>No dynamic suggestions right now.</p>
              )}
            </div>
          </div>
        )}

        <div className="card card-sm">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h3 className="section-title">Automated Postings</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {autoPostChips.length === 0 ? (
               <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>No auto-post rules configured.</p>
            ) : autoPostChips.map((chip, i) => (
              <button
                key={i}
                className="chip"
                disabled={chip.disabled}
                onClick={() => fillFromChip(chip)}
                title={chip.disabled ? 'Already handled this month' : 'Click to manual-override & log now'}
                style={{ justifyContent: 'space-between', textAlign: 'left', borderColor: 'var(--blue-dim)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{chip.label}</span>
                  {!chip.disabled && <span style={{ color: 'var(--blue)', fontSize: '0.8rem' }}>⚡</span>}
                </div>
                {chip.disabled && <span style={{ fontSize: '0.7rem', opacity: 0.7, color: 'var(--blue)' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Current month txns */}
        <div className="card card-sm">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h3 className="section-title" style={{ fontSize: '0.875rem' }}>This Month</h3>
          </div>
          {txns.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>Nothing posted yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {txns.slice(0, 8).map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', gap: 8 }}>
                  <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.tag_name}
                    {t.is_auto_posted && <span style={{ color: 'var(--blue)', marginLeft: 4 }}>⚡</span>}
                  </span>
                  <span className={clsx('td-mono', t.amount > 0 ? 'text-green' : 'text-red')} style={{ fontWeight: 500, flexShrink: 0 }}>
                    {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
