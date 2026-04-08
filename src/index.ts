import type { ValueType, Endianness, ComparisonType, ScannerConfig } from '#types/Cheatscan.ts'
import { VALUE_TYPE, ENDIANNESS, ALIGNMENT, CMP } from '#src/constants.ts'
import { loadWasm } from '#src/wasm.ts'
const wasm = await loadWasm()
const e = wasm.exports


export class Cheatscan {
  #scanner: number
  #valueType: ValueType
  #endianness: Endianness
  #baseAddress: number

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
    // TODO: Check `config``
    // TODO: Check `initialBlock`
    this.#valueType = config.valueType
    this.#endianness = config.endianness
    this.#baseAddress = config.baseAddress ?? 0x0
    this.#scanner = Cheatscan.withBlock(initialBlock, (ptr, size) => {
      return e.cheatscan_new_from_unknown(
        VALUE_TYPE[this.#valueType],
        ENDIANNESS[this.#endianness],
        ALIGNMENT[config.alignment],
        this.#baseAddress,
        ptr,
        size,
        0
      )
    })
  }

  scan(nextBlock: Uint8Array, compare: ComparisonType, value: number): number {
    this.#ensureAlive()
    // TODO: Check `nextBlock`
    // TODO: Check `compare`
    // TODO: Check `value`
    const cmp = CMP[compare]
    return Cheatscan.withBlock(nextBlock, (ptr, size) => {
      switch (this.#valueType) {
        case 'u8':
          return e.cheatscan_scan_u8(this.#scanner, ptr, size, cmp, value)
        case 'u16':
          return e.cheatscan_scan_u16(this.#scanner, ptr, size, cmp, value)
        case 'u32':
          return e.cheatscan_scan_u32(this.#scanner, ptr, size, cmp, value)
        case 'i8':
          return e.cheatscan_scan_i8(this.#scanner, ptr, size, cmp, value)
        case 'i16':
          return e.cheatscan_scan_i16(this.#scanner, ptr, size, cmp, value)
        case 'i32':
          return e.cheatscan_scan_i32(this.#scanner, ptr, size, cmp, value)
        case 'f32':
          return e.cheatscan_scan_f32(this.#scanner, ptr, size, cmp, Math.fround(value))
      }
    })
  }


  scanPrevious(nextBlock: Uint8Array, compare: ComparisonType): number {
    this.#ensureAlive()
    // TODO: Check `block`
    // TODO: Check `compare`
    return Cheatscan.withBlock(nextBlock, (ptr, size) => {
      return e.cheatscan_scan_previous(
        this.#scanner,
        ptr,
        size,
        CMP[compare])
    })
  }

  scanAgain(compare: ComparisonType, value: number): number {
    this.#ensureAlive()
    // TODO: Check `compare`
    // TODO: Check `value`
    const cmp = CMP[compare]
    switch (this.#valueType) {
      case 'u8':
        return e.cheatscan_scan_again_u8(this.#scanner, cmp, value)
      case 'u16':
        return e.cheatscan_scan_again_u16(this.#scanner, cmp, value)
      case 'u32':
        return e.cheatscan_scan_again_u32(this.#scanner, cmp, value)
      case 'i8':
        return e.cheatscan_scan_again_i8(this.#scanner, cmp, value)
      case 'i16':
        return e.cheatscan_scan_again_i16(this.#scanner, cmp, value)
      case 'i32':
        return e.cheatscan_scan_again_i32(this.#scanner, cmp, value)
      case 'f32':
        return e.cheatscan_scan_again_f32(this.#scanner, cmp, Math.fround(value))
    }
  }

  count(): number {
    this.#ensureAlive()
    return e.cheatscan_count(this.#scanner)
  }

  results(offset: number | undefined, count: number | undefined): number[] {
    this.#ensureAlive()

    const total = e.cheatscan_count(this.#scanner)
    // No count, we take everything
    if (count === undefined)
      count = total
    // No offset, we start from zero
    if (offset === undefined)
      offset = 0
    if (offset < 0)
      throw new Error('Cannot use negative offset')
    if (count < 0)
      throw new Error('Cannot use negative count')
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
      return Array.from(view)
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
