import { useEffect, useState } from 'react'

export const APP_TITLE = 'DoAide Code'

// What the browser tab says: working, a reply finished while you were in another tab, or just the name.
export function tabTitle(busy, unseen) {
  if (busy) return `● Working… · ${APP_TITLE}`
  if (unseen) return `✓ Reply ready · ${APP_TITLE}`
  return APP_TITLE
}

export default function useTabTitle(busy) {
  const [unseen, setUnseen] = useState(false)
  const [wasBusy, setWasBusy] = useState(busy)
  if (wasBusy !== busy) {
    setWasBusy(busy)
    if (wasBusy && !busy && document.hidden) setUnseen(true)
  }
  useEffect(() => {
    const seen = () => !document.hidden && setUnseen(false)
    document.addEventListener('visibilitychange', seen)
    return () => document.removeEventListener('visibilitychange', seen)
  }, [])
  useEffect(() => {
    document.title = tabTitle(busy, unseen)
  }, [busy, unseen])
}
