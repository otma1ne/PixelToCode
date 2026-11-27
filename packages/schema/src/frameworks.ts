import { z } from "zod";

export const FRAMEWORKS = ["angular", "react", "vue", "html"] as const;
export const Framework = z.enum(FRAMEWORKS);
export type Framework = z.infer<typeof Framework>;

export const STYLE_SYSTEMS = ["css", "scss", "tailwind"] as const;
export const StyleSystem = z.enum(STYLE_SYSTEMS);
export type StyleSystem = z.infer<typeof StyleSystem>;

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  angular: "Angular",
  react: "React",
  vue: "Vue",
  html: "HTML",
};

export const STYLE_LABELS: Record<StyleSystem, string> = {
  css: "CSS",
  scss: "SCSS",
  tailwind: "Tailwind",
};

/**
 * Framework and style combinations the product supports.
 * Plain HTML has no build step, so it cannot use SCSS. Tailwind works through
 * the browser build of Tailwind, both in the preview and in the exported page.
 */
const SUPPORTED: Record<Framework, readonly StyleSystem[]> = {
  angular: ["css", "scss", "tailwind"],
  react: ["css", "scss", "tailwind"],
  vue: ["css", "scss", "tailwind"],
  html: ["css", "tailwind"],
};

/** Why a combination is not offered, shown next to the disabled option. */
export function unsupportedReason(framework: Framework, style: StyleSystem): string | null {
  if (isSupportedCombination(framework, style)) return null;
  return `${FRAMEWORK_LABELS[framework]} has no ${STYLE_LABELS[style]} build step`;
}

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
