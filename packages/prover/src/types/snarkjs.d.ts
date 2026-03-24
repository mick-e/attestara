declare module 'snarkjs' {
  export namespace groth16 {
    function fullProve(
      inputs: Record<string, unknown>,
      wasmPath: string,
      zkeyPath: string,
    ): Promise<{ proof: unknown; publicSignals: string[] }>

    function verify(
      verificationKey: unknown,
      publicSignals: string[],
      proof: unknown,
    ): Promise<boolean>
  }
}
