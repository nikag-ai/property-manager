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
  isValid,
  setMonth,
  setYear,
  getYear,
  addYears,
  subYears
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

type ViewMode = 'calendar' | 'month' | 'year'

export function DateSelector({ label, value, min, max, align = 'left', onChange }: DateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  
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

  // Reset view mode when opening
  useEffect(() => {
    if (isOpen) {
      setViewMode('calendar')
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

  // Month Grid Data (Jan-Dec)
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  // Year Grid Data (Decade window)
  const yearRange = useMemo(() => {
    const startYear = Math.floor(getYear(viewDate) / 12) * 12
    return Array.from({ length: 12 }, (_, i) => startYear + i)
  }, [viewDate])

  // Navigation constraints
  const prevDisabled = useMemo(() => {
    if (!minDate) return false
    if (viewMode === 'calendar') return isSameMonth(viewDate, minDate) || viewDate < minDate
    if (viewMode === 'month') return getYear(viewDate) <= getYear(minDate)
    if (viewMode === 'year') return yearRange[0] <= getYear(minDate)
    return false
  }, [viewMode, viewDate, minDate, yearRange])

  const nextDisabled = useMemo(() => {
    if (!maxDate) return false
    if (viewMode === 'calendar') return isSameMonth(viewDate, maxDate) || viewDate > maxDate
    if (viewMode === 'month') return getYear(viewDate) >= getYear(maxDate)
    if (viewMode === 'year') return yearRange[11] >= getYear(maxDate)
    return false
  }, [viewMode, viewDate, maxDate, yearRange])

  const handleNav = (direction: 'prev' | 'next') => {
    if (viewMode === 'calendar') {
      setViewDate(direction === 'prev' ? subMonths(viewDate, 1) : addMonths(viewDate, 1))
    } else if (viewMode === 'month') {
      setViewDate(direction === 'prev' ? subYears(viewDate, 1) : addYears(viewDate, 1))
    } else {
      setViewDate(direction === 'prev' ? subYears(viewDate, 12) : addYears(viewDate, 12))
    }
  }

  const handleSelectDay = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'))
    setIsOpen(false)
  }

  const handleSelectMonth = (monthIdx: number) => {
    setViewDate(setMonth(viewDate, monthIdx))
    setViewMode('calendar')
  }

  const handleSelectYear = (year: number) => {
    setViewDate(setYear(viewDate, year))
    setViewMode('month')
  }

  const zoomOut = () => {
    if (viewMode === 'calendar') setViewMode('month')
    else if (viewMode === 'month') setViewMode('year')
  }

  const getHeaderTitle = () => {
    if (viewMode === 'calendar') return format(viewDate, 'MMMM yyyy')
    if (viewMode === 'month') return format(viewDate, 'yyyy')
    return `${yearRange[0]} - ${yearRange[11]}`
  }

  return (
    <div className="month-picker-container" ref={containerRef}>
      <div className="month-picker-display" onClick={() => setIsOpen(!isOpen)}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{label}:</span>
        {value ? formatDate(value) : 'Select Date'}
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
              onClick={zoomOut}
            >
              {getHeaderTitle()}
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

          {viewMode === 'calendar' && (
            <>
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
                      onClick={() => handleSelectDay(day)}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {viewMode === 'month' && (
            <div className="month-grid">
              {months.map((m, i) => {
                const targetDate = setMonth(viewDate, i)
                const isDisabled = (minDate && targetDate < startOfMonth(minDate)) || (maxDate && targetDate > endOfMonth(maxDate))
                const isSelected = value && isSameMonth(targetDate, parseISO(value)) && getYear(targetDate) === getYear(parseISO(value))
                
                return (
                  <button
                    key={m}
                    type="button"
                    className={`picker-cell ${isSelected ? 'active' : ''}`}
                    disabled={!!isDisabled}
                    onClick={() => handleSelectMonth(i)}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          )}

          {viewMode === 'year' && (
            <div className="year-grid">
              {yearRange.map(y => {
                const isDisabled = (minDate && y < getYear(minDate)) || (maxDate && y > getYear(maxDate))
                const isSelected = value && y === getYear(parseISO(value))
                
                return (
                  <button
                    key={y}
                    type="button"
                    className={`picker-cell ${isSelected ? 'active' : ''}`}
                    disabled={!!isDisabled}
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
