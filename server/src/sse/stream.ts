import { Response } from 'express';

export interface SSEWriter {
  send: (event: string, data: unknown) => void;
  close: () => void;
  onDisconnect: (cb: () => void) => void;
}

export function createSSEStream(res: Response): SSEWriter {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(':ok\n\n');

  let closed = false;

  return {
    send(event: string, data: unknown) {
      if (closed) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    close() {
      if (closed) return;
      closed = true;
      res.write('event: done\ndata: {}\n\n');
      res.end();
    },
    onDisconnect(cb: () => void) {
      res.on('close', () => {
        closed = true;
        cb();
      });
    },
  };
}
