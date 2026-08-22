import express, { Express, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { sendError } from './utils/apiResponse';

const app: Express = express();

// Security middleware
app.use(helmet());
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

// 404 fallback for undefined routes
app.use((req: Request, res: Response) => {
  sendError(res, `Endpoint ${req.method} ${req.originalUrl} not found`, undefined, 404);
});

// Centralized error handler
app.use(errorHandler);

export default app;
