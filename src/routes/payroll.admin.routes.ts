import { Router } from 'express';
import { payrollAdminController } from '../controllers/payroll.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import {
  upsertSalarySchema,
  payslipPeriodSchema,
  adminPayslipsQuerySchema,
} from '../validators/payroll.validator';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN_HR'));

// List all payslips with filters.
router.get('/', validateQuery(adminPayslipsQuerySchema), (req, res, next) =>
  payrollAdminController.listPayslips(req, res, next)
);

// Create a salary structure.
router.post('/:employeeId', validateBody(upsertSalarySchema), (req, res, next) =>
  payrollAdminController.createSalaryStructure(req, res, next)
);

// Update the wage on an existing salary structure.
router.put('/:employeeId', validateBody(upsertSalarySchema), (req, res, next) =>
  payrollAdminController.updateSalaryStructure(req, res, next)
);

// Generate / recompute a payslip for a period.
router.post(
  '/:employeeId/generate-payslip',
  validateBody(payslipPeriodSchema),
  (req, res, next) => payrollAdminController.generatePayslip(req, res, next)
);

// View one employee's full payroll (structure + components + payslips).
router.get('/:employeeId', (req, res, next) =>
  payrollAdminController.getEmployeePayroll(req, res, next)
);

export default router;
