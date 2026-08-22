import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { reportsService } from '../services/reports.service';
import { toCsv } from '../services/reports.service';
import { sendSuccess } from '../utils/apiResponse';

export class DashboardController {
  /** GET /api/admin/dashboard - aggregated live metrics. */
  async overview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await dashboardService.getOverview(req.query.month as string | undefined);
      sendSuccess(res, 'Dashboard overview fetched', result);
    } catch (error) {
      next(error);
    }
  }
}

export class ReportsController {
  private sendCsv(res: Response, filename: string, headers: Record<string, string>, rows: Record<string, any>[]) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(toCsv(headers, rows));
  }

  /** GET /api/admin/reports/attendance */
  async attendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.attendanceReport({
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        employeeId: req.query.employeeId as string | undefined,
        department: req.query.department as string | undefined,
        status: req.query.status as string | undefined,
      });
      if (req.query.format === 'csv') {
        return this.sendCsv(
          res,
          `attendance-report.csv`,
          {
            date: 'Date',
            loginId: 'Login ID',
            name: 'Name',
            department: 'Department',
            status: 'Status',
            workHours: 'Work Hours',
            extraHours: 'Extra Hours',
          },
          result.records.map((r: any) => ({
            date: r.date,
            loginId: r.employee.loginId,
            name: `${r.employee.firstName} ${r.employee.lastName}`,
            department: r.employee.department ?? '',
            status: r.status,
            workHours: r.workHours,
            extraHours: r.extraHours,
          }))
        );
      }
      sendSuccess(res, 'Attendance report generated', result);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/admin/reports/leaves */
  async leaves(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.leaveReport({
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        employeeId: req.query.employeeId as string | undefined,
        department: req.query.department as string | undefined,
        leaveType: req.query.leaveType as string | undefined,
        status: req.query.status as string | undefined,
      });
      if (req.query.format === 'csv') {
        return this.sendCsv(
          res,
          `leave-report.csv`,
          {
            startDate: 'Start Date',
            endDate: 'End Date',
            days: 'Requested Days',
            type: 'Leave Type',
            status: 'Status',
            loginId: 'Login ID',
            name: 'Name',
            department: 'Department',
            decidedBy: 'Decided By',
            adminComment: 'Admin Comment',
          },
          result.records.map((r: any) => ({
            startDate: r.startDate.toISOString().slice(0, 10),
            endDate: r.endDate.toISOString().slice(0, 10),
            days: r.requestedDays,
            type: r.leaveType,
            status: r.status,
            loginId: r.employee.loginId,
            name: `${r.employee.firstName} ${r.employee.lastName}`,
            department: r.employee.department ?? '',
            decidedBy: r.decidedBy?.email ?? '',
            adminComment: r.adminComment ?? '',
          }))
        );
      }
      sendSuccess(res, 'Leave report generated', result);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/admin/reports/payroll */
  async payroll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.payrollReport({
        month: req.query.month as string | undefined,
        employeeId: req.query.employeeId as string | undefined,
        department: req.query.department as string | undefined,
      });
      if (req.query.format === 'csv') {
        return this.sendCsv(
          res,
          `payroll-report.csv`,
          {
            period: 'Period',
            loginId: 'Login ID',
            name: 'Name',
            department: 'Department',
            monthlyWage: 'Monthly Wage (INR)',
            basicSalary: 'Basic (INR)',
            hra: 'HRA (INR)',
            standardAllowance: 'Standard Allowance (INR)',
            performanceBonus: 'Performance Bonus (INR)',
            lta: 'LTA (INR)',
            fixedAllowance: 'Fixed Allowance (INR)',
            grossEarnings: 'Gross (INR)',
            employeePf: 'Employee PF (INR)',
            employerPf: 'Employer PF (INR)',
            professionalTax: 'Professional Tax (INR)',
            payableDays: 'Payable Days',
            netPay: 'Net Pay (INR)',
          },
          result.records.map((r: any) => ({
            period: `${r.periodYear}-${String(r.periodMonth).padStart(2, '0')}`,
            loginId: r.employee.loginId,
            name: `${r.employee.firstName} ${r.employee.lastName}`,
            department: r.employee.department ?? '',
            monthlyWage: r.monthlyWage,
            basicSalary: r.basicSalary,
            hra: r.hra,
            standardAllowance: r.standardAllowance,
            performanceBonus: r.performanceBonus,
            lta: r.lta,
            fixedAllowance: r.fixedAllowance,
            grossEarnings: r.grossEarnings,
            employeePf: r.employeePf,
            employerPf: r.employerPf,
            professionalTax: r.professionalTax,
            payableDays: r.payableDays,
            netPay: r.netPay,
          }))
        );
      }
      sendSuccess(res, 'Payroll report generated', result);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/admin/reports/employees */
  async employees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportsService.employeeReport({
        department: req.query.department as string | undefined,
        search: req.query.search as string | undefined,
      });
      if (req.query.format === 'csv') {
        return this.sendCsv(
          res,
          `employee-report.csv`,
          {
            loginId: 'Login ID',
            firstName: 'First Name',
            lastName: 'Last Name',
            email: 'Email',
            phone: 'Phone',
            department: 'Department',
            designation: 'Designation',
            joiningDate: 'Joining Date',
            role: 'Role',
            status: 'Status',
          },
          result.employees.map((e: any) => ({
            loginId: e.loginId,
            firstName: e.firstName,
            lastName: e.lastName,
            email: e.email,
            phone: e.phone ?? '',
            department: e.department ?? '',
            designation: e.designation ?? '',
            joiningDate: e.joiningDate ? new Date(e.joiningDate).toISOString().slice(0, 10) : '',
            role: e.user.role,
            status: e.user.status,
          }))
        );
      }
      sendSuccess(res, 'Employee report generated', result);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
export const reportsController = new ReportsController();
