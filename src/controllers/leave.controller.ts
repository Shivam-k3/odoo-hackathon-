import { Request, Response, NextFunction } from 'express';
import { leaveService } from '../services/leave.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

function requireEmployee(req: Request, res: Response): string | null {
  if (!req.user || !req.user.employeeId) {
    sendError(res, 'Employee profile not associated with this user account', undefined, 403);
    return null;
  }
  return req.user.employeeId;
}

export class LeaveController {
  /**
   * POST /api/leaves
   * Employee applies for leave. requestedDays is computed on the backend.
   */
  async applyLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = requireEmployee(req, res);
      if (!employeeId) return;

      const file = req.file as Express.Multer.File | undefined;
      const attachmentUrl = file
        ? `/uploads/leaves/${file.filename}`
        : (req.body.attachment as string | undefined) ?? null;

      const result = await leaveService.applyLeave(employeeId, {
        leaveType: req.body.leaveType,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        remarks: req.body.remarks,
        attachment: attachmentUrl,
      });
      sendSuccess(res, 'Leave request submitted', { leaveRequest: result }, 201);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/leaves/me
   * Employee views own requests with optional status/year filters.
   */
  async getMyLeaves(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = requireEmployee(req, res);
      if (!employeeId) return;
      const result = await leaveService.listMyLeaves(employeeId, {
        status: req.query.status as string | undefined,
        year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      sendSuccess(res, 'Leave requests fetched', result);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/leaves/:id
   * Employee views one of their own requests.
   */
  async getMyLeaveById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = requireEmployee(req, res);
      if (!employeeId) return;
      const record = await leaveService.getMyLeave(employeeId, req.params.id);
      sendSuccess(res, 'Leave request fetched', { leaveRequest: record });
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/leaves/allocations/me
   * Employee views own balances for the current or given year.
   */
  async getMyAllocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employeeId = requireEmployee(req, res);
      if (!employeeId) return;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const result = await leaveService.getMyAllocations(employeeId, year);
      sendSuccess(res, 'Leave allocations fetched', result);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }
}

export class LeaveAdminController {
  /**
   * GET /api/admin/leaves
   */
  async listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await leaveService.adminListLeaves({
        status: req.query.status as string | undefined,
        leaveType: req.query.leaveType as string | undefined,
        employeeId: req.query.employeeId as string | undefined,
        department: req.query.department as string | undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      sendSuccess(res, 'Leave requests fetched', result);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/admin/leaves/:id
   */
  async getDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await leaveService.adminGetLeave(req.params.id);
      sendSuccess(res, 'Leave request fetched', { leaveRequest: record });
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/admin/leaves/:id/approve
   */
  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated user', undefined, 401);
        return;
      }
      const record = await leaveService.decideLeave(
        req.params.id,
        'APPROVED',
        req.user.id,
        (req.body && req.body.comment) as string | undefined
      );
      sendSuccess(res, 'Leave request approved', { leaveRequest: record });
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/admin/leaves/:id/reject
   */
  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated user', undefined, 401);
        return;
      }
      const record = await leaveService.decideLeave(
        req.params.id,
        'REJECTED',
        req.user.id,
        (req.body && req.body.comment) as string | undefined
      );
      sendSuccess(res, 'Leave request rejected', { leaveRequest: record });
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }
}

export const leaveController = new LeaveController();
export const leaveAdminController = new LeaveAdminController();
