# PixelToCode

PixelToCode turns a UI screenshot into an Angular, React, Vue or HTML component, shows it live and exports it as a ZIP.

## Repository

| Path              | What                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `apps/web`        | The product: Next.js (App Router), strict TypeScript, Tailwind CSS v4, Radix primitives.      |
| `apps/preview`    | The preview sandbox: a static page served from its own domain that compiles and renders code. |
| `packages/schema` | Zod schemas shared by the app, the server and the sandbox.                                    |
| `packages/tokens` | Design tokens. `tokens.json` is the source; `tokens.css` and `theme.css` are generated.       |

## Requirements

- Node.js 22 (see `.nvmrc`)
- pnpm 10 (the exact version is pinned in `package.json`; `corepack enable` picks it up)

## Getting started

```sh
pnpm install
pnpm dev          # web on http://localhost:3000, preview on http://localhost:4100
```

Copy `apps/web/.env.example` to `apps/web/.env.local` when a phase needs server variables.

## Scripts

| Command                                   | What                                                      |
| ----------------------------------------- | --------------------------------------------------------- |
| `pnpm lint`                               | ESLint for web, type checks for the packages              |
| `pnpm typecheck`                          | TypeScript in every package                               |
| `pnpm test`                               | Unit tests (Vitest)                                       |
| `pnpm build`                              | Builds every package                                      |
| `pnpm --filter preview test:e2e`          | Compiles and renders examples in the sandbox (Playwright) |
| `pnpm --filter @pixeltocode/tokens build` | Regenerates the CSS after editing `tokens.json`           |

## Preview sandbox

Generated code never runs on the app origin or on the server. The web app sends files to an iframe on the preview domain with `postMessage`; the iframe compiles them and renders the result.

- The iframe uses `sandbox="allow-scripts allow-forms"` without `allow-same-origin`, so it has an opaque origin: no cookies, no storage, no access to the parent.
- The sandbox page has a Content Security Policy with `connect-src 'none'` and `form-action 'none'`: generated code cannot call the network or submit a form anywhere. `allow-forms` is only there so that `submit` events reach the component.
- Angular is compiled in the browser with TypeScript `transpileModule` and the Angular JIT compiler. Two source transforms make generated code work in JIT mode: `templateUrl` and `styleUrl` are inlined, and signal `input()`, `model()` and `output()` get the matching decorator metadata.
- `apps/preview/spike.html` (built with `pnpm --filter preview build:spike`) is a development harness that plays the role of the web app.

Run the sandbox tests with an installed Chrome instead of the Playwright build:

```sh
PW_CHANNEL=chrome pnpm --filter preview test:e2e
```

## Deployment

Two Vercel projects from this repository:

- `web`: root directory `apps/web`.
- `preview`: root directory `apps/preview`, on a separate registrable domain. Headers come from `apps/preview/vercel.json`. Set `VITE_HOST_ORIGINS` to the web origin(s), comma separated.
