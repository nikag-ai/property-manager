import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { createPortal } from 'react-dom'
import { useProperty } from '../../contexts/PropertyContext'
import { useTags, useUpdateTransaction } from '../../hooks/useData'
import type { Transaction } from '../../lib/types'

interface TransactionEditModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
}

interface FormValues {
  date: string
  amount: number
  tag_id: string
  notes: string
}

export function TransactionEditModal({ isOpen, onClose, transaction }: TransactionEditModalProps) {
  const { activeProperty: prop } = useProperty()
  const propId = prop?.id ?? null

  const { data: tags = [] } = useTags(propId)
  const updateTx = useUpdateTransaction()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>()

  useEffect(() => {
    if (transaction) {
      reset({
        date: transaction.date,
        amount: transaction.amount,
        tag_id: transaction.tag_id || '',
        notes: transaction.notes || ''
      })
    }
  }, [transaction, reset])

  const onSubmit = async (data: FormValues) => {
    if (!transaction || !propId) return
    
    const tag = tags.find(t => t.id === data.tag_id)
    
    await updateTx.mutateAsync({
      id: transaction.id,
      propertyId: propId,
      patch: {
        date: data.date,
        amount: Number(data.amount),
        tag_id: data.tag_id || null,
        tag_name: tag?.name ?? '',
        notes: data.notes || null,
      }
    })
    
    onClose()
  }

  if (!isOpen || !transaction) return null

  const incomeTags  = tags.filter(t => t.category === 'income')
  const expenseTags = tags.filter(t => t.category === 'expense')

  return createPortal(
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2 style={{ fontSize: '1rem' }}>Edit Transaction</h2>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: '1.25rem' }} onClick={onClose}>
            &times;
          </button>
        </div>
        
        <div className="drawer-body">
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-date">Date</label>
              <input 
                id="edit-date" 
                type="date" 
                className="form-input"
                {...register('date', { required: 'Date is required' })} 
                min={prop?.purchase_date}
                max={new Date().toISOString().split('T')[0]}
              />

              {errors.date && <span className="form-error">{errors.date.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-amount">Amount</label>
              <input
                id="edit-amount"
                type="number"
                step="any"
                className="form-input mono"
                {...register('amount', {
                  required: 'Amount is required',
                  validate: v => v !== 0 || 'Amount cannot be zero',
                })}
              />
              <span className="form-hint">Positive = income, negative = expense</span>
              {errors.amount && <span className="form-error">{errors.amount.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-tag">Tag</label>
              <select 
                id="edit-tag" 
                className="form-select" 
                {...register('tag_id', { required: 'Tag is required' })}
              >
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
              <label className="form-label" htmlFor="edit-notes">Notes</label>
              <textarea 
                id="edit-notes" 
                className="form-textarea" 
                placeholder="Transaction details..."
                {...register('notes')} 
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
          
          {transaction.is_auto_posted && (
            <div style={{ marginTop: 32, padding: 16, background: 'var(--blue-dim)', border: '1px solid var(--blue)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--blue)', lineHeight: 1.4 }}>
                <strong>⚡ Auto-posted Record</strong><br />
                This transaction was generated automatically. Modifying it here will update this specific record, but won't change your recurring rules or loan schedule.
              </p>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
