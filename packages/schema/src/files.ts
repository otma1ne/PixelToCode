import { z } from "zod";
import { ALLOWED_EXTENSIONS, type Framework } from "./frameworks";

export const MAX_FILES = 12;
const SEGMENT = /^[A-Za-z0-9._-]+$/;

export type PathProblem =
  | "empty"
  | "absolute"
  | "parent_segment"
  | "invalid_segment"
  | "extension_not_allowed";

/** Returns null when the path is safe for the framework, or the first problem found. */
export function checkPath(path: string, framework: Framework): PathProblem | null {
  if (path.length === 0) return "empty";
  if (path.startsWith("/") || path.startsWith("\\") || /^[A-Za-z]:/.test(path)) return "absolute";
  const segments = path.split("/");
  for (const segment of segments) {
    if (segment === ".." || segment === ".") return "parent_segment";
    if (!SEGMENT.test(segment)) return "invalid_segment";
  }
  const name = segments[segments.length - 1] ?? "";
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  if (!ALLOWED_EXTENSIONS[framework].includes(ext)) return "extension_not_allowed";
  return null;
}

export const GeneratedFile = z.object({
  path: z.string().min(1).max(200),
  content: z.string().max(200_000),
});
export type GeneratedFile = z.infer<typeof GeneratedFile>;

export const GeneratedFiles = z.array(GeneratedFile).min(1).max(MAX_FILES);
