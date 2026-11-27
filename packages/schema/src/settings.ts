import { z } from "zod";
import { Framework, isSupportedCombination, StyleSystem } from "./frameworks";

export const MAX_INSTRUCTIONS_LENGTH = 500;

/** What the user chose before generating. The same schema validates the API request. */
export const GenerationSettings = z
  .object({
    framework: Framework,
    style: StyleSystem,
    instructions: z.string().max(MAX_INSTRUCTIONS_LENGTH),
  })
  .refine((s) => isSupportedCombination(s.framework, s.style), {
    message: "This framework and styling combination is not supported",
    path: ["style"],
  });
export type GenerationSettings = z.infer<typeof GenerationSettings>;

export const DEFAULT_SETTINGS: GenerationSettings = {
  framework: "angular",
  style: "scss",
  instructions: "",
};
