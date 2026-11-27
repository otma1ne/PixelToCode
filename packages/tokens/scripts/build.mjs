// Generates tokens.css from tokens.json.
// `--check` fails when tokens.css is out of date, so CI catches hand edits.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(join(root, "tokens.json"), "utf8"));
const outFile = join(root, "tokens.css");

const themes = tokens.color.themes.map((t) => t.id);
const [defaultTheme] = themes;
const otherThemes = themes.slice(1);

/** Theme-aware families: values may be a string or { [themeId]: string }. */
const themed = [
  ...tokens.color.tokens.map((t) => ({ name: t.name, value: t.value })),
  ...tokens.shadow.tokens.map((t) => ({ name: t.name, value: t.value })),
];

/** Fixed families: one value for every theme. */
const fixed = [...tokens.spacing.tokens, ...tokens.radius.tokens, ...tokens.size.tokens].map(
  (t) => ({ name: t.name, value: t.value }),
);

const valueFor = (value, theme) =>
  typeof value === "string" ? value : (value[theme] ?? value[defaultTheme]);

const decl = (name, value) => `  --${name}: ${value};`;

const themeBlock = (theme) =>
  themed
    .filter((t) => typeof t.value !== "string" || theme === defaultTheme)
    .map((t) => decl(t.name, valueFor(t.value, theme)))
    .join("\n");

const typeVars = [];
for (const [family, stack] of Object.entries(tokens.type.families)) {
  typeVars.push(decl(`font-${family}-stack`, stack));
}
for (const group of tokens.type.groups) {
  for (const style of group.styles) {
    const lh = typeof style.lineHeight === "number" ? String(style.lineHeight) : style.lineHeight;
    typeVars.push(decl(`text-${style.name}-size`, style.fontSize));
    typeVars.push(decl(`text-${style.name}-line-height`, lh));
    typeVars.push(decl(`text-${style.name}-weight`, String(style.fontWeight)));
    if (style.letterSpacing) {
      typeVars.push(decl(`text-${style.name}-tracking`, style.letterSpacing));
    }
  }
}

const lines = [
  `/* ${tokens.name} design tokens, generated from tokens.json. Do not edit by hand: run pnpm --filter @pixeltocode/tokens build. */`,
  "",
  `/* ${defaultTheme} is the default theme. */`,
  ":root {",
  `  color-scheme: ${defaultTheme};`,
  themeBlock(defaultTheme),
  fixed.map((t) => decl(t.name, t.value)).join("\n"),
  typeVars.join("\n"),
  "}",
];

for (const theme of otherThemes) {
  const block = themed
    .filter((t) => typeof t.value !== "string")
    .map((t) => `  ${decl(t.name, valueFor(t.value, theme))}`)
    .join("\n");
  lines.push(
    "",
    `/* ${theme} follows the system preference unless a theme is set explicitly. */`,
    `@media (prefers-color-scheme: ${theme}) {`,
    `  :root:not([data-theme]) {`,
    `    color-scheme: ${theme};`,
    block,
    "  }",
    "}",
    "",
    `:root[data-theme="${theme}"] {`,
    `  color-scheme: ${theme};`,
    block.replace(/^  /gm, ""),
    "}",
  );
}

lines.push("");

const css = lines.join("\n");

/**
 * Tailwind v4 theme: declares the utility keys (bg-panel, text-muted, rounded-md, h-control, text-body...).
 * Values that change per theme point at the runtime variables of tokens.css.
 * Keys that share a name with a token (radius, shadow) carry the default value here and are
 * overridden at runtime by tokens.css, which is not in a cascade layer.
 */
const themeLines = [
  "/* Tailwind theme generated from tokens.json. Do not edit by hand. */",
  "@theme {",
  "  --color-*: initial;",
  "  --radius-*: initial;",
  "  --shadow-*: initial;",
  "  --text-*: initial;",
  ...tokens.radius.tokens.map((t) => decl(t.name, t.value)),
  ...tokens.shadow.tokens.map((t) => decl(t.name, valueFor(t.value, defaultTheme))),
  ...tokens.size.tokens.map((t) => decl(`spacing-${t.name}`, t.value)),
];
for (const group of tokens.type.groups) {
  for (const style of group.styles) {
    const lh = typeof style.lineHeight === "number" ? String(style.lineHeight) : style.lineHeight;
    themeLines.push(decl(`text-${style.name}`, style.fontSize));
    themeLines.push(decl(`text-${style.name}--line-height`, lh));
    themeLines.push(decl(`text-${style.name}--font-weight`, String(style.fontWeight)));
    if (style.letterSpacing)
      themeLines.push(decl(`text-${style.name}--letter-spacing`, style.letterSpacing));
  }
}
themeLines.push(
  "}",
  "",
  "@theme inline {",
  ...tokens.color.tokens.map((t) => decl(`color-${t.name}`, `var(--${t.name})`)),
  "}",
  "",
);
const themeCss = themeLines.join("\n");
const outputs = [
  [outFile, css],
  [join(root, "theme.css"), themeCss],
];

if (process.argv.includes("--check")) {
  for (const [file, expected] of outputs) {
    let current = "";
    try {
      current = readFileSync(file, "utf8");
    } catch {
      // Missing file is reported below.
    }
    if (current.replace(/\r\n/g, "\n") !== expected) {
      console.error(`${file} is out of date. Run: pnpm --filter @pixeltocode/tokens build`);
      process.exit(1);
    }
  }
  console.log("Generated CSS is up to date.");
} else {
  for (const [file, content] of outputs) {
    writeFileSync(file, content);
    console.log(`Wrote ${file}`);
  }
}
