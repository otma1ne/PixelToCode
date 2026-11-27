import { z } from "zod";

export const FRAMEWORKS = ["angular", "react", "vue", "html"] as const;
export const Framework = z.enum(FRAMEWORKS);
export type Framework = z.infer<typeof Framework>;

export const STYLE_SYSTEMS = ["css", "scss", "tailwind"] as const;
export const StyleSystem = z.enum(STYLE_SYSTEMS);
export type StyleSystem = z.infer<typeof StyleSystem>;

/**
 * Framework and style combinations the product supports.
 * Plain HTML has no build step, so it cannot use SCSS or Tailwind.
 */
const SUPPORTED: Record<Framework, readonly StyleSystem[]> = {
  angular: ["css", "scss", "tailwind"],
  react: ["css", "scss", "tailwind"],
  vue: ["css", "scss", "tailwind"],
  html: ["css"],
};

export function isSupportedCombination(framework: Framework, style: StyleSystem): boolean {
  return SUPPORTED[framework].includes(style);
}

export function supportedStyles(framework: Framework): readonly StyleSystem[] {
  return SUPPORTED[framework];
}

/** File extensions each framework may produce. */
export const ALLOWED_EXTENSIONS: Record<Framework, readonly string[]> = {
  angular: [".ts", ".html", ".css", ".scss", ".md", ".json"],
  react: [".tsx", ".ts", ".css", ".scss", ".md", ".json"],
  vue: [".vue", ".ts", ".css", ".scss", ".md", ".json"],
  html: [".html", ".css", ".js", ".md"],
};
