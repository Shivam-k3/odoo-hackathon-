import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// GET /api/notifications/me - current user's notifications (newest first).
router.get('/me', (req: Request, res: Response, next: NextFunction) => {
  notificationService
    .listForUser(req.user!.id, {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      unreadOnly: req.query.unread === 'true',
    })
    .then((notifications) =>
      sendSuccess(res, 'Notifications fetched', { count: notifications.length, notifications })
    )
    .catch(next);
});

// POST /api/notifications/:id/read - mark own notification as read.
router.post('/:id/read', (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    sendError(res, 'Unauthenticated user', undefined, 401);
    return;
  }
  notificationService
    .markRead(req.user.id, req.params.id)
    .then(() => sendSuccess(res, 'Notification marked as read'))
    .catch((error: any) => {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    });
});

export default router;
