// DAYFLOW HRMS — ADMIN SERVICE LAYER (REAL BACKEND APIs)
// Thin async wrapper around the admin REST endpoints. Views own their loading/
// error/empty states; this layer never fabricates business data.

import { api } from './api.js';

// Small local palette so avatar tinting works without any mock dataset.
const AVATAR_PALETTE = [
  ['#e8f0fe', '#1967d2'], ['#fef7e0', '#b06000'], ['#e6f4ea', '#188038'],
  ['#fce8e6', '#c5221f'], ['#f3e8fd', '#7627bb'], ['#e4f7fb', '#007b83'],
];

export const DEPARTMENT_OPTIONS = [
  'Engineering', 'Human Resources', 'Finance', 'Marketing',
  'Sales', 'Operations', 'Design', 'Product', 'General',
];

class AdminService {
  // ------------------------------------------------------------------ EMPLOYEES

  /** GET /api/employees?search=&department=&page=&limit= */
  async queryEmployees({ search = '', department = '', page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (department) params.set('department', department);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return api.get(`/api/employees?${params.toString()}`);
  }

  /** GET /api/employees/:id */
  getEmployeeById(id) {
    return api.get(`/api/employees/${id}`);
  }

  /** PUT /api/employees/:id */
  updateEmployee(id, patch) {
    return api.put(`/api/employees/${id}`, patch);
  }

  /** POST /api/employees */
  createEmployee(data) {
    return api.post('/api/employees', data);
  }

  // ------------------------------------------------------------------ ATTENDANCE

  /** GET /api/attendance/admin/today — org summary + per-employee records */
  getTodayAttendance() {
    return api.get('/api/attendance/admin/today');
  }

  /**
   * GET /api/attendance/admin/employee/:employeeId?startDate=&endDate=&limit=
   * Backend returns { employee, total, page, limit, totalPages, records }.
   */
  async getEmployeeMonthlyAttendance(employeeId, month) {
    const [year, mon] = month.split('-');
    const startDate = `${month}-01`;
    const endDate = new Date(Number(year), Number(mon), 0)
      .toISOString()
      .slice(0, 10);
    const params = new URLSearchParams({
      startDate,
      endDate,
      limit: '50',
      page: '1',
    });
    const data = await api.get(
      `/api/attendance/admin/employee/${encodeURIComponent(employeeId)}?${params.toString()}`
    );
    return { employee: data.employee, records: data.records || [] };
  }

  /** GET /api/attendance/admin/monthly-summary?month=YYYY-MM — company aggregates. */
  getMonthlySummary(month) {
    const q = month ? `?month=${encodeURIComponent(month)}` : '';
    return api.get(`/api/attendance/admin/monthly-summary${q}`);
  }

  // ----------------------------------------------------------------------- LEAVE

  /** GET /api/admin/leaves?status=&leaveType=&employeeId=&department=&from=&to=&page=&limit= */
  async getLeaves({
    status = '', leaveType = '', employeeId = '', department = '',
    from = '', to = '', page = 1, limit = 50,
  } = {}) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (leaveType) params.set('leaveType', leaveType);
    if (employeeId) params.set('employeeId', employeeId);
    if (department) params.set('department', department);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return api.get(`/api/admin/leaves?${params.toString()}`);
  }

  /** GET /api/admin/leaves/:id — single request with employee + decidedBy. */
  getLeaveById(requestId) {
    return api.get(`/api/admin/leaves/${encodeURIComponent(requestId)}`);
  }

  /** Pending-count helper used by sidebar badge (cheap single fetch). */
  async getPendingLeaveCount() {
    try {
      const data = await api.get('/api/admin/leaves?status=PENDING&page=1&limit=1');
      return data.total || 0;
    } catch (_) {
      return 0;
    }
  }

  /** POST /api/admin/leaves/:id/approve | reject */
  decideLeave(requestId, decision, comment = '') {
    const action = decision === 'APPROVED' || decision === 'Approved' ? 'approve' : 'reject';
    return api.post(`/api/admin/leaves/${requestId}/${action}`, { comment });
  }

  // --------------------------------------------------------------------- PAYROLL

  /** GET /api/admin/payroll — all payslips + totals */
  getPayrollOverview() {
    return api.get('/api/admin/payroll');
  }

  /** GET /api/admin/payroll/:employeeId — structure + components + payslips */
  getEmployeePayroll(employeeId) {
    return api.get(`/api/admin/payroll/${employeeId}`);
  }

  /** POST /api/admin/payroll/:employeeId — create/update salary structure */
  saveWage(employeeId, monthlyWage) {
    return api.post(`/api/admin/payroll/${employeeId}`, { monthlyWage: Number(monthlyWage) });
  }

  /** PUT /api/admin/payroll/:employeeId */
  updateWage(employeeId, monthlyWage) {
    return api.put(`/api/admin/payroll/${employeeId}`, { monthlyWage: Number(monthlyWage) });
  }

  /** POST /api/admin/payroll/:employeeId/generate-payslip { month: 'YYYY-MM' } */
  generatePayslip(employeeId, month) {
    return api.post(`/api/admin/payroll/${employeeId}/generate-payslip`, { month });
  }

  // -------------------------------------------------------------------- REPORTS

  /**
   * GET /api/admin/reports/:type?type=attendance|leaves|payroll|employees
   * Returns JSON object or raw CSV string depending on `format`.
   */
  getReport(type, { from, to, department = '', status = '', employeeId = '', leaveType = '', month = '', search = '', format = 'json' } = {}) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (department) params.set('department', department);
    if (status) params.set('status', status);
    if (employeeId) params.set('employeeId', employeeId);
    if (type === 'leaves' && leaveType) params.set('leaveType', leaveType);
    if (type === 'payroll' && month) params.set('month', month);
    if (type === 'employees' && search) params.set('search', search);
    params.set('format', format);
    return api.get(`/api/admin/reports/${type}?${params.toString()}`);
  }

  /** Build the same filter object used by getReport — keeps CSV exports identical to previews. */
  reportFilters({ from = '', to = '', department = '', status = '', employeeId = '', leaveType = '', month = '', search = '' } = {}) {
    const f = {};
    if (from) f.from = from;
    if (to) f.to = to;
    if (department) f.department = department;
    if (status) f.status = status;
    if (employeeId) f.employeeId = employeeId;
    if (leaveType) f.leaveType = leaveType;
    if (month) f.month = month;
    if (search) f.search = search;
    return f;
  }

  /** Download CSV by navigating the browser to the endpoint (auth via token header is required,
      so we fetch as blob and trigger a download instead). */
  async downloadReportCsv(type, filters) {
    const csv = await this.getReport(type, { ...filters, format: 'csv' });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dayflow-${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // -------------------------------------------------------------------- DASHBOARD

  /** GET /api/admin/dashboard */
  getDashboardStats() {
    return api.get('/api/admin/dashboard');
  }

  // -------------------------------------------------------------------- UTILS

  avatarStyle(index) {
    const [bg, fg] = AVATAR_PALETTE[Math.abs(index || 0) % AVATAR_PALETTE.length];
    return `background-color:${bg};color:${fg};`;
  }
}

export const adminStore = new AdminService();

export function formatINR(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0';
  const hasPaise = Math.round(n * 100) % 100 !== 0;
  return '₹' + n.toLocaleString('en-IN', hasPaise
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 0 });
}

export function formatHoursLabel(decimalHours) {
  const total = Math.round(Number(decimalHours || 0) * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Map a backend employee record onto the shape used by shared UI components. */
export function uiEmployee(emp) {
  if (!emp) return null;
  return {
    id: emp.id,
    userId: emp.userId,
    loginId: emp.loginId || '',
    name: `${emp.firstName} ${emp.lastName}`.trim(),
    position: emp.designation || emp.department || 'Staff',
    department: emp.department || 'General',
    email: emp.email,
    phone: emp.phone,
    joiningDate: emp.joiningDate,
    employmentStatus: emp.user?.status || 'ACTIVE',
    role: emp.user?.role,
    raw: emp,
  };
}

export function todayISO() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function currentMonthKey() {
  return todayISO().slice(0, 7);
}
