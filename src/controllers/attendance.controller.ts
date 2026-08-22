import { Request, Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

export class AttendanceController {
  /**
   * POST /api/attendance/check-in
   * Record check-in for authenticated employee.
   */
  async checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.employeeId) {
        sendError(res, 'Employee profile not associated with this user account', undefined, 403);
        return;
      }

      const result = await attendanceService.checkIn(req.user.employeeId);
      sendSuccess(res, 'Checked in successfully', result, 201);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/attendance/check-out
   * Record check-out for authenticated employee.
   */
  async checkOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.employeeId) {
        sendError(res, 'Employee profile not associated with this user account', undefined, 403);
        return;
      }

      const result = await attendanceService.checkOut(req.user.employeeId);
      sendSuccess(res, 'Checked out successfully', result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/attendance/me/today
   * Get today's attendance status & punch.
   */
  async getToday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.employeeId) {
        sendError(res, 'Employee profile not associated with this user account', undefined, 403);
        return;
      }

      const result = await attendanceService.getTodayAttendance(req.user.employeeId);
      sendSuccess(res, "Today's attendance retrieved", result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/attendance/me
   * Get own attendance history.
   */
  async getOwnAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.employeeId) {
        sendError(res, 'Employee profile not associated with this user account', undefined, 403);
        return;
      }

      const { startDate, endDate, page, limit } = req.query as any;
      const result = await attendanceService.getEmployeeAttendanceHistory(req.user.employeeId, {
        startDate,
        endDate,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 30,
      });

      sendSuccess(res, 'Attendance history retrieved', result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/attendance/me/date?date=YYYY-MM-DD
   * Get attendance for specific date.
   */
  async getByDate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.employeeId) {
        sendError(res, 'Employee profile not associated with this user account', undefined, 403);
        return;
      }

      const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
      const result = await attendanceService.getAttendanceByDate(req.user.employeeId, dateStr);
      sendSuccess(res, 'Attendance for date retrieved', result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/attendance/me/weekly
   * Get attendance for current week.
   */
  async getWeeklyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.employeeId) {
        sendError(res, 'Employee profile not associated with this user account', undefined, 403);
        return;
      }

      const result = await attendanceService.getWeeklyAttendance(req.user.employeeId);
      sendSuccess(res, 'Weekly attendance retrieved', result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/attendance/me/monthly?month=YYYY-MM
   * Get attendance for specific or current month.
   */
  async getMonthlyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.employeeId) {
        sendError(res, 'Employee profile not associated with this user account', undefined, 403);
        return;
      }

      const monthStr = req.query.month as string | undefined;
      const result = await attendanceService.getMonthlyAttendance(req.user.employeeId, monthStr);
      sendSuccess(res, 'Monthly attendance retrieved', result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/attendance/admin/all
   * Admin: List all attendance across organization.
   */
  async getAdminAllAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, month, status, department, page, limit } = req.query as any;
      const result = await attendanceService.getAdminAllAttendance({
        date,
        month,
        status,
        department,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 30,
      });

      sendSuccess(res, 'Organization attendance records retrieved', result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/attendance/admin/employee/:employeeId
   * Admin: Get attendance for specific employee.
   */
  async getAdminEmployeeAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate, page, limit } = req.query as any;
      const result = await attendanceService.getAdminEmployeeAttendance(employeeId, {
        startDate,
        endDate,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 30,
      });

      sendSuccess(res, 'Employee attendance records retrieved', result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/attendance/admin/today
   * Admin: Get today's company-wide attendance dashboard.
   */
  async getAdminToday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await attendanceService.getAdminTodayAttendance();
      sendSuccess(res, "Today's organization attendance summary", result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/attendance/admin/monthly-summary?month=YYYY-MM
   * Admin: Get monthly attendance aggregate statistics.
   */
  async getAdminMonthlySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const monthStr = req.query.month as string | undefined;
      const result = await attendanceService.getAdminMonthlySummary(monthStr);
      sendSuccess(res, 'Monthly attendance summary retrieved', result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }
}

export const attendanceController = new AttendanceController();
