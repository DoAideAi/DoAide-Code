import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, PRESETS, animationShorthand, bezierPath, fullCss, keyframesCss, normalizeFrames, safeName, stopCss, timingFunction } from './animationTool.js'

describe('animation CSS', () => {
  it('writes transform and opacity declarations', () => {
    expect(stopCss({ x: 20, scale: 1.1, opacity: 0.5 })).toEqual(['transform: translateX(20px) scale(1.1);', 'opacity: 0.5;'])
    expect(stopCss({ x: 0, y: -40 })).toEqual(['transform: translateY(-40px);'])
    expect(stopCss({ x: 5, y: 5, rotate: 90 })).toEqual(['transform: translate(5px, 5px) rotate(90deg);'])
  })

  it('fills missing props with neutral values so stops interpolate', () => {
    const frames = normalizeFrames([{ at: 100, props: { rotate: 90 } }, { at: 0, props: { opacity: 0 } }])
    expect(frames).toEqual([
      { at: 0, props: { rotate: 0, opacity: 0 } },
      { at: 100, props: { rotate: 90, opacity: 1 } },
    ])
  })

  it('builds keyframes for a preset', () => {
    const css = keyframesCss(PRESETS.spin.frames, 'spin')
    expect(css).toBe('@keyframes spin {\n  0% {\n    transform: rotate(0deg);\n  }\n  100% {\n    transform: rotate(360deg);\n  }\n}')
  })

  it('writes timing functions', () => {
    expect(timingFunction({ easing: 'ease-in' })).toBe('ease-in')
    expect(timingFunction({ easing: 'ease-out-back' })).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)')
    expect(timingFunction({ easing: 'custom', bezier: [0.1, 0.2, 0.3, 0.4] })).toBe('cubic-bezier(0.1, 0.2, 0.3, 0.4)')
    expect(timingFunction({ easing: 'steps', steps: 5 })).toBe('steps(5, end)')
  })

  it('writes the shorthand and reduced-motion fallback', () => {
    expect(animationShorthand({ ...DEFAULT_SETTINGS, name: 'Fade In!' })).toBe('Fade-In 1s ease 0s infinite normal both')
    expect(fullCss(PRESETS['fade-in'].frames, DEFAULT_SETTINGS)).toContain('prefers-reduced-motion')
  })

  it('sanitizes names and draws curves', () => {
    expect(safeName('9lives')).toBe('anim-9lives')
    expect(safeName('  ')).toBe('anim-custom')
    expect(bezierPath([0, 0, 1, 1]).startsWith('M0.0,100.0')).toBe(true)
  })
})
