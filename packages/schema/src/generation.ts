import { z } from "zod";
import { GeneratedFile } from "./files";

/**
 * What the model must return. Kept free of optional fields and bounds so it maps
 * one-to-one to a strict JSON schema; limits are enforced afterwards by GenerationResult.
 */
export const ModelOutput = z.object({
  componentName: z
    .string()
    .describe("PascalCase name of the root component, for example InviteMembersCard"),
  summary: z.string().describe("One sentence describing what was built"),
  files: z
    .array(
      z.object({
        path: z.string().describe("Relative path with forward slashes"),
        content: z.string(),
      }),
    )
    .describe("Every source file of the component"),
  subcomponents: z.array(z.string()).describe("PascalCase names of extracted subcomponents"),
  dependencies: z
    .array(z.object({ name: z.string(), version: z.string() }))
    .describe("npm packages the files import, besides the framework itself"),
  assumptions: z
    .array(z.string())
    .describe("Things that could not be read from the screenshot and were decided"),
});
export type ModelOutput = z.infer<typeof ModelOutput>;

export const Dependency = z.object({ name: z.string(), version: z.string() });
export type Dependency = z.infer<typeof Dependency>;

export const Usage = z.object({
  inputTokens: z.number().int().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
});
export type Usage = z.infer<typeof Usage>;

/** A generation after validation and normalisation, as the browser receives it. */
export const GenerationResult = z.object({
  componentName: z.string().regex(/^[A-Z][A-Za-z0-9]*$/),
  summary: z.string().max(500),
  entry: z.string(),
  files: z.array(GeneratedFile).min(1).max(12),
  subcomponents: z.array(z.string()).max(12),
  dependencies: z.array(Dependency),
  removedDependencies: z.array(z.string()),
  assumptions: z.array(z.string().max(500)).max(20),
  durationMs: z.number().nonnegative(),
  usage: Usage,
});
export type GenerationResult = z.infer<typeof GenerationResult>;

export const GENERATION_STEPS = ["checks", "image", "model", "validate", "normalize"] as const;
export const GenerationStep = z.enum(GENERATION_STEPS);
export type GenerationStep = z.infer<typeof GenerationStep>;

export const STEP_LABELS: Record<GenerationStep, string> = {
  checks: "Checking limits",
  image: "Preparing screenshot",
  model: "Writing component",
  validate: "Validating files",
  normalize: "Checking paths and dependencies",
};

export const GENERATION_ERROR_CODES = [
  "invalid_request",
  "invalid_image",
  "origin_not_allowed",
  "limit_reached",
  "budget_exhausted",
  "not_configured",
  "model_timeout",
  "model_error",
  "invalid_output",
] as const;
export const GenerationErrorCode = z.enum(GENERATION_ERROR_CODES);
export type GenerationErrorCode = z.infer<typeof GenerationErrorCode>;

/** Server-sent events of POST /api/generate, one JSON object per event. */
export const GenerationEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("step"),
    step: GenerationStep,
    status: z.enum(["running", "done"]),
    ms: z.number().nonnegative().optional(),
  }),
  z.object({ type: z.literal("result"), result: GenerationResult }),
  z.object({
    type: z.literal("error"),
    code: GenerationErrorCode,
    message: z.string(),
    /** ISO time when a limit resets. */
    resetAt: z.string().optional(),
  }),
]);
export type GenerationEvent = z.infer<typeof GenerationEvent>;
