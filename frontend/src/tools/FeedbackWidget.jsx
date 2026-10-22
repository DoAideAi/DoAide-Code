// "Was this tool helpful?" on every tool page. A thumb sends right away; a comment box then
// offers one optional follow-up. Anonymous, rate limited server-side, and never in the way:
// errors are swallowed into a quiet thanks, and the widget remembers per tool (per browser)
// that it already asked.

import { useState } from 'react'

const KEY = 'doaide-tool-feedback'

function alreadyThanked(tool) {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]').includes(tool)
  } catch {
    return false
  }
}

function rememberThanked(tool) {
  try {
    const seen = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    localStorage.setItem(KEY, JSON.stringify([...new Set([...seen, tool])]))
  } catch {
    // Storage may be unavailable; the widget just asks again next visit.
  }
}

async function send(tool, helpful, comment = '') {
  try {
    await fetch('/api/public/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, helpful, comment }),
    })
  } catch {
    // Feedback is best-effort; losing one vote is fine.
  }
}

const THUMB = 'flex min-h-[44px] items-center gap-1.5 rounded-md border border-zinc-800 px-3 text-sm text-zinc-300 hover:bg-zinc-900 sm:min-h-[36px]'

export default function FeedbackWidget({ tool }) {
  // 'ask' -> thumb clicked -> 'comment' -> 'done' (or straight to 'done' from storage).
  const [stage, setStage] = useState(() => (alreadyThanked(tool) ? 'done' : 'ask'))
  const [helpful, setHelpful] = useState(null)
  const [comment, setComment] = useState('')

  const vote = (isHelpful) => {
    setHelpful(isHelpful)
    send(tool, isHelpful)
    rememberThanked(tool)
    setStage('comment')
  }

  const submitComment = () => {
    if (comment.trim()) send(tool, helpful, comment.trim().slice(0, 500))
    setStage('done')
  }

  if (stage === 'done') {
    return (
      <p data-testid="feedback-done" className="text-xs text-zinc-500">
        Thanks for the feedback!
      </p>
    )
  }
  if (stage === 'comment') {
    return (
      <div data-testid="feedback-comment" className="flex flex-col gap-2">
        <p className="text-xs text-zinc-500">Thanks! Anything we should change?</p>
        <div className="flex gap-2">
          <label htmlFor="feedback-text" className="sr-only">
            Your feedback
          </label>
          <input
            id="feedback-text"
            data-testid="feedback-text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitComment()}
            maxLength={500}
            placeholder={helpful ? 'What worked well? (optional)' : 'What went wrong? (optional)'}
            className="min-h-[44px] w-full max-w-md rounded-md border border-zinc-800 bg-shade/40 px-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none sm:min-h-[36px]"
          />
          <button type="button" data-testid="feedback-send" onClick={submitComment} className={THUMB}>
            {comment.trim() ? 'Send' : 'Skip'}
          </button>
        </div>
      </div>
    )
  }
  return (
    <div data-testid="feedback-ask" className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-zinc-500">Was this tool helpful?</span>
      <button type="button" data-testid="feedback-yes" onClick={() => vote(true)} className={THUMB} aria-label="Yes, helpful">
        <span aria-hidden>👍</span> Yes
      </button>
      <button type="button" data-testid="feedback-no" onClick={() => vote(false)} className={THUMB} aria-label="No, not helpful">
        <span aria-hidden>👎</span> No
      </button>
    </div>
  )
}
