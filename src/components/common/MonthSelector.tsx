import { useState, useRef, useEffect } from 'react'
import { monthNames, formatMonthLabel } from '../../lib/utils'

interface MonthSelectorProps {
  label: string
  value: string
  min?: string
  max?: string
  align?: 'left' | 'right'
  onChange: (val: string) => void
}

export function MonthSelector({ label, value, min, max, align = 'left', onChange }: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
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

  const currentMonth = value ? parseInt(value.split('-')[1]) : null
  const currentYear = value ? parseInt(value.split('-')[0]) : null

  const minYear = min ? parseInt(min.split('-')[0]) : 2000
  const minMonth = min ? parseInt(min.split('-')[1]) : 1
  const maxYear = max ? parseInt(max.split('-')[0]) : new Date().getFullYear()
  const maxMonth = max ? parseInt(max.split('-')[1]) : 12

  const handleSelect = (mIdx: number) => {
    const monthStr = String(mIdx + 1).padStart(2, '0')
    onChange(`${viewYear}-${monthStr}`)
    setIsOpen(false)
  }

  return (
    <div className="month-picker-container" ref={containerRef} onClick={() => setIsOpen(!isOpen)}>

      <div className="month-picker-display">
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{label}:</span>
        {formatMonthLabel(value)}
      </div>


      {isOpen && (
        <div className={`month-picker-dropdown ${align === 'right' ? 'align-right' : ''}`} onClick={e => e.stopPropagation()}>

          <div className="picker-header">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setViewYear(v => v - 1)} disabled={viewYear <= minYear}>&larr;</button>
            <span className="picker-year">{viewYear}</span>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setViewYear(v => v + 1)} disabled={viewYear >= maxYear}>&rarr;</button>
          </div>
          <div className="month-grid">
            {monthNames.map((name, idx) => {
              const monthNum = idx + 1
              const isDisabled = (viewYear === minYear && monthNum < minMonth) || (viewYear === maxYear && monthNum > maxMonth)
              const isActive = currentYear === viewYear && currentMonth === monthNum
              return (
                <button 
                  key={name} 
                  type="button"
                  className={`month-btn${isActive ? ' active' : ''}`}
                  disabled={isDisabled}
                  onClick={() => handleSelect(idx)}
                >
                  {name}
                </button>
              )
            })}
          </div>
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
