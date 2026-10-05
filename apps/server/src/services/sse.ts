import type { FastifyInstance, FastifyReply } from 'fastify';

export interface SseEvent {
  type: string;
  [key: string]: unknown;
}

/** Server-Sent Events broadcaster for live dashboard updates. */
export class SseService {
  private readonly _clients = new Set<FastifyReply>();

  register(app: FastifyInstance): void {
    app.get('/events', (_req, reply) => {
      void reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      reply.raw.write('retry: 3000\n\n');
      this._clients.add(reply);
      _req.raw.on('close', () => { this._clients.delete(reply); });
    });
  }

  broadcast(event: SseEvent): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this._clients) {
      try {
        client.raw.write(data);
      } catch {
        this._clients.delete(client);
      }
    }
  }

  get clientCount(): number {
    return this._clients.size;
  }
}
