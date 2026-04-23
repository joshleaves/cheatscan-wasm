export const mockInstance = () => {
  const memory = new WebAssembly.Memory({ initial: 1 })

  return {
    instance: {
      exports: {
        memory,
      },
    } as unknown as WebAssembly.Instance,
    memory,
  }
}

export const mockInstantiatedSource = (instance: WebAssembly.Instance): WebAssembly.WebAssemblyInstantiatedSource => {
  return {
    instance,
    module: {} as WebAssembly.Module,
  }
}
