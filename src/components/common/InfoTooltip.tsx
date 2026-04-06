import React from 'react'

interface InfoTooltipProps {
  content: React.ReactNode
}

export function InfoTooltip({ content }: InfoTooltipProps) {
  return (
    <span className="info-tooltip-wrap">
      <span className="info-tooltip-btn" aria-label="More info">?</span>
      <span className="info-tooltip-box" role="tooltip">{content}</span>
    </span>
  )
}
