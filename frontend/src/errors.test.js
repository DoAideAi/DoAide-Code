import { describe, expect, it } from 'vitest'
import { OFFLINE_ERROR, explainFailure, requestError } from './errors.js'

describe('explainFailure', () => {
  it.each([
    ['Your laptop is offline', /went offline/],
    ['[laptop disconnected before finishing]', /went offline/],
    ['All executors failed.\nclaude: claude exited with 1: Error: rate_limit_error', /usage limit/],
    ['All executors failed.\nclaude: Not logged in · Please run /login', /not signed in/],
    ['All executors failed.\nollama: Ollama request failed: ConnectError: [Errno 61] Connection refused', /Ollama is not running/],
    ['All executors failed.\ncodex: codex timed out after 600s', /took too long/],
    ['All executors failed.\ncannot start claude: [Errno 2] No such file or directory', /not installed/],
    ['All executors failed.\nsomething odd', /None of the models/],
  ])('%s', (raw, summary) => {
    const failure = explainFailure(raw)
    expect(failure.summary).toMatch(summary)
    expect(failure.hint).toBeTruthy()
    expect(failure.details).toBe(raw.trim())
  })

  it('leaves alone text that is not a known tool error, and long partial answers', () => {
    expect(explainFailure('')).toBeNull()
    expect(explainFailure(null)).toBeNull()
    expect(explainFailure('Here is half an answer about the parser')).toBeNull()
    expect(explainFailure(`${'A long partial answer. '.repeat(100)} then it timed out`)).toBeNull()
  })
})

describe('requestError', () => {
  it("keeps the server's own explanation", () => {
    expect(requestError(404, 'Session not found')).toBe('Session not found')
  })

  it('explains common statuses in plain words', () => {
    expect(requestError(401)).toMatch(/sign-in has expired/)
    expect(requestError(404)).toMatch(/not found/)
    expect(requestError(502)).toMatch(/server had a problem \(502\)/)
    expect(requestError(418)).toMatch(/failed \(418\)/)
    expect(OFFLINE_ERROR).toMatch(/Can’t reach DoAide/)
  })
})
