// DAYFLOW HRMS — ADMIN / HR STATE STORE (MOCK)
// Central mock data store for the admin console. Mirrors the employee-side
// store pattern: plain observable state + localStorage persistence.
// BACKEND INTEGRATION POINT: replace method bodies with REST calls later;
// view code depends only on these stable contracts.

import {
  EMPLOYEES, LEAVE_REQUESTS, SEED_ACTIVITY, SEED_NOTIFICATIONS,
  generateMonthAttendance, CURRENT_MONTH, TODAY_ISO, NEXT_PAYOUT_DATE,
  ADMIN_PROFILE, AVATAR_PALETTE
} from '../data/adminMockData.js';

const STORAGE_KEY = 'DAYFLOW_ADMIN_STATE_V1';

const nowStamp = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

let idCounter = 100;
const nextLocalId = prefix => `${prefix}-${++idCounter}`;

class AdminStore {
  constructor() {
    this.attendanceCache = null;
    this.listeners = [];
    this.state = this.load();
  }

  defaultState() {
    return {
      employees: JSON.parse(JSON.stringify(EMPLOYEES)),
      leaveRequests: JSON.parse(JSON.stringify(LEAVE_REQUESTS)),
      activity: JSON.parse(JSON.stringify(SEED_ACTIVITY)),
      notifications: JSON.parse(JSON.stringify(SEED_NOTIFICATIONS)),
      payrollOverrides: {}
    };
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...this.defaultState(), ...JSON.parse(saved) };
    } catch (e) { /* corrupted storage -> reseed */ }
    return this.defaultState();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) { /* storage full/unavailable -> keep in-memory only */ }
    this.notify();
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this.state));
  }

  // ------------------------------------------------------------------ EMPLOYEES

  getEmployees() {
    return this.state.employees;
  }

  getEmployeeById(id) {
    return this.state.employees.find(e => e.id === id) || null;
  }

  queryEmployees({ search = '', department = '', status = '' } = {}) {
    const q = search.trim().toLowerCase();
    return this.state.employees.filter(emp => {
      const matchesSearch = !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.id.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.position.toLowerCase().includes(q);
      const matchesDept = !department || emp.department === department;
      const matchesStatus = !status || emp.employmentStatus === status;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }

  updateEmployee(id, patch) {
    const idx = this.state.employees.findIndex(e => e.id === id);
    if (idx < 0) return false;
    this.state.employees[idx] = { ...this.state.employees[idx], ...patch };
    this.save();
    this.logActivity({
      icon: 'user', tone: 'info',
      title: 'Employee profile updated',
      desc: `${this.state.employees[idx].name}'s details were updated by HR.`,
      time: nowStamp()
    });
    return true;
  }

  // ---------------------------------------------------------------- ATTENDANCE

  getAllAttendance() {
    if (!this.attendanceCache) {
      this.attendanceCache = generateMonthAttendance(CURRENT_MONTH.year, CURRENT_MONTH.month);
    }
    return this.attendanceCache;
  }

  getAttendanceForDate(dateISO) {
    return this.getAllAttendance().filter(r => r.date === dateISO);
  }

  filterAttendance({ employeeId = '', status = '', date = '' } = {}) {
    return this.getAllAttendance().filter(r =>
      (!employeeId || r.employeeId === employeeId) &&
      (!status || r.status === status) &&
      (!date || r.date === date)
    );
  }

  getMonthlyAttendance(employeeId, year = CURRENT_MONTH.year, month = CURRENT_MONTH.month) {
    const prefix = `${year}-` + String(month).padStart(2, '0');
    return this.getAllAttendance()
      .filter(r => r.employeeId === employeeId && r.date.startsWith(prefix))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }

  summarize(records) {
    const summary = { present: 0, absent: 0, halfDay: 0, leave: 0, totalMinutes: 0, extraMinutes: 0 };
    for (const r of records) {
      if (r.status === 'Present') summary.present++;
      else if (r.status === 'Absent') summary.absent++;
      else if (r.status === 'Half-day') summary.halfDay++;
      else if (r.status === 'Leave') summary.leave++;
      summary.totalMinutes += r.workMinutes || 0;
      summary.extraMinutes += r.extraMinutes || 0;
    }
    return summary;
  }

  getTodayRecords() {
    return this.getAllAttendance().filter(r => r.date === TODAY_ISO);
  }

  // Weekly trend for dashboard mini bar chart (last 7 working days incl. today)
  getLastSevenWorkingDays() {
    const all = this.getAllAttendance();
    const dates = [...new Set(all.map(r => r.date))].sort().slice(-7);
    return dates.map(date => {
      const dayRecords = all.filter(r => r.date === date);
      const s = this.summarize(dayRecords);
      return {
        date,
        label: new Date(date.slice(0, 4), date.slice(5, 7) - 1, date.slice(8, 10))
          .toLocaleDateString('en-US', { weekday: 'short' }),
        presentRate: dayRecords.length ? Math.round((s.present / dayRecords.length) * 100) : 0
      };
    });
  }

  // --------------------------------------------------------------------- LEAVE

  getLeaves(statusFilter = '') {
    const list = this.state.leaveRequests;
    return statusFilter ? list.filter(l => l.status === statusFilter) : list;
  }

  getLeaveById(id) {
    return this.state.leaveRequests.find(l => l.id === id) || null;
  }

  getEmployeeLeaveStats() {
    const counts = { Pending: 0, Approved: 0, Rejected: 0 };
    this.state.leaveRequests.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return counts;
  }

  setLeaveDecision(requestId, decision, commentText = '') {
    const req = this.getLeaveById(requestId);
    if (!req || req.status !== 'Pending') return null;

    req.status = decision; // 'Approved' | 'Rejected'
    req.decidedBy = ADMIN_PROFILE.name;
    req.decidedOn = nowStamp();

    const trimmed = commentText.trim();
    if (trimmed) {
      req.comments.push({ author: ADMIN_PROFILE.name, text: trimmed, time: nowStamp() });
    }

    // Keep attendance story consistent: approved leave marks the employee on leave.
    if (decision === 'Approved') {
      const att = this.getAllAttendance();
      const start = req.startDate <= TODAY_ISO ? req.startDate : null;
      const end = TODAY_ISO <= req.endDate ? TODAY_ISO : null;
      if (start && end) {
        att.filter(r => r.employeeId === req.employeeId && r.date >= start && r.date <= end)
          .forEach(r => {
            r.status = 'Leave';
            r.checkIn = '-';
            r.checkOut = '-';
            r.workMinutes = 0;
            r.hoursLabel = '0h 00m';
            r.extraMinutes = 0;
            r.extraLabel = '0h 00m';
          });
        this.syncEmployeeStatus(req.employeeId, TODAY_ISO >= req.startDate && TODAY_ISO <= req.endDate);
      }
    }

    this.save();

    const emp = this.getEmployeeById(req.employeeId);
    this.logActivity({
      icon: decision === 'Approved' ? 'plane' : 'x-circle',
      tone: decision === 'Approved' ? 'info' : 'danger',
      title: `Leave ${decision.toLowerCase()}`,
      desc: `${emp ? emp.name : req.employeeId}'s ${req.type} (${req.startDate} - ${req.endDate}) was ${decision.toLowerCase()} by HR.`,
      time: nowStamp()
    });
    this.addNotification({
      icon: decision === 'Approved' ? 'check-circle' : 'alert-triangle',
      tone: decision === 'Approved' ? 'success' : 'danger',
      title: `Leave ${decision.toLowerCase()}`,
      desc: `${req.id}: ${emp ? emp.name : req.employeeId} · ${req.type}.`,
      time: 'Just now'
    });

    return req;
  }

  syncEmployeeStatus(employeeId, onLeaveToday) {
    const emp = this.getEmployeeById(employeeId);
    if (!emp || emp.employmentStatus === 'Inactive') return;
    if (onLeaveToday && emp.employmentStatus !== 'On Leave') {
      emp.employmentStatus = 'On Leave';
    } else if (!onLeaveToday && emp.employmentStatus === 'On Leave') {
      emp.employmentStatus = 'Active';
    }
  }

  addLeaveComment(requestId, text) {
    const req = this.getLeaveById(requestId);
    if (!req || !text.trim()) return null;
    const comment = { author: ADMIN_PROFILE.name, text: text.trim(), time: nowStamp() };
    req.comments.push(comment);
    this.save();
    return comment;
  }

  // ------------------------------------------------------------------- PAYROLL
  // MOCK SPLIT ONLY. Real statutory calculations (PF, PT, TDS etc.) will come
  // from the backend; the ratios below exist purely to demo the UI and mirror
  // the employee portal's ₹50,000 sample payslip.

  computePayslip(wage, payableDays = CURRENT_MONTH.workingDays) {
    const w = Number(wage) || 0;
    const basicSalary = Math.round(w * 0.5);
    const hra = Math.round(w * 0.25);
    const standardAllowance = Math.round(w * 0.08334);
    const performanceBonus = Math.round(w * 0.04165 * 10) / 10;
    const lta = Math.round(w * 0.04165 * 10) / 10;
    const fixedAllowance = Math.max(0, Math.round(w - (basicSalary + hra + standardAllowance + performanceBonus + lta)));
    const employeePF = Math.round(basicSalary * 0.12);
    const employerPF = employeePF;
    const professionalTax = 200;
    const totalDeductions = employeePF + professionalTax; // employer PF is an employer cost, never deducted
    return {
      currency: '₹',
      month: CURRENT_MONTH.label,
      payPeriod: 'Aug 01, 2026 - Aug 31, 2026',
      payableDays,
      grossWage: w,
      basicSalary,
      hra,
      standardAllowance,
      performanceBonus,
      lta,
      fixedAllowance,
      employeePF,
      employerPF,
      professionalTax,
      totalDeductions,
      netPay: w - totalDeductions,
      nextPayoutDate: NEXT_PAYOUT_DATE
    };
  }

  getPayslip(employeeId) {
    const emp = this.getEmployeeById(employeeId);
    if (!emp) return null;
    const override = this.state.payrollOverrides[employeeId] || {};
    const wage = override.wage ?? emp.wage;
    const payableDays = override.payableDays ?? emp.payableDays ?? CURRENT_MONTH.workingDays;
    return { employee: emp, slip: this.computePayslip(wage, payableDays) };
  }

  saveWage(employeeId, wage) {
    const value = Number(wage);
    if (!value || value <= 0) return false;
    this.state.payrollOverrides[employeeId] = {
      ...(this.state.payrollOverrides[employeeId] || {}),
      wage: value
    };
    this.save();
    const emp = this.getEmployeeById(employeeId);
    this.logActivity({
      icon: 'receipt', tone: 'neutral',
      title: 'Salary updated (mock)',
      desc: `Monthly wage for ${emp.name} set to ₹${value.toLocaleString('en-IN')}. Backend will compute final figures.`,
      time: nowStamp()
    });
    return true;
  }

  getPayrollOverview() {
    const slips = this.state.employees
      .filter(e => e.employmentStatus !== 'Inactive')
      .map(e => this.getPayslip(e.id).slip);
    const sum = key => slips.reduce((acc, s) => acc + s[key], 0);
    return {
      headcount: slips.length,
      grossTotal: sum('grossWage'),
      deductionsTotal: sum('totalDeductions'),
      netTotal: sum('netPay'),
      nextPayoutDate: NEXT_PAYOUT_DATE,
      month: CURRENT_MONTH.label
    };
  }

  // ------------------------------------------------------- DASHBOARD & FEEDS

  getDashboardStats() {
    const today = this.summarize(this.getTodayRecords());
    const employees = this.state.employees;
    return {
      totalEmployees: employees.length,
      present: today.present,
      onLeave: today.leave,
      absent: today.absent,
      halfDay: today.halfDay,
      pendingLeaves: this.getEmployeeLeaveStats().Pending,
      payrollOverview: this.getPayrollOverview()
    };
  }

  logActivity(entry) {
    this.state.activity.unshift({ id: nextLocalId('ACT'), ...entry });
    this.state.activity = this.state.activity.slice(0, 30); // cap feed size
    this.save();
  }

  getActivity(limit = 8) {
    return this.state.activity.slice(0, limit);
  }

  addNotification(entry) {
    this.state.notifications.unshift({ id: nextLocalId('NTF'), read: false, ...entry });
    this.state.notifications = this.state.notifications.slice(0, 20);
    this.save();
  }

  getNotifications() {
    return this.state.notifications;
  }

  markAllNotificationsRead() {
    this.state.notifications.forEach(n => { n.read = true; });
    this.save();
  }

  unreadNotificationCount() {
    return this.state.notifications.filter(n => !n.read).length;
  }

  // -------------------------------------------------------------------- UTILS

  avatarStyle(index) {
    const [bg, fg] = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
    return `background-color:${bg};color:${fg};`;
  }
}

export const adminStore = new AdminStore();

// Simulated network latency helper for loading skeletons.
export function simulateFetch(ms = 450) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
