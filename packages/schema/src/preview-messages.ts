import { z } from "zod";
import { Framework, StyleSystem } from "./frameworks";
import { GeneratedFiles } from "./files";

/** Host to preview iframe. */
export const RenderMessage = z.object({
  type: z.literal("render"),
  id: z.string().min(1),
  framework: Framework,
  style: StyleSystem,
  entry: z.string().min(1),
  files: GeneratedFiles,
});
export type RenderMessage = z.infer<typeof RenderMessage>;

export const PingMessage = z.object({ type: z.literal("ping"), id: z.string().min(1) });

export const HostToPreviewMessage = z.discriminatedUnion("type", [RenderMessage, PingMessage]);
export type HostToPreviewMessage = z.infer<typeof HostToPreviewMessage>;

/** Preview iframe to host. */
export const RenderedMessage = z.object({
  type: z.literal("rendered"),
  id: z.string(),
  timings: z.record(z.string(), z.number().nonnegative()),
});

export const CompileErrorMessage = z.object({
  type: z.literal("compileError"),
  id: z.string(),
  file: z.string().optional(),
  message: z.string(),
});

export const RuntimeErrorMessage = z.object({
  type: z.literal("runtimeError"),
  id: z.string(),
  message: z.string(),
});

export const SizeMessage = z.object({
  type: z.literal("size"),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
});

export const PongMessage = z.object({ type: z.literal("pong"), id: z.string() });

export const PreviewToHostMessage = z.discriminatedUnion("type", [
  RenderedMessage,
  CompileErrorMessage,
  RuntimeErrorMessage,
  SizeMessage,
  PongMessage,
]);
export type PreviewToHostMessage = z.infer<typeof PreviewToHostMessage>;
