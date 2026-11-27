/** Server-sent events: one JSON object per event, as `data: {...}\n\n`. */
export function encodeSseEvent(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Splits a text stream into the JSON payloads of its events. Keeps incomplete events in the buffer. */
export function createSseParser(onData: (data: unknown) => void) {
  let buffer = "";
  return (chunk: string) => {
    buffer += chunk;
    let index: number;
    while ((index = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const data = raw
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      try {
        onData(JSON.parse(data));
      } catch {
        // A malformed event is skipped; the schema check downstream reports missing results.
      }
    }
  };
}
