import { describe, expect, it } from 'vitest'
import { escapeLike } from './escapeLike'

describe('escapeLike', () => {
  it('leaves plain text alone', () => {
    expect(escapeLike('john d')).toBe('john d')
  })

  it.each([
    ['%', '\\%'],
    ['_', '\\_'],
    ['\\', '\\\\'],
  ])('escapes %s so it matches itself', (input, expected) => {
    expect(escapeLike(input)).toBe(expected)
  })

  it('escapes every wildcard in a longer text', () => {
    expect(escapeLike('100%_off\\')).toBe('100\\%\\_off\\\\')
  })
})
