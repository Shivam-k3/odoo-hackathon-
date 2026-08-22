import { Router } from 'express';
import { dashboardController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateQuery } from '../middleware/validate.middleware';
import { dashboardQuerySchema } from '../validators/report.validator';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN_HR'));

// GET /api/admin/dashboard - live aggregated metrics.
router.get('/', validateQuery(dashboardQuerySchema), (req, res, next) =>
  dashboardController.overview(req, res, next)
);

export default router;
