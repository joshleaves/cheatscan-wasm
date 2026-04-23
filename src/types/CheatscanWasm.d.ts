export interface CheatscanWasmInstance {
  instance: WebAssembly.Instance
  exports: CheatscanWasmExports
  memory: WebAssembly.Memory
}

export interface CheatscanWasmExports {
  memory: WebAssembly.Memory

  cheatscan_new_from_unknown: (
    valueType: number,
    endianness: number,
    alignment: number,
    baseAddress: number,
    initialBlockPtr: number,
    initialBlockLen: number,
    outErrorPtr: number
  ) => number

  cheatscan_new_from_known_u8: (
    valueType: number,
    endianness: number,
    alignment: number,
    baseAddress: number,
    initialBlockPtr: number,
    initialBlockLen: number,
    cmp: number,
    value: number,
    outErrorPtr: number
  ) => number

  cheatscan_scan_previous: (
    scannerPtr: number,
    nextBlockPtr: number,
    nextBlockLen: number,
    cmp: number
  ) => number

  cheatscan_scan_u8: (
    scannerPtr: number,
    nextBlockPtr: number,
    nextBlockLen: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_scan_u16: (
    scannerPtr: number,
    nextBlockPtr: number,
    nextBlockLen: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_scan_u32: (
    scannerPtr: number,
    nextBlockPtr: number,
    nextBlockLen: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_scan_i8: (
    scannerPtr: number,
    nextBlockPtr: number,
    nextBlockLen: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_scan_i16: (
    scannerPtr: number,
    nextBlockPtr: number,
    nextBlockLen: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_scan_i32: (
    scannerPtr: number,
    nextBlockPtr: number,
    nextBlockLen: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_scan_f32: (
    scannerPtr: number,
    nextBlockPtr: number,
    nextBlockLen: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_scan_again_u8: (
    scannerPtr: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_scan_again_u16: (
    scannerPtr: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_scan_again_u32: (
    scannerPtr: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_scan_again_i8: (
    scannerPtr: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_scan_again_i16: (
    scannerPtr: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_scan_again_i32: (
    scannerPtr: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_scan_again_f32: (
    scannerPtr: number,
    cmp: number,
    value: number
  ) => number

  cheatscan_count: (scannerPtr: number) => number

  cheatscan_write_results: (
    scannerPtr: number,
    outResultsPtr: number,
    outResultsLen: number,
    offset: number
  ) => number

  cheatscan_free: (scannerPtr: number) => void

  cheatscan_ramblock_alloc: (size: number) => number
  cheatscan_ramblock_free: (ptr: number, size: number) => void
}