import type { FastifyInstance } from 'fastify';
import { BioPayloadSchema } from '@bio-sdk/protocol';
import type { SessionStore } from '../storage/ring-buffer.js';
import { computeHumanScore } from '../analytics/human-score.js';
import type { SseService } from '../services/sse.js';

export function collectRoute(
  app: FastifyInstance,
  store: SessionStore,
  sse: SseService,
): void {
  app.post('/collect', async (request, reply) => {
    const result = BioPayloadSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: result.error.flatten() });
    }

    const payload = result.data;
    const session = store.upsert(payload);
    const score = computeHumanScore(session.payloads.flatMap(p => p.events));

    sse.broadcast({ type: 'batch', payload, score });

    return reply.status(204).send();
  });
}
