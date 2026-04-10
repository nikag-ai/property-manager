import { useState, useRef, useEffect, useMemo } from 'react'
import { monthNames, formatMonthLabel } from '../../lib/utils'

interface MonthSelectorProps {
  label: string
  value: string
  min?: string
  max?: string
  align?: 'left' | 'right'
  onChange: (val: string) => void
}

type ViewMode = 'month' | 'year'

export function MonthSelector({ label, value, min, max, align = 'left', onChange }: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [viewYear, setViewYear] = useState(value ? parseInt(value.split('-')[0]) : new Date().getFullYear())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Reset view mode and sync year when opening
  useEffect(() => {
    if (isOpen) {
      setViewMode('month')
      if (value) {
        setViewYear(parseInt(value.split('-')[0]))
      }
    }
  }, [isOpen, value])

  const currentMonth = value ? parseInt(value.split('-')[1]) : null
  const currentYear = value ? parseInt(value.split('-')[0]) : null

  const minYear = min ? parseInt(min.split('-')[0]) : 2000
  const minMonth = min ? parseInt(min.split('-')[1]) : 1
  const maxYear = max ? parseInt(max.split('-')[0]) : new Date().getFullYear()
  const maxMonth = max ? parseInt(max.split('-')[1]) : 12

  // Year Grid Data (Decade window)
  const yearRange = useMemo(() => {
    const startYear = Math.floor(viewYear / 12) * 12
    return Array.from({ length: 12 }, (_, i) => startYear + i)
  }, [viewYear])

  const prevDisabled = useMemo(() => {
    if (viewMode === 'month') return viewYear <= minYear
    return yearRange[0] <= minYear
  }, [viewMode, viewYear, minYear, yearRange])

  const nextDisabled = useMemo(() => {
    if (viewMode === 'month') return viewYear >= maxYear
    return yearRange[11] >= maxYear
  }, [viewMode, viewYear, maxYear, yearRange])

  const handleNav = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setViewYear(direction === 'prev' ? viewYear - 1 : viewYear + 1)
    } else {
      setViewYear(direction === 'prev' ? viewYear - 12 : viewYear + 12)
    }
  }

  const handleSelectMonth = (mIdx: number) => {
    const monthStr = String(mIdx + 1).padStart(2, '0')
    onChange(`${viewYear}-${monthStr}`)
    setIsOpen(false)
  }

  const handleSelectYear = (year: number) => {
    setViewYear(year)
    setViewMode('month')
  }

  return (
    <div className="month-picker-container" ref={containerRef}>
      <div className="month-picker-display" onClick={() => setIsOpen(!isOpen)}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{label}:</span>
        {formatMonthLabel(value)}
      </div>

      {isOpen && (
        <div className={`month-picker-dropdown ${align === 'right' ? 'align-right' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="picker-header">
            <button 
              className="btn btn-ghost btn-sm" 
              type="button" 
              disabled={prevDisabled}
              onClick={() => handleNav('prev')}
            >
              &larr;
            </button>
            <div 
              className="picker-year clickable-header" 
              style={{ fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => { if (viewMode === 'month') setViewMode('year') }}
            >
              {viewMode === 'month' ? viewYear : `${yearRange[0]} - ${yearRange[11]}`}
            </div>
            <button 
              className="btn btn-ghost btn-sm" 
              type="button" 
              disabled={nextDisabled}
              onClick={() => handleNav('next')}
            >
              &rarr;
            </button>
          </div>

          {viewMode === 'month' && (
            <div className="month-grid">
              {monthNames.map((name, idx) => {
                const monthNum = idx + 1
                const isDisabled = (viewYear === minYear && monthNum < minMonth) || (viewYear === maxYear && monthNum > maxMonth)
                const isActive = currentYear === viewYear && currentMonth === monthNum
                return (
                  <button 
                    key={name} 
                    type="button"
                    className={`picker-cell${isActive ? ' active' : ''}`}
                    disabled={isDisabled}
                    onClick={() => handleSelectMonth(idx)}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
          )}

          {viewMode === 'year' && (
            <div className="year-grid">
              {yearRange.map(y => {
                const isDisabled = y < minYear || y > maxYear
                const isSelected = y === currentYear
                return (
                  <button
                    key={y}
                    type="button"
                    className={`picker-cell ${isSelected ? 'active' : ''}`}
                    disabled={isDisabled}
                    onClick={() => handleSelectYear(y)}
                  >
                    {y}
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
            <button 
              type="button" 
              className="btn btn-ghost btn-sm" 
              style={{ fontSize: '0.75rem', color: 'var(--red)' }}
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
                setIsOpen(false)
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
