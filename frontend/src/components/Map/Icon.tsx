import React from 'react'

export const Icon: React.FC<{ path: string; size?: number }> = ({ path, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
)
