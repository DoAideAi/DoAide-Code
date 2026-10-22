import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useNotificationSound from './useNotificationSound.js'

afterEach(() => {
  localStorage.clear()
})

describe('useNotificationSound', () => {
  it('defaults to muted', () => {
    const { result } = renderHook(() => useNotificationSound())
    expect(result.current.muted).toBe(true)
  })

  it('toggles mute state', () => {
    const { result } = renderHook(() => useNotificationSound())
    act(() => result.current.toggleMute())
    expect(result.current.muted).toBe(false)
    act(() => result.current.toggleMute())
    expect(result.current.muted).toBe(true)
  })

  it('persists mute state to localStorage', () => {
    const { result } = renderHook(() => useNotificationSound())
    act(() => result.current.toggleMute())
    expect(localStorage.getItem('doaide-code-muted')).toBe('false')
  })

  it('restores mute state from localStorage', () => {
    localStorage.setItem('doaide-code-muted', 'false')
    const { result } = renderHook(() => useNotificationSound())
    expect(result.current.muted).toBe(false)
  })

  it('does not crash when checkAndPlay is called with empty messages', () => {
    const { result } = renderHook(() => useNotificationSound())
    expect(() => act(() => result.current.checkAndPlay([]))).not.toThrow()
  })

  it('does not crash when checkAndPlay is called while muted', () => {
    const { result } = renderHook(() => useNotificationSound())
    const messages = [{ id: '1', role: 'assistant', content: 'done', status: 'done' }]
    expect(() => act(() => result.current.checkAndPlay(messages))).not.toThrow()
  })
})
