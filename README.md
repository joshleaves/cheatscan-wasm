# cheatscan-wasm

`cheatscan-wasm` is a WebAssembly (WASM) + TypeScript wrapper around the [cheatscan](https://github.com/joshleaves/cheatscan) engine written in Rust.

It exposes a low-level, predictable API for memory scanning in JavaScript environments (Node, Bun, browser), while keeping the core logic in Rust.

This package provides:

- a TypeScript API backed by WebAssembly
- a thin wrapper over the native `cheatscan` engine

This wrapper is designed for use in emulators, console tooling, and reverse engineering workflows.

## Features

- High-performance memory scanning via WASM
- Supports multiple types: `u8`, `u16`, `u32`, `i8`, `i16`, `i32`, `f32`
- Little-endian and big-endian reads
- Aligned and unaligned scans
- Exact-value and previous-value comparisons
- Incremental narrowing of candidate addresses
- Minimal allocations (initialization + results only)

## TypeScript / WASM API

The WASM wrapper provides a low-level but clean TypeScript interface over the core engine.

```ts
import { Cheatscan } from 'cheatscan-wasm'

const scan = new Cheatscan(config, initialBlock)

scan.scan(nextBlock, 'gt', 0)
scan.scanAgain('lt', 100)

const results = scan.results()
console.log(results.length)
```

### Notes

- All memory blocks are passed as `Uint8Array`
- Values are provided as JavaScript numbers and interpreted based on `valueType`
- The WASM layer handles memory allocation internally via temporary buffers
- The API mirrors the low-level engine closely and avoids hidden allocations

## Current Status

The WASM wrapper is stable for basic usage and intentionally mirrors the low-level engine. It does not hide memory management or add abstractions beyond what is necessary for JavaScript interop.

## License

This project is licensed under the MIT License.

See the `LICENSE` file for details.
