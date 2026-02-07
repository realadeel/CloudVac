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
