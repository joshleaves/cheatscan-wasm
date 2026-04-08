export type ValueType = 'u8' | 'u16' | 'u32' | 'i8' | 'i16' | 'i32' | 'f32'
export type Endianness = 'little' | 'big'
export type Alignment = 'unaligned' | 'aligned'
export type ComparisonType = 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge'

export type ScannerConfig = {
  valueType: ValueType
  endianness: Endianness
  alignment: Alignment
  baseAddress?: number
}
