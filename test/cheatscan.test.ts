import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { Cheatscan } from '../src/index.ts'
import type { ComparisonType, ScannerConfig } from '../src/types/Cheatscan.d.ts'

const baseConfig: ScannerConfig = {
  valueType: 'u8',
  endianness: 'little',
  alignment: 'aligned',
  baseAddress: 0,
}

const compare = (cmp: ComparisonType, left: number, right: number): boolean => {
  switch (cmp) {
    case 'eq':
    case '==':
      return left === right
    case 'ne':
    case '!=':
      return left !== right
    case 'lt':
    case '<':
      return left < right
    case 'le':
    case '<=':
      return left <= right
    case 'gt':
    case '>':
      return left > right
    case 'ge':
    case '>=':
      return left >= right
  }
}

const allComparisons: ComparisonType[] = [
  'eq', '==',
  'ne', '!=',
  'lt', '<',
  'le', '<=',
  'gt', '>',
  'ge', '>='
]

const matchingAddresses = (
  values: Uint8Array,
  baseAddress: number,
  predicate: (value: number, index: number) => boolean
): number[] => {
  const out: number[] = []

  for (let idx = 0; idx < values.length; idx += 1) {
    if (predicate(values[idx] ?? 0, idx))
      out.push(baseAddress + idx)
  }

  return out
}

describe('Cheatscan (integration)', () => {
  it('scan() returns addresses matching the comparison against the provided value', () => {
    fc.assert(fc.property(
      fc.uint8Array({ minLength: 1, maxLength: 128 }),
      fc.uint8Array({ minLength: 1, maxLength: 128 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 1024 }),
      fc.constantFrom(...allComparisons),
      (initialBlock, nextBlock, value, baseAddress, cmp) => {
        const size = Math.min(initialBlock.length, nextBlock.length)
        const initial = initialBlock.slice(0, size)
        const next = nextBlock.slice(0, size)
        const scanner = new Cheatscan({ ...baseConfig, baseAddress }, initial)

        try {
          scanner.scan(next, cmp, value)
          const actual = scanner.results()
          const expected = matchingAddresses(next, baseAddress, (current) => compare(cmp, current, value))

          expect(scanner.count()).toBe(expected.length)
          expect(actual).toEqual(expected)
        } finally {
          scanner[Symbol.dispose]()
        }
      }
    ), { numRuns: 150 })
  })

  it('scanPrevious() compares next block values against previous snapshot values', () => {
    fc.assert(fc.property(
      fc.uint8Array({ minLength: 1, maxLength: 128 }),
      fc.uint8Array({ minLength: 1, maxLength: 128 }),
      fc.integer({ min: 0, max: 1024 }),
      fc.constantFrom(...allComparisons),
      (initialBlock, nextBlock, baseAddress, cmp) => {
        const size = Math.min(initialBlock.length, nextBlock.length)
        const initial = initialBlock.slice(0, size)
        const next = nextBlock.slice(0, size)
        const scanner = new Cheatscan({ ...baseConfig, baseAddress }, initial)

        try {
          scanner.scanPrevious(next, cmp)
          const actual = scanner.results()
          const expected = matchingAddresses(next, baseAddress, (current, idx) => compare(cmp, current, initial[idx] ?? 0))

          expect(actual).toEqual(expected)
        } finally {
          scanner[Symbol.dispose]()
        }
      }
    ), { numRuns: 150 })
  })

  it('scanAgain() narrows existing candidates against a second value comparison', () => {
    fc.assert(fc.property(
      fc.uint8Array({ minLength: 1, maxLength: 128 }),
      fc.uint8Array({ minLength: 1, maxLength: 128 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 1024 }),
      fc.constantFrom(...allComparisons),
      fc.constantFrom(...allComparisons),
      (initialBlock, nextBlock, firstValue, secondValue, baseAddress, firstCmp, secondCmp) => {
        const size = Math.min(initialBlock.length, nextBlock.length)
        const initial = initialBlock.slice(0, size)
        const next = nextBlock.slice(0, size)
        const scanner = new Cheatscan({ ...baseConfig, baseAddress }, initial)

        try {
          scanner.scan(next, firstCmp, firstValue)
          scanner.scanAgain(secondCmp, secondValue)

          const expected = matchingAddresses(next, baseAddress, (current) => {
            const keptByFirst = compare(firstCmp, current, firstValue)
            const keptBySecond = compare(secondCmp, current, secondValue)

            return keptByFirst && keptBySecond
          })

          expect(scanner.results()).toEqual(expected)
        } finally {
          scanner[Symbol.dispose]()
        }
      }
    ), { numRuns: 150 })
  })

  it('results(offset, count) behaves like a slice over current matches', () => {
    fc.assert(fc.property(
      fc.uint8Array({ minLength: 1, maxLength: 128 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 1024 }),
      fc.option(fc.integer({ min: 0, max: 256 }), { nil: undefined }),
      fc.option(fc.integer({ min: 0, max: 256 }), { nil: undefined }),
      (nextBlock, value, baseAddress, offset, count) => {
        const scanner = new Cheatscan({ ...baseConfig, baseAddress }, nextBlock)

        try {
          scanner.scan(nextBlock, 'eq', value)
          const full = matchingAddresses(nextBlock, baseAddress, (current) => current === value)

          const safeOffset = offset ?? 0
          const safeCount = count ?? full.length
          const expected = full.slice(safeOffset, safeOffset + safeCount)

          expect(scanner.results(offset, count)).toEqual(expected)
        } finally {
          scanner[Symbol.dispose]()
        }
      }
    ), { numRuns: 150 })
  })

  it('results() throws on negative offset/count and methods throw after dispose', () => {
    fc.assert(fc.property(
      fc.uint8Array({ minLength: 1, maxLength: 64 }),
      fc.integer({ min: -128, max: -1 }),
      fc.integer({ min: -128, max: -1 }),
      (block, negativeOffset, negativeCount) => {
        const scanner = new Cheatscan(baseConfig, block)

        expect(() => scanner.results(negativeOffset, 1)).toThrow('Cannot use negative offset')
        expect(() => scanner.results(0, negativeCount)).toThrow('Cannot use negative count')

        scanner[Symbol.dispose]()

        expect(() => scanner.count()).toThrow('Scanner has been freed')
      }
    ), { numRuns: 100 })
  })
})
