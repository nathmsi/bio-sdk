import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { SessionStore } from './storage/ring-buffer.js';
import { SseService } from './services/sse.js';
import { collectRoute } from './routes/collect.js';
import { sessionsRoute } from './routes/sessions.js';

const PORT = Number(process.env['PORT'] ?? 9000);

export async function buildApp() {
  const isDev = process.env['NODE_ENV'] !== 'production';
  const app = Fastify({
    logger: isDev
      ? { level: process.env['LOG_LEVEL'] ?? 'info', transport: { target: 'pino-pretty', options: { colorize: true } } }
      : { level: process.env['LOG_LEVEL'] ?? 'info' },
    genReqId: () => crypto.randomUUID(),
  });

  // ── Plugins ─────────────────────────────────────────────────────────────────
  await app.register(helmet, { contentSecurityPolicy: false });
  const extraOrigins = (process.env['ALLOWED_ORIGINS'] ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: (origin, cb) => {
      const allowed = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:9000',
        ...extraOrigins,
        undefined, // same-origin and non-browser requests
      ];
      cb(null, allowed.includes(origin));
    },
  });
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ error: 'Too many requests' }),
  });

  // ── Services & routes ────────────────────────────────────────────────────────
  const store = new SessionStore();
  const sse = new SseService();

  sse.register(app);
  collectRoute(app, store, sse);
  sessionsRoute(app, store);

  // ── Health ──────────────────────────────────────────────────────────────────
  app.get('/health', (_req, reply) => reply.send({ status: 'ok' }));
  app.get('/ready',  (_req, reply) => reply.send({ status: 'ready', sessions: store.size }));

  return app;
}

// Start only when run directly
if (process.argv[1] !== undefined) {
  const app = await buildApp();
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\n🚀  BioSDK server  →  http://localhost:${PORT}`);
    console.log(`   POST /collect   →  receive event batches`);
    console.log(`   GET  /sessions  →  list sessions`);
    console.log(`   GET  /events    →  SSE stream\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, () => {
      void app.close().then(() => process.exit(0));
    });
  }
}
