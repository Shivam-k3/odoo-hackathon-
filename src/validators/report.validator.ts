import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const attendanceReportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  employeeId: z.string().uuid().optional(),
  department: z.string().optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE']).optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

export const leaveReportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  employeeId: z.string().uuid().optional(),
  department: z.string().optional(),
  leaveType: z.enum(['PTO', 'SICK', 'UNPAID']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

export const payrollReportQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  employeeId: z.string().uuid().optional(),
  department: z.string().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

export const employeeReportQuerySchema = z.object({
  department: z.string().optional(),
  search: z.string().max(100).optional(),
  format: z.enum(['json', 'csv']).default('json'),
});
