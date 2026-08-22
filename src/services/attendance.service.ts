import { prisma } from '../models/prisma';
import {
  getTodayDateString,
  calculateWorkHours,
  calculateExtraHours,
  getWeekRange,
  getMonthRange,
} from '../utils/dateUtils';
import { config } from '../config/env';

export class AttendanceService {
  /**
   * Records check-in for the authenticated employee.
   * Validates duplicate check-in prevention and sets initial status to PRESENT.
   */
  async checkIn(employeeId: string) {
    const today = getTodayDateString();

    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    if (existing && existing.checkInTime) {
      throw { statusCode: 400, message: 'You have already checked in for today' };
    }

    const now = new Date();

    if (existing) {
      // Update existing record (e.g. if placeholder was created)
      return await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkInTime: now,
          status: 'PRESENT',
        },
      });
    }

    return await prisma.attendance.create({
      data: {
        employeeId,
        date: today,
        checkInTime: now,
        status: 'PRESENT',
        workHours: 0,
        extraHours: 0,
      },
    });
  }

  /**
   * Records check-out for the authenticated employee.
   * Calculates work hours and overtime (extra hours) on the backend.
   */
  async checkOut(employeeId: string) {
    const today = getTodayDateString();

    const record = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    if (!record || !record.checkInTime) {
      throw { statusCode: 400, message: 'No active check-in found for today. Please check in first.' };
    }

    if (record.checkOutTime) {
      throw { statusCode: 400, message: 'You have already checked out for today.' };
    }

    const now = new Date();

    if (now.getTime() < record.checkInTime.getTime()) {
      throw { statusCode: 400, message: 'Check-out time cannot be earlier than check-in time.' };
    }

    const workHours = calculateWorkHours(record.checkInTime, now);
    const extraHours = calculateExtraHours(workHours, config.standardWorkHoursPerDay);

    // Determine status: if less than 4 hours worked, mark as HALF_DAY, else PRESENT
    const status = workHours < 4.0 ? 'HALF_DAY' : 'PRESENT';

    return await prisma.attendance.update({
      where: { id: record.id },
      data: {
        checkOutTime: now,
        workHours,
        extraHours,
        status,
      },
    });
  }

  /**
   * Retrieves today's attendance status and active punch for an employee.
   */
  async getTodayAttendance(employeeId: string) {
    const today = getTodayDateString();
    const record = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    return (
      record || {
        employeeId,
        date: today,
        checkInTime: null,
        checkOutTime: null,
        workHours: 0,
        extraHours: 0,
        status: 'ABSENT',
      }
    );
  }

  /**
   * Retrieves attendance history for the authenticated employee with optional date filtering.
   */
  async getEmployeeAttendanceHistory(
    employeeId: string,
    options: { startDate?: string; endDate?: string; page?: number; limit?: number } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 30;
    const skip = (page - 1) * limit;

    const where: any = { employeeId };

    if (options.startDate && options.endDate) {
      where.date = {
        gte: options.startDate,
        lte: options.endDate,
      };
    } else if (options.startDate) {
      where.date = { gte: options.startDate };
    } else if (options.endDate) {
      where.date = { lte: options.endDate };
    }

    const [total, records] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      records,
    };
  }

  /**
   * Retrieves attendance record for a specific date for an employee.
   */
  async getAttendanceByDate(employeeId: string, date: string) {
    const record = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date,
        },
      },
    });

    if (!record) {
      return {
        employeeId,
        date,
        checkInTime: null,
        checkOutTime: null,
        workHours: 0,
        extraHours: 0,
        status: 'ABSENT',
      };
    }

    return record;
  }

  /**
   * Retrieves weekly attendance for the authenticated employee.
   */
  async getWeeklyAttendance(employeeId: string) {
    const { startDate, endDate } = getWeekRange();
    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    const totalWorkHours = records.reduce((sum, r) => sum + r.workHours, 0);
    const totalExtraHours = records.reduce((sum, r) => sum + r.extraHours, 0);

    return {
      startDate,
      endDate,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      totalExtraHours: Math.round(totalExtraHours * 100) / 100,
      records,
    };
  }

  /**
   * Retrieves monthly attendance for the authenticated employee.
   */
  async getMonthlyAttendance(employeeId: string, monthStr?: string) {
    const { startDate, endDate, yearMonth } = getMonthRange(monthStr);

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    const presentDays = records.filter((r) => r.status === 'PRESENT').length;
    const halfDays = records.filter((r) => r.status === 'HALF_DAY').length;
    const leaveDays = records.filter((r) => r.status === 'LEAVE').length;
    const totalWorkHours = records.reduce((sum, r) => sum + r.workHours, 0);
    const totalExtraHours = records.reduce((sum, r) => sum + r.extraHours, 0);

    return {
      month: yearMonth,
      startDate,
      endDate,
      stats: {
        presentDays,
        halfDays,
        leaveDays,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        totalExtraHours: Math.round(totalExtraHours * 100) / 100,
      },
      records,
    };
  }

  /**
   * Admin: Retrieves all attendance records with department/date/status filters and pagination.
   */
  async getAdminAllAttendance(options: {
    date?: string;
    month?: string;
    status?: string;
    department?: string;
    page?: number;
    limit?: number;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 30;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.date) {
      where.date = options.date;
    } else if (options.month) {
      const { startDate, endDate } = getMonthRange(options.month);
      where.date = { gte: startDate, lte: endDate };
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.department) {
      where.employee = { department: options.department };
    }

    const [total, records] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              loginId: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
              designation: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      records,
    };
  }

  /**
   * Admin: Retrieves attendance records for a specific employee.
   */
  async getAdminEmployeeAttendance(
    employeeId: string,
    options: { startDate?: string; endDate?: string; page?: number; limit?: number } = {}
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        loginId: true,
        firstName: true,
        lastName: true,
        department: true,
        designation: true,
      },
    });

    if (!employee) {
      throw { statusCode: 404, message: 'Employee not found' };
    }

    const history = await this.getEmployeeAttendanceHistory(employeeId, options);

    return {
      employee,
      ...history,
    };
  }

  /**
   * Admin: Retrieves today's attendance summary and roster across all employees.
   */
  async getAdminTodayAttendance() {
    const today = getTodayDateString();

    const [totalEmployees, todayRecords] = await Promise.all([
      prisma.employee.count(),
      prisma.attendance.findMany({
        where: { date: today },
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
      }),
    ]);

    const presentCount = todayRecords.filter((r) => r.status === 'PRESENT').length;
    const halfDayCount = todayRecords.filter((r) => r.status === 'HALF_DAY').length;
    const leaveCount = todayRecords.filter((r) => r.status === 'LEAVE').length;
    const checkedInCount = todayRecords.filter((r) => r.checkInTime !== null).length;
    const checkedOutCount = todayRecords.filter((r) => r.checkOutTime !== null).length;
    const absentCount = Math.max(0, totalEmployees - todayRecords.length);

    return {
      date: today,
      totalEmployees,
      summary: {
        presentCount,
        halfDayCount,
        leaveCount,
        absentCount,
        checkedInCount,
        checkedOutCount,
      },
      records: todayRecords,
    };
  }

  /**
   * Admin: Monthly Attendance Summary across company.
   */
  async getAdminMonthlySummary(monthStr?: string) {
    const { startDate, endDate, yearMonth } = getMonthRange(monthStr);

    const [totalEmployees, records] = await Promise.all([
      prisma.employee.count(),
      prisma.attendance.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    const presentTotal = records.filter((r) => r.status === 'PRESENT').length;
    const halfDayTotal = records.filter((r) => r.status === 'HALF_DAY').length;
    const leaveTotal = records.filter((r) => r.status === 'LEAVE').length;
    const totalWorkHours = records.reduce((sum, r) => sum + r.workHours, 0);
    const totalExtraHours = records.reduce((sum, r) => sum + r.extraHours, 0);

    return {
      month: yearMonth,
      startDate,
      endDate,
      totalEmployees,
      totalRecords: records.length,
      aggregateStats: {
        presentTotal,
        halfDayTotal,
        leaveTotal,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        totalExtraHours: Math.round(totalExtraHours * 100) / 100,
        averageWorkHoursPerDay: records.length > 0 ? Math.round((totalWorkHours / records.length) * 100) / 100 : 0,
      },
    };
  }
}

export const attendanceService = new AttendanceService();
