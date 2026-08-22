import { Router } from 'express';
import { leaveAdminController } from '../controllers/leave.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import { adminLeavesQuerySchema, decideLeaveSchema } from '../validators/leave.validator';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN_HR'));

// Admin views all leave requests with filters.
router.get('/', validateQuery(adminLeavesQuerySchema), (req, res, next) =>
  leaveAdminController.listAll(req, res, next)
);

// Admin views a single request in detail.
router.get('/:id', (req, res, next) => leaveAdminController.getDetail(req, res, next));

// Admin approves a pending request (optional comment).
router.post('/:id/approve', validateBody(decideLeaveSchema), (req, res, next) =>
  leaveAdminController.approve(req, res, next)
);

// Admin rejects a pending request (optional comment).
router.post('/:id/reject', validateBody(decideLeaveSchema), (req, res, next) =>
  leaveAdminController.reject(req, res, next)
);

export default router;
