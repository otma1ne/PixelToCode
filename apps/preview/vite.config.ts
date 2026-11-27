/// <reference types="vitest/config" />
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * Content Security Policy of the sandbox page.
 * - No network: connect-src 'none', no external scripts, images only from data: and blob:.
 * - 'unsafe-eval' is required: the Angular JIT compiler and the module loader evaluate generated code.
 */
export const SANDBOX_CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

/** Adds the CSP meta tag to built pages only, so the dev server keeps hot reload. */
function cspMeta(): Plugin {
  return {
    name: "sandbox-csp",
    apply: "build",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        // Only the sandbox page is locked down; the spike harness plays the host app.
        if (!ctx.path.endsWith("/index.html")) return html;
        return html.replace(
          "<head>",
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}" />`,
        );
      },
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [cspMeta()],
  build: {
    target: "es2022",
    // The compilers are large by nature; they are loaded on demand and cached.
    chunkSizeWarningLimit: 10_000,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        ...(mode === "spike" ? { spike: resolve(__dirname, "spike.html") } : {}),
      },
    },
  },
  // The sandboxed iframe has an opaque origin, so its module requests are cross-origin.
  preview: { cors: true, headers: { "Access-Control-Allow-Origin": "*" } },
  server: { cors: true },
  test: { include: ["src/**/*.test.ts"] },
}));
