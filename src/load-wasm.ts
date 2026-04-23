// src/wasm.ts
import type {
  CheatscanWasmInstance,
  CheatscanWasmExports
} from './types/CheatscanWasm.d.ts'

const isResponseLike = (value: unknown): value is Response => {
  return typeof Response !== 'undefined' && value instanceof Response
}

const instantiateFromResponse = async (
  response: Response,
  imports: WebAssembly.Imports
): Promise<WebAssembly.WebAssemblyInstantiatedSource> => {
  try {
    return await WebAssembly.instantiateStreaming(response, imports)
  } catch {
    const bytes = await response.arrayBuffer()
    return await WebAssembly.instantiate(bytes, imports)
  }
}

const instantiateFromFile = async (
  wasmUrl: URL,
  imports: WebAssembly.Imports
): Promise<WebAssembly.WebAssemblyInstantiatedSource> => {
  const { readFile } = await import('node:fs/promises')
  const bytes = await readFile(wasmUrl)
  return await WebAssembly.instantiate(bytes, imports)
}

export const loadWasm = async (
  imports: WebAssembly.Imports = {}
): Promise<CheatscanWasmInstance> => {
  const wasmUrl = new URL('./cheatscan.wasm', import.meta.url)

  try {
    if (typeof fetch === 'function') {
      const response = await fetch(wasmUrl)

      if (isResponseLike(response) && response.ok) {
        const { instance } = await instantiateFromResponse(response, imports)
        const exports = instance.exports as unknown as CheatscanWasmExports

        return {
          instance,
          exports,
          memory: exports.memory,
        }
      }
    }
  } catch {
    // Fallback handled below
  }

  const { instance } = await instantiateFromFile(wasmUrl, imports)
  const exports = instance.exports as unknown as CheatscanWasmExports

  return {
    instance,
    exports,
    memory: exports.memory,
  }
}
