import { Request, Response, NextFunction } from 'express';
import { payrollService } from '../services/payroll.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

function requireEmployee(req: Request, res: Response): string | null {
  if (!req.user || !req.user.employeeId) {
    sendError(res, 'Employee profile not associated with this user account', undefined, 403);
    return null;
  }
  return req.user.employeeId;
}

export class PayrollController {
  /**
   * GET /api/payroll/me
   * Employee views own salary structure + computed components + payslips.
   * Read-only by design; there is no employee write endpoint.
   */
  async getMyPayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = requireEmployee(req, res);
      if (!employeeId) return;
      const result = await payrollService.getMyPayroll(employeeId);
      sendSuccess(res, 'Payroll details fetched', { ...result, currency: 'INR' });
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/payroll/payslip
   * Employee views own payslip for a specific period.
   */
  async getMyPayslip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = requireEmployee(req, res);
      if (!employeeId) return;
      const year = parseInt(req.query.year as string, 10);
      const month = parseInt(req.query.month as string, 10);
      const payslip = await payrollService.getMyPayslip(employeeId, year, month);
      sendSuccess(res, 'Payslip fetched', { payslip, currency: 'INR' });
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/payroll/me/payable-days?month=YYYY-MM
   * Transparent view of the payable-days computation for the logged-in employee.
   */
  async getMyPayableDays(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = requireEmployee(req, res);
      if (!employeeId) return;
      const { getPayableDays } = await import('../services/payableDays.service');
      const result = await getPayableDays(employeeId, req.query.month as string | undefined);
      sendSuccess(res, 'Payable days fetched', result);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }
}

export class PayrollAdminController {
  /**
   * GET /api/admin/payroll
   */
  async listPayslips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await payrollService.adminListPayslips({
        month: req.query.month as string | undefined,
        employeeId: req.query.employeeId as string | undefined,
        department: req.query.department as string | undefined,
      });
      sendSuccess(res, 'Payslips fetched', result);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/admin/payroll/:employeeId
   * Admin/HR views one employee's structure, components and payslips.
   */
  async getEmployeePayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await payrollService.getMyPayroll(req.params.employeeId);
      sendSuccess(res, 'Employee payroll fetched', { ...result, currency: 'INR' });
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/admin/payroll/:employeeId
   * Create salary structure for an employee.
   */
  async createSalaryStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated user', undefined, 401);
        return;
      }
      const existing = await payrollService.getSalaryStructure(req.params.employeeId);
      if (existing) {
        sendError(res, 'Salary structure already exists. Use PUT to update it.', undefined, 409);
        return;
      }
      const structure = await payrollService.upsertSalaryStructure(
        req.params.employeeId,
        req.body.monthlyWage,
        req.user.id,
        req.body.effectiveFrom
      );
      sendSuccess(res, 'Salary structure created', { salaryStructure: structure }, 201);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * PUT /api/admin/payroll/:employeeId
   * Update wage on existing salary structure.
   */
  async updateSalaryStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated user', undefined, 401);
        return;
      }
      const structure = await payrollService.upsertSalaryStructure(
        req.params.employeeId,
        req.body.monthlyWage,
        req.user.id,
        req.body.effectiveFrom
      );
      sendSuccess(res, 'Salary structure updated', { salaryStructure: structure });
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/admin/payroll/:employeeId/generate-payslip
   * Generate/regenerate a payslip for a pay period (recompute).
   */
  async generatePayslip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated user', undefined, 401);
        return;
      }
      const result = await payrollService.generatePayslip(
        req.params.employeeId,
        (req.body && req.body.month) as string | undefined,
        req.user.id
      );
      sendSuccess(res, 'Payslip generated', result, 201);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }
}

export const payrollController = new PayrollController();
export const payrollAdminController = new PayrollAdminController();
