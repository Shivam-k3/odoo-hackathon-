import { Router } from 'express';
import { attendanceController } from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateQuery } from '../middleware/validate.middleware';
import {
  dateQuerySchema,
  monthQuerySchema,
  adminAttendanceQuerySchema,
} from '../validators/attendance.validator';

const router = Router();

// All attendance routes require authentication
router.use(authenticate);

// Employee Check-in / Check-out actions
router.post('/check-in', (req, res, next) =>
  attendanceController.checkIn(req, res, next)
);

router.post('/check-out', (req, res, next) =>
  attendanceController.checkOut(req, res, next)
);

// Employee attendance queries (own attendance only)
router.get('/me/today', (req, res, next) =>
  attendanceController.getToday(req, res, next)
);

router.get('/me/date', validateQuery(dateQuerySchema), (req, res, next) =>
  attendanceController.getByDate(req, res, next)
);

router.get('/me/weekly', (req, res, next) =>
  attendanceController.getWeeklyAttendance(req, res, next)
);

router.get('/me/monthly', validateQuery(monthQuerySchema), (req, res, next) =>
  attendanceController.getMonthlyAttendance(req, res, next)
);

router.get('/me', (req, res, next) =>
  attendanceController.getOwnAttendance(req, res, next)
);

// Admin-only attendance management and reporting endpoints
router.get(
  '/admin/all',
  requireRole('ADMIN_HR'),
  validateQuery(adminAttendanceQuerySchema),
  (req, res, next) => attendanceController.getAdminAllAttendance(req, res, next)
);

router.get('/admin/today', requireRole('ADMIN_HR'), (req, res, next) =>
  attendanceController.getAdminToday(req, res, next)
);

router.get(
  '/admin/monthly-summary',
  requireRole('ADMIN_HR'),
  validateQuery(monthQuerySchema),
  (req, res, next) => attendanceController.getAdminMonthlySummary(req, res, next)
);

router.get(
  '/admin/employee/:employeeId',
  requireRole('ADMIN_HR'),
  (req, res, next) => attendanceController.getAdminEmployeeAttendance(req, res, next)
);

export default router;
