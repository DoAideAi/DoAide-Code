import { describe, expect, it } from 'vitest'
import { convertCss, convertDeclaration, splitValue } from './tailwindTool.js'

const c = (prop, value) => convertDeclaration(prop, value)

describe('convertDeclaration', () => {
  it('maps spacing to the scale or arbitrary values', () => {
    expect(c('padding', '16px')).toEqual(['p-4'])
    expect(c('padding', '8px 16px')).toEqual(['py-2', 'px-4'])
    expect(c('margin', '0 auto')).toEqual(['my-0', 'mx-auto'])
    expect(c('margin', '1px 2px 3px 4px')).toEqual(['mt-px', 'mr-0.5', 'mb-[3px]', 'ml-1'])
    expect(c('margin-top', '-8px')).toEqual(['-mt-2'])
    expect(c('margin-top', '-13px')).toEqual(['mt-[-13px]'])
    expect(c('padding', '1.5rem')).toEqual(['p-6'])
  })

  it('maps sizes and fractions', () => {
    expect(c('width', '100%')).toEqual(['w-full'])
    expect(c('width', '50%')).toEqual(['w-1/2'])
    expect(c('height', '100vh')).toEqual(['h-screen'])
    expect(c('width', '13px')).toEqual(['w-[13px]'])
    expect(c('max-width', '768px')).toEqual(['max-w-3xl'])
  })

  it('maps layout keywords', () => {
    expect(c('display', 'none')).toEqual(['hidden'])
    expect(c('flex-direction', 'column')).toEqual(['flex-col'])
    expect(c('justify-content', 'space-between')).toEqual(['justify-between'])
    expect(c('flex', '1')).toEqual(['flex-1'])
    expect(c('grid-template-columns', 'repeat(3, minmax(0, 1fr))')).toEqual(['grid-cols-3'])
    expect(c('gap', '12px 24px')).toEqual(['gap-y-3', 'gap-x-6'])
  })

  it('maps typography, colors, borders and effects', () => {
    expect(c('font-size', '14px')).toEqual(['text-sm'])
    expect(c('font-weight', '600')).toEqual(['font-semibold'])
    expect(c('line-height', '1.5')).toEqual(['leading-normal'])
    expect(c('color', '#fff')).toEqual(['text-white'])
    expect(c('background-color', 'rgb(30, 41, 59)')).toEqual(['bg-[rgb(30,_41,_59)]'])
    expect(c('border', '1px solid #e5e7eb')).toEqual(['border', 'border-[#e5e7eb]'])
    expect(c('border-bottom', '2px dashed red')).toEqual(['border-b-2', 'border-dashed', 'border-[red]'])
    expect(c('border-radius', '8px')).toEqual(['rounded-lg'])
    expect(c('border-radius', '9999px')).toEqual(['rounded-full'])
    expect(c('opacity', '0.5')).toEqual(['opacity-50'])
    expect(c('z-index', '50')).toEqual(['z-50'])
    expect(c('transition', 'all 0.2s ease-in-out')).toEqual(['transition-all', 'duration-200', 'ease-in-out'])
    expect(c('box-shadow', '0 1px 2px rgba(0,0,0,.1)')).toEqual(['shadow-[0_1px_2px_rgba(0,0,0,.1)]'])
  })

  it('falls back to arbitrary properties and keeps !important', () => {
    expect(c('mask-type', 'alpha')).toEqual(['[mask-type:alpha]'])
    expect(c('display', 'flex !important')).toEqual(['!flex'])
  })
})

describe('convertCss', () => {
  it('converts rules with hover, media and dark variants', () => {
    const rules = convertCss(`
      /* a button */
      .btn { display: inline-flex; padding: 8px 16px; border-radius: 6px; }
      .btn:hover { background-color: #1d4ed8; }
      @media (min-width: 768px) { .btn { padding: 12px 24px; } }
      @media (prefers-color-scheme: dark) { .btn { color: white; } }
      .card, .panel { margin: 0; }
    `)
    expect(rules.map((r) => r.selector)).toEqual(['.btn', '.card', '.panel'])
    expect(rules[0].classes).toEqual(['inline-flex', 'py-2', 'px-4', 'rounded-md', 'hover:bg-[#1d4ed8]', 'md:py-3', 'md:px-6', 'dark:text-white'])
    expect(rules[1].classes).toEqual(['m-0'])
  })

  it('converts bare declarations and ::before content', () => {
    expect(convertCss('color: black; font-weight: bold')[0].classes).toEqual(['text-black', 'font-bold'])
    expect(convertCss(".x::before { content: ''; position: absolute }")[0]).toEqual({ selector: '.x', classes: ["before:content-['']", 'before:absolute'] })
    expect(convertCss('  ')).toEqual([])
  })

  it('splits values outside parentheses', () => {
    expect(splitValue('1px solid rgb(0, 0, 0)')).toEqual(['1px', 'solid', 'rgb(0, 0, 0)'])
  })
})
