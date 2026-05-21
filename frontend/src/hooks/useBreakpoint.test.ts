import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { useBreakpoint, BREAKPOINTS } from './useBreakpoint'

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
  window.dispatchEvent(new Event('resize'))
}

describe('useBreakpoint', () => {
  afterEach(() => {
    setWidth(1024)
  })

  it('isMobile is true when width < 768', () => {
    setWidth(375)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.isMobile).toBe(true)
  })

  it('isMobile is false when width >= 768', () => {
    setWidth(768)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.isMobile).toBe(false)
  })

  it('isMobile is false on desktop width', () => {
    setWidth(1440)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.isMobile).toBe(false)
  })

  it('updates when window is resized', () => {
    setWidth(1440)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.isMobile).toBe(false)

    act(() => setWidth(375))
    expect(result.current.isMobile).toBe(true)
  })

  it('removes resize listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useBreakpoint())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('BREAKPOINTS.mobile is 768', () => {
    expect(BREAKPOINTS.mobile).toBe(768)
  })
})
