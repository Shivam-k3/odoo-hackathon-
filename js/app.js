// DAYFLOW HRMS — MAIN APPLICATION INITIALIZER

import { router } from './core/router.js';
import { createLoginView } from './views/auth/LoginView.js';
import { createSignupView } from './views/auth/SignupView.js';
import { createDashboardView } from './views/dashboard/DashboardView.js';
import { createProfileView } from './views/profile/ProfileView.js';
import { createAttendanceView } from './views/attendance/AttendanceView.js';
import { createLeaveView } from './views/leave/LeaveView.js';
import { createPayrollView } from './views/payroll/PayrollView.js';

// Register Routes
router.addRoute('/login', createLoginView);
router.addRoute('/signup', createSignupView);
router.addRoute('/employee/dashboard', createDashboardView);
router.addRoute('/employee/profile', createProfileView);
router.addRoute('/employee/attendance', createAttendanceView);
router.addRoute('/employee/leave', createLeaveView);
router.addRoute('/employee/payroll', createPayrollView);

// Initialize application routing
document.addEventListener('DOMContentLoaded', () => {
  router.handleRoute();
});
