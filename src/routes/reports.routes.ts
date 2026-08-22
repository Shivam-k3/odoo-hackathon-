import { Router } from 'express';
import { reportsController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateQuery } from '../middleware/validate.middleware';
import {
  attendanceReportQuerySchema,
  leaveReportQuerySchema,
  payrollReportQuerySchema,
  employeeReportQuerySchema,
} from '../validators/report.validator';

const router = Router();

router.use(authenticate);
router.use(requireRole('ADMIN_HR'));

// Attendance report (json | csv).
router.get('/attendance', validateQuery(attendanceReportQuerySchema), (req, res, next) =>
  reportsController.attendance(req, res, next)
);

// Leave report (json | csv).
router.get('/leaves', validateQuery(leaveReportQuerySchema), (req, res, next) =>
  reportsController.leaves(req, res, next)
);

// Payroll report (json | csv).
router.get('/payroll', validateQuery(payrollReportQuerySchema), (req, res, next) =>
  reportsController.payroll(req, res, next)
);

// Employee directory report (json | csv).
router.get('/employees', validateQuery(employeeReportQuerySchema), (req, res, next) =>
  reportsController.employees(req, res, next)
);

export default router;
