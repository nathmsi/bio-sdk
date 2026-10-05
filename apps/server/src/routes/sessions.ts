import type { FastifyInstance } from 'fastify';
import type { SessionStore } from '../storage/ring-buffer.js';
import { computeHumanScore } from '../analytics/human-score.js';

export function sessionsRoute(app: FastifyInstance, store: SessionStore): void {
  app.get('/sessions', (_req, reply) => {
    const sessions = store.getAll().map(s => ({
      id: s.id,
      firstSeen: s.firstSeen,
      lastSeen: s.lastSeen,
      totalEvents: s.totalEvents,
      batchCount: s.payloads.length,
      score: computeHumanScore(s.payloads.flatMap(p => p.events)),
    }));
    return reply.send(sessions);
  });

  app.get<{ Params: { id: string } }>('/sessions/:id', (req, reply) => {
    const session = store.getById(req.params.id);
    if (!session) return reply.status(404).send({ error: 'Session not found' });
    return reply.send({
      ...session,
      score: computeHumanScore(session.payloads.flatMap(p => p.events)),
    });
  });
}
