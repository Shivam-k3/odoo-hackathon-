import { Request, Response, NextFunction } from 'express';
import { employeeService } from '../services/employee.service';
import { sendSuccess, sendError } from '../utils/apiResponse';

export class EmployeeController {
  /**
   * GET /api/employees/me
   * Retrieve authenticated employee's own profile.
   */
  async getOwnProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated', undefined, 401);
        return;
      }
      const profile = await employeeService.getOwnProfile(req.user.id);
      sendSuccess(res, 'Employee profile retrieved', profile, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * PUT /api/employees/me (or PATCH)
   * Update allowed fields on own profile.
   */
  async updateOwnProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated', undefined, 401);
        return;
      }
      const updated = await employeeService.updateOwnProfile(req.user.id, req.body);
      sendSuccess(res, 'Profile updated successfully', updated, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/employees/me/info
   * Retrieve employee basic info.
   */
  async getOwnInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated', undefined, 401);
        return;
      }
      const profile = await employeeService.getOwnProfile(req.user.id);
      sendSuccess(res, 'Employee information retrieved', profile, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/employees
   * Admin: List all employees with search, department filtering, and pagination.
   */
  async getAllEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, department, page, limit } = req.query as any;
      const result = await employeeService.getAllEmployees({
        query,
        department,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });
      sendSuccess(res, 'Employees retrieved successfully', result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/employees/search
   * Admin: Dedicated search endpoint.
   */
  async searchEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, department, page, limit } = req.query as any;
      const result = await employeeService.getAllEmployees({
        query,
        department,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });
      sendSuccess(res, 'Employee search results', result, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/employees/:id
   * Admin: Get single employee by ID.
   */
  async getEmployeeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employee = await employeeService.getEmployeeById(req.params.id);
      sendSuccess(res, 'Employee retrieved successfully', employee, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/employees
   * Admin: Create a new employee.
   */
  async createEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const employee = await employeeService.adminCreateEmployee(req.body);
      sendSuccess(res, 'Employee created successfully', employee, 201);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }

  /**
   * PUT /api/employees/:id
   * Admin: Update employee record.
   */
  async updateEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await employeeService.adminUpdateEmployee(req.params.id, req.body);
      sendSuccess(res, 'Employee updated successfully', updated, 200);
    } catch (error: any) {
      if (error.statusCode) {
        sendError(res, error.message, undefined, error.statusCode);
        return;
      }
      next(error);
    }
  }
}

export const employeeController = new EmployeeController();
