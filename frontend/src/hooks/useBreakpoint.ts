import { useEffect, useState } from 'react'

export const BREAKPOINTS = {
  mobile: 768,
} as const

export function useBreakpoint() {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return {
    isMobile: width < BREAKPOINTS.mobile,
  }
}
