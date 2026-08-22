import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import {
  updateOwnProfileSchema,
  adminCreateEmployeeSchema,
  adminUpdateEmployeeSchema,
  searchEmployeeQuerySchema,
} from '../validators/employee.validator';

const router = Router();

// All employee routes require authentication
router.use(authenticate);

// Employee own profile endpoints
router.get('/me', (req, res, next) =>
  employeeController.getOwnProfile(req, res, next)
);

router.get('/me/info', (req, res, next) =>
  employeeController.getOwnInfo(req, res, next)
);

router.put('/me', validateBody(updateOwnProfileSchema), (req, res, next) =>
  employeeController.updateOwnProfile(req, res, next)
);

router.patch('/me', validateBody(updateOwnProfileSchema), (req, res, next) =>
  employeeController.updateOwnProfile(req, res, next)
);

// Admin-only employee management endpoints
router.get(
  '/',
  requireRole('ADMIN_HR'),
  validateQuery(searchEmployeeQuerySchema),
  (req, res, next) => employeeController.getAllEmployees(req, res, next)
);

router.get(
  '/search',
  requireRole('ADMIN_HR'),
  validateQuery(searchEmployeeQuerySchema),
  (req, res, next) => employeeController.searchEmployees(req, res, next)
);

router.get('/:id', requireRole('ADMIN_HR'), (req, res, next) =>
  employeeController.getEmployeeById(req, res, next)
);

router.post(
  '/',
  requireRole('ADMIN_HR'),
  validateBody(adminCreateEmployeeSchema),
  (req, res, next) => employeeController.createEmployee(req, res, next)
);

router.put(
  '/:id',
  requireRole('ADMIN_HR'),
  validateBody(adminUpdateEmployeeSchema),
  (req, res, next) => employeeController.updateEmployee(req, res, next)
);

router.patch(
  '/:id',
  requireRole('ADMIN_HR'),
  validateBody(adminUpdateEmployeeSchema),
  (req, res, next) => employeeController.updateEmployee(req, res, next)
);

export default router;
