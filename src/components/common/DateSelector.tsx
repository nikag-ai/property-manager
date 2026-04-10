import { useState, useRef, useEffect, useMemo } from 'react'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  parseISO,
  isValid
} from 'date-fns'
import { formatDate } from '../../lib/utils'

interface DateSelectorProps {
  label: string
  value: string
  min?: string
  max?: string
  align?: 'left' | 'right'
  onChange: (val: string) => void
}

export function DateSelector({ label, value, min, max, align = 'left', onChange }: DateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Use current value or today to initialize the calendar view month
  const initialDate = useMemo(() => {
    const d = value ? parseISO(value) : new Date()
    return isValid(d) ? d : new Date()
  }, [value])
  
  const [viewDate, setViewDate] = useState(initialDate)
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
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Sync viewDate when picker opens
  useEffect(() => {
    if (isOpen) {
      const d = value ? parseISO(value) : new Date()
      if (isValid(d)) setViewDate(d)
    }
  }, [isOpen, value])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate))
    const end = endOfWeek(endOfMonth(viewDate))
    return eachDayOfInterval({ start, end })
  }, [viewDate])

  const minDate = min ? parseISO(min) : null
  const maxDate = max ? parseISO(max) : null

  // Navigation constraints
  const prevMonthDisabled = useMemo(() => {
    if (!minDate) return false
    return isSameMonth(viewDate, minDate) || viewDate < minDate
  }, [viewDate, minDate])

  const nextMonthDisabled = useMemo(() => {
    if (!maxDate) return false
    return isSameMonth(viewDate, maxDate) || viewDate > maxDate
  }, [viewDate, maxDate])


  const handleSelect = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    onChange(dateStr)
    setIsOpen(false)
  }

  return (
    <div className="month-picker-container" ref={containerRef} onClick={() => setIsOpen(!isOpen)}>
      <div className="month-picker-display">
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{label}:</span>
        {value ? formatDate(value) : 'Select Date'}
      </div>

      {isOpen && (
        <div className={`month-picker-dropdown ${align === 'right' ? 'align-right' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="picker-header">
            <button 
              className="btn btn-ghost btn-sm" 
              type="button" 
              disabled={prevMonthDisabled}
              onClick={() => setViewDate(subMonths(viewDate, 1))}
            >
              &larr;
            </button>
            <span className="picker-year" style={{ fontSize: '0.9rem' }}>{format(viewDate, 'MMMM yyyy')}</span>
            <button 
              className="btn btn-ghost btn-sm" 
              type="button" 
              disabled={nextMonthDisabled}
              onClick={() => setViewDate(addMonths(viewDate, 1))}
            >
              &rarr;
            </button>
          </div>

          <div className="date-grid-header">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="date-grid-day-label">{d}</div>
            ))}
          </div>

          <div className="date-grid">
            {days.map((day, i) => {
              const isDisabled = (minDate && day < minDate) || (maxDate && day > maxDate)
              const isSelected = value && isSameDay(day, parseISO(value))
              const isToday = isSameDay(day, new Date())
              const inMonth = isSameMonth(day, viewDate)

              return (
                <button
                  key={i}
                  type="button"
                  className={`calendar-day ${isSelected ? 'active' : ''} ${isToday ? 'today' : ''} ${!inMonth ? 'other-month' : ''}`}
                  disabled={!!isDisabled}
                  onClick={() => handleSelect(day)}
                >

                  {format(day, 'd')}
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

