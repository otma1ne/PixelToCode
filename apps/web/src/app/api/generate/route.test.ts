import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GenerationEvent } from "@pixeltocode/schema";
import { http, HttpResponse } from "msw/http";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createSseParser } from "@/lib/sse";
import { resetServerConfig } from "@/server/generation/deps";
import { ANGULAR_OUTPUT } from "@/server/generation/fixtures";
import { POST } from "./route";

const PNG = readFileSync(join(__dirname, "../../../../public/examples/invite-members.png"));
const OPENAI = "https://api.openai.com/v1/responses";

/** The Responses API shape the SDK reads, with the given text as the model's answer. */
function openaiResponse(text: string, status = "completed") {
  return HttpResponse.json({
    id: "resp_test",
    object: "response",
    created_at: 0,
    status,
    model: "test-model",
    output: [
      {
        id: "msg_test",
        type: "message",
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text, annotations: [] }],
      },
    ],
    usage: {
      input_tokens: 2100,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens: 3200,
      output_tokens_details: { reasoning_tokens: 0 },
      total_tokens: 5300,
    },
  });
}

const server = setupServer();
let lastBody: Record<string, unknown> | null = null;

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
beforeEach(() => {
  lastBody = null;
  Object.assign(process.env, {
    OPENAI_API_KEY: "sk-test-not-real",
    OPENAI_MODEL: "test-model",
    OPENAI_PRICE_INPUT_PER_MTOK: "2",
    OPENAI_PRICE_OUTPUT_PER_MTOK: "8",
    DAILY_GENERATIONS_PER_VISITOR: "5",
  });
  delete process.env.UPSTASH_REDIS_REST_URL;
  resetServerConfig();
});

function request(
  options: { origin?: string; settings?: unknown; image?: Buffer; ip?: string } = {},
) {
  const form = new FormData();
  form.set(
    "image",
    new Blob([new Uint8Array(options.image ?? PNG)], { type: "image/png" }),
    "card.png",
  );
  form.set(
    "settings",
    JSON.stringify(options.settings ?? { framework: "angular", style: "scss", instructions: "" }),
  );
  return new Request("http://localhost:3000/api/generate", {
    method: "POST",
    body: form,
    headers: {
      origin: options.origin ?? "http://localhost:3000",
      "x-forwarded-for": options.ip ?? "198.51.100.1",
    },
  });
}

async function events(response: Response): Promise<GenerationEvent[]> {
  const out: GenerationEvent[] = [];
  const parse = createSseParser((data) => out.push(GenerationEvent.parse(data)));
  parse(await response.text());
  return out;
}

describe("POST /api/generate", () => {
  it("streams the steps and a validated result from OpenAI", async () => {
    server.use(
      http.post(OPENAI, async ({ request: req }) => {
        lastBody = (await req.json()) as Record<string, unknown>;
        return openaiResponse(JSON.stringify(ANGULAR_OUTPUT));
      }),
    );
    const response = await POST(request());
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const list = await events(response);
    const result = list.at(-1);
    expect(result?.type).toBe("result");
    if (result?.type !== "result") return;
    expect(result.result.files).toHaveLength(4);
    expect(result.result.usage).toMatchObject({ inputTokens: 2100, outputTokens: 3200 });

    // What was sent: strict JSON schema, a resized image, nothing stored.
    expect(lastBody).toMatchObject({ model: "test-model", store: false, max_output_tokens: 16000 });
    expect(JSON.stringify(lastBody?.text)).toContain('"strict":true');
    expect(JSON.stringify(lastBody?.input)).toContain("data:image/png;base64,");
  });

  it("retries once when OpenAI returns unusable JSON", async () => {
    let calls = 0;
    server.use(
      http.post(OPENAI, () => {
        calls += 1;
        return openaiResponse(calls === 1 ? "not json" : JSON.stringify(ANGULAR_OUTPUT));
      }),
    );
    const list = await events(await POST(request()));
    expect(calls).toBe(2);
    expect(list.at(-1)?.type).toBe("result");
  });

  it("maps an OpenAI error to model_error without echoing it", async () => {
    server.use(
      http.post(OPENAI, () =>
        HttpResponse.json({ error: { message: "secret detail" } }, { status: 500 }),
      ),
    );
    const list = await events(await POST(request()));
    expect(list.at(-1)).toMatchObject({ type: "error", code: "model_error" });
    expect(JSON.stringify(list)).not.toContain("secret detail");
  });

  it("refuses other origins", async () => {
    const response = await POST(request({ origin: "https://evil.example" }));
    expect(response.status).toBe(403);
  });

  it("refuses unsupported settings and non-images before calling OpenAI", async () => {
    const bad = await events(
      await POST(request({ settings: { framework: "html", style: "scss", instructions: "" } })),
    );
    expect(bad.at(-1)).toMatchObject({ type: "error", code: "invalid_request" });
    const notImage = await events(await POST(request({ image: Buffer.from("%PDF-1.7 hello") })));
    expect(notImage.at(-1)).toMatchObject({ type: "error", code: "invalid_image" });
  });

  it("applies the daily limit per visitor", async () => {
    process.env.DAILY_GENERATIONS_PER_VISITOR = "1";
    process.env.GENERATIONS_PER_MINUTE = "10";
    resetServerConfig();
    server.use(http.post(OPENAI, () => openaiResponse(JSON.stringify(ANGULAR_OUTPUT))));
    expect((await events(await POST(request({ ip: "192.0.2.9" })))).at(-1)?.type).toBe("result");
    expect((await events(await POST(request({ ip: "192.0.2.9" })))).at(-1)).toMatchObject({
      type: "error",
      code: "limit_reached",
    });
    expect((await events(await POST(request({ ip: "192.0.2.10" })))).at(-1)?.type).toBe("result");
  });

  it("reports not_configured without a key", async () => {
    delete process.env.OPENAI_API_KEY;
    resetServerConfig();
    const list = await events(await POST(request()));
    expect(list.at(-1)).toMatchObject({ type: "error", code: "not_configured" });
  });
});
