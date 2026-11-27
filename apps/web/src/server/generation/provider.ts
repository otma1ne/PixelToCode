import { ModelOutput } from "@pixeltocode/schema";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

export interface ProviderRequest {
  system: string;
  user: string;
  imageDataUrl: string;
  /** Extra text for a second attempt. */
  retryNote?: string;
}

export interface ProviderUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

export interface ProviderResponse {
  text: string;
  usage: ProviderUsage;
  /** True when the answer was cut, for example by the output token limit. */
  incomplete: boolean;
}

export class ProviderTimeoutError extends Error {}
export class ProviderError extends Error {}

/** The one interface the pipeline knows. OpenAI is the only implementation today. */
export interface ModelProvider {
  generate(request: ProviderRequest, signal?: AbortSignal): Promise<ProviderResponse>;
}

export interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
  baseURL?: string;
  timeoutMs: number;
  maxOutputTokens: number;
}

const FORMAT = zodTextFormat(ModelOutput, "component");

export function createOpenAIProvider(options: OpenAIProviderOptions): ModelProvider {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseURL,
    timeout: options.timeoutMs,
    maxRetries: 0,
  });

  return {
    async generate(request, signal) {
      try {
        const response = await client.responses.create(
          {
            model: options.model,
            instructions: request.system,
            input: [
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: request.retryNote
                      ? `${request.user}\n\n${request.retryNote}`
                      : request.user,
                  },
                  { type: "input_image", image_url: request.imageDataUrl, detail: "high" },
                ],
              },
            ],
            text: { format: FORMAT },
            max_output_tokens: options.maxOutputTokens,
            // Screenshots and code are not kept on OpenAI's side for later retrieval.
            store: false,
          },
          { signal },
        );
        return {
          text: response.output_text,
          incomplete: response.status === "incomplete",
          usage: {
            inputTokens: response.usage?.input_tokens ?? 0,
            cachedInputTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0,
            outputTokens: response.usage?.output_tokens ?? 0,
          },
        };
      } catch (err) {
        if (err instanceof OpenAI.APIConnectionTimeoutError) {
          throw new ProviderTimeoutError("The model did not answer in time");
        }
        if (err instanceof OpenAI.APIError) {
          // Only the status is kept: the raw message can echo request details.
          throw new ProviderError(`OpenAI returned status ${err.status ?? "unknown"}`);
        }
        throw new ProviderError(err instanceof Error ? err.name : "Unknown provider error");
      }
    },
  };
}
