import { describe, expect, it } from 'vitest'
import { analyze, blankSkips, complexityBand, cyclomatic, maxNesting } from './complexityTool.js'

const JS = `// helper
function shipping(order, user) {
  if (!order) return null
  let total = 0
  for (const item of order.items) {
    if (item.fragile && user.intl) total += 50
    else total += 10
  }
  return user.prime ? 0 : total
}

const double = (n) => n * 2
`

const PY = `import os

def pick(items, key):
    # choose the first match
    for item in items:
        if item.key == key or item.alias == key:
            return item
    return None
`

describe('blankSkips', () => {
  it('blanks strings and comments but keeps newlines and code', () => {
    const out = blankSkips('a = "if x" // if y\nb = 2')
    expect(out).toContain('a = ')
    expect(out).not.toContain('if')
    expect(out.split('\n').length).toBe(2)
  })
})

describe('cyclomatic', () => {
  it('counts decision points plus one', () => {
    expect(cyclomatic('let a = 1')).toBe(1)
    expect(cyclomatic('if (a) {} else if (b && c) {}')).toBe(4) // if + if + &&
    expect(cyclomatic('x = a ? b : c')).toBe(2)
    expect(cyclomatic('if a and b: pass', { wordOps: true })).toBe(3)
  })

  it('ignores optional chaining', () => {
    expect(cyclomatic('a?.b ?? c')).toBe(2) // only the ??
  })
})

describe('maxNesting', () => {
  it('tracks brace depth and python indentation', () => {
    expect(maxNesting('{ { { } } }')).toBe(3)
    expect(maxNesting('def f():\n    for x in y:\n        if x:\n            pass', true)).toBe(3)
  })
})

describe('analyze', () => {
  it('reports line metrics and per-function complexity for JavaScript', () => {
    const report = analyze(JS)
    expect(report.commentLines).toBe(1)
    expect(report.blankLines).toBe(2) // the separator line and the trailing newline
    expect(report.codeLines).toBe(report.totalLines - 3)
    const shipping = report.functions.find((f) => f.name === 'shipping')
    // 1 + if + for + if + && + ternary
    expect(shipping.complexity).toBe(6)
    const double = report.functions.find((f) => f.name === 'double')
    expect(double.complexity).toBe(1)
    expect(report.functions[0].name).toBe('shipping') // sorted riskiest first
  })

  it('reads python defs by indentation and counts and/or', () => {
    const report = analyze(PY)
    const pick = report.functions.find((f) => f.name === 'pick')
    // 1 + for + if + or
    expect(pick.complexity).toBe(4)
    expect(report.maxNesting).toBeGreaterThanOrEqual(2)
  })

  it('bands scores for the UI', () => {
    expect(complexityBand(3).tone).toBe('good')
    expect(complexityBand(8).tone).toBe('ok')
    expect(complexityBand(15).tone).toBe('warn')
    expect(complexityBand(25).tone).toBe('bad')
  })
})
