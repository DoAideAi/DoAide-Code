import { useCallback, useEffect, useRef, useState } from 'react'

const MUTED_KEY = 'doaide-code-muted'

function loadMuted() {
  try {
    const v = localStorage.getItem(MUTED_KEY)
    // Default to muted
    return v === null ? true : v === 'true'
  } catch {
    return true
  }
}

function saveMuted(muted) {
  try {
    localStorage.setItem(MUTED_KEY, String(muted))
  } catch {
    // Ignore storage errors.
  }
}

// Generate a pleasant two-tone notification using Web Audio API.
function playTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const now = ctx.currentTime

    // First tone: a gentle high note
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now) // A5
    gain1.gain.setValueAtTime(0.08, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.15)

    // Second tone: a slightly lower note for a pleasant ding
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1174.66, now + 0.08) // D6
    gain2.gain.setValueAtTime(0, now)
    gain2.gain.setValueAtTime(0.06, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.3)

    // Cleanup
    setTimeout(() => ctx.close(), 500)
  } catch {
    // Web Audio API not available.
  }
}

export default function useNotificationSound() {
  const [muted, setMuted] = useState(loadMuted)
  const prevStatus = useRef(null)

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      saveMuted(next)
      return next
    })
  }, [])

  // Play sound when a task transitions from streaming to done/error/stopped
  const checkAndPlay = useCallback(
    (messages) => {
      if (muted || !messages.length) return
      const last = messages[messages.length - 1]
      if (last.role !== 'assistant') return
      const wasStreaming = prevStatus.current === 'streaming'
      const isDone = last.status === 'done' || last.status === 'error' || last.status === 'stopped'
      if (wasStreaming && isDone) {
        playTone()
      }
      prevStatus.current = last.status
    },
    [muted],
  )

  return { muted, toggleMute, checkAndPlay }
}
