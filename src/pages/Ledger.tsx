import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProperty } from '../contexts/PropertyContext'
import { useTransactions, useActiveTags } from '../hooks/useData'

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
  const [includeClosingCosts, setIncludeClosingCosts] = useState(false)

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
      .map(tx => {
        if (!tx.breakdown) return tx
        const opLines = tx.breakdown.filter(line => line.label !== 'Principal')
        const opAmount = opLines.reduce((sum, line) => sum + (line.amount || 0), 0)
        return {
          ...tx,
          amount: tx.amount < 0 ? -opAmount : opAmount,
          breakdown: opLines
        }
      })
  }, [transactions, includeClosingCosts])

  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '')

  return (
    <main className="page-content">
      <div className="section-header" style={{ marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.25rem' }}>Full Ledger</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 'auto', background: 'var(--surface-2)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>All-in Mode</span>
          <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 34, height: 20 }}>
            <input type="checkbox" checked={includeClosingCosts} onChange={e => setIncludeClosingCosts(e.target.checked)} 
              style={{ opacity: 0, width: 0, height: 0 }} />
            <span className="slider" style={{ 
              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
              backgroundColor: includeClosingCosts ? 'var(--purple)' : '#ccc', transition: '.2s', borderRadius: 20 
            }}>
              <span style={{ 
                position: 'absolute', content: '""', height: 14, width: 14, left: includeClosingCosts ? 17 : 3, bottom: 3, 
                backgroundColor: 'white', transition: '.2s', borderRadius: '50%' 
              }} />
            </span>
          </label>
        </div>
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
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Filter by tags…" 
                value={tagInput}
                list="tags-datalist"
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag(tagInput)
                  }
                }}
              />
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => handleAddTag(tagInput)}
                title="Add tag filter"
              >
                ✓
              </button>
            </div>
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

        {/* Active Filter Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, padding: '0 4px' }}>
          {!includeClosingCosts && (
            <div className="badge" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 16, background: 'rgba(147, 51, 234, 0.1)', border: '1px solid var(--purple)', color: 'var(--purple)', fontSize: '0.8125rem' }}>
              <span style={{ fontWeight: 600 }}>Operational View</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>(Excl. Principal & Acquisition)</span>
              <button 
                onClick={() => setIncludeClosingCosts(true)} 
                title="Show all costs"
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', color: 'var(--purple)', fontWeight: 800 }}>✕</button>
            </div>
          )}

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

        <TransactionTable transactions={displayTransactions} isLoading={txLoading} />
      </div>
    </main>
  )
}
