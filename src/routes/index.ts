import { Router } from 'express';
import authRoutes from './auth.routes';
import employeeRoutes from './employee.routes';
import attendanceRoutes from './attendance.routes';
import leaveRoutes from './leave.routes';
import leaveAdminRoutes from './leave.admin.routes';
import notificationRoutes from './notification.routes';
import payrollRoutes from './payroll.routes';
import payrollAdminRoutes from './payroll.admin.routes';
import dashboardRoutes from './dashboard.routes';
import reportsRoutes from './reports.routes';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dayflow HRMS Backend API is operational',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leaves', leaveRoutes);
router.use('/admin/leaves', leaveAdminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/payroll', payrollRoutes);
router.use('/admin/payroll', payrollAdminRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/admin/reports', reportsRoutes);

export default router;
