import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import staticFiles from '@fastify/static';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openStore } from './store.js';
import { createService, ApiError } from './service.js';
export async function buildApp({
  database = ':memory:',
  clock = Date.now,
  logger = false,
  webOrigin = 'http://127.0.0.1:5173',
  production = false,
} = {}) {
  const app = Fastify({
    logger,
    bodyLimit: 16384,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
  });
  const db = openStore(database),
    service = createService(db, clock);
  app.addHook('onClose', () => db.close());
  await app.register(cookie);
  app.addHook('onRequest', async (request) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) && request.headers.origin) {
      const sameOrigin = `${request.protocol}://${request.headers.host}`;
      if (request.headers.origin !== webOrigin && request.headers.origin !== sameOrigin)
        throw new ApiError(403, 'Origin not allowed.');
    }
  });
  app.setErrorHandler((error, request, reply) => {
    const status = error.status ?? error.statusCode ?? 500;
    if (status >= 500) request.log.error(error);
    reply.code(status).send({ error: status >= 500 ? 'Unexpected server error.' : error.message });
  });
  const player = (request) => service.player(request.cookies.pawzzle_session);
  app.get('/api/health', () => ({ ok: true, service: 'pawzzle-maze-api' }));
  app.post('/api/session', async (request, reply) => {
    const session = service.session(request.cookies.pawzzle_session);
    reply.setCookie('pawzzle_session', session.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: production,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return { playerId: session.playerId, identity: 'anonymous', ranking: 'development' };
  });
  app.get('/api/daily', (request) => service.daily(player(request)));
  app.post('/api/rounds', (request) => service.start(player(request)));
  app.get('/api/rounds/:id', (request) => service.round(request.params.id, player(request)));
  app.post('/api/rounds/:id/finish', (request) =>
    service.finish(request.params.id, player(request)),
  );
  app.post(
    '/api/rounds/:id/submissions',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['submissionId', 'orderedCellIds'],
          properties: {
            submissionId: { type: 'string', minLength: 8, maxLength: 100 },
            orderedCellIds: {
              type: 'array',
              minItems: 2,
              maxItems: 144,
              items: { type: 'integer', minimum: 0, maximum: 143 },
            },
          },
        },
      },
    },
    (request) => service.submit(request.params.id, player(request), request.body),
  );
  app.get(
    '/api/leaderboard',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['challengeId'],
          properties: { challengeId: { type: 'string', maxLength: 100 } },
        },
      },
    },
    (request) => ({
      scope: 'development',
      entries: service.leaderboard(request.query.challengeId),
    }),
  );
  const webRoot = fileURLToPath(new URL('../../web/dist/', import.meta.url));
  if (existsSync(webRoot)) await app.register(staticFiles, { root: webRoot });
  return app;
}
