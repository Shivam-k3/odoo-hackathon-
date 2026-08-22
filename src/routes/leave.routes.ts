import { Router } from 'express';
import { leaveController } from '../controllers/leave.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import { applyLeaveSchema, myLeavesQuerySchema } from '../validators/leave.validator';
import { leaveAttachmentUpload } from '../utils/upload';

const router = Router();

router.use(authenticate);

// Employee applies for leave (multipart form-data; attachment required for SICK).
router.post(
  '/',
  leaveAttachmentUpload.single('attachment'),
  (req, res, next) => {
    // Multipart text fields arrive as strings; nothing else to transform here,
    // Zod validation below enforces formats.
    next();
  },
  validateBody(applyLeaveSchema),
  (req, res, next) => leaveController.applyLeave(req, res, next)
);

// Employee views own leave requests.
router.get('/me', validateQuery(myLeavesQuerySchema), (req, res, next) =>
  leaveController.getMyLeaves(req, res, next)
);

// Employee views own leave allocations/balances.
router.get('/allocations/me', (req, res, next) =>
  leaveController.getMyAllocations(req, res, next)
);

// Employee views one of their own requests by id.
router.get('/:id', (req, res, next) => leaveController.getMyLeaveById(req, res, next));

export default router;
