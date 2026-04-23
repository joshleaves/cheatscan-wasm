import type { ValueType, Endianness, ComparisonType, ScannerConfig } from './types/Cheatscan.d.ts'
import { VALUE_TYPE, ENDIANNESS, ALIGNMENT, CMP } from './constants.ts'
import { loadWasm } from './load-wasm.ts'
import {
  ensureComparisonType,
  ensureOptionalNonNegativeInteger,
  ensureScannerConfig,
  ensureUint8Array,
  ensureValueForType,
} from './validators.ts'
const wasm = await loadWasm()
const e = wasm.exports

export class Cheatscan {
  #scanner: number
  #valueType: ValueType
  #endianness: Endianness
  #baseAddress: number
  #blockSize: number

  static withBlock(block: Uint8Array, fn: (ptr: number, size: number) => number): number {
    const size = block.length
    const ptr = e.cheatscan_ramblock_alloc(size)
    try {
      new Uint8Array(e.memory.buffer).set(block, ptr)

      return fn(ptr, size)
    } finally {
      e.cheatscan_ramblock_free(ptr, size)
    }
  }

  get valueType(): ValueType { return this.#valueType }
  get endianness(): Endianness { return this.#endianness }
  get baseAddress(): number { return this.#baseAddress }

  #ensureAlive(): void {
    if (this.#scanner === 0)
      throw new Error('Scanner has been freed')
  }

  constructor(config: ScannerConfig, initialBlock: Uint8Array) {
    const safeConfig = ensureScannerConfig(config)
    const safeInitialBlock = ensureUint8Array('initialBlock', initialBlock)

    this.#valueType = safeConfig.valueType
    this.#endianness = safeConfig.endianness
    this.#baseAddress = safeConfig.baseAddress ?? 0x0
    this.#blockSize = safeInitialBlock.length
    this.#scanner = Cheatscan.withBlock(safeInitialBlock, (ptr, size) => {
      return e.cheatscan_new_from_unknown(
        VALUE_TYPE[this.#valueType],
        ENDIANNESS[this.#endianness],
        ALIGNMENT[safeConfig.alignment],
        this.#baseAddress,
        ptr,
        size,
        0
      )
    })
  }

  scan(nextBlock: Uint8Array, compare: ComparisonType, value: number): number {
    this.#ensureAlive()
    const safeNextBlock = ensureUint8Array('nextBlock', nextBlock, this.#blockSize)

    const safeCompare = ensureComparisonType(compare)
    const safeValue = ensureValueForType(this.#valueType, value)
    const cmp = CMP[safeCompare]
    return Cheatscan.withBlock(safeNextBlock, (ptr, size) => {
      switch (this.#valueType) {
        case 'u8':
          return e.cheatscan_scan_u8(this.#scanner, ptr, size, cmp, safeValue)
        case 'u16':
          return e.cheatscan_scan_u16(this.#scanner, ptr, size, cmp, safeValue)
        case 'u32':
          return e.cheatscan_scan_u32(this.#scanner, ptr, size, cmp, safeValue)
        case 'i8':
          return e.cheatscan_scan_i8(this.#scanner, ptr, size, cmp, safeValue)
        case 'i16':
          return e.cheatscan_scan_i16(this.#scanner, ptr, size, cmp, safeValue)
        case 'i32':
          return e.cheatscan_scan_i32(this.#scanner, ptr, size, cmp, safeValue)
        case 'f32':
          return e.cheatscan_scan_f32(this.#scanner, ptr, size, cmp, Math.fround(safeValue))
      }
    })
  }


  scanPrevious(nextBlock: Uint8Array, compare: ComparisonType): number {
    this.#ensureAlive()
    const safeNextBlock = ensureUint8Array('nextBlock', nextBlock, this.#blockSize)
    const safeCompare = ensureComparisonType(compare)
    return Cheatscan.withBlock(safeNextBlock, (ptr, size) => {
      return e.cheatscan_scan_previous(
        this.#scanner,
        ptr,
        size,
        CMP[safeCompare])
    })
  }

  scanAgain(compare: ComparisonType, value: number): number {
    this.#ensureAlive()
    const safeCompare = ensureComparisonType(compare)
    const safeValue = ensureValueForType(this.#valueType, value)
    const cmp = CMP[safeCompare]
    switch (this.#valueType) {
      case 'u8':
        return e.cheatscan_scan_again_u8(this.#scanner, cmp, safeValue)
      case 'u16':
        return e.cheatscan_scan_again_u16(this.#scanner, cmp, safeValue)
      case 'u32':
        return e.cheatscan_scan_again_u32(this.#scanner, cmp, safeValue)
      case 'i8':
        return e.cheatscan_scan_again_i8(this.#scanner, cmp, safeValue)
      case 'i16':
        return e.cheatscan_scan_again_i16(this.#scanner, cmp, safeValue)
      case 'i32':
        return e.cheatscan_scan_again_i32(this.#scanner, cmp, safeValue)
      case 'f32':
        return e.cheatscan_scan_again_f32(this.#scanner, cmp, Math.fround(safeValue))
    }
  }

  count(): number {
    this.#ensureAlive()
    return e.cheatscan_count(this.#scanner)
  }

  results(offset?: number, count?: number): number[] {
    this.#ensureAlive()
    offset = ensureOptionalNonNegativeInteger('offset', offset)
    count = ensureOptionalNonNegativeInteger('count', count)

    const total = e.cheatscan_count(this.#scanner)
    // No count, we take everything
    if (count === undefined)
      count = total
    // No offset, we start from zero
    if (offset === undefined)
      offset = 0
    // No results, or big offset, early return
    if (total === 0 || offset >= total)
      return []
    // Clamp count to not overshoot
    if (offset + count > total)
      count = total - offset
    // No results to return, early return
    if (count === 0)
      return []

    const byteSize = count * 4
    const ptr = e.cheatscan_ramblock_alloc(byteSize)
    try {
      e.cheatscan_write_results(this.#scanner, ptr, count, offset)
      const view = new Uint32Array(e.memory.buffer, ptr, count)
      return [...view]
    } finally {
      e.cheatscan_ramblock_free(ptr, byteSize)
    }
  }

  [Symbol.dispose](): void {
    this.#ensureAlive()
    e.cheatscan_free(this.#scanner)
    this.#scanner = 0
  }
}
