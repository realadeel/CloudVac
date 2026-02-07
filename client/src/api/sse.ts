type Handler = (data: any) => void;

export function connectSSE(
  url: string,
  handlers: Record<string, Handler>,
  onError?: (err: Event) => void
): () => void {
  const source = new EventSource(url);

  for (const [event, handler] of Object.entries(handlers)) {
    source.addEventListener(event, (e: MessageEvent) => {
      try {
        handler(JSON.parse(e.data));
      } catch {
        handler(e.data);
      }
    });
  }

  source.addEventListener('done', () => {
    source.close();
  });

  source.onerror = (err) => {
    onError?.(err);
    source.close();
  };

  return () => source.close();
}

/**
 * Connect to a POST-based SSE endpoint (fetch + ReadableStream).
 * Returns an abort function.
 */
export function connectPostSSE(
  url: string,
  body: unknown,
  handlers: Record<string, Handler>,
  onError?: (err: unknown) => void
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as any).error || `Request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
          } else if (line === '' && currentEvent) {
            if (currentEvent === 'done') break;
            const handler = handlers[currentEvent];
            if (handler) {
              try {
                handler(JSON.parse(currentData));
              } catch {
                handler(currentData);
              }
            }
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } catch (err) {
      if ((err as any)?.name !== 'AbortError') {
        onError?.(err);
      }
    }
  })();

  return () => controller.abort();
}
