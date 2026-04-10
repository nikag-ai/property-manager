import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProperty } from '../contexts/PropertyContext'
import { useTransactions, useActiveTags } from '../hooks/useData'
import { formatCurrency } from '../lib/utils'


import { TransactionTable } from '../components/ledger/TransactionTable'
import type { TransactionFilters } from '../lib/types'

const formatMonth = (m: string) => {
  const [yy, mm] = m.split('-')
  const date = new Date(Number(yy), Number(mm) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function Ledger() {
  const { activePropertyId: propId } = useProperty()
  const [searchParams, setSearchParams] = useSearchParams()

  const initMonth = searchParams.get('month') ?? ''
  const initTags  = searchParams.getAll('tag')
  const initSearch = searchParams.get('search') ?? ''

  const [filters, setFilters] = useState<TransactionFilters>({
    month: initMonth || undefined,
    tags: initTags.length > 0 ? initTags : undefined,
    search: initSearch || undefined
  })

  const [tagInput, setTagInput] = useState('')
  const includeClosingCosts = searchParams.get('allIn') !== 'false'



  // Sync URL -> state
  useEffect(() => {
    const m = searchParams.get('month')
    const s = searchParams.get('search')
    const urlTags = searchParams.getAll('tag')
    
    setFilters(f => ({ 
      ...f, 
      month: m || undefined,
      search: s || undefined,
      tags: urlTags.length > 0 ? urlTags : undefined
    }))
  }, [searchParams])

  // Sync filters -> URL 
  const updateUrl = (newFilters: TransactionFilters) => {
    setSearchParams(prev => {
      if (newFilters.month) prev.set('month', newFilters.month)
      else prev.delete('month')
      
      if (newFilters.search) prev.set('search', newFilters.search)
      else prev.delete('search')

      prev.delete('tag')
      newFilters.tags?.forEach(t => prev.append('tag', t))
      
      return prev
    }, { replace: true })
  }

  const { data: transactions = [], isLoading: txLoading } = useTransactions(propId, filters)
  const { data: availableTags = [] } = useActiveTags(propId)


  const handleAddTag = (tag: string) => {
    const cleanTag = tag.trim()
    if (!cleanTag) return
    if (filters.tags?.includes(cleanTag)) {
      setTagInput('')
      return
    }
    
    const newTags = [...(filters.tags || []), cleanTag]
    const next = { ...filters, tags: newTags }
    setFilters(next)
    updateUrl(next)
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    const newTags = filters.tags?.filter(t => t !== tag)
    const next = { ...filters, tags: newTags && newTags.length > 0 ? newTags : undefined }
    setFilters(next)
    updateUrl(next)
  }

  const displayTransactions = useMemo(() => {
    if (includeClosingCosts) return transactions

    return transactions
      .filter(tx => tx.tag_name !== 'Closing Costs' && tx.tag_name !== 'Down Payment')
  }, [transactions, includeClosingCosts])


  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '')

  return (
    <main className="page-content">
      <div className="section-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.25rem' }}>Full Ledger</h1>
      </div>


      <div className="card">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 120px' }}>
            <label className="form-label">Month</label>
            <input type="month" className="form-input" value={filters.month ?? ''}
              onChange={e => {
                const next = { ...filters, month: e.target.value || undefined }
                setFilters(next)
                updateUrl(next)
              }} />
          </div>

          <div className="form-group" style={{ flex: '1 1 200px', position: 'relative' }}>
            <label className="form-label">Tags</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Filter by tags…" 
              value={tagInput}
              list="tags-datalist"
              onChange={e => {
                const val = e.target.value
                setTagInput(val)
                // Auto-add if it exactly matches an available tag (selection from datalist)
                if (availableTags.includes(val)) {
                  handleAddTag(val)
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag(tagInput)
                }
              }}
            />
            <datalist id="tags-datalist">
              {availableTags.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>


          <div className="form-group" style={{ flex: '2 1 180px', minWidth: 200 }}>
            <label className="form-label">Search notes</label>
            <input type="text" className="form-input" placeholder="Search…" value={filters.search ?? ''}
              onChange={e => {
                const next = { ...filters, search: e.target.value || undefined }
                setFilters(next)
                updateUrl(next)
              }} />
          </div>

          {hasFilters && (
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => {
              setFilters({})
              setSearchParams({}, { replace: true })
            }}>Clear all</button>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, padding: '0 4px' }}>


          {hasFilters && (
            <>
              {filters.month && (
                <div className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 16, background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Month:</span>
                  <span style={{ fontWeight: 600 }}>{formatMonth(filters.month)}</span>
                  <button onClick={() => {
                    const next = { ...filters, month: undefined }
                    setFilters(next)
                    updateUrl(next)
                  }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>✕</button>
                </div>
              )}
              {filters.tags?.map(tag => (
                <div key={tag} className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 16, background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Tag:</span>
                  <span style={{ fontWeight: 600 }}>{tag}</span>
                  <button onClick={() => handleRemoveTag(tag)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>✕</button>
                </div>
              ))}
              {filters.search && (
                <div className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 16, background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Search:</span>
                  <span style={{ fontWeight: 600 }}>"{filters.search}"</span>
                  <button onClick={() => {
                    const next = { ...filters, search: undefined }
                    setFilters(next)
                    updateUrl(next)
                  }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>✕</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Summary Stats */}
        <div className="section-header" style={{ marginBottom: 16, background: 'var(--surface-2)', padding: '12px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', justifyContent: 'flex-start', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Income</span>
            <span style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(displayTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + (t.amount || 0), 0))}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Expenses</span>
            <span style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(Math.abs(displayTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + (t.amount || 0), 0)))}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 'auto', textAlign: 'right' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Net Flow</span>
            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(displayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0))}
            </span>
          </div>
        </div>

        <TransactionTable transactions={displayTransactions} isLoading={txLoading} />

      </div>
    </main>
  )
}
