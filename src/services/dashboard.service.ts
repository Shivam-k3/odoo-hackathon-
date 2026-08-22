import { prisma } from '../models/prisma';
import { getTodayDateString, getMonthRange } from '../utils/dateUtils';

export const dashboardService = {
  /**
   * Aggregated admin dashboard metrics. Every number is computed live from
   * database records - nothing is hardcoded.
   */
  async getOverview(monthStr?: string) {
    const today = getTodayDateString();
    const { startDate, endDate } = getMonthRange(monthStr);

    const [
      totalEmployees,
      presentToday,
      halfDayToday,
      onLeaveRecords,
      pendingLeaveRequests,
      approvedLeavesTotal,
      rejectedLeavesTotal,
      monthAttendance,
      payslips,
      salaryStructures,
    ] = await Promise.all([
      prisma.employee.count({ where: { user: { status: 'ACTIVE' } } }),
      prisma.attendance.count({ where: { date: today, status: 'PRESENT' } }),
      prisma.attendance.count({ where: { date: today, status: 'HALF_DAY' } }),
      prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: new Date(`${today}T23:59:59.999Z`) },
          endDate: { gte: new Date(`${today}T00:00:00.000Z`) },
        },
        select: { employeeId: true },
      }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.leaveRequest.count({ where: { status: 'APPROVED' } }),
      prisma.leaveRequest.count({ where: { status: 'REJECTED' } }),
      prisma.attendance.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        select: { status: true, workHours: true, extraHours: true },
      }),
      prisma.payslip.findMany({
        where: {
          periodYear: parseInt(startDate.slice(0, 4), 10),
          periodMonth: parseInt(startDate.slice(5, 7), 10),
        },
        select: { grossEarnings: true, netPay: true, employeePf: true, employerPf: true, professionalTax: true },
      }),
      prisma.salaryStructure.count(),
    ]);

    const onLeaveEmployeeIds = new Set(onLeaveRecords.map((r) => r.employeeId));

    // Absent = active employees without PRESENT/HALF_DAY record and not on approved leave.
    const absentToday = Math.max(
      0,
      totalEmployees - presentToday - halfDayToday - onLeaveEmployeeIds.size
    );

    const attendanceSummary = monthAttendance.reduce(
      (acc, r) => {
        if (r.status === 'PRESENT') acc.present += 1;
        else if (r.status === 'ABSENT') acc.absent += 1;
        else if (r.status === 'HALF_DAY') acc.halfDay += 1;
        else if (r.status === 'LEAVE') acc.leave += 1;
        acc.totalWorkHours = Math.round((acc.totalWorkHours + r.workHours) * 100) / 100;
        acc.totalExtraHours = Math.round((acc.totalExtraHours + r.extraHours) * 100) / 100;
        return acc;
      },
      { present: 0, absent: 0, halfDay: 0, leave: 0, totalWorkHours: 0, totalExtraHours: 0 }
    );

    const payrollSummary = payslips.reduce(
      (acc, p) => ({
        payslipsGenerated: acc.payslipsGenerated + 1,
        totalGross: Math.round((acc.totalGross + p.grossEarnings) * 100) / 100,
        totalNet: Math.round((acc.totalNet + p.netPay) * 100) / 100,
        totalPfLiability:
          Math.round((acc.totalPfLiability + p.employeePf + p.employerPf) * 100) / 100,
        totalProfessionalTax:
          Math.round((acc.totalProfessionalTax + p.professionalTax) * 100) / 100,
      }),
      {
        payslipsGenerated: 0,
        totalGross: 0,
        totalNet: 0,
        totalPfLiability: 0,
        totalProfessionalTax: 0,
      }
    );

    return {
      asOfDate: today,
      employees: {
        totalActive: totalEmployees,
        presentToday,
        halfDayToday,
        onApprovedLeaveToday: onLeaveEmployeeIds.size,
        absentToday,
      },
      leaves: {
        pendingRequests: pendingLeaveRequests,
        approvedTotal: approvedLeavesTotal,
        rejectedTotal: rejectedLeavesTotal,
      },
      attendanceSummary: { ...attendanceSummary, month: startDate.slice(0, 7) },
      payrollSummary: { ...payrollSummary, month: startDate.slice(0, 7), currency: 'INR', employeesWithSalaryStructure: salaryStructures },
    };
  },
};
