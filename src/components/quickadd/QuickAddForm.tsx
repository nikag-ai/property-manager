import { useForm } from 'react-hook-form'
import { useProperty } from '../../contexts/PropertyContext'
import { useCurrentMonthTransactions, useTags, useAddTransaction } from '../../hooks/useData'
import { formatCurrency } from '../../lib/utils'
import clsx from 'clsx'

interface FormValues {
  date: string
  amount: string
  tag_id: string
  notes: string
}


export function QuickAddForm() {
  const { activePropertyId: propId } = useProperty()
  const { data: tags = [] }          = useTags(propId)
  const { data: txns = [] }          = useCurrentMonthTransactions(propId)
  const addTx                        = useAddTransaction()

  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
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


  const incomeTags  = tags.filter(t => t.category === 'income')
  const expenseTags = tags.filter(t => t.category === 'expense')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
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

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
