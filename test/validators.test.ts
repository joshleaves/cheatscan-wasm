import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import type { Alignment, ComparisonType, Endianness, ScannerConfig, ValueType } from '../src/types/Cheatscan.d.ts'
import {
  ensureComparisonType,
  ensureOptionalNonNegativeInteger,
  ensureScannerConfig,
  ensureUint8Array,
  ensureValueForType,
} from '../src/validators.ts'

const comparisonValues: ComparisonType[] = [
  'eq', '==',
  'ne', '!=',
  'lt', '<',
  'le', '<=',
  'gt', '>',
  'ge', '>='
]
const comparisonSet = new Set<string>(comparisonValues)
const valueTypes: ValueType[] = ['u8', 'u16', 'u32', 'i8', 'i16', 'i32', 'f32']
const endiannessValues: Endianness[] = ['little', 'big']
const alignmentValues: Alignment[] = ['unaligned', 'aligned']

const integerRanges: Record<Exclude<ValueType, 'f32'>, { min: number, max: number }> = {
  u8: { min: 0, max: 0xFF },
  u16: { min: 0, max: 0xFFFF },
  u32: { min: 0, max: 0xFFFFFFFF },
  i8: { min: -0x80, max: 0x7F },
  i16: { min: -0x8000, max: 0x7FFF },
  i32: { min: -0x80000000, max: 0x7FFFFFFF },
}

const scannerConfigArb = fc.record({
  valueType: fc.constantFrom(...valueTypes),
  endianness: fc.constantFrom(...endiannessValues),
  alignment: fc.constantFrom(...alignmentValues),
  baseAddress: fc.option(fc.integer({ min: 0, max: 0xFFFFFFFF }), { nil: undefined }),
})

describe('validators', () => {
  describe('ensureUint8Array', () => {
    it('accepts non-empty Uint8Array values and optional matching length', () => {
      fc.assert(fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 512 }),
        (buffer) => {
          expect(ensureUint8Array('nextBlock', buffer)).toBe(buffer)
          expect(ensureUint8Array('nextBlock', buffer, buffer.length)).toBe(buffer)
        }
      ), { numRuns: 150 })
    })

    it('rejects non-Uint8Array values', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(void 0),
          fc.bigInt(),
          fc.array(fc.integer()),
          fc.object()
        ),
        (value) => {
          expect(() => ensureUint8Array('nextBlock', value)).toThrow('nextBlock must be a Uint8Array')
        }
      ), { numRuns: 120 })
    })

    it('rejects empty arrays', () => {
      expect(() => ensureUint8Array('nextBlock', new Uint8Array())).toThrow('nextBlock cannot be empty')
    })

    it('rejects arrays of mismatched expected length', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 256 }),
        (size) => {
          expect(() => ensureUint8Array('nextBlock', new Uint8Array(size), size + 1)).toThrow(`nextBlock length must be exactly ${size + 1}`)
        }
      ), { numRuns: 60 })
    })
  })

  describe('ensureComparisonType', () => {
    it('accepts every allowed comparison token', () => {
      fc.assert(fc.property(
        fc.constantFrom(...comparisonValues),
        (cmp) => {
          expect(ensureComparisonType(cmp)).toBe(cmp)
        }
      ), { numRuns: 120 })
    })

    it('rejects invalid comparison values', () => {
      fc.assert(fc.property(
        fc.string().filter((value) => !comparisonSet.has(value)),
        (cmp) => {
          expect(() => ensureComparisonType(cmp)).toThrow('compare must be a valid comparison operator')
        }
      ), { numRuns: 120 })

      fc.assert(fc.property(
        fc.oneof(fc.integer(), fc.boolean(), fc.constant(void 0), fc.bigInt(), fc.object()),
        (cmp) => {
          expect(() => ensureComparisonType(cmp)).toThrow('compare must be a valid comparison operator')
        }
      ), { numRuns: 120 })
    })
  })

  describe('ensureValueForType', () => {
    it('accepts finite f32 values', () => {
      fc.assert(fc.property(
        fc.float({ min: -1_000_000, max: 1_000_000, noNaN: true }),
        (value) => {
          expect(ensureValueForType('f32', value)).toBe(value)
        }
      ), { numRuns: 120 })
    })

    it('rejects non-finite values for every type', () => {
      fc.assert(fc.property(
        fc.constantFrom(...valueTypes),
        fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
        (type, value) => {
          expect(() => ensureValueForType(type, value)).toThrow('value must be a finite number')
        }
      ), { numRuns: 120 })
    })

    for (const type of Object.keys(integerRanges) as Exclude<ValueType, 'f32'>[]) {
      const range = integerRanges[type]

      it(`accepts integers in range for ${type}`, () => {
        fc.assert(fc.property(
          fc.integer({ min: range.min, max: range.max }),
          (value) => {
            expect(ensureValueForType(type, value)).toBe(value)
          }
        ), { numRuns: 120 })
      })

      it(`rejects non-integers for ${type}`, () => {
        fc.assert(fc.property(
          fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true }).filter((value) => !Number.isInteger(value)),
          (value) => {
            expect(() => ensureValueForType(type, value)).toThrow('value must be an integer')
          }
        ), { numRuns: 120 })
      })

      it(`rejects out-of-range integers for ${type}`, () => {
        fc.assert(fc.property(
          fc.oneof(
            fc.integer({ min: range.min - 10_000, max: range.min - 1 }),
            fc.integer({ min: range.max + 1, max: range.max + 10_000 })
          ),
          (value) => {
            expect(() => ensureValueForType(type, value)).toThrow('value must be between')
          }
        ), { numRuns: 120 })
      })
    }
  })

  describe('ensureScannerConfig', () => {
    it('accepts valid ScannerConfig values', () => {
      fc.assert(fc.property(
        scannerConfigArb,
        (config) => {
          expect(ensureScannerConfig(config)).toEqual(config)
        }
      ), { numRuns: 150 })
    })

    it('rejects non-object inputs', () => {
      fc.assert(fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(void 0), fc.bigInt()),
        (value) => {
          expect(() => ensureScannerConfig(value)).toThrow('config must be an object')
        }
      ), { numRuns: 120 })
    })

    it('rejects invalid enum fields and invalid baseAddress', () => {
      fc.assert(fc.property(
        fc.string().filter((value) => !valueTypes.includes(value as ValueType)),
        (valueType) => {
          const config = {
            valueType,
            endianness: 'little',
            alignment: 'aligned',
          }

          expect(() => ensureScannerConfig(config)).toThrow('config.valueType is invalid')
        }
      ), { numRuns: 80 })

      fc.assert(fc.property(
        fc.string().filter((value) => !endiannessValues.includes(value as Endianness)),
        (endianness) => {
          const config = {
            valueType: 'u8',
            endianness,
            alignment: 'aligned',
          }

          expect(() => ensureScannerConfig(config)).toThrow('config.endianness is invalid')
        }
      ), { numRuns: 80 })

      fc.assert(fc.property(
        fc.string().filter((value) => !alignmentValues.includes(value as Alignment)),
        (alignment) => {
          const config = {
            valueType: 'u8',
            endianness: 'little',
            alignment,
          }

          expect(() => ensureScannerConfig(config)).toThrow('config.alignment is invalid')
        }
      ), { numRuns: 80 })

      fc.assert(fc.property(
        fc.double({ noNaN: true, min: -100_000, max: 100_000 }).filter((value) => !Number.isInteger(value)),
        (baseAddress) => {
          const config: ScannerConfig = {
            valueType: 'u8',
            endianness: 'little',
            alignment: 'aligned',
            baseAddress,
          }

          expect(() => ensureScannerConfig(config)).toThrow('config.baseAddress must be an integer')
        }
      ), { numRuns: 80 })

      fc.assert(fc.property(
        fc.integer({ min: -100_000, max: -1 }),
        (baseAddress) => {
          const config: ScannerConfig = {
            valueType: 'u8',
            endianness: 'little',
            alignment: 'aligned',
            baseAddress,
          }

          expect(() => ensureScannerConfig(config)).toThrow('config.baseAddress must be between 0 and 4294967295')
        }
      ), { numRuns: 80 })
    })
  })

  describe('ensureOptionalNonNegativeInteger', () => {
    it('accepts undefined and non-negative integers', () => {
      expect(ensureOptionalNonNegativeInteger('offset', void 0)).toBeUndefined()
      expect(ensureOptionalNonNegativeInteger('count', void 0)).toBeUndefined()

      fc.assert(fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        (value) => {
          expect(ensureOptionalNonNegativeInteger('offset', value)).toBe(value)
          expect(ensureOptionalNonNegativeInteger('count', value)).toBe(value)
        }
      ), { numRuns: 120 })
    })

    it('rejects non-finite, non-integer, and negative values', () => {
      fc.assert(fc.property(
        fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
        (value) => {
          expect(() => ensureOptionalNonNegativeInteger('offset', value)).toThrow('offset must be a finite number')
        }
      ), { numRuns: 60 })

      fc.assert(fc.property(
        fc.double({ min: -10_000, max: 10_000, noNaN: true }).filter((value) => !Number.isInteger(value)),
        (value) => {
          expect(() => ensureOptionalNonNegativeInteger('count', value)).toThrow('count must be an integer')
        }
      ), { numRuns: 80 })

      fc.assert(fc.property(
        fc.integer({ min: -10_000, max: -1 }),
        (value) => {
          expect(() => ensureOptionalNonNegativeInteger('offset', value)).toThrow('Cannot use negative offset')
          expect(() => ensureOptionalNonNegativeInteger('count', value)).toThrow('Cannot use negative count')
        }
      ), { numRuns: 80 })
    })
  })
})
