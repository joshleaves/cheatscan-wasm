import type { Alignment, ComparisonType, Endianness, ValueType } from './types/Cheatscan.d.ts'

export const VALUE_TYPE = {
  u8: 0,
  u16: 1,
  u32: 2,
  i8: 3,
  i16: 4,
  i32: 5,
  f32: 6,
} as const satisfies Record<ValueType, number>

export const ENDIANNESS = {
  little: 0,
  big: 1,
} as const satisfies Record<Endianness, number>

export const ALIGNMENT = {
  unaligned: 0,
  aligned: 1,
} as const satisfies Record<Alignment, number>

export const CMP = {
  'eq': 0,
  '==': 0,
  'ne': 1,
  '!=': 1,
  'lt': 2,
  '<': 2,
  'le': 3,
  '<=': 3,
  'gt': 4,
  '>': 4,
  'ge': 5,
  '>=': 5,
} as const satisfies Record<ComparisonType, number>
