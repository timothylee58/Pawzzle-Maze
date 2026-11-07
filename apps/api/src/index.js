import { buildApp } from './app.js';
const app = await buildApp({
  database: process.env.DATABASE_PATH ?? './data/pawzzle.sqlite',
  logger: true,
  webOrigin: process.env.WEB_ORIGIN ?? 'http://127.0.0.1:5173',
  production: process.env.NODE_ENV === 'production',
});
try {
  await app.listen({
    host: process.env.HOST ?? '127.0.0.1',
    port: Number(process.env.PORT ?? 3001),
  });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
  await app.close();
}
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
