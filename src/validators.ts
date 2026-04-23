import { VALUE_TYPE, ENDIANNESS, ALIGNMENT, CMP } from './constants.ts'
import type { ComparisonType, ScannerConfig, ValueType } from './types/Cheatscan.d.ts'

export const ensureUint8Array = (name: string, value: unknown, expectedLength?: number): Uint8Array => {
  if (!(value instanceof Uint8Array))
    throw new Error(`${name} must be a Uint8Array`)
  if (value.length === 0)
    throw new Error(`${name} cannot be empty`)
  if (expectedLength !== undefined && value.length !== expectedLength)
    throw new Error(`${name} length must be exactly ${expectedLength}`)

  return value
}

const ensureFiniteNumber = (name: string, value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`${name} must be a finite number`)

  return value
}

const ensureInteger = (name: string, value: number): number => {
  if (!Number.isInteger(value))
    throw new Error(`${name} must be an integer`)

  return value
}

const ensureNumberInRange = (name: string, value: number, min: number, max: number): number => {
  if (value < min || value > max)
    throw new Error(`${name} must be between ${min} and ${max}`)

  return value
}

export const ensureComparisonType = (compare: unknown): ComparisonType => {
  if (typeof compare !== 'string' || !Object.hasOwn(CMP, compare))
    throw new Error('compare must be a valid comparison operator')

  return compare as ComparisonType
}

export const ensureValueForType = (valueType: ValueType, value: unknown): number => {
  const safeValue = ensureFiniteNumber('value', value)

  if (valueType === 'f32')
    return safeValue

  ensureInteger('value', safeValue)

  switch (valueType) {
    case 'u8':
      return ensureNumberInRange('value', safeValue, 0, 0xFF)
    case 'u16':
      return ensureNumberInRange('value', safeValue, 0, 0xFFFF)
    case 'u32':
      return ensureNumberInRange('value', safeValue, 0, 0xFFFFFFFF)
    case 'i8':
      return ensureNumberInRange('value', safeValue, -0x80, 0x7F)
    case 'i16':
      return ensureNumberInRange('value', safeValue, -0x8000, 0x7FFF)
    case 'i32':
      return ensureNumberInRange('value', safeValue, -0x80000000, 0x7FFFFFFF)
    default:
      return safeValue
  }
}

export const ensureScannerConfig = (config: unknown): ScannerConfig => {
  if (typeof config !== 'object' || config === null)
    throw new Error('config must be an object')

  const c = config as Partial<ScannerConfig>

  if (typeof c.valueType !== 'string' || !Object.hasOwn(VALUE_TYPE, c.valueType))
    throw new Error('config.valueType is invalid')
  if (typeof c.endianness !== 'string' || !Object.hasOwn(ENDIANNESS, c.endianness))
    throw new Error('config.endianness is invalid')
  if (typeof c.alignment !== 'string' || !Object.hasOwn(ALIGNMENT, c.alignment))
    throw new Error('config.alignment is invalid')

  if (c.baseAddress !== undefined) {
    const baseAddress = ensureFiniteNumber('config.baseAddress', c.baseAddress)

    ensureInteger('config.baseAddress', baseAddress)
    ensureNumberInRange('config.baseAddress', baseAddress, 0, 0xFFFFFFFF)
  }

  return c as ScannerConfig
}

export const ensureOptionalNonNegativeInteger = (name: 'offset' | 'count', value: number | undefined): number | undefined => {
  if (value === undefined)
    return undefined

  const safeValue = ensureFiniteNumber(name, value)

  ensureInteger(name, safeValue)
  if (safeValue < 0) {
    if (name === 'offset')
      throw new Error('Cannot use negative offset')

    throw new Error('Cannot use negative count')
  }

  return safeValue
}
