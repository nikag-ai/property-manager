import React from 'react'

interface InfoTooltipProps {
  content: React.ReactNode
  children?: React.ReactNode
}

export function InfoTooltip({ content, children }: InfoTooltipProps) {
  return (
    <span className="info-tooltip-wrap">
      <span className="info-tooltip-btn" aria-label="More info">
        {children ?? '?'}
      </span>
      <span className="info-tooltip-box" role="tooltip">{content}</span>
    </span>
  )
}
