import { describe, expect, it } from 'vitest'
import { CASES, countString, reverseString, slugify, splitWords } from './stringTool.js'

const convert = (label, text) => CASES.find(([l]) => l === label)[1](text)

describe('splitWords', () => {
  it('splits camelCase, snake_case and spaces alike', () => {
    expect(splitWords('getUserName')).toEqual(['get', 'User', 'Name'])
    expect(splitWords('get_user_name')).toEqual(['get', 'user', 'name'])
    expect(splitWords('Get user-name!')).toEqual(['Get', 'user', 'name'])
  })
  it('keeps acronym boundaries', () => {
    expect(splitWords('HTTPServerError')).toEqual(['HTTP', 'Server', 'Error'])
  })
})

describe('CASES', () => {
  it('converts to camelCase', () => {
    expect(convert('camelCase', 'hello world example')).toBe('helloWorldExample')
  })
  it('converts to PascalCase', () => {
    expect(convert('PascalCase', 'hello_world')).toBe('HelloWorld')
  })
  it('converts to snake_case', () => {
    expect(convert('snake_case', 'helloWorldExample')).toBe('hello_world_example')
  })
  it('converts to SCREAMING_SNAKE', () => {
    expect(convert('SCREAMING_SNAKE', 'hello world')).toBe('HELLO_WORLD')
  })
  it('converts to kebab-case', () => {
    expect(convert('kebab-case', 'Hello World')).toBe('hello-world')
  })
  it('converts to Title Case and Sentence case', () => {
    expect(convert('Title Case', 'hello wonderful world')).toBe('Hello Wonderful World')
    expect(convert('Sentence case', 'HELLO WONDERFUL WORLD')).toBe('Hello wonderful world')
  })
})

describe('slugify', () => {
  it('builds URL slugs', () => {
    expect(slugify('Hello, World! 2026 Edition')).toBe('hello-world-2026-edition')
  })
  it('folds accents away', () => {
    expect(slugify('Café à la crème')).toBe('cafe-a-la-creme')
  })
})

describe('reverseString', () => {
  it('reverses plain text', () => {
    expect(reverseString('abc')).toBe('cba')
  })
  it('keeps multi-codepoint characters whole', () => {
    expect(reverseString('a👍b')).toBe('b👍a')
  })
})

describe('countString', () => {
  it('counts chars, words, lines and bytes', () => {
    expect(countString('héllo world\nsecond line')).toEqual({ chars: 23, words: 4, lines: 2, bytes: 24 })
  })
  it('counts empty text as zero everything', () => {
    expect(countString('')).toEqual({ chars: 0, words: 0, lines: 0, bytes: 0 })
  })
})
