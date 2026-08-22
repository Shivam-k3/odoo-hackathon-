import { prisma } from '../models/prisma';

export type CsvValue = string | number | null | undefined;

/** Minimal RFC-4180 CSV serializer for report exports. */
export function toCsv(headers: Record<string, string>, rows: Record<string, CsvValue>[]): string {
  const cols = Object.keys(headers);
  const escape = (v: CsvValue) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.map((c) => escape(headers[c])).join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => escape(row[c])).join(','));
  }
  return lines.join('\n');
}

export const reportsService = {
  /** Attendance report with employee/date-range/status/department filters. */
  async attendanceReport(filters: {
    from?: string;
    to?: string;
    employeeId?: string;
    department?: string;
    status?: string;
  }) {
    const where: any = {};
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;
    if (filters.department) where.employee = { department: filters.department };
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = filters.from;
      if (filters.to) where.date.lte = filters.to;
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: [{ date: 'desc' }],
      include: {
        employee: {
          select: {
            id: true,
            loginId: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true,
          },
        },
      },
      take: 5000,
    });

    const summary = records.reduce(
      (acc, r) => {
        acc.totalRecords += 1;
        if (r.status === 'PRESENT') acc.present += 1;
        else if (r.status === 'ABSENT') acc.absent += 1;
        else if (r.status === 'HALF_DAY') acc.halfDay += 1;
        else if (r.status === 'LEAVE') acc.leave += 1;
        acc.totalWorkHours = Math.round((acc.totalWorkHours + r.workHours) * 100) / 100;
        acc.totalExtraHours = Math.round((acc.totalExtraHours + r.extraHours) * 100) / 100;
        return acc;
      },
      { totalRecords: 0, present: 0, absent: 0, halfDay: 0, leave: 0, totalWorkHours: 0, totalExtraHours: 0 }
    );

    return { filters, summary, records };
  },

  /** Leave report with employee/type/status/date-range/department filters. */
  async leaveReport(filters: {
    from?: string;
    to?: string;
    employeeId?: string;
    leaveType?: string;
    status?: string;
    department?: string;
  }) {
    const where: any = {};
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.leaveType) where.leaveType = filters.leaveType;
    if (filters.status) where.status = filters.status;
    if (filters.department) where.employee = { department: filters.department };
    if (filters.from || filters.to) {
      where.startDate = {};
      if (filters.from) where.startDate.gte = new Date(`${filters.from}T00:00:00.000Z`);
      if (filters.to) where.startDate.lte = new Date(`${filters.to}T23:59:59.999Z`);
    }

    const records = await prisma.leaveRequest.findMany({
      where,
      orderBy: [{ startDate: 'desc' }],
      include: {
        employee: {
          select: {
            id: true,
            loginId: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
        decidedBy: { select: { email: true } },
      },
      take: 5000,
    });

    const summary = records.reduce(
      (acc, r) => {
        acc.totalRequests += 1;
        acc.totalDaysRequested += r.requestedDays;
        if (r.status === 'PENDING') acc.pending += 1;
        else if (r.status === 'APPROVED') acc.approved += 1;
        else if (r.status === 'REJECTED') acc.rejected += 1;
        return acc;
      },
      { totalRequests: 0, pending: 0, approved: 0, rejected: 0, totalDaysRequested: 0 }
    );

    return { filters, summary, records };
  },

  /** Payroll report from stored payslips for a period/filters. */
  async payrollReport(filters: { month?: string; employeeId?: string; department?: string }) {
    const where: any = {};
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.department) where.employee = { department: filters.department };
    if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
      where.periodYear = parseInt(filters.month.slice(0, 4), 10);
      where.periodMonth = parseInt(filters.month.slice(5, 7), 10);
    }

    const records = await prisma.payslip.findMany({
      where,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      include: {
        employee: {
          select: {
            id: true,
            loginId: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      take: 5000,
    });

    const summary = records.reduce(
      (acc, r) => ({
        payslipCount: acc.payslipCount + 1,
        totalGross: Math.round((acc.totalGross + r.grossEarnings) * 100) / 100,
        totalNetPay: Math.round((acc.totalNetPay + r.netPay) * 100) / 100,
        totalEmployeePf: Math.round((acc.totalEmployeePf + r.employeePf) * 100) / 100,
        totalEmployerPf: Math.round((acc.totalEmployerPf + r.employerPf) * 100) / 100,
        totalProfessionalTax:
          Math.round((acc.totalProfessionalTax + r.professionalTax) * 100) / 100,
      }),
      {
        payslipCount: 0,
        totalGross: 0,
        totalNetPay: 0,
        totalEmployeePf: 0,
        totalEmployerPf: 0,
        totalProfessionalTax: 0,
      }
    );

    return { filters, summary, records, currency: 'INR' };
  },

  /** Employee directory report grouped by department. */
  async employeeReport(filters: { department?: string; search?: string }) {
    const where: any = {};
    if (filters.department) where.department = filters.department;
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { loginId: { contains: filters.search.toUpperCase() } },
      ];
    }
    const employees = await prisma.employee.findMany({
      where,
      orderBy: [{ department: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        loginId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        department: true,
        designation: true,
        joiningDate: true,
        user: { select: { role: true, status: true } },
      },
      take: 5000,
    });

    const byDepartment = employees.reduce<Record<string, number>>((acc, e) => {
      const key = e.department || 'Unassigned';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return { filters, totalEmployees: employees.length, byDepartment, employees };
  },
};
