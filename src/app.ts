import express, { Express, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { sendError } from './utils/apiResponse';

const app: Express = express();

// Security middleware.
// CSP is explicitly configured so the SPA's pinned CDN assets (lucide icons,
// Google Fonts) keep working; everything else stays locked to same-origin.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://unpkg.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ['https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploaded leave attachments (public read for authenticated frontend usage)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Main API routes
app.use('/api', routes);

// ---------------------------------------------------------------------------
// SPA (frontend) serving — the vanilla-JS portal lives at the repo root
// (index.html + /js + /css) and is served by this Express process in all envs.
// ---------------------------------------------------------------------------
const rootDir = process.cwd();
app.use('/js', express.static(path.join(rootDir, 'js'), { index: false }));
app.use('/css', express.static(path.join(rootDir, 'css'), { index: false }));
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Deep-link fallback: any non-API GET renders the SPA shell (hash-free router
// resolves the real route client-side).
app.use((req: Request, res: Response, next: express.NextFunction) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    return res.sendFile(path.join(rootDir, 'index.html'));
  }
  next();
});

// 404 fallback for undefined routes
app.use((req: Request, res: Response) => {
  sendError(res, `Endpoint ${req.method} ${req.originalUrl} not found`, undefined, 404);
});

// Centralized error handler
app.use(errorHandler);

export default app;
