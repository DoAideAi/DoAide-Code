// Plain-language explanations for failures, so people see what happened and what to do, not a
// raw tool error. The raw text stays available under "Technical details".

// Most specific first: the first match explains the failure.
const FAILURES = [
  {
    test: /laptop is offline|laptop disconnected/i,
    summary: 'Your laptop went offline before this finished.',
    hint: 'When DoAide is running on your laptop again, press Retry.',
  },
  {
    test: /rate.?limit|\b429\b|usage limit|quota|overloaded|\b529\b/i,
    summary: 'The model is busy or has reached its usage limit.',
    hint: 'Wait a minute and press Retry, or type /models to use another model.',
  },
  {
    test: /not logged in|log in|authenticat|unauthori[sz]ed|\b401\b|invalid api key/i,
    summary: 'A model on your laptop is not signed in.',
    hint: 'Sign in to it on your laptop (for example `claude auth login`), then press Retry.',
  },
  {
    test: /ollama is not reachable|ollama request failed|connecterror|connection refused/i,
    summary: 'Ollama is not running on your laptop.',
    hint: 'Start it with `ollama serve`, or type /models to see which models are available.',
  },
  {
    test: /timed out/i,
    summary: 'The model took too long and was stopped.',
    hint: 'Press Retry, or ask for a smaller piece of the task.',
  },
  {
    test: /cannot start|no such file|command not found/i,
    summary: 'A model’s command-line tool is not installed on your laptop.',
    hint: 'Type /models to see what was detected and how to set it up.',
  },
]
const ALL_FAILED = /^all executors failed/i
// Longer error text is a partial answer cut short, shown as it is.
const MAX_RAW = 1500

// { summary, hint, details } for a failed reply whose text is a tool error, else null.
export function explainFailure(content) {
  const text = (content ?? '').trim()
  if (!text || (text.length > MAX_RAW && !ALL_FAILED.test(text))) return null
  const known = FAILURES.find((f) => f.test.test(text))
  if (known) return { summary: known.summary, hint: known.hint, details: text }
  if (ALL_FAILED.test(text)) {
    return {
      summary: 'None of the models could answer this.',
      hint: 'Press Retry, or type /models to check what is set up on your laptop.',
      details: text,
    }
  }
  return null
}

// The message for a failed request to DoAide's server: its own explanation when it gave one.
export function requestError(status, detail) {
  if (typeof detail === 'string' && detail.trim()) return detail
  if (status === 401) return 'Your sign-in has expired. Reload the page to sign in again.'
  if (status === 403) return 'This account is not allowed to do that.'
  if (status === 404) return 'That was not found. It may have been deleted.'
  if (status === 429) return 'Too many requests. Wait a moment and try again.'
  if (status >= 500) return `DoAide’s server had a problem (${status}). Try again in a moment.`
  return `The request failed (${status}). Try again.`
}

export const OFFLINE_ERROR = 'Can’t reach DoAide. Check your connection and try again.'
