import { createV3Service } from './service.js';
export function registerV3(app, { db, player, clock }) {
  const service = createV3Service(db, clock);
  const versions = {
    levelVersion: { type: 'integer', minimum: 1 },
    rulesVersion: { type: 'string', const: '3.0' },
  };
  const planActions = {
    type: 'array',
    maxItems: 4096,
    items: {
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'direction'],
          properties: {
            type: { const: 'move' },
            direction: { enum: ['up', 'down', 'left', 'right'] },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'leverId'],
          properties: {
            type: { const: 'activateLever' },
            leverId: { type: 'string', minLength: 1, maxLength: 80 },
          },
        },
      ],
    },
  };
  const body = (properties, required = Object.keys(properties)) => ({
    schema: { body: { type: 'object', additionalProperties: false, required, properties } },
  });
  const id = { type: 'string', minLength: 8, maxLength: 100 };
  const submission = body({ ...versions, submissionId: id, planActions });
  const preview = body({ ...versions, planActions });
  const pause = body({ reason: { enum: ['explicit', 'platform', 'hidden', 'reload'] } });
  app.get('/api/v3/campaign', (request) => service.catalog(player(request)));
  app.get('/api/v3/levels/:id', (request) => service.level(player(request), request.params.id));
  app.post('/api/v3/levels/:id/preview', preview, (request) =>
    service.preview(player(request), request.params.id, request.body),
  );
  app.post('/api/v3/levels/:id/submissions', submission, (request) =>
    service.submit(player(request), request.params.id, request.body),
  );
  app.post(
    '/api/v3/levels/:id/solution',
    body({ ...versions, assistance: { type: 'boolean' } }),
    (request) => service.solution(player(request), request.params.id, request.body),
  );
  app.post(
    '/api/v3/timed-runs',
    body({ ...versions, levelId: { type: 'string', minLength: 1, maxLength: 80 }, startId: id }),
    (request) => service.startTimed(player(request), request.body, request.receivedAt),
  );
  app.get('/api/v3/timed-runs/:id', (request) =>
    service.run(player(request), request.params.id, request.receivedAt),
  );
  app.post('/api/v3/timed-runs/:id/submissions', submission, (request) =>
    service.submitTimed(player(request), request.params.id, request.body, request.receivedAt),
  );
  app.post('/api/v3/timed-runs/:id/preview', preview, (request) =>
    service.previewTimed(player(request), request.params.id, request.body, request.receivedAt),
  );
  for (const operation of ['pause', 'resume'])
    app.post(`/api/v3/timed-runs/:id/${operation}`, pause, (request) =>
      service.lifecycle(
        player(request),
        request.params.id,
        operation,
        request.body,
        request.receivedAt,
      ),
    );
  app.post('/api/v3/timed-runs/:id/finish', (request) =>
    service.lifecycle(player(request), request.params.id, 'finish', {}, request.receivedAt),
  );
  app.post('/api/v3/timed-runs/:id/mute', body({ muted: { type: 'boolean' } }), (request) =>
    service.lifecycle(player(request), request.params.id, 'mute', request.body, request.receivedAt),
  );
  app.get('/api/v3/timed-runs/:id/solution', (request) =>
    service.timedSolution(player(request), request.params.id),
  );
}
