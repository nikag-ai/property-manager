import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProperty } from '../contexts/PropertyContext'
import { useTransactions, useActiveTags } from '../hooks/useData'
import { formatCurrency } from '../lib/utils'


import { TransactionTable } from '../components/ledger/TransactionTable'
import type { TransactionFilters } from '../lib/types'

const formatDate = (d: string) => {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric' 
  })
}


export default function Ledger() {
  const { activePropertyId: propId } = useProperty()
  const [searchParams, setSearchParams] = useSearchParams()

  const initFrom = searchParams.get('from') || ''
  const initTo   = searchParams.get('to') || ''
  const initTags = searchParams.getAll('tag')
  const initSearch = searchParams.get('search') || ''
  const initMonth = searchParams.get('month') // Legacy month param

  const [filters, setFilters] = useState<TransactionFilters>(() => {
    let from = initFrom
    let to = initTo

    // Handle legacy month param if present
    if (initMonth && !from && !to) {
      const [yy, mm] = initMonth.split('-')
      from = `${initMonth}-01`
      const lastDay = new Date(Number(yy), Number(mm), 0).getDate()
      to = `${initMonth}-${lastDay}`
    }

    return {
      date_from: from || undefined,
      date_to: to || undefined,
      tags: initTags.length > 0 ? initTags : undefined,
      search: initSearch || undefined
    }
  })

  const [tagInput, setTagInput] = useState('')
  const includeClosingCosts = searchParams.get('allIn') !== 'false'

  // Sync URL -> state on change
  useEffect(() => {
    const f = searchParams.get('from')
    const t = searchParams.get('to')
    const s = searchParams.get('search')
    const m = searchParams.get('month')
    const urlTags = searchParams.getAll('tag')
    
    setFilters(prev => {
      let from = f
      let to = t
      if (m && !f && !t) {
        const [yy, mm] = m.split('-')
        from = `${m}-01`
        to = `${m}-${new Date(Number(yy), Number(mm), 0).getDate()}`
      }
      return { 
        ...prev, 
        date_from: from || undefined,
        date_to: to || undefined,
        search: s || undefined,
        tags: urlTags.length > 0 ? urlTags : undefined
      }
    })
  }, [searchParams])


  // Sync filters -> URL 
  const updateUrl = (newFilters: TransactionFilters) => {
    setSearchParams(prev => {
      if (newFilters.date_from) prev.set('from', newFilters.date_from)
      else prev.delete('from')
      
      if (newFilters.date_to) prev.set('to', newFilters.date_to)
      else prev.delete('to')

      prev.delete('month') // Clean up legacy month param if it exists
      
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
    <main className="page-content page-content-full">

      <div className="section-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.25rem' }}>Full Ledger</h1>
      </div>


      <div className="card">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 240px' }}>
            <label className="form-label">Date Range</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="date" className="form-input" value={filters.date_from ?? ''}
                onChange={e => {
                  const next = { ...filters, date_from: e.target.value || undefined }
                  setFilters(next)
                  updateUrl(next)
                }} />
              <span style={{ color: 'var(--text-muted)' }}>–</span>
              <input type="date" className="form-input" value={filters.date_to ?? ''}
                onChange={e => {
                  const next = { ...filters, date_to: e.target.value || undefined }
                  setFilters(next)
                  updateUrl(next)
                }} />
            </div>
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
              {filters.date_from && (
                <div className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 16, background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>From:</span>
                  <span style={{ fontWeight: 600 }}>{formatDate(filters.date_from)}</span>
                  <button onClick={() => {
                    const next = { ...filters, date_from: undefined }
                    setFilters(next)
                    updateUrl(next)
                  }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>✕</button>
                </div>
              )}
              {filters.date_to && (
                <div className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 16, background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>To:</span>
                  <span style={{ fontWeight: 600 }}>{formatDate(filters.date_to)}</span>
                  <button onClick={() => {
                    const next = { ...filters, date_to: undefined }
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
