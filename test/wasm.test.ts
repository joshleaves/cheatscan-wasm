import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fc from 'fast-check'
import { mockInstance, mockInstantiatedSource } from './_utils.ts'

describe('loadWasm', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses instantiateStreaming when fetch returns OK', async () => {
    await fc.assert(fc.asyncProperty(
      fc.uint8Array({ minLength: 1, maxLength: 128 }),
      async (bytes) => {
        vi.restoreAllMocks()
        const response = new Response(bytes)
        const wasm = mockInstance()
        const instantiatedSource = mockInstantiatedSource(wasm.instance)

        vi.stubGlobal('fetch', vi.fn(() => response))
        const instantiateStreamingSpy = vi.spyOn(WebAssembly, 'instantiateStreaming').mockResolvedValue(instantiatedSource)
        const instantiateSpy = vi.spyOn(WebAssembly, 'instantiate')
        const { loadWasm } = await import('../src/load-wasm.ts')
        const loaded = await loadWasm()

        expect(instantiateStreamingSpy).toHaveBeenCalledOnce()
        expect(instantiateSpy).not.toHaveBeenCalled()
        expect(loaded.memory).toBe(wasm.memory)
      }
    ), { numRuns: 50 })
  })

  it('falls back to instantiate(bytes) if instantiateStreaming fails', async () => {
    await fc.assert(fc.asyncProperty(
      fc.uint8Array({ minLength: 1, maxLength: 128 }),
      fc.string({ minLength: 1, maxLength: 32 }),
      async (bytes, errorMessage) => {
        vi.restoreAllMocks()
        const response = new Response(bytes)
        const wasm = mockInstance()
        const instantiatedSource = mockInstantiatedSource(wasm.instance)

        vi.stubGlobal('fetch', vi.fn(() => response))
        vi.spyOn(WebAssembly, 'instantiateStreaming').mockRejectedValue(new Error(errorMessage))
        const instantiateSpy = vi.spyOn(WebAssembly, 'instantiate').mockImplementation(() => instantiatedSource as unknown as WebAssembly.Instance)
        const { loadWasm } = await import('../src/load-wasm.ts')

        await loadWasm()

        expect(instantiateSpy).toHaveBeenCalledOnce()
      }
    ), { numRuns: 50 })
  })
})
