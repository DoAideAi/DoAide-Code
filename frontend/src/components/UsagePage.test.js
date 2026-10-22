import { describe, expect, it } from 'vitest'
import { costShare, taskStats } from './UsagePage.jsx'

describe('taskStats', () => {
  it('totals tasks, cost per model, average response time and escalation rate', () => {
    const s = taskStats([
      { model: 'sonnet', cost_usd: 0.1, response_time_seconds: 30, escalated: true },
      { model: 'sonnet', cost_usd: 0.02, response_time_seconds: 10, escalated: false },
      { model: 'qwen2.5-coder:7b', cost_usd: 0, response_time_seconds: 2, escalated: false },
      { executor: 'direct', cost_usd: 0, response_time_seconds: null, escalated: false },
    ])
    expect(s.tasks).toBe(4)
    expect(s.cost_usd).toBeCloseTo(0.12)
    expect(s.avg_seconds).toBeCloseTo(14) // the untimed task is left out, not counted as 0
    expect(s.escalation_rate).toBe(0.25)
    expect(s.by_model.map((m) => [m.model, m.tasks, m.avg_seconds])).toEqual([
      ['sonnet', 2, 20],
      ['qwen2.5-coder:7b', 1, 2],
      ['direct', 1, null],
    ])
  })

  it('handles no tasks', () => {
    expect(taskStats([])).toEqual({ tasks: 0, cost_usd: 0, avg_seconds: null, escalation_rate: 0, by_model: [] })
  })
})

describe('costShare', () => {
  it('is the part of the total cost, and 0 when everything was free', () => {
    expect(costShare(0.05, 0.2)).toBe(0.25)
    expect(costShare(0, 0)).toBe(0)
    expect(costShare(undefined, 1)).toBe(0)
  })
})
