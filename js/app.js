// DAYFLOW HRMS — MAIN APPLICATION INITIALIZER

import { router } from './core/router.js';
import { createLoginView } from './views/auth/LoginView.js';
import { createSignupView } from './views/auth/SignupView.js';
import { createDashboardView } from './views/dashboard/DashboardView.js';
import { createProfileView } from './views/profile/ProfileView.js';
import { createAttendanceView } from './views/attendance/AttendanceView.js';
import { createLeaveView } from './views/leave/LeaveView.js';
import { createPayrollView } from './views/payroll/PayrollView.js';

// ADMIN / HR CONSOLE (Member 2)
import { createAdminDashboardView } from './views/admin/AdminDashboardView.js';
import { createAdminEmployeesView } from './views/admin/AdminEmployeesView.js';
import { createAdminEmployeeProfileView } from './views/admin/AdminEmployeeProfileView.js';
import { createAdminAttendanceView } from './views/admin/AdminAttendanceView.js';
import { createAdminLeaveView } from './views/admin/AdminLeaveView.js';
import { createAdminPayrollView } from './views/admin/AdminPayrollView.js';
import { createAdminReportsView } from './views/admin/AdminReportsView.js';

// Register Routes — Employee Portal
router.addRoute('/login', createLoginView);
router.addRoute('/signup', createSignupView);
router.addRoute('/employee/dashboard', createDashboardView);
router.addRoute('/employee/profile', createProfileView);
router.addRoute('/employee/attendance', createAttendanceView);
router.addRoute('/employee/leave', createLeaveView);
router.addRoute('/employee/payroll', createPayrollView);

// Register Routes — Admin / HR Console
router.addRoute('/admin/dashboard', createAdminDashboardView);
router.addRoute('/admin/employees', createAdminEmployeesView);
router.addRoute('/admin/employees/:id', createAdminEmployeeProfileView);
router.addRoute('/admin/attendance', createAdminAttendanceView);
router.addRoute('/admin/leave', createAdminLeaveView);
router.addRoute('/admin/payroll', createAdminPayrollView);
router.addRoute('/admin/reports', createAdminReportsView);

// Initialize application routing
document.addEventListener('DOMContentLoaded', () => {
  router.handleRoute();
});
