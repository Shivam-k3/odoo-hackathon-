import { Router } from 'express';
import { payrollController } from '../controllers/payroll.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateQuery } from '../middleware/validate.middleware';
import { myPayslipQuerySchema } from '../validators/payroll.validator';

const router = Router();

router.use(authenticate);

// Employee payroll is read-only: structure + components + payslip history.
router.get('/me', (req, res, next) => payrollController.getMyPayroll(req, res, next));

// Employee views a single payslip for an exact period.
router.get('/payslip', validateQuery(myPayslipQuerySchema), (req, res, next) =>
  payrollController.getMyPayslip(req, res, next)
);

// Employee sees the transparent payable-days breakdown for own attendance.
router.get('/me/payable-days', (req, res, next) =>
  payrollController.getMyPayableDays(req, res, next)
);

export default router;
