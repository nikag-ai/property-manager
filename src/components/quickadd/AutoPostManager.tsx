import { useState } from 'react'
import { useProperty } from '../../contexts/PropertyContext'
import { useAutoPostRules, useTags, useAddAutoPostRule, useUpdateAutoPostRule, useDeleteAutoPostRule } from '../../hooks/useData'
import { formatCurrency } from '../../lib/utils'
import type { AutoPostRule } from '../../lib/types'
import { useForm } from 'react-hook-form'
import clsx from 'clsx'

interface RuleFormValues {
  label: string
  amount: string
  tag_id: string
  post_day: string
}

export function AutoPostManager() {
  const { activePropertyId: propId } = useProperty()
  const { data: rules = [], isLoading } = useAutoPostRules(propId)
  const { data: tags = [] } = useTags(propId)
  
  const addRule = useAddAutoPostRule()
  const updateRule = useUpdateAutoPostRule()
  const deleteRule = useDeleteAutoPostRule()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const { register, handleSubmit, reset, setValue } = useForm<RuleFormValues>()

  const onSave = async (data: RuleFormValues) => {
    if (!propId) return
    const tag = tags.find(t => t.id === data.tag_id)
    const payload = {
      property_id: propId,
      label: data.label,
      amount: parseFloat(data.amount),
      tag_id: data.tag_id,
      tag_name: tag?.name ?? '',
      post_day: parseInt(data.post_day),
      is_active: true,
      is_amortized: false,
      breakdown_template: null,
    }

    if (editingId) {
      await updateRule.mutateAsync({ id: editingId, patch: payload })
    } else {
      await addRule.mutateAsync(payload)
    }
    
    cancel()
  }

  const edit = (rule: AutoPostRule) => {
    setEditingId(rule.id)
    setIsAdding(true)
    setValue('label', rule.label)
    setValue('amount', String(rule.amount))
    setValue('tag_id', rule.tag_id)
    setValue('post_day', String(rule.post_day))
  }

  const cancel = () => {
    setEditingId(null)
    setIsAdding(false)
    reset()
  }

  if (!propId) return null

  return (
    <div className="card card-sm" style={{ marginTop: 24 }}>
      <div className="section-header" style={{ marginBottom: 16 }}>
        <h3 className="section-title">Manage Recurring Rules</h3>
        {!isAdding && (
          <button className="btn btn-secondary btn-sm" onClick={() => setIsAdding(true)}>
            + Add Rule
          </button>
        )}
      </div>

      {isAdding ? (
        <form onSubmit={handleSubmit(onSave)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input {...register('label', { required: true })} className="form-input" placeholder="e.g. HOA Fee" />
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input {...register('amount', { required: true })} type="number" step="0.01" className="form-input mono" placeholder="-150.00" />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Category (Tag)</label>
              <select {...register('tag_id', { required: true })} className="form-select">
                <option value="">Select tag</option>
                {tags.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Day of Month</label>
              <input {...register('post_day', { required: true, min: 1, max: 31 })} type="number" className="form-input" placeholder="1" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={addRule.isPending || updateRule.isPending}>
              {editingId ? 'Update Rule' : 'Create Rule'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>Cancel</button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isLoading ? (
            <div className="skeleton" style={{ height: 40 }} />
          ) : rules.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>No custom rules yet.</p>
          ) : (
            rules.filter(r => !r.is_amortized).map(rule => (
              <div key={rule.id} className="stat-row" style={{ padding: '8px 0', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{rule.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                     {rule.tag_name} • Monthly on day {rule.post_day}
                  </div>
                </div>
                <div className={clsx('td-mono', rule.amount >= 0 ? 'text-green' : 'text-red')} style={{ fontWeight: 600, marginRight: 16 }}>
                  {formatCurrency(rule.amount)}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => edit(rule)} style={{ padding: '4px 8px' }}>✎</button>
                  <button className="btn btn-ghost btn-sm text-red" onClick={() => deleteRule.mutate(rule.id)} style={{ padding: '4px 8px' }}>✕</button>
                </div>
              </div>
            ))
          )}
          
          {/* Amortized rules (read-only for clarity as they come from the schedule) */}
          {rules.filter(r => r.is_amortized).map(rule => (
            <div key={rule.id} className="stat-row" style={{ padding: '8px 0', alignItems: 'center', opacity: 0.8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{rule.label} <span style={{ color: 'var(--blue)', fontSize: '0.7rem' }}>⚡</span></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                   Managed via Loan Schedule
                </div>
              </div>
              <div className="td-mono text-muted" style={{ fontWeight: 600, marginRight: 16 }}>
                Amortized
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
