import express from 'express';
import path from 'node:path';
import process, { env } from 'node:process';
import { createServer as createViteServer } from 'vite';
import { initializeApi, registerApi } from './api';

const app = express();
const port = Number(env.PORT || 5000);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '5mb', strict: true }));

registerApi(app);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

async function start(): Promise<void> {
  await initializeApi();

  if (env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const details = error instanceof Error ? error.message : 'Unknown error.';
    const statusCode = error && typeof error === 'object' && 'statusCode' in error &&
      typeof error.statusCode === 'number'
      ? error.statusCode
      : error && typeof error === 'object' && 'status' in error && typeof error.status === 'number'
        ? error.status
        : 500;
    const status = statusCode >= 400 && statusCode < 500 ? statusCode : 500;
    console.error('Request failed:', status === 500 ? 'Server error.' : details);
    if (!res.headersSent) {
      res.status(status).json({
        error: status === 500
          ? 'The server could not complete the request. Please try again.'
          : status === 413
            ? 'The request is too large. Reduce the uploaded content and try again.'
            : status === 400
              ? 'The request body is invalid. Check the submitted data and try again.'
              : details,
      });
    }
  });

  app.listen(port, '0.0.0.0', () => {
    console.info(`RegisTrack server listening on 0.0.0.0:${port}`);
  });
}

start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error.';
  console.error(`RegisTrack server startup failed: ${message}`);
  process.exitCode = 1;
});