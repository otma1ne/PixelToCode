export interface RenderResult {
  timings: Record<string, number>;
}

/** An error in the generated code itself, shown to the user with its file. */
export class CompileError extends Error {
  constructor(
    message: string,
    readonly file?: string,
  ) {
    super(message);
  }
}
